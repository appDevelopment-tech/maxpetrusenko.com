#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_device_rollout import build_torch_policy
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_recurrent_rollout,
    summarize_eval_passes,
    train_energy_teacher_bc_sequences,
)


DEFAULT_CHECKPOINT_DIR = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints"
)
DEFAULT_WARMSTART = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt"
DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-replay-ver-bc-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-replay-ver-bc-f160-20260611.pt"


def load_policy_from_checkpoint(checkpoint_path: Path, seed: int, requested_force_scale: float):
    import torch

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    links = int(checkpoint.get("links", 1))
    hidden_dim = int(checkpoint.get("hiddenDim", 128))
    obs_dim = int(checkpoint.get("obsDim", OBS_DIM))
    force_scale = float(checkpoint.get("forceScale", requested_force_scale))
    policy_kind = str(checkpoint.get("policyKind", "tiny-gru"))
    if obs_dim != int(OBS_DIM):
        raise ValueError(f"Checkpoint obsDim {obs_dim} does not match OBS_DIM {OBS_DIM}")
    policy = build_torch_policy(OBS_DIM, hidden_dim, seed, recurrent=True, policy_kind=policy_kind)
    policy.load_state_dict(checkpoint["policyStateDict"])
    return policy, {
        "path": str(checkpoint_path),
        "links": links,
        "hiddenDim": hidden_dim,
        "obsDim": obs_dim,
        "forceScale": force_scale,
        "requestedForceScale": float(requested_force_scale),
        "policyKind": policy_kind,
        "bestDownEvaluation": checkpoint.get("bestDownEvaluation"),
        "bestStochasticDownEvaluation": checkpoint.get("bestStochasticDownEvaluation"),
    }


def mirror_observations(observations: np.ndarray) -> np.ndarray:
    mirrored = np.array(observations, copy=True)
    mirrored[..., 0] *= -1.0
    mirrored[..., 1] *= -1.0
    mirrored[..., 2] *= -1.0
    link_count = (OBS_DIM - 3) // 5
    for link_index in range(link_count):
        cursor = 3 + link_index * 5
        mirrored[..., cursor] *= -1.0
        mirrored[..., cursor + 2] *= -1.0
        mirrored[..., cursor + 4] *= -1.0
    return mirrored.astype(np.float32, copy=False)


def one_link_metrics(observations: np.ndarray) -> dict:
    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    near_top = np.abs(theta) < 0.5
    catch_basin = (np.abs(theta) < 0.36) & (np.abs(omega) < 3.0) & (cart_abs < 2.2)
    recentered = cart_abs < 1.4
    return {
        "nearTopStepCount": int(np.sum(near_top)),
        "nearTopWorldRate": float(np.mean(np.any(near_top, axis=0))) if near_top.size else 0.0,
        "catchBasinStepCount": int(np.sum(catch_basin)),
        "catchBasinWorldRate": float(np.mean(np.any(catch_basin, axis=0))) if catch_basin.size else 0.0,
        "recenteredWorldRate": float(np.mean(np.any(recentered & near_top, axis=0))) if near_top.size else 0.0,
        "bestThetaAbs": float(np.min(np.abs(theta))) if theta.size else 0.0,
        "bestCartAbsNearTop": float(np.min(np.where(near_top, cart_abs, np.inf))) if np.any(near_top) else None,
    }


