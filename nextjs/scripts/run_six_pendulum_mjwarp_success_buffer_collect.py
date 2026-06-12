#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
)
from train_six_pendulum_mjwarp_device_ppo import collect_recurrent_rollout


DEFAULT_WARMSTART = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-modal-link1-neartop-window-burst-20260612.pt"
DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-link1-exactdown-success-buffer-20260612.json"
DEFAULT_REPLAY = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-link1-exactdown-success-buffer-20260612.npz"


def select_worlds(buffers: dict, min_held_seconds: float, top_k_per_pass: int) -> np.ndarray:
    held = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32).reshape(-1)
    strict = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32).reshape(-1)
    if held.size == 0:
        return np.zeros(0, dtype=np.int64)
    eligible = np.where(held >= float(min_held_seconds))[0]
    ordered = sorted(
        eligible.tolist(),
        key=lambda world: (
            float(held[world]),
            float(strict[world]) if strict.size > int(world) else 0.0,
        ),
        reverse=True,
    )
    return np.asarray(ordered[: max(1, int(top_k_per_pass))], dtype=np.int64)


def first_action_diagnostic(actions: np.ndarray) -> dict:
    if actions.size == 0:
        return {"mean": 0.0, "absMean": 0.0, "absMax": 0.0, "nearZeroFraction": 1.0}
    first = np.asarray(actions[0], dtype=np.float32).reshape(-1)
    return {
        "mean": float(np.mean(first)),
        "absMean": float(np.mean(np.abs(first))),
        "absMax": float(np.max(np.abs(first))),
        "nearZeroFraction": float(np.mean(np.abs(first) < 0.02)),
    }


def concat_selected(selected: list[dict]) -> dict:
    keys = [
        "obs",
        "actions",
        "logprobs",
        "values",
        "rewards",
        "terminals",
        "truncations",
        "qpos",
        "qvel",
        "stateLastActions",
        "hiddenStates",
    ]
    result = {}
    for key in keys:
        arrays = [item[key] for item in selected if key in item]
        if arrays:
            result[key] = np.concatenate(arrays, axis=1).astype(np.float32, copy=False)
    return result


