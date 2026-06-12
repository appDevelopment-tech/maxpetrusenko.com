#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor, hold_quality
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    DEFAULT_WARMSTART,
    evaluate_policy,
    load_policy_from_checkpoint,
    mirror_observations,
    select_replay_worlds,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import collect_recurrent_rollout


DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-elite-sequence-replay-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-elite-sequence-replay-f160-20260611.pt"


def selected_event_segment(
    buffers: dict,
    world: int,
    min_steps: int,
    min_event_steps: int,
) -> tuple[np.ndarray, np.ndarray, dict] | None:
    observations = buffers["obs"]
    actions = buffers["actions"]
    done = (buffers["terminals"] > 0.5) | (buffers["truncations"] > 0.5)
    world_obs = observations[:, world, :]
    theta = np.arctan2(world_obs[:, 3], world_obs[:, 4])
    omega = world_obs[:, 7] * 8.0
    cart_abs = np.abs(world_obs[:, 0])
    catch_basin = (np.abs(theta) < 0.36) & (np.abs(omega) < 3.0) & (cart_abs < 2.2)
    near_top = np.abs(theta) < 0.5
    if np.any(catch_basin):
        candidates = np.where(catch_basin)[0]
        costs = np.abs(theta[candidates]) + 0.05 * cart_abs[candidates] + 0.01 * np.abs(omega[candidates])
        event_step = int(candidates[int(np.argmin(costs))])
        event_kind = "catch"
    elif np.any(near_top):
        candidates = np.where(near_top)[0]
        costs = np.abs(theta[candidates]) + 0.05 * cart_abs[candidates]
        event_step = int(candidates[int(np.argmin(costs))])
        event_kind = "near-top"
    else:
        event_step = int(np.argmin(np.abs(theta)))
        event_kind = "best-theta"

    done_steps = np.where(done[:, world])[0]
    prior_done = done_steps[done_steps < event_step]
    next_done = done_steps[done_steps >= event_step]
    start = int(prior_done[-1] + 1) if prior_done.size else 0
    stop = int(next_done[0]) if next_done.size else int(observations.shape[0])
    steps = stop - start
    required_steps = int(min_event_steps) if event_kind in {"catch", "near-top"} else int(min_steps)
    if steps < required_steps:
        return None
    metadata = {
        "eventKind": event_kind,
        "eventStep": int(event_step),
        "episodeStart": int(start),
        "episodeStop": int(stop),
        "steps": int(steps),
        "thetaAbs": float(abs(theta[event_step])),
        "omegaAbs": float(abs(omega[event_step])),
        "cartAbs": float(cart_abs[event_step]),
    }
    return (
        observations[start:stop, world : world + 1, :].astype(np.float32, copy=False),
        actions[start:stop, world : world + 1].astype(np.float32, copy=False),
        metadata,
    )


