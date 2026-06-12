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
    mirror_observations,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import collect_recurrent_rollout


DEFAULT_WARMSTART = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt"
DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-catch-filtered-bc-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-catch-filtered-bc-f160-20260611.pt"


def hold_quality(observations: np.ndarray) -> np.ndarray:
    theta_abs = np.abs(np.arctan2(observations[..., 3], observations[..., 4]))
    omega_abs = np.abs(observations[..., 7] * 8.0)
    cart_abs = np.abs(observations[..., 0])
    near_top = theta_abs < 0.5
    catch = (theta_abs < 0.36) & (omega_abs < 3.0) & (cart_abs < 2.2)
    quality = 2.0 * catch.astype(np.float32) + 0.75 * near_top.astype(np.float32)
    quality -= 0.55 * np.minimum(theta_abs / 0.7, 4.0).astype(np.float32)
    quality -= 0.18 * np.minimum(omega_abs / 5.0, 4.0).astype(np.float32)
    quality -= 0.22 * np.minimum(cart_abs / 2.2, 4.0).astype(np.float32)
    return quality.astype(np.float32)


def future_segment_max(values: np.ndarray, window: int) -> np.ndarray:
    result = np.full(values.shape, -1e9, dtype=np.float32)
    for index in range(values.shape[0]):
        stop = min(values.shape[0], index + max(2, int(window)))
        if index + 1 < stop:
            result[index] = float(np.max(values[index + 1 : stop]))
    return result


