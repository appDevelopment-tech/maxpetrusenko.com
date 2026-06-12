#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor, train_filtered_bc
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_parameterized_teacher_labeled_trajectory,
    load_parameterized_teacher_configs,
    summarize_phase_diagnostics,
)


DEFAULT_WARMSTART = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt"
DEFAULT_TEACHER_SOURCE = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.json"
DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-phase-balanced-bc-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-phase-balanced-bc-f160-20260611.pt"


def phase_masks(observations: np.ndarray) -> dict[str, np.ndarray]:
    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    theta_abs = np.abs(theta)
    omega_abs = np.abs(omega)
    catch = (theta_abs < 0.36) & (omega_abs < 3.0) & (cart_abs < 2.2)
    near_top_fast = (theta_abs < 0.5) & ~catch
    approach = (theta_abs <= 1.1) & ~(theta_abs < 0.5)
    pump = (theta_abs > 1.1) & (theta_abs <= 2.35)
    bottom = theta_abs > 2.35
    centered = cart_abs < 1.6
    return {
        "bottom": bottom,
        "pump": pump,
        "approach": approach,
        "nearTopFast": near_top_fast,
        "catch": catch,
        "centeredCatch": catch & centered,
    }


def flatten_labeled_trajectory(observations: np.ndarray, actions: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if observations.ndim != 3 or actions.ndim != 2:
        raise ValueError("Expected observations [steps, worlds, obs] and actions [steps, worlds]")
    if observations.shape[:2] != actions.shape:
        raise ValueError("Observation/action step or world dimensions do not match")
    if observations.shape[2] != OBS_DIM:
        raise ValueError(f"Observation dim {observations.shape[2]} does not match {OBS_DIM}")
    return observations.reshape(-1, OBS_DIM).astype(np.float32), actions.reshape(-1).astype(np.float32)


def select_phase_balanced_samples(
    batches: list[tuple[str, np.ndarray, np.ndarray]],
    max_samples_per_phase: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    phase_order = ["bottom", "pump", "approach", "nearTopFast", "catch", "centeredCatch"]
    phase_weights = {
        "bottom": 0.2,
        "pump": 0.8,
        "approach": 1.2,
        "nearTopFast": 1.6,
        "catch": 2.4,
        "centeredCatch": 3.0,
    }
    selected_obs = []
    selected_actions = []
    selected_weights = []
    summary = {
        "schema": "six-pendulum-phase-balanced-samples-v1",
        "maxSamplesPerPhase": int(max_samples_per_phase),
        "phaseOrder": phase_order,
        "sources": [],
        "phaseCountsAvailable": {phase: 0 for phase in phase_order},
        "phaseCountsSelected": {phase: 0 for phase in phase_order},
        "weights": phase_weights,
    }

    for source_name, observations, actions in batches:
        flat_obs, flat_actions = flatten_labeled_trajectory(observations, actions)
        masks = phase_masks(flat_obs)
        source_summary = {
            "source": source_name,
            "samples": int(flat_actions.shape[0]),
            "phaseDiagnostics": summarize_phase_diagnostics(observations, actions),
            "phaseCountsAvailable": {},
            "phaseCountsSelected": {},
        }
        already_selected = np.zeros(flat_actions.shape[0], dtype=bool)
        for phase in phase_order:
            candidates = np.where(masks[phase] & ~already_selected)[0]
            summary["phaseCountsAvailable"][phase] += int(candidates.size)
            source_summary["phaseCountsAvailable"][phase] = int(candidates.size)
            if candidates.size == 0:
                source_summary["phaseCountsSelected"][phase] = 0
                continue
            take = min(int(max_samples_per_phase), int(candidates.size))
            chosen = rng.choice(candidates, size=take, replace=False)
            already_selected[chosen] = True
            selected_obs.append(flat_obs[chosen])
            selected_actions.append(flat_actions[chosen])
            selected_weights.append(np.full(take, phase_weights[phase], dtype=np.float32))
            summary["phaseCountsSelected"][phase] += int(take)
            source_summary["phaseCountsSelected"][phase] = int(take)
        summary["sources"].append(source_summary)

    if not selected_obs:
        return (
            np.zeros((0, OBS_DIM), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            np.zeros((0,), dtype=np.float32),
            summary,
        )

    obs = np.concatenate(selected_obs, axis=0).astype(np.float32, copy=False)
    actions = np.concatenate(selected_actions, axis=0).astype(np.float32, copy=False)
    weights = np.concatenate(selected_weights, axis=0).astype(np.float32, copy=False)
    summary["selectedSamples"] = int(obs.shape[0])
    summary["actionAbsMean"] = float(np.mean(np.abs(actions))) if actions.size else 0.0
    summary["weightMean"] = float(np.mean(weights)) if weights.size else 0.0
    summary["weightMax"] = float(np.max(weights)) if weights.size else 0.0
    return obs, actions, weights, summary


def run_phase_balanced_bc(mjcf_xml: str, args: argparse.Namespace) -> dict:
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
    configs = load_parameterized_teacher_configs(args.teacher_source, args.teacher_limit)
    batches = []
    rollout_summaries = []
    for iteration in range(int(args.dagger_iterations)):
        observations, actions, summary = collect_parameterized_teacher_labeled_trajectory(
            mjcf_xml,
            policy if iteration > 0 else None,
            configs,
            links,
            args.nworld,
            args.teacher_steps,
            args.seed + 500_000 + iteration,
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

    obs, actions, weights, phase_balance = select_phase_balanced_samples(
        batches,
        args.max_samples_per_phase,
        rng,
    )
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if obs.shape[0] == 0:
        bc_losses = []
        after_eval = before_eval
        status = "no-phase-balanced-samples"
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
        status = "phase-balanced-bc-finished"

    if args.write_checkpoint and obs.shape[0] > 0:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-phase-balanced-bc-policy-checkpoint-v1",
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
        "schema": "six-pendulum-mjwarp-phase-balanced-bc-v1",
        "status": status,
        "algorithm": "phase-balanced-parameterized-teacher-dagger-bc-with-hold-anchor",
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
        "teacherConfigCount": int(len(configs)),
        "daggerIterations": int(args.dagger_iterations),
        "rollouts": rollout_summaries,
        "phaseBalance": phase_balance,
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
            "This run forces phase quotas before BC so bottom states cannot dominate learner-state DAgger.",
            "Teacher labels are scaffolding only; only held-out learned exact down-start evaluation can count.",
            "The hold anchor preserves the prior learned top-stabilizer behavior while phase samples target pump/catch.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Phase-balanced DAgger/BC repair for MJWarp one-link exact down-start.")
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
    parser.add_argument("--max-samples-per-phase", type=int, default=512)
    parser.add_argument("--hold-anchor-steps", type=int, default=1024)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.15)
    parser.add_argument("--bc-epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=8e-6)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_phase_balanced_bc(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
