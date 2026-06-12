#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor, hold_quality
from run_six_pendulum_mjwarp_phase_balanced_bc import DEFAULT_TEACHER_SOURCE, DEFAULT_WARMSTART
from run_six_pendulum_mjwarp_phase_sequence_bc import load_trajectory_batches, select_phase_windows
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_parameterized_teacher_labeled_trajectory,
    load_parameterized_teacher_configs,
)


DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-awr-sequence-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-awr-sequence-f160-20260611.pt"


def discounted_future_sum(values: np.ndarray, gamma: float) -> np.ndarray:
    returns = np.zeros(values.shape, dtype=np.float32)
    running = 0.0
    for index in range(values.shape[0] - 1, -1, -1):
        running = float(values[index]) + float(gamma) * running
        returns[index] = running
    return returns


def attach_window_returns(windows: list[dict], gamma: float) -> dict:
    if not windows:
        return {
            "schema": "six-pendulum-awr-window-returns-v1",
            "windowCount": 0,
            "returnMean": 0.0,
            "returnStd": 0.0,
            "returnMin": 0.0,
            "returnMax": 0.0,
        }
    all_returns = []
    for window in windows:
        quality = hold_quality(window["observations"])
        returns = discounted_future_sum(quality, gamma)
        window["quality"] = quality.astype(np.float32, copy=False)
        window["rawReturns"] = returns.astype(np.float32, copy=False)
        all_returns.append(returns.reshape(-1))
    flat = np.concatenate(all_returns).astype(np.float32, copy=False)
    mean = float(np.mean(flat))
    std = float(np.std(flat) + 1e-6)
    phase_stats: dict[str, dict] = {}
    for window in windows:
        normalized = ((window["rawReturns"] - mean) / std).astype(np.float32, copy=False)
        window["returns"] = normalized
        phase = str(window["phase"])
        if phase not in phase_stats:
            phase_stats[phase] = {"windows": 0, "returnMean": 0.0, "qualityMax": -1e9}
        phase_stats[phase]["windows"] += 1
        phase_stats[phase]["returnMean"] += float(np.mean(normalized))
        phase_stats[phase]["qualityMax"] = max(phase_stats[phase]["qualityMax"], float(np.max(window["quality"])))
    for stats in phase_stats.values():
        stats["returnMean"] /= max(1, int(stats["windows"]))
    return {
        "schema": "six-pendulum-awr-window-returns-v1",
        "windowCount": int(len(windows)),
        "discount": float(gamma),
        "returnMean": mean,
        "returnStd": std,
        "returnMin": float(np.min(flat)),
        "returnMax": float(np.max(flat)),
        "normalizedReturnMin": float(min(float(np.min(window["returns"])) for window in windows)),
        "normalizedReturnMax": float(max(float(np.max(window["returns"])) for window in windows)),
        "phaseStats": phase_stats,
    }