def extract_filtered_samples(
    buffers: dict,
    future_window_steps: int,
    catch_angle: float,
    catch_omega: float,
    catch_cart: float,
    min_advantage: float,
    max_action_abs: float,
    beta: float,
    max_weight: float,
    mirror: bool,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    observations = buffers["obs"].astype(np.float32, copy=False)
    actions = buffers["actions"].astype(np.float32, copy=False)
    done = (buffers["terminals"] > 0.5) | (buffers["truncations"] > 0.5)
    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    quality = hold_quality(observations)
    obs_samples = []
    action_samples = []
    weight_samples = []
    stats = {
        "candidateSamples": 0,
        "keptSamples": 0,
        "mirroredSamples": 0,
        "droppedSaturated": 0,
        "droppedNoAdvantage": 0,
        "worldsWithKeptSamples": 0,
        "maxAdvantage": 0.0,
        "meanKeptActionAbs": 0.0,
    }

    for world in range(observations.shape[1]):
        kept_for_world = 0
        start = 0
        stops = np.where(done[:, world])[0].tolist() + [observations.shape[0]]
        for stop in stops:
            if stop - start < 2:
                start = stop + 1
                continue
            segment_obs = observations[start:stop, world, :]
            segment_actions = actions[start:stop, world]
            segment_theta = theta[start:stop, world]
            segment_omega = omega[start:stop, world]
            segment_cart = cart_abs[start:stop, world]
            segment_quality = quality[start:stop, world]
            future_best = future_segment_max(segment_quality, future_window_steps)
            advantage = future_best - segment_quality
            catch_band = (
                (np.abs(segment_theta) < float(catch_angle))
                & (np.abs(segment_omega) < float(catch_omega))
                & (segment_cart < float(catch_cart))
            )
            improving = advantage > float(min_advantage)
            not_saturated = np.abs(segment_actions) <= float(max_action_abs)
            keep = catch_band & improving & not_saturated
            stats["candidateSamples"] += int(np.sum(catch_band))
            stats["droppedSaturated"] += int(np.sum(catch_band & improving & ~not_saturated))
            stats["droppedNoAdvantage"] += int(np.sum(catch_band & ~improving))
            if np.any(keep):
                kept_obs = segment_obs[keep]
                kept_actions = segment_actions[keep]
                kept_advantage = advantage[keep]
                weights = np.clip(np.exp(kept_advantage / max(float(beta), 1e-6)), 1.0, float(max_weight))
                obs_samples.append(kept_obs)
                action_samples.append(kept_actions)
                weight_samples.append(weights.astype(np.float32))
                stats["maxAdvantage"] = max(stats["maxAdvantage"], float(np.max(kept_advantage)))
                kept_for_world += int(kept_obs.shape[0])
                if mirror:
                    obs_samples.append(mirror_observations(kept_obs.reshape(kept_obs.shape[0], 1, OBS_DIM)).reshape(-1, OBS_DIM))
                    action_samples.append((-kept_actions).astype(np.float32))
                    weight_samples.append(weights.astype(np.float32))
                    stats["mirroredSamples"] += int(kept_obs.shape[0])
            start = stop + 1
        if kept_for_world > 0:
            stats["worldsWithKeptSamples"] += 1

    if not obs_samples:
        return (
            np.zeros((0, OBS_DIM), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            stats,
        )
    obs_array = np.concatenate(obs_samples, axis=0).astype(np.float32, copy=False)
    action_array = np.concatenate(action_samples, axis=0).astype(np.float32, copy=False)
    weight_array = np.concatenate(weight_samples, axis=0).astype(np.float32, copy=False)
    stats["keptSamples"] = int(obs_array.shape[0])
    stats["meanKeptActionAbs"] = float(np.mean(np.abs(action_array))) if action_array.size else 0.0
    return obs_array, action_array, weight_array, stats


def collect_filtered_replay(mjcf_xml: str, policy, args: argparse.Namespace, links: int, hidden_dim: int):
    obs_batches = []
    action_batches = []
    weight_batches = []
    summaries = []
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
        )
        obs, actions, weights, stats = extract_filtered_samples(
            rollout["buffers"],
            args.future_window_steps,
            args.catch_angle,
            args.catch_omega,
            args.catch_cart,
            args.min_advantage,
            args.max_action_abs,
            args.advantage_beta,
            args.max_weight,
            args.mirror,
        )
        if obs.shape[0] > 0:
            obs_batches.append(obs)
            action_batches.append(actions)
            weight_batches.append(weights)
        summary = {
            "pass": pass_index + 1,
            "rollout": rollout["summary"],
            "filter": stats,
        }
        summaries.append(summary)
        print(json.dumps(summary, sort_keys=True), flush=True)
    if not obs_batches:
        return (
            np.zeros((0, OBS_DIM), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            summaries,
        )
    return (
        np.concatenate(obs_batches, axis=0).astype(np.float32, copy=False),
        np.concatenate(action_batches, axis=0).astype(np.float32, copy=False),
        np.concatenate(weight_batches, axis=0).astype(np.float32, copy=False),
        summaries,
    )


def collect_hold_anchor(mjcf_xml: str, policy, args: argparse.Namespace, links: int, hidden_dim: int):
    rollout = collect_recurrent_rollout(
        mjcf_xml,
        policy,
        links,
        args.nworld,
        args.hold_anchor_steps,
        "hold",
        args.force_scale,
        args.seed + 400_000,
        hidden_dim,
        stochastic=False,
    )
    observations = rollout["buffers"]["obs"].reshape(-1, OBS_DIM).astype(np.float32, copy=False)
    theta_abs = np.abs(np.arctan2(observations[:, 3], observations[:, 4]))
    omega_abs = np.abs(observations[:, 7] * 8.0)
    cart_abs = np.abs(observations[:, 0])
    mask = (theta_abs < 0.5) & (omega_abs < 4.5) & (cart_abs < 1.8)
    return observations[mask], {
        "rollout": rollout["summary"],
        "candidateAnchorSamples": int(observations.shape[0]),
        "keptAnchorSamples": int(np.sum(mask)),
    }


def train_filtered_bc(policy, old_policy, obs, actions, weights, anchor_obs, args: argparse.Namespace, hidden_dim: int):
    import torch

    if obs.shape[0] == 0:
        return []
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    obs_t = torch.as_tensor(obs, dtype=torch.float32)
    actions_t = torch.as_tensor(actions, dtype=torch.float32)
    weights_t = torch.as_tensor(weights, dtype=torch.float32)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    marker_epochs = {0, max(0, int(args.bc_epochs) // 2), max(0, int(args.bc_epochs) - 1)}
    losses = []
    batch_size = min(int(args.batch_size), obs_t.shape[0])
    for epoch in range(int(args.bc_epochs)):
        indices = torch.randint(0, obs_t.shape[0], (batch_size,))
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        predicted, _, _, _ = policy(obs_t[indices], hidden, deterministic=True)
        bc_loss = (weights_t[indices] * (predicted.reshape(-1) - actions_t[indices]).pow(2)).mean()
        anchor_loss = torch.tensor(0.0, dtype=torch.float32)
        if anchor_t is not None and float(args.hold_anchor_weight) > 0.0:
            anchor_count = min(int(args.anchor_batch_size), anchor_t.shape[0])
            anchor_indices = torch.randint(0, anchor_t.shape[0], (anchor_count,))
            anchor_batch = anchor_t[anchor_indices]
            anchor_hidden = torch.zeros(anchor_count, int(hidden_dim), dtype=torch.float32)
            with torch.no_grad():
                old_action, _, _, _ = old_policy(anchor_batch, anchor_hidden, deterministic=True)
            new_action, _, _, _ = policy(anchor_batch, anchor_hidden, deterministic=True)
            anchor_loss = (new_action.reshape(-1) - old_action.reshape(-1)).pow(2).mean()
        loss = bc_loss + float(args.hold_anchor_weight) * anchor_loss
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7).detach())
        optimizer.step()
        if epoch in marker_epochs:
            losses.append(
                {
                    "epoch": epoch + 1,
                    "loss": float(loss.detach()),
                    "bcLoss": float(bc_loss.detach()),
                    "holdAnchorLoss": float(anchor_loss.detach()),
                    "gradNorm": grad_norm,
                }
            )
    return losses


def run_filtered_bc(mjcf_xml: str, args: argparse.Namespace) -> dict:
    import copy
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
    obs, actions, weights, replay_summaries = collect_filtered_replay(mjcf_xml, policy, args, links, hidden_dim)
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if obs.shape[0] == 0:
        bc_losses = []
        after_eval = before_eval
        status = "no-filtered-samples"
    else:
        bc_losses = train_filtered_bc(policy, old_policy, obs, actions, weights, anchor_obs, args, hidden_dim)
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
        status = "catch-filtered-bc-finished"

    if args.write_checkpoint and obs.shape[0] > 0:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-catch-filtered-bc-policy-checkpoint-v1",
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

    return {
        "schema": "six-pendulum-mjwarp-catch-filtered-bc-v1",
        "status": status,
        "algorithm": "catch-only-advantage-filtered-bc-with-hold-anchor",
        "links": links,
        "nworld": int(args.nworld),
        "rolloutSteps": int(args.rollout_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "filter": {
            "sampleCount": int(obs.shape[0]),
            "weightMean": float(np.mean(weights)) if weights.size else 0.0,
            "weightMax": float(np.max(weights)) if weights.size else 0.0,
            "futureWindowSteps": int(args.future_window_steps),
            "futureWindowSeconds": float(args.future_window_steps) * 0.0025,
            "catchAngle": float(args.catch_angle),
            "catchOmega": float(args.catch_omega),
            "catchCart": float(args.catch_cart),
            "minAdvantage": float(args.min_advantage),
            "maxActionAbs": float(args.max_action_abs),
            "advantageBeta": float(args.advantage_beta),
            "maxWeight": float(args.max_weight),
            "mirrorEnabled": bool(args.mirror),
            "passSummaries": replay_summaries,
        },
        "holdAnchor": hold_anchor,
        "bc": {
            "epochs": int(args.bc_epochs),
            "learningRate": float(args.learning_rate),
            "batchSize": int(args.batch_size),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "losses": bc_losses,
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "checkpoint": {
            "written": bool(args.write_checkpoint and obs.shape[0] > 0),
            "path": str(args.write_checkpoint) if args.write_checkpoint and obs.shape[0] > 0 else None,
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
            "This is a failure-specific repair after naive replay BC regressed the policy.",
            "Samples are kept only inside a catch band when future one-second-window quality improves.",
            "The hold anchor preserves old-policy actions inside the already-solved hold basin.",
            "BC loss is not a solve; only held-out exact down-start evaluation counts.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Catch-only advantage-filtered BC repair for MJWarp one-link exact down-start.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=1600)
    parser.add_argument("--replay-passes", type=int, default=8)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--future-window-steps", type=int, default=400)
    parser.add_argument("--catch-angle", type=float, default=0.7)
    parser.add_argument("--catch-omega", type=float, default=5.5)
    parser.add_argument("--catch-cart", type=float, default=1.8)
    parser.add_argument("--min-advantage", type=float, default=0.08)
    parser.add_argument("--max-action-abs", type=float, default=0.92)
    parser.add_argument("--advantage-beta", type=float, default=0.35)
    parser.add_argument("--max-weight", type=float, default=8.0)
    parser.add_argument("--mirror", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--hold-anchor-steps", type=int, default=1024)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.2)
    parser.add_argument("--bc-epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=1e-5)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_filtered_bc(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