def collect_elite_sequences(mjcf_xml: str, policy, args: argparse.Namespace, links: int, hidden_dim: int):
    trajectories: list[tuple[np.ndarray, np.ndarray]] = []
    summaries: list[dict] = []
    for pass_index in range(int(args.replay_passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.rollout_steps,
            "down",
            args.force_scale,
            args.seed + 200_000 + pass_index,
            hidden_dim,
            stochastic=True,
            random_horizon=bool(args.random_horizon),
            min_horizon=int(args.min_horizon),
            max_horizon=int(args.max_horizon),
        )
        selected, selection = select_replay_worlds(
            rollout["buffers"],
            args.min_replay_held_seconds,
            args.fallback_min_replay_held_seconds,
            args.top_k,
            True,
            False,
        )
        selected_best_held = float(selection.get("selectedBestHeldSeconds", 0.0))
        selection["trainingAccepted"] = bool(selected_best_held >= float(args.min_selected_held_seconds))
        selection["minSelectedHeldSeconds"] = float(args.min_selected_held_seconds)
        if not selection["trainingAccepted"]:
            selection["trainingRejectReason"] = "selected held time below training floor"
            selected = np.asarray([], dtype=np.int64)
        added = []
        for world in selected.tolist():
            segment = selected_event_segment(
                rollout["buffers"],
                int(world),
                args.min_segment_steps,
                args.min_event_segment_steps,
            )
            if segment is None:
                continue
            observations, actions, metadata = segment
            trajectories.append((observations, actions))
            added.append({"world": int(world), "mirrored": False, **metadata})
            if args.mirror:
                trajectories.append((mirror_observations(observations), (-actions).astype(np.float32, copy=False)))
                added.append({"world": int(world), "mirrored": True, **metadata})
        summary = {
            "pass": pass_index + 1,
            "rollout": rollout["summary"],
            "selection": selection,
            "addedTrajectories": int(len(added)),
            "addedSamples": int(sum(item["steps"] for item in added)),
            "added": added,
        }
        summaries.append(summary)
        print(json.dumps(summary, sort_keys=True), flush=True)
    return trajectories, summaries


def discounted_future_sum(values: np.ndarray, gamma: float) -> np.ndarray:
    returns = np.zeros(values.shape, dtype=np.float32)
    running = 0.0
    for index in range(values.shape[0] - 1, -1, -1):
        running = float(values[index]) + float(gamma) * running
        returns[index] = running
    return returns


def attach_sequence_returns(trajectories: list[tuple[np.ndarray, np.ndarray]], gamma: float) -> tuple[list[tuple[np.ndarray, np.ndarray, np.ndarray]], dict]:
    weighted = []
    all_returns = []
    for observations, actions in trajectories:
        quality = hold_quality(observations)
        returns = discounted_future_sum(quality.reshape(-1), gamma).reshape(quality.shape).astype(np.float32, copy=False)
        weighted.append((observations, actions, returns))
        all_returns.append(returns.reshape(-1))
    if not all_returns:
        return [], {
            "schema": "six-pendulum-elite-sequence-returns-v1",
            "sampleCount": 0,
            "returnMean": 0.0,
            "returnStd": 0.0,
            "returnMin": 0.0,
            "returnMax": 0.0,
        }
    flat = np.concatenate(all_returns).astype(np.float32, copy=False)
    return weighted, {
        "schema": "six-pendulum-elite-sequence-returns-v1",
        "sampleCount": int(flat.size),
        "discount": float(gamma),
        "returnMean": float(np.mean(flat)),
        "returnStd": float(np.std(flat) + 1e-6),
        "returnMin": float(np.min(flat)),
        "returnMax": float(np.max(flat)),
    }


def train_elite_sequences(policy, old_policy, trajectories, anchor_obs: np.ndarray, args: argparse.Namespace, hidden_dim: int):
    import torch
    import torch.nn.functional as F

    if not trajectories:
        return [], None
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    weighted_trajectories, returns_summary = attach_sequence_returns(trajectories, args.return_gamma)
    return_mean = float(returns_summary["returnMean"])
    return_std = max(float(returns_summary["returnStd"]), 1e-6)
    torch_trajectories = [
        (
            torch.as_tensor(obs, dtype=torch.float32),
            torch.as_tensor(actions, dtype=torch.float32),
            torch.as_tensor((returns - return_mean) / return_std, dtype=torch.float32),
        )
        for obs, actions, returns in weighted_trajectories
    ]
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    marker_epochs = {0, max(0, int(args.epochs) // 2), max(0, int(args.epochs) - 1)}
    losses = []
    for epoch in range(int(args.epochs)):
        index = int(torch.randint(0, len(torch_trajectories), (1,)).item())
        observations, actions, returns = torch_trajectories[index]
        train_steps, train_worlds, _obs_dim = observations.shape
        chunk = min(int(args.sequence_length), train_steps)
        if train_steps <= chunk or float(args.start_at_zero_prob) >= float(torch.rand(()).item()):
            start = 0
        else:
            start = int(torch.randint(0, train_steps - chunk + 1, (1,)).item())
        hidden = torch.zeros(train_worlds, int(hidden_dim), dtype=torch.float32)
        old_sequence_hidden = torch.zeros(train_worlds, int(hidden_dim), dtype=torch.float32)
        step_losses = []
        old_step_losses = []
        for offset in range(chunk):
            obs_step = observations[start + offset]
            target = actions[start + offset]
            predicted, _, _, hidden = policy(obs_step, hidden, deterministic=True)
            per_action_loss = F.smooth_l1_loss(predicted.reshape(-1), target.reshape(-1), reduction="none")
            if float(args.return_weight_beta) > 0.0:
                step_return = returns[start + offset].reshape(-1)
                step_weight = torch.exp(step_return / max(float(args.return_weight_beta), 1e-6))
                step_weight = torch.clamp(step_weight, min=float(args.min_return_weight), max=float(args.max_return_weight))
                step_losses.append((per_action_loss * step_weight).mean())
            else:
                step_losses.append(per_action_loss.mean())
            if float(args.sequence_anchor_weight) > 0.0:
                with torch.no_grad():
                    old_action, _, _, old_sequence_hidden = old_policy(
                        obs_step,
                        old_sequence_hidden,
                        deterministic=True,
                    )
                old_step_losses.append(F.mse_loss(predicted.reshape(-1), old_action.reshape(-1)))
        sequence_loss = torch.stack(step_losses).mean()
        sequence_anchor_loss = (
            torch.stack(old_step_losses).mean() if old_step_losses else torch.tensor(0.0, dtype=torch.float32)
        )
        hold_anchor_loss = torch.tensor(0.0, dtype=torch.float32)
        if anchor_t is not None and float(args.hold_anchor_weight) > 0.0:
            anchor_count = min(int(args.anchor_batch_size), anchor_t.shape[0])
            anchor_indices = torch.randint(0, anchor_t.shape[0], (anchor_count,))
            anchor_batch = anchor_t[anchor_indices]
            anchor_hidden = torch.zeros(anchor_count, int(hidden_dim), dtype=torch.float32)
            with torch.no_grad():
                old_action, _, _, _ = old_policy(anchor_batch, anchor_hidden, deterministic=True)
            new_action, _, _, _ = policy(anchor_batch, anchor_hidden, deterministic=True)
            hold_anchor_loss = F.mse_loss(new_action.reshape(-1), old_action.reshape(-1))
        loss = (
            sequence_loss
            + float(args.sequence_anchor_weight) * sequence_anchor_loss
            + float(args.hold_anchor_weight) * hold_anchor_loss
        )
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(args.grad_clip)).detach())
        optimizer.step()
        if epoch in marker_epochs:
            losses.append(
                {
                    "epoch": epoch + 1,
                    "loss": float(loss.detach()),
                    "sequenceLoss": float(sequence_loss.detach()),
                    "sequenceAnchorLoss": float(sequence_anchor_loss.detach()),
                    "holdAnchorLoss": float(hold_anchor_loss.detach()),
                    "gradNorm": grad_norm,
                    "trajectoryIndex": index,
                    "chunkStart": int(start),
                    "chunkSteps": int(chunk),
                }
            )
    return losses, returns_summary


def run_elite_sequence_replay(mjcf_xml: str, args: argparse.Namespace) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(args.seed))
    np.random.seed(int(args.seed))
    policy, checkpoint = load_policy_from_checkpoint(args.warmstart_checkpoint, args.seed, args.force_scale)
    old_policy = copy.deepcopy(policy)
    old_policy.eval()
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
    )
    trajectories, replay_summaries = collect_elite_sequences(mjcf_xml, policy, args, links, hidden_dim)
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if trajectories:
        losses, returns_summary = train_elite_sequences(policy, old_policy, trajectories, anchor_obs, args, hidden_dim)
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
        )
        status = "elite-sequence-replay-finished"
    else:
        losses = []
        returns_summary = None
        after_eval = before_eval
        status = "no-elite-sequences"

    if args.write_checkpoint and trajectories:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-elite-sequence-replay-policy-checkpoint-v1",
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

    sample_count = int(sum(int(obs.shape[0]) * int(obs.shape[1]) for obs, _actions in trajectories))
    replay_best = max((item["rollout"]["maxHeldSeconds"] for item in replay_summaries), default=0.0)
    return {
        "schema": "six-pendulum-mjwarp-elite-sequence-replay-v1",
        "status": status,
        "algorithm": "learned-policy-elite-whole-sequence-replay",
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
            "bestReplayHeldSeconds": float(replay_best),
            "minReplayHeldSeconds": float(args.min_replay_held_seconds),
            "fallbackMinReplayHeldSeconds": float(args.fallback_min_replay_held_seconds),
            "minSelectedHeldSeconds": float(args.min_selected_held_seconds),
            "topK": int(args.top_k),
            "passSummaries": replay_summaries,
        },
        "holdAnchor": hold_anchor,
        "training": {
            "epochs": int(args.epochs),
            "returns": returns_summary if trajectories else None,
            "learningRate": float(args.learning_rate),
            "sequenceLength": int(args.sequence_length),
            "startAtZeroProb": float(args.start_at_zero_prob),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "sequenceAnchorWeight": float(args.sequence_anchor_weight),
            "losses": losses,
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "checkpoint": {"written": bool(args.write_checkpoint and trajectories), "path": str(args.write_checkpoint) if args.write_checkpoint and trajectories else None},
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
            "Only stochastic learned-policy exact-down elite sequences are distilled.",
            "Replay passes below min-selected-held-seconds are rejected before training.",
            "Mirroring is virtual experience replay, not a scripted controller.",
            "Only held-out learned exact-down evaluation can promote link two.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Distill elite whole stochastic whip/catch sequences from learned MJWarp policy replay.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=1600)
    parser.add_argument("--replay-passes", type=int, default=8)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--min-replay-held-seconds", type=float, default=0.75)
    parser.add_argument("--fallback-min-replay-held-seconds", type=float, default=0.25)
    parser.add_argument("--min-selected-held-seconds", type=float, default=0.75)
    parser.add_argument("--top-k", type=int, default=1)
    parser.add_argument("--min-segment-steps", type=int, default=512)
    parser.add_argument("--min-event-segment-steps", type=int, default=96)
    parser.add_argument("--mirror", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--epochs", type=int, default=16)
    parser.add_argument("--sequence-length", type=int, default=768)
    parser.add_argument("--learning-rate", type=float, default=0.000003)
    parser.add_argument("--return-gamma", type=float, default=0.997)
    parser.add_argument("--return-weight-beta", type=float, default=1.0)
    parser.add_argument("--min-return-weight", type=float, default=0.1)
    parser.add_argument("--max-return-weight", type=float, default=8.0)
    parser.add_argument("--start-at-zero-prob", type=float, default=0.85)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.25)
    parser.add_argument("--sequence-anchor-weight", type=float, default=0.02)
    parser.add_argument("--hold-anchor-steps", type=int, default=768)
    parser.add_argument("--anchor-batch-size", type=int, default=1024)
    parser.add_argument("--grad-clip", type=float, default=0.7)
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
    result = run_elite_sequence_replay(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
