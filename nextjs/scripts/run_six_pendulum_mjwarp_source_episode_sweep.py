#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from train_six_pendulum_mjwarp_device_ppo import OBS_DIM, build_torch_policy, collect_recurrent_rollout


OUTPUT_DIR = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints"
)
SWEEP_DIR = Path("/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps")
DEFAULT_CHECKPOINT = OUTPUT_DIR / "puffer-mjwarp-modal-link1-neartop-window-burst-20260612.pt"


def load_policy(checkpoint_path: Path, links: int, hidden_dim: int | None, policy_kind: str | None, seed: int):
    import torch

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    checkpoint_links = int(checkpoint.get("links", links))
    checkpoint_hidden = int(checkpoint.get("hiddenDim", hidden_dim or 128))
    checkpoint_policy_kind = str(checkpoint.get("policyKind", policy_kind or "tiny-gru"))
    checkpoint_obs_dim = int(checkpoint.get("obsDim", OBS_DIM))
    if checkpoint_links != int(links):
        raise ValueError(f"Checkpoint links {checkpoint_links} does not match requested links {links}")
    if checkpoint_obs_dim != int(OBS_DIM):
        raise ValueError(f"Checkpoint obsDim {checkpoint_obs_dim} does not match trainer obsDim {OBS_DIM}")
    policy = build_torch_policy(OBS_DIM, checkpoint_hidden, seed, recurrent=True, policy_kind=checkpoint_policy_kind)
    policy.load_state_dict(checkpoint["policyStateDict"])
    return policy, {
        "path": str(checkpoint_path),
        "links": checkpoint_links,
        "hiddenDim": checkpoint_hidden,
        "policyKind": checkpoint_policy_kind,
        "forceScale": float(checkpoint.get("forceScale", 0.0)),
        "bestDownEvaluation": checkpoint.get("bestDownEvaluation"),
        "bestStochasticDownEvaluation": checkpoint.get("bestStochasticDownEvaluation"),
    }


def summarize_row(index: int, seed: int, rollout: dict) -> dict:
    summary = rollout["summary"]
    phase = summary.get("phaseDiagnostics") or {}
    first_catch = phase.get("firstCatch") or {}
    return {
        "index": int(index),
        "seed": int(seed),
        "maxHeldSeconds": float(summary.get("maxHeldSeconds", 0.0)),
        "maxStrictScore": float(summary.get("maxStrictScore", 0.0)),
        "catchBasinWorldRate": float(summary.get("catchBasinWorldRate", 0.0)),
        "nearTopWorldRate": float(summary.get("nearTopWorldRate", 0.0)),
        "firstCatchSeconds": summary.get("firstCatchSeconds"),
        "firstNearTopSeconds": summary.get("firstNearTopSeconds"),
        "terminalCount": int(summary.get("terminalCount", 0)),
        "railFraction": float(phase.get("railFraction", 0.0)),
        "saturatedActionFraction": float(phase.get("saturatedActionFraction", 0.0)),
        "firstCatchCartAbs": first_catch.get("cartAbs"),
        "firstCatchThetaAbs": first_catch.get("thetaAbs"),
        "firstCatchOmegaAbs": first_catch.get("omegaAbs"),
        "elapsedSeconds": float(summary.get("elapsedSeconds", 0.0)),
        "sps": float(summary.get("sps", 0.0)),
    }


def row_sort_key(row: dict) -> tuple[float, float, float, float, float]:
    return (
        float(row["maxHeldSeconds"]),
        float(row["maxStrictScore"]),
        float(row["catchBasinWorldRate"]),
        float(row["nearTopWorldRate"]),
        -float(row["railFraction"]),
    )


def choose_worlds(buffers: dict, top_k: int, min_held_seconds: float) -> np.ndarray:
    held = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32)
    strict = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32)
    if held.size == 0:
        return np.asarray([], dtype=np.int64)
    candidates = np.where(held >= float(min_held_seconds))[0]
    if candidates.size == 0:
        candidates = np.arange(held.size)
    ordered = sorted(
        candidates.tolist(),
        key=lambda world: (
            float(held[world]),
            float(strict[world]) if strict.size else 0.0,
        ),
        reverse=True,
    )
    return np.asarray(ordered[: max(1, min(int(top_k), len(ordered)))], dtype=np.int64)


