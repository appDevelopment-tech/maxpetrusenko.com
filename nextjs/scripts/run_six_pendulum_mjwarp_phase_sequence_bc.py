#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor
from run_six_pendulum_mjwarp_phase_balanced_bc import (
    DEFAULT_TEACHER_SOURCE,
    DEFAULT_WARMSTART,
    phase_masks,
)
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
    mirror_observations,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_parameterized_teacher_labeled_trajectory,
    load_parameterized_teacher_configs,
    summarize_phase_diagnostics,
)


DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-phase-sequence-bc-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-phase-sequence-bc-f160-20260611.pt"


def select_phase_windows(
    batches: list[tuple[str, np.ndarray, np.ndarray]],
    window_steps: int,
    pre_steps: int,
    max_windows_per_phase: int,
    rng: np.random.Generator,
) -> tuple[list[dict], dict]:
    phase_order = ["bottom", "pump", "approach", "nearTopFast", "catch", "centeredCatch"]
    phase_weights = {
        "bottom": 0.15,
        "pump": 0.75,
        "approach": 1.15,
        "nearTopFast": 1.8,
        "catch": 3.0,
        "centeredCatch": 4.0,
    }
    source_weights = {
        "teacher-visited": 1.0,
        "learner-visited": 0.45,
    }
    windows: list[dict] = []
    summary = {
        "schema": "six-pendulum-phase-sequence-windows-v1",
        "windowSteps": int(window_steps),
        "preSteps": int(pre_steps),
        "maxWindowsPerPhase": int(max_windows_per_phase),
        "phaseOrder": phase_order,
        "phaseWeights": phase_weights,
        "sourceWeights": source_weights,
        "sources": [],
        "phaseCountsAvailable": {phase: 0 for phase in phase_order},
        "phaseWindowsSelected": {phase: 0 for phase in phase_order},
    }
    for source_name, observations, actions in batches:
        if observations.ndim != 3 or actions.ndim != 2:
            raise ValueError("Expected observations [steps, worlds, obs] and actions [steps, worlds]")
        if observations.shape[:2] != actions.shape:
            raise ValueError("Observation/action step or world dimensions do not match")
        if observations.shape[2] != OBS_DIM:
            raise ValueError(f"Observation dim {observations.shape[2]} does not match {OBS_DIM}")
        steps, _worlds, _obs_dim = observations.shape
        if steps < int(window_steps):
            continue
        masks = phase_masks(observations)
        source_prefix = "teacher-visited" if source_name.startswith("teacher-") else "learner-visited"
        source_weight = source_weights[source_prefix]
        source_summary = {
            "source": source_name,
            "samples": int(observations.shape[0] * observations.shape[1]),
            "phaseDiagnostics": summarize_phase_diagnostics(observations, actions),
            "phaseCountsAvailable": {},
            "phaseWindowsSelected": {},
        }
        selected_centers: set[tuple[int, int]] = set()
        for phase in phase_order:
            candidates = np.argwhere(masks[phase])
            if selected_centers:
                candidates = np.asarray(
                    [item for item in candidates.tolist() if (int(item[0]), int(item[1])) not in selected_centers],
                    dtype=np.int64,
                )
            summary["phaseCountsAvailable"][phase] += int(candidates.shape[0])
            source_summary["phaseCountsAvailable"][phase] = int(candidates.shape[0])
            if candidates.shape[0] == 0:
                source_summary["phaseWindowsSelected"][phase] = 0
                continue
            take = min(int(max_windows_per_phase), int(candidates.shape[0]))
            chosen_indices = rng.choice(candidates.shape[0], size=take, replace=False)
            chosen = candidates[chosen_indices]
            for center_step_raw, world_raw in chosen.tolist():
                center_step = int(center_step_raw)
                world = int(world_raw)
                selected_centers.add((center_step, world))
                start = max(0, min(center_step - int(pre_steps), steps - int(window_steps)))
                stop = start + int(window_steps)
                windows.append(
                    {
                        "source": source_name,
                        "phase": phase,
                        "weight": float(phase_weights[phase] * source_weight),
                        "centerStep": center_step,
                        "world": world,
                        "start": int(start),
                        "stop": int(stop),
                        "observations": observations[start:stop, world, :].astype(np.float32, copy=False),
                        "actions": actions[start:stop, world].astype(np.float32, copy=False),
                    }
                )
            summary["phaseWindowsSelected"][phase] += int(take)
            source_summary["phaseWindowsSelected"][phase] = int(take)
        summary["sources"].append(source_summary)
    if windows:
        summary["windowCount"] = int(len(windows))
        summary["weightMean"] = float(np.mean([item["weight"] for item in windows]))
        summary["weightMax"] = float(np.max([item["weight"] for item in windows]))
    else:
        summary["windowCount"] = 0
        summary["weightMean"] = 0.0
        summary["weightMax"] = 0.0
    return windows, summary