def run_success_buffer_collect(mjcf_xml: str, args: argparse.Namespace) -> dict:
    started = time.time()
    policy, checkpoint = load_policy_from_checkpoint(args.warmstart_checkpoint, args.seed, args.force_scale)
    links = int(args.links or checkpoint["links"])
    hidden_dim = int(args.policy_hidden_dim or checkpoint["hiddenDim"])
    if links != int(checkpoint["links"]):
        raise ValueError(f"Requested links {links} do not match checkpoint links {checkpoint['links']}")
    if hidden_dim != int(checkpoint["hiddenDim"]):
        raise ValueError(f"Requested hidden dim {hidden_dim} does not match checkpoint hidden dim {checkpoint['hiddenDim']}")

    deterministic_probe = collect_recurrent_rollout(
        mjcf_xml,
        policy,
        links,
        args.probe_nworld,
        min(args.eval_steps, 256),
        args.pose,
        args.force_scale,
        args.seed + 17,
        hidden_dim,
        stochastic=False,
        random_horizon=False,
        terminal_boundary=args.terminal_boundary,
        reward_mode=args.reward_mode,
        record_hidden_states=False,
    )

    selected_sequences = []
    pass_summaries = []
    selected_rows = []
    best_held = 0.0
    best_strict = 0.0
    for pass_index in range(int(args.passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.eval_steps,
            args.pose,
            args.force_scale,
            args.seed + 1000 + pass_index,
            hidden_dim,
            stochastic=True,
            random_horizon=bool(args.random_horizon),
            min_horizon=args.min_horizon,
            max_horizon=args.max_horizon,
            terminal_boundary=args.terminal_boundary,
            reward_mode=args.reward_mode,
            record_hidden_states=True,
        )
        buffers = rollout["buffers"]
        summary = dict(rollout["summary"])
        held = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32).reshape(-1)
        strict = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32).reshape(-1)
        if held.size:
            best_held = max(best_held, float(np.max(held)))
        if strict.size:
            best_strict = max(best_strict, float(np.max(strict)))
        worlds = select_worlds(buffers, args.min_held_seconds, args.top_k_per_pass)
        summary["selectedWorlds"] = int(worlds.size)
        summary["selectedWorldIds"] = worlds.astype(int).tolist()
        pass_summaries.append(summary)
        print(
            json.dumps(
                {
                    "phase": "success-buffer-pass",
                    "pass": int(pass_index + 1),
                    "passes": int(args.passes),
                    "maxHeldSeconds": float(summary.get("maxHeldSeconds", 0.0)),
                    "maxStrictScore": float(summary.get("maxStrictScore", 0.0)),
                    "selectedWorlds": int(worlds.size),
                },
                sort_keys=True,
            ),
            flush=True,
        )
        if worlds.size == 0:
            continue
        selected = {}
        for key, value in buffers.items():
            array = np.asarray(value)
            if array.ndim >= 2 and array.shape[1] == int(args.nworld):
                selected[key] = array[:, worlds, ...].astype(np.float32, copy=False)
            elif key in {"maxHeldSecondsByWorld", "maxStrictScoreByWorld"}:
                selected[key] = array[worlds].astype(np.float32, copy=False)
        selected_sequences.append(selected)
        for rank, world in enumerate(worlds.tolist()):
            selected_rows.append(
                {
                    "pass": int(pass_index + 1),
                    "world": int(world),
                    "rank": int(rank + 1),
                    "heldSeconds": float(held[world]) if held.size > int(world) else 0.0,
                    "strictScore": float(strict[world]) if strict.size > int(world) else 0.0,
                }
            )

    replay_written = False
    replay_path = None
    selected_world_count = int(sum(item["actions"].shape[1] for item in selected_sequences if "actions" in item))
    if selected_world_count > 0:
        replay = concat_selected(selected_sequences)
        selected_held = np.concatenate(
            [item["maxHeldSecondsByWorld"] for item in selected_sequences if "maxHeldSecondsByWorld" in item],
            axis=0,
        ).astype(np.float32, copy=False)
        selected_strict = np.concatenate(
            [item["maxStrictScoreByWorld"] for item in selected_sequences if "maxStrictScoreByWorld" in item],
            axis=0,
        ).astype(np.float32, copy=False)
        args.write_replay.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            args.write_replay,
            **replay,
            selectedHeldSeconds=selected_held,
            selectedStrictScore=selected_strict,
            selectedRows=json.dumps(selected_rows),
            sourceCheckpoint=str(args.warmstart_checkpoint),
            pose=str(args.pose),
            links=np.asarray([links], dtype=np.int32),
            forceScale=np.asarray([float(args.force_scale)], dtype=np.float32),
            minHeldSeconds=np.asarray([float(args.min_held_seconds)], dtype=np.float32),
            randomHorizon=np.asarray([int(bool(args.random_horizon))], dtype=np.int32),
        )
        replay_written = True
        replay_path = str(args.write_replay)

    before_eval = None
    if bool(args.include_eval):
        before_eval = evaluate_policy(
            mjcf_xml,
            policy,
            links,
            args.probe_nworld,
            args.eval_steps,
            args.force_scale,
            args.seed + 50_000,
            hidden_dim,
            args.eval_stochastic_passes,
            args.pose,
        )

    return {
        "schema": "six-pendulum-mjwarp-success-buffer-collector-v1",
        "status": "success-buffer-written" if replay_written else "no-success-buffer-worlds",
        "links": links,
        "policyKind": str(checkpoint["policyKind"]),
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "pose": str(args.pose),
        "forceScale": float(args.force_scale),
        "passes": int(args.passes),
        "nworld": int(args.nworld),
        "evalSteps": int(args.eval_steps),
        "minHeldSeconds": float(args.min_held_seconds),
        "selectedWorlds": selected_world_count,
        "bestHeldSeconds": float(best_held),
        "bestStrictScore": float(best_strict),
        "selectedRows": selected_rows,
        "passSummaries": pass_summaries,
        "deterministicProbe": {
            "summary": deterministic_probe["summary"],
            "firstAction": first_action_diagnostic(deterministic_probe["buffers"]["actions"]),
        },
        "evaluation": before_eval,
        "replay": {"written": replay_written, "path": replay_path},
        "elapsedSeconds": time.time() - started,
        "gates": {
            "learnedPolicyOnly": True,
            "exactDownOnly": str(args.pose) == "exact-down",
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "collectorOnly": True,
            "safeForDistill": bool(selected_world_count > 0 and best_held >= float(args.min_held_seconds)),
        },
        "notes": [
            "This script collects learned-policy stochastic exact-down source sequences only; it does not train.",
            "Use minHeldSeconds=1.0 for counted success-buffer data. Lower thresholds are diagnostics only.",
            "Mirroring is intentionally not applied here because exact-down first-kick symmetry can average the deterministic mean toward zero.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Collect strong exact-down stochastic success sequences for later AWR/SIL distillation.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=64)
    parser.add_argument("--probe-nworld", type=int, default=8)
    parser.add_argument("--passes", type=int, default=8)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426900)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--pose", choices=["exact-down"], default="exact-down")
    parser.add_argument("--min-held-seconds", type=float, default=1.0)
    parser.add_argument("--top-k-per-pass", type=int, default=4)
    parser.add_argument("--random-horizon", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--min-horizon", type=int, default=160)
    parser.add_argument("--max-horizon", type=int, default=768)
    parser.add_argument("--terminal-boundary", type=float, default=3.0)
    parser.add_argument("--reward-mode", type=str, default="default")
    parser.add_argument("--include-eval", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-replay", type=Path, default=DEFAULT_REPLAY)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_success_buffer_collect(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