def train_awr_sequence(policy, old_policy, windows: list[dict], anchor_obs: np.ndarray, args: argparse.Namespace, hidden_dim: int):
    import torch
    import torch.nn.functional as F

    if not windows:
        return []
    policy.train()
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    obs_tensors = [torch.as_tensor(item["observations"], dtype=torch.float32) for item in windows]
    action_tensors = [torch.as_tensor(item["actions"], dtype=torch.float32) for item in windows]
    return_tensors = [torch.as_tensor(item["returns"], dtype=torch.float32) for item in windows]
    phase_weights = torch.as_tensor([float(item["weight"]) for item in windows], dtype=torch.float32)
    phase_weights = phase_weights / torch.clamp(phase_weights.mean(), min=1e-6)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    marker_epochs = {0, max(0, int(args.epochs) // 2), max(0, int(args.epochs) - 1)}
    losses = []
    batch_size = min(int(args.batch_windows), len(windows))
    for epoch in range(int(args.epochs)):
        indices = torch.randint(0, len(windows), (batch_size,))
        obs_batch = torch.stack([obs_tensors[int(index)] for index in indices], dim=1)
        action_batch = torch.stack([action_tensors[int(index)] for index in indices], dim=1)
        return_batch = torch.stack([return_tensors[int(index)] for index in indices], dim=1)
        phase_weight_batch = phase_weights[indices]
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        actor_losses = []
        value_losses = []
        entropy_terms = []
        weight_terms = []
        advantage_terms = []
        for step in range(obs_batch.shape[0]):
            logprob, entropy, value, hidden = policy.evaluate_actions(obs_batch[step], hidden, action_batch[step])
            advantage = return_batch[step] - value.detach()
            awr_weight = torch.exp(advantage / max(float(args.advantage_beta), 1e-6))
            awr_weight = torch.clamp(awr_weight, min=float(args.min_weight), max=float(args.max_weight))
            awr_weight = awr_weight * phase_weight_batch
            actor_losses.append(-(awr_weight * logprob).mean())
            value_losses.append(F.mse_loss(value, return_batch[step]))
            entropy_terms.append(entropy.mean())
            weight_terms.append(awr_weight.detach().mean())
            advantage_terms.append(advantage.detach().mean())
        actor_loss = torch.stack(actor_losses).mean()
        value_loss = torch.stack(value_losses).mean()
        entropy_loss = torch.stack(entropy_terms).mean()
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
        loss = (
            actor_loss
            + float(args.value_coef) * value_loss
            - float(args.entropy_coef) * entropy_loss
            + float(args.hold_anchor_weight) * anchor_loss
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
                    "actorLoss": float(actor_loss.detach()),
                    "valueLoss": float(value_loss.detach()),
                    "entropy": float(entropy_loss.detach()),
                    "holdAnchorLoss": float(anchor_loss.detach()),
                    "weightMean": float(torch.stack(weight_terms).mean()),
                    "advantageMean": float(torch.stack(advantage_terms).mean()),
                    "gradNorm": grad_norm,
                    "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                }
            )
    policy.eval()
    return losses


def run_awr_sequence(mjcf_xml: str, args: argparse.Namespace) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(args.seed))
    np.random.seed(int(args.seed))
    rng = np.random.default_rng(int(args.seed))
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
    configs = []
    batches = []
    rollout_summaries = []
    if args.trajectory_file is not None:
        batches, rollout_summaries = load_trajectory_batches(args.trajectory_file, args.mirror_trajectory)
        print(json.dumps({"source": "trajectory-file", "trajectory": rollout_summaries}, sort_keys=True), flush=True)
    else:
        configs = load_parameterized_teacher_configs(args.teacher_source, args.teacher_limit)
        for iteration in range(int(args.dagger_iterations)):
            observations, actions, summary = collect_parameterized_teacher_labeled_trajectory(
                mjcf_xml,
                policy if iteration > 0 else None,
                configs,
                links,
                args.nworld,
                args.teacher_steps,
                args.seed + 600_000 + iteration,
                hidden_dim,
                args.force_scale,
            )
            source_name = "teacher-visited" if iteration == 0 else f"learner-visited-{iteration}"
            batches.append((source_name, observations, actions))
            rollout_summaries.append(
                {
                    "iteration": iteration + 1,
                    "source": source_name,
                    "policyVisitedStates": bool(iteration > 0),
                    "teacherRollout": summary,
                }
            )
            print(json.dumps(rollout_summaries[-1], sort_keys=True), flush=True)

    windows, window_summary = select_phase_windows(
        batches,
        args.window_steps,
        args.pre_steps,
        args.max_windows_per_phase,
        rng,
    )
    returns_summary = attach_window_returns(windows, args.return_gamma)
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if not windows:
        awr_losses = []
        after_eval = before_eval
        status = "no-awr-sequence-windows"
    else:
        awr_losses = train_awr_sequence(policy, old_policy, windows, anchor_obs, args, hidden_dim)
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
        status = "awr-sequence-finished"

    if args.write_checkpoint and windows:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-awr-sequence-policy-checkpoint-v1",
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
        "schema": "six-pendulum-mjwarp-awr-sequence-v1",
        "status": status,
        "algorithm": "phase-balanced-parameterized-teacher-dagger-advantage-weighted-sequence-replay",
        "links": links,
        "nworld": int(args.nworld),
        "teacherSteps": int(args.teacher_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "teacherSource": str(args.teacher_source),
        "trajectoryFile": str(args.trajectory_file) if args.trajectory_file is not None else None,
        "teacherConfigCount": int(len(configs)),
        "daggerIterations": int(args.dagger_iterations),
        "rollouts": rollout_summaries,
        "sequenceReplay": window_summary,
        "returns": returns_summary,
        "holdAnchor": hold_anchor,
        "awr": {
            "epochs": int(args.epochs),
            "learningRate": float(args.learning_rate),
            "batchWindows": int(args.batch_windows),
            "windowSteps": int(args.window_steps),
            "preSteps": int(args.pre_steps),
            "returnGamma": float(args.return_gamma),
            "advantageBeta": float(args.advantage_beta),
            "minWeight": float(args.min_weight),
            "maxWeight": float(args.max_weight),
            "valueCoef": float(args.value_coef),
            "entropyCoef": float(args.entropy_coef),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "losses": awr_losses,
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "checkpoint": {
            "written": bool(args.write_checkpoint and windows),
            "path": str(args.write_checkpoint) if args.write_checkpoint and windows else None,
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
            "AWR is the next source-backed lane after flat and sequence BC both regressed exact-down behavior.",
            "The actor loss is weighted negative log-prob of teacher/replay actions, not deterministic action MSE.",
            "The value head learns normalized future hold-quality returns; clipped exponential advantages prioritize useful windows.",
            "Teacher labels remain scaffolding only; only held-out learned exact down-start evaluation can count.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="AWR sequence replay repair for MJWarp one-link exact down-start.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--teacher-steps", type=int, default=1024)
    parser.add_argument("--dagger-iterations", type=int, default=2)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--teacher-source", type=Path, default=DEFAULT_TEACHER_SOURCE)
    parser.add_argument("--teacher-limit", type=int, default=8)
    parser.add_argument("--trajectory-file", type=Path, default=None)
    parser.add_argument("--mirror-trajectory", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--window-steps", type=int, default=256)
    parser.add_argument("--pre-steps", type=int, default=192)
    parser.add_argument("--max-windows-per-phase", type=int, default=64)
    parser.add_argument("--hold-anchor-steps", type=int, default=1024)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.08)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-windows", type=int, default=16)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=4e-6)
    parser.add_argument("--grad-clip", type=float, default=0.5)
    parser.add_argument("--return-gamma", type=float, default=0.997)
    parser.add_argument("--advantage-beta", type=float, default=1.5)
    parser.add_argument("--min-weight", type=float, default=0.05)
    parser.add_argument("--max-weight", type=float, default=6.0)
    parser.add_argument("--value-coef", type=float, default=0.5)
    parser.add_argument("--entropy-coef", type=float, default=0.002)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_awr_sequence(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