def select_replay_worlds(
    buffers: dict,
    min_held_seconds: float,
    fallback_min_held_seconds: float,
    top_k: int,
    require_near_top: bool,
    allow_plain_top_k: bool,
) -> tuple[np.ndarray, dict]:
    observations = buffers["obs"]
    held_seconds = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32)
    strict_scores = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32)
    metrics = one_link_metrics(observations)

    if held_seconds.size == 0:
        return np.asarray([], dtype=np.int64), {**metrics, "selector": "none", "reason": "no per-world hold metrics"}

    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    near_top_by_world = np.any(np.abs(theta) < 0.5, axis=0)
    catch_by_world = np.any((np.abs(theta) < 0.36) & (np.abs(omega) < 3.0) & (cart_abs < 2.2), axis=0)

    selected = np.where(held_seconds >= float(min_held_seconds))[0]
    selector = "min-held"
    if require_near_top:
        selected = selected[near_top_by_world[selected]] if selected.size else selected
        selector = "min-held-near-top"

    if selected.size == 0:
        candidate = np.where((held_seconds >= float(fallback_min_held_seconds)) | near_top_by_world | catch_by_world)[0]
        selector = "fallback-held-or-catch"
        if candidate.size == 0:
            if not allow_plain_top_k:
                return np.asarray([], dtype=np.int64), {
                    **metrics,
                    "selector": "none",
                    "selectedWorlds": 0,
                    "selectedWorldIndices": [],
                    "bestHeldSeconds": float(np.max(held_seconds)) if held_seconds.size else 0.0,
                    "bestStrictScore": float(np.max(strict_scores)) if strict_scores.size else 0.0,
                    "reason": "no held-threshold, near-top, or catch-basin worlds",
                }
            candidate = np.arange(held_seconds.size)
            selector = "plain-top-k-held"
        order = sorted(
            candidate.tolist(),
            key=lambda index: (
                float(held_seconds[index]),
                bool(catch_by_world[index]),
                bool(near_top_by_world[index]),
                float(strict_scores[index]) if strict_scores.size else 0.0,
            ),
            reverse=True,
        )
        selected = np.asarray(order[: max(1, min(int(top_k), len(order)))], dtype=np.int64)

    selected_held = held_seconds[selected] if selected.size else np.asarray([], dtype=np.float32)
    selected_score = strict_scores[selected] if strict_scores.size and selected.size else np.asarray([], dtype=np.float32)
    return selected.astype(np.int64), {
        **metrics,
        "selector": selector,
        "selectedWorlds": int(selected.size),
        "selectedWorldIndices": [int(index) for index in selected.tolist()],
        "bestHeldSeconds": float(np.max(held_seconds)) if held_seconds.size else 0.0,
        "bestStrictScore": float(np.max(strict_scores)) if strict_scores.size else 0.0,
        "selectedBestHeldSeconds": float(np.max(selected_held)) if selected_held.size else 0.0,
        "selectedBestStrictScore": float(np.max(selected_score)) if selected_score.size else 0.0,
        "selectedNearTopWorlds": int(np.sum(near_top_by_world[selected])) if selected.size else 0,
        "selectedCatchWorlds": int(np.sum(catch_by_world[selected])) if selected.size else 0,
    }


def extract_contiguous_segments(
    buffers: dict,
    selected: np.ndarray,
    min_segment_steps: int,
) -> list[tuple[np.ndarray, np.ndarray]]:
    observations = buffers["obs"]
    actions = buffers["actions"]
    done = (buffers["terminals"] > 0.5) | (buffers["truncations"] > 0.5)
    segments: list[tuple[np.ndarray, np.ndarray]] = []
    for world in selected.tolist():
        start = 0
        done_steps = np.where(done[:, world])[0].tolist()
        for stop in done_steps + [observations.shape[0]]:
            if stop - start >= int(min_segment_steps):
                segment_obs = observations[start:stop, world : world + 1, :].astype(np.float32, copy=False)
                segment_actions = actions[start:stop, world : world + 1].astype(np.float32, copy=False)
                segments.append((segment_obs, segment_actions))
            start = stop + 1
    return segments