def load_trajectory_batches(path: Path, mirror: bool) -> tuple[list[tuple[str, np.ndarray, np.ndarray]], list[dict]]:
    data = np.load(path)
    observations = np.asarray(data["observations"], dtype=np.float32)
    actions = np.asarray(data["actions"], dtype=np.float32)
    if observations.ndim == 2:
        observations = observations[:, None, :]
    if actions.ndim == 1:
        actions = actions[:, None]
    if observations.ndim != 3 or actions.ndim != 2:
        raise ValueError("Expected trajectory observations [steps, worlds, obs] and actions [steps, worlds]")
    if observations.shape[:2] != actions.shape:
        raise ValueError("Trajectory observation/action dimensions do not match")
    if observations.shape[2] != OBS_DIM:
        raise ValueError(f"Trajectory obs dim {observations.shape[2]} does not match {OBS_DIM}")
    batches = [("teacher-trajectory", observations, actions)]
    if mirror:
        batches.append(("teacher-trajectory-mirror", mirror_observations(observations), (-actions).astype(np.float32)))
    metadata = {
        "path": str(path),
        "steps": int(observations.shape[0]),
        "worlds": int(observations.shape[1]),
        "samples": int(observations.shape[0] * observations.shape[1]),
        "mirror": bool(mirror),
        "actionAbsMean": float(np.mean(np.abs(actions))) if actions.size else 0.0,
        "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
        "pose": str(data["pose"][0]) if "pose" in data.files else None,
        "forceScale": float(np.asarray(data["force_scale"]).reshape(-1)[0]) if "force_scale" in data.files else None,
        "links": int(np.asarray(data["links"]).reshape(-1)[0]) if "links" in data.files else None,
    }
    return batches, [metadata]


def train_phase_sequence_bc(policy, old_policy, windows: list[dict], anchor_obs: np.ndarray, args: argparse.Namespace, hidden_dim: int):
    import torch
    import torch.nn.functional as F

    if not windows:
        return []
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    obs_tensors = [torch.as_tensor(item["observations"], dtype=torch.float32) for item in windows]
    action_tensors = [torch.as_tensor(item["actions"], dtype=torch.float32) for item in windows]
    weights = torch.as_tensor([float(item["weight"]) for item in windows], dtype=torch.float32)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    marker_epochs = {0, max(0, int(args.bc_epochs) // 2), max(0, int(args.bc_epochs) - 1)}
    losses = []
    batch_size = min(int(args.batch_windows), len(windows))
    for epoch in range(int(args.bc_epochs)):
        indices = torch.randint(0, len(windows), (batch_size,))
        obs_batch = torch.stack([obs_tensors[int(index)] for index in indices], dim=1)
        action_batch = torch.stack([action_tensors[int(index)] for index in indices], dim=1)
        weight_batch = weights[indices]
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        step_losses = []
        for step in range(obs_batch.shape[0]):
            predicted, _, _, hidden = policy(obs_batch[step], hidden, deterministic=True)
            per_item = F.smooth_l1_loss(predicted.reshape(-1), action_batch[step], reduction="none")
            step_losses.append((per_item * weight_batch).mean())
        bc_loss = torch.stack(step_losses).mean()
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
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(args.grad_clip)).detach())
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


def run_phase_sequence_bc(mjcf_xml: str, args: argparse.Namespace) -> dict:
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
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if not windows:
        bc_losses = []
        after_eval = before_eval
        status = "no-phase-sequence-windows"
    else:
        bc_losses = train_phase_sequence_bc(policy, old_policy, windows, anchor_obs, args, hidden_dim)
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
        status = "phase-sequence-bc-finished"

    if args.write_checkpoint and windows:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-phase-sequence-bc-policy-checkpoint-v1",
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
        "schema": "six-pendulum-mjwarp-phase-sequence-bc-v1",
        "status": status,
        "algorithm": "phase-balanced-parameterized-teacher-dagger-sequence-bc-with-hold-anchor",
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
        "holdAnchor": hold_anchor,
        "bc": {
            "epochs": int(args.bc_epochs),
            "learningRate": float(args.learning_rate),
            "batchWindows": int(args.batch_windows),
            "windowSteps": int(args.window_steps),
            "preSteps": int(args.pre_steps),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "losses": bc_losses,
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
            "This keeps phase quotas but trains contiguous windows so timing through pump, approach, and catch is visible to the recurrent policy.",
            "Teacher labels are scaffolding only; only held-out learned exact down-start evaluation can count.",
            "If this still regresses exact-down, the next lane should add value/advantage weights or critic replay.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Phase-balanced sequence BC repair for MJWarp one-link exact down-start.")
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
    parser.add_argument("--bc-epochs", type=int, default=6)
    parser.add_argument("--batch-windows", type=int, default=16)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=6e-6)
    parser.add_argument("--grad-clip", type=float, default=0.5)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_phase_sequence_bc(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