def write_replay_npz(path: Path, rollout: dict, worlds: np.ndarray, metadata: dict) -> dict:
    buffers = rollout["buffers"]
    path.parent.mkdir(parents=True, exist_ok=True)
    held = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32)
    strict = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32)
    np.savez_compressed(
        path,
        obs=buffers["obs"][:, worlds, :].astype(np.float32, copy=False),
        actions=buffers["actions"][:, worlds].astype(np.float32, copy=False),
        rewards=buffers["rewards"][:, worlds].astype(np.float32, copy=False),
        values=buffers["values"][:, worlds].astype(np.float32, copy=False),
        terminals=buffers["terminals"][:, worlds].astype(np.float32, copy=False),
        truncations=buffers["truncations"][:, worlds].astype(np.float32, copy=False),
        qpos=buffers["qpos"][:, worlds, :].astype(np.float32, copy=False),
        qvel=buffers["qvel"][:, worlds, :].astype(np.float32, copy=False),
        stateLastActions=buffers["stateLastActions"][:, worlds].astype(np.float32, copy=False),
        selectedWorlds=worlds.astype(np.int64, copy=False),
        selectedHeldSeconds=held[worlds].astype(np.float32, copy=False),
        selectedStrictScore=strict[worlds].astype(np.float32, copy=False) if strict.size else np.zeros(worlds.shape, dtype=np.float32),
        metadata=np.asarray([json.dumps(metadata, sort_keys=True)]),
    )
    return {
        "path": str(path),
        "selectedWorlds": [int(world) for world in worlds.tolist()],
        "selectedBestHeldSeconds": float(np.max(held[worlds])) if worlds.size else 0.0,
        "selectedBestStrictScore": float(np.max(strict[worlds])) if worlds.size and strict.size else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and rank exact-down stochastic source episodes for replay.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--mjcf", type=Path, default=None)
    parser.add_argument("--nworld", type=int, default=32)
    parser.add_argument("--steps", type=int, default=640)
    parser.add_argument("--passes", type=int, default=4)
    parser.add_argument("--seed", type=int, default=621900)
    parser.add_argument("--seed-stride", type=int, default=97)
    parser.add_argument("--force-scale", type=float, default=None)
    parser.add_argument("--terminal-boundary", type=float, default=2.35)
    parser.add_argument("--top-k-worlds", type=int, default=4)
    parser.add_argument("--min-held-seconds", type=float, default=0.08)
    parser.add_argument("--tag", default=time.strftime("%Y%m%d-%H%M%S"))
    parser.add_argument("--write-summary", type=Path, default=None)
    parser.add_argument("--write-replay", type=Path, default=None)
    args = parser.parse_args()

    mjcf_path = args.mjcf or Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{int(args.links)}_link.xml")
    mjcf_xml = mjcf_path.read_text()
    policy, checkpoint_meta = load_policy(args.checkpoint, args.links, None, None, args.seed)
    force_scale = float(args.force_scale if args.force_scale is not None else checkpoint_meta.get("forceScale") or 160.0)

    rows = []
    rollouts = []
    started = time.time()
    for index in range(int(args.passes)):
        seed = int(args.seed) + index * int(args.seed_stride)
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            int(args.links),
            int(args.nworld),
            int(args.steps),
            "exact-down",
            force_scale,
            seed,
            int(checkpoint_meta["hiddenDim"]),
            stochastic=True,
            terminal_boundary=float(args.terminal_boundary),
            record_hidden_states=False,
        )
        row = summarize_row(index + 1, seed, rollout)
        rows.append(row)
        rollouts.append(rollout)
        print(json.dumps({"event": "source-pass", **row}, sort_keys=True), flush=True)

    ranked_indices = sorted(range(len(rows)), key=lambda idx: row_sort_key(rows[idx]), reverse=True)
    best_index = ranked_indices[0] if ranked_indices else -1
    best_rollout = rollouts[best_index] if best_index >= 0 else None
    replay = None
    if best_rollout is not None:
        worlds = choose_worlds(best_rollout["buffers"], args.top_k_worlds, args.min_held_seconds)
        if worlds.size:
            replay_path = args.write_replay or (OUTPUT_DIR / f"puffer-mjwarp-source-episode-sweep-{args.tag}.npz")
            replay = write_replay_npz(
                replay_path,
                best_rollout,
                worlds,
                {
                    "tag": args.tag,
                    "bestPassIndex": int(best_index),
                    "checkpoint": str(args.checkpoint),
                    "seed": int(rows[best_index]["seed"]),
                    "steps": int(args.steps),
                    "nworld": int(args.nworld),
                    "forceScale": force_scale,
                },
            )

    ranked = [rows[index] for index in ranked_indices]
    summary = {
        "schema": "six-pendulum-mjwarp-source-episode-sweep-v1",
        "status": "finished",
        "tag": args.tag,
        "elapsedSeconds": time.time() - started,
        "checkpoint": checkpoint_meta,
        "links": int(args.links),
        "nworld": int(args.nworld),
        "steps": int(args.steps),
        "passes": int(args.passes),
        "pose": "exact-down",
        "forceScale": force_scale,
        "best": ranked[0] if ranked else None,
        "ranked": ranked,
        "replay": replay or {"written": False},
        "gates": {
            "learnedPolicyOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "sourceHasOneSecondCandidate": bool(ranked and ranked[0]["maxHeldSeconds"] >= 1.0),
        },
    }
    summary_path = args.write_summary or (SWEEP_DIR / f"puffer-mjwarp-source-episode-sweep-{args.tag}.json")
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"event": "summary", "summary": str(summary_path), "best": summary["best"], "replay": summary["replay"]}, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