def collect_replay(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    rollout_steps: int,
    replay_passes: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    min_held_seconds: float,
    fallback_min_held_seconds: float,
    top_k: int,
    mirror: bool,
    random_horizon: bool,
    min_horizon: int,
    max_horizon: int,
    require_near_top: bool,
    min_segment_steps: int,
    allow_plain_top_k: bool,
    replay_pose: str,
) -> tuple[list[tuple[np.ndarray, np.ndarray]], list[dict]]:
    trajectories: list[tuple[np.ndarray, np.ndarray]] = []
    pass_summaries: list[dict] = []
    for pass_index in range(int(replay_passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            rollout_steps,
            replay_pose,
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=True,
            random_horizon=random_horizon,
            min_horizon=min_horizon,
            max_horizon=max_horizon,
        )
        selected, selection = select_replay_worlds(
            rollout["buffers"],
            min_held_seconds,
            fallback_min_held_seconds,
            top_k,
            require_near_top,
            allow_plain_top_k,
        )
        if selected.size:
            segments = extract_contiguous_segments(rollout["buffers"], selected, min_segment_steps)
            for observations, actions in segments:
                trajectories.append((observations, actions))
                if mirror:
                    trajectories.append((mirror_observations(observations), (-actions).astype(np.float32, copy=False)))
        else:
            segments = []
        pass_summaries.append(
            {
                "pass": pass_index + 1,
                "rollout": rollout["summary"],
                "selection": selection,
                "addedSegments": int(len(segments)),
                "addedTrajectories": int(len(segments) * (2 if mirror else 1)),
                "addedSamples": int(
                    sum(int(obs.shape[0]) * int(obs.shape[1]) for obs, _actions in segments) * (2 if mirror else 1)
                ),
            }
        )
        print(json.dumps(pass_summaries[-1], sort_keys=True), flush=True)
    return trajectories, pass_summaries


def evaluate_policy(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    stochastic_passes: int,
    eval_pose: str = "exact-down",
) -> dict:
    down = collect_recurrent_rollout(
        mjcf_xml,
        policy,
        links,
        nworld,
        eval_steps,
        eval_pose,
        force_scale,
        seed,
        hidden_dim,
        stochastic=False,
    )["summary"]
    hold = collect_recurrent_rollout(
        mjcf_xml,
        policy,
        links,
        nworld,
        eval_steps,
        "hold",
        force_scale,
        seed + 10_000,
        hidden_dim,
        stochastic=False,
    )["summary"]
    stochastic_down = summarize_eval_passes(
        [
            collect_recurrent_rollout(
                mjcf_xml,
                policy,
                links,
                nworld,
                eval_steps,
                eval_pose,
                force_scale,
                seed + 20_000 + pass_index,
                hidden_dim,
                stochastic=True,
            )["summary"]
            for pass_index in range(int(stochastic_passes))
        ]
    )
    return {
        "down": down,
        "hold": hold,
        "stochasticDown": stochastic_down,
    }


def run_replay_ver_bc(
    mjcf_xml: str,
    args: argparse.Namespace,
) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(args.seed))
    np.random.seed(int(args.seed))
    policy, checkpoint = load_policy_from_checkpoint(args.warmstart_checkpoint, args.seed, args.force_scale)
    links = int(args.links or checkpoint["links"])
    hidden_dim = int(args.policy_hidden_dim or checkpoint["hiddenDim"])
    policy_kind = str(checkpoint["policyKind"])
    if links != int(checkpoint["links"]):
        raise ValueError(f"Requested links {links} do not match warmstart links {checkpoint['links']}")
    if hidden_dim != int(checkpoint["hiddenDim"]):
        raise ValueError(f"Requested hidden dim {hidden_dim} does not match warmstart hidden dim {checkpoint['hiddenDim']}")

    before_eval = evaluate_policy(
        mjcf_xml,
        policy,
        links,
        args.nworld,
        args.eval_steps,
        args.force_scale,
        args.seed + 100_000,
        hidden_dim,
        args.eval_stochastic_passes,
        args.eval_pose,
    )
    trajectories, replay_summaries = collect_replay(
        mjcf_xml,
        policy,
        links,
        args.nworld,
        args.rollout_steps,
        args.replay_passes,
        args.force_scale,
        args.seed + 200_000,
        hidden_dim,
        args.min_replay_held_seconds,
        args.fallback_min_replay_held_seconds,
        args.top_k,
        args.mirror,
        args.random_horizon,
        args.min_horizon,
        args.max_horizon,
        args.require_near_top,
        args.min_segment_steps,
        args.allow_plain_top_k,
        args.replay_pose,
    )
    if not trajectories:
        bc_losses = []
        after_eval = before_eval
        status = "no-replay-trajectories"
    else:
        bc_losses = train_energy_teacher_bc_sequences(
            policy,
            trajectories,
            args.bc_epochs,
            hidden_dim,
            args.sequence_length,
            "replay-ver-bc",
            args.learning_rate,
        )
        after_eval = evaluate_policy(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.eval_steps,
            args.force_scale,
            args.seed + 300_000,
            hidden_dim,
            args.eval_stochastic_passes,
            args.eval_pose,
        )
        status = "replay-ver-bc-finished"

    if args.write_checkpoint and trajectories:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-replay-ver-bc-policy-checkpoint-v1",
                "policyStateDict": policy.state_dict(),
                "links": links,
                "hiddenDim": hidden_dim,
                "obsDim": int(OBS_DIM),
                "forceScale": float(args.force_scale),
                "policyKind": policy_kind,
                "seed": int(args.seed),
                "sourceCheckpoint": str(args.warmstart_checkpoint),
                "bestDownEvaluation": after_eval["down"],
                "bestStochasticDownEvaluation": after_eval["stochasticDown"],
            },
            args.write_checkpoint,
        )

    sample_count = int(
        sum(int(obs.shape[0]) * int(obs.shape[1]) for obs, _actions in trajectories)
    )
    return {
        "schema": "six-pendulum-mjwarp-replay-ver-bc-v1",
        "status": status,
        "algorithm": "learned-policy-replay-virtual-experience-bc",
        "links": links,
        "nworld": int(args.nworld),
        "rolloutSteps": int(args.rollout_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "replay": {
            "passes": int(args.replay_passes),
            "trajectoryCount": int(len(trajectories)),
            "sampleCount": sample_count,
            "mirrorEnabled": bool(args.mirror),
            "randomHorizon": {
                "enabled": bool(args.random_horizon),
                "minSteps": int(args.min_horizon) if args.random_horizon else 0,
                "maxSteps": int(args.max_horizon) if args.random_horizon else 0,
            },
            "minHeldSeconds": float(args.min_replay_held_seconds),
            "fallbackMinHeldSeconds": float(args.fallback_min_replay_held_seconds),
            "topK": int(args.top_k),
            "requireNearTop": bool(args.require_near_top),
            "minSegmentSteps": int(args.min_segment_steps),
            "allowPlainTopK": bool(args.allow_plain_top_k),
            "replayPose": str(args.replay_pose),
            "passSummaries": replay_summaries,
        },
        "bc": {
            "epochs": int(args.bc_epochs),
            "learningRate": float(args.learning_rate),
            "sequenceLength": int(args.sequence_length),
            "losses": bc_losses,
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "evalPose": str(args.eval_pose),
        "checkpoint": {
            "written": bool(args.write_checkpoint and trajectories),
            "path": str(args.write_checkpoint) if args.write_checkpoint and trajectories else None,
        },
        "elapsedSeconds": time.time() - started,
        "gates": {
            "learnedPolicyOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "deterministicDownSolvedOneSecond": bool(after_eval["down"].get("solvedOneSecond", False)),
            "stochasticDownSolvedOneSecond": bool(after_eval["stochasticDown"].get("solvedOneSecond", False)),
            "promoteToNextLink": bool(after_eval["down"].get("solvedOneSecond", False)),
        },
        "notes": [
            "Replay data comes only from stochastic learned-policy exact-down rollouts, then mirrored as virtual experience replay.",
            "BC loss is not a solve. Only held-out exact-down evaluation after distillation can count.",
            "Teacher/classical controllers are not used in this script; the warmstart remains a learned policy checkpoint.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Distill rare learned-policy MJWarp down-start catches with replay/VER BC.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=1024)
    parser.add_argument("--replay-passes", type=int, default=8)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--min-replay-held-seconds", type=float, default=0.75)
    parser.add_argument("--fallback-min-replay-held-seconds", type=float, default=0.25)
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--require-near-top", action="store_true")
    parser.add_argument("--min-segment-steps", type=int, default=64)
    parser.add_argument("--allow-plain-top-k", action="store_true")
    parser.add_argument("--replay-pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--eval-pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--mirror", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--bc-epochs", type=int, default=120)
    parser.add_argument("--sequence-length", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=3e-5)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--random-horizon", action="store_true")
    parser.add_argument("--min-horizon", type=int, default=128)
    parser.add_argument("--max-horizon", type=int, default=768)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_replay_ver_bc(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
