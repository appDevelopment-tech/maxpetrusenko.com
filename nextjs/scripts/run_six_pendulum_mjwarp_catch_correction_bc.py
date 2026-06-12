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
    evaluate_policy,
    load_policy_from_checkpoint,
    mirror_observations,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_recurrent_rollout,
    expert_stabilizer_action_from_obs,
)


DEFAULT_TEACHER_TRAJECTORY = (
    DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-energy-teacher-sweep-exactdown-f160-20260612.npz"
)
DEFAULT_WARMSTART = (
    DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-npz-awr-smoke-20260612.pt"
)
DEFAULT_OUTPUT = (
    DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-catch-correction-bc-20260612.json"
)
DEFAULT_CHECKPOINT = (
    DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-catch-correction-bc-20260612.pt"
)


def load_trajectory(path: Path) -> tuple[np.ndarray, np.ndarray, dict]:
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
    metadata = {
        "path": str(path),
        "steps": int(observations.shape[0]),
        "worlds": int(observations.shape[1]),
        "samples": int(observations.shape[0] * observations.shape[1]),
        "pose": str(data["pose"][0]) if "pose" in data.files else None,
        "forceScale": float(np.asarray(data["force_scale"]).reshape(-1)[0]) if "force_scale" in data.files else None,
        "links": int(np.asarray(data["links"]).reshape(-1)[0]) if "links" in data.files else None,
        "actionAbsMean": float(np.mean(np.abs(actions))) if actions.size else 0.0,
        "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
    }
    return observations, actions, metadata


def one_link_state(observations: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    return theta, omega, cart_abs


def catch_mask(
    observations: np.ndarray,
    angle: float,
    omega: float,
    cart: float,
    centered_cart: float,
) -> dict[str, np.ndarray]:
    theta, speed, cart_abs = one_link_state(observations)
    theta_abs = np.abs(theta)
    omega_abs = np.abs(speed)
    correction = (theta_abs < float(angle)) & (omega_abs < float(omega)) & (cart_abs < float(cart))
    strict = (theta_abs < 0.36) & (omega_abs < 3.0) & (cart_abs < 2.2)
    centered = strict & (cart_abs < float(centered_cart))
    pump_preserve = (theta_abs > 1.1) & (theta_abs < 2.45)
    approach_preserve = (theta_abs <= 1.1) & (theta_abs >= float(angle))
    return {
        "correction": correction,
        "strictCatch": strict,
        "centeredCatch": centered,
        "pumpPreserve": pump_preserve,
        "approachPreserve": approach_preserve,
    }


def sample_indices(indices: np.ndarray, limit: int, rng: np.random.Generator) -> np.ndarray:
    if indices.size == 0:
        return indices.astype(np.int64)
    take = min(int(limit), int(indices.size))
    return rng.choice(indices, size=take, replace=False).astype(np.int64)


def append_samples(
    obs_parts: list[np.ndarray],
    action_parts: list[np.ndarray],
    weight_parts: list[np.ndarray],
    flag_parts: list[np.ndarray],
    observations: np.ndarray,
    actions: np.ndarray,
    weight: float,
    correction_flag: bool,
    mirror: bool,
) -> int:
    if observations.shape[0] == 0:
        return 0
    obs_parts.append(observations.astype(np.float32, copy=False))
    action_parts.append(actions.astype(np.float32, copy=False))
    weight_parts.append(np.full(observations.shape[0], float(weight), dtype=np.float32))
    flag_parts.append(np.full(observations.shape[0], bool(correction_flag), dtype=bool))
    count = int(observations.shape[0])
    if mirror:
        mirrored_obs = mirror_observations(observations.reshape(observations.shape[0], 1, OBS_DIM)).reshape(-1, OBS_DIM)
        obs_parts.append(mirrored_obs.astype(np.float32, copy=False))
        action_parts.append((-actions).astype(np.float32, copy=False))
        weight_parts.append(np.full(observations.shape[0], float(weight), dtype=np.float32))
        flag_parts.append(np.full(observations.shape[0], bool(correction_flag), dtype=bool))
        count *= 2
    return count


def policy_actions(policy, observations: np.ndarray, hidden_dim: int, batch_size: int) -> np.ndarray:
    import torch

    if observations.shape[0] == 0:
        return np.zeros((0,), dtype=np.float32)
    policy.eval()
    actions = []
    with torch.no_grad():
        for start in range(0, observations.shape[0], int(batch_size)):
            stop = min(start + int(batch_size), observations.shape[0])
            batch = torch.as_tensor(observations[start:stop], dtype=torch.float32)
            hidden = torch.zeros(batch.shape[0], int(hidden_dim), dtype=torch.float32)
            predicted, _, _, _ = policy(batch, hidden, deterministic=True)
            actions.append(predicted.reshape(-1).cpu().numpy().astype(np.float32))
    return np.concatenate(actions, axis=0).astype(np.float32, copy=False)


def build_teacher_correction_dataset(
    teacher_obs: np.ndarray,
    teacher_actions: np.ndarray,
    old_policy,
    hidden_dim: int,
    args: argparse.Namespace,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, dict]:
    flat_obs = teacher_obs.reshape(-1, OBS_DIM).astype(np.float32, copy=False)
    flat_actions = teacher_actions.reshape(-1).astype(np.float32, copy=False)
    masks = catch_mask(flat_obs, args.catch_angle, args.catch_omega, args.catch_cart, args.centered_cart)
    obs_parts: list[np.ndarray] = []
    action_parts: list[np.ndarray] = []
    weight_parts: list[np.ndarray] = []
    flag_parts: list[np.ndarray] = []

    correction_indices = sample_indices(np.where(masks["correction"])[0], args.max_teacher_correction_samples, rng)
    correction_obs = flat_obs[correction_indices]
    if args.teacher_correction_label == "trajectory":
        correction_actions = flat_actions[correction_indices]
    else:
        correction_actions = expert_stabilizer_action_from_obs(correction_obs, args.force_scale)
    correction_count = append_samples(
        obs_parts,
        action_parts,
        weight_parts,
        flag_parts,
        correction_obs,
        correction_actions,
        args.teacher_correction_weight,
        True,
        args.mirror,
    )

    preserve_mask = masks["pumpPreserve"] | masks["approachPreserve"]
    preserve_indices = sample_indices(np.where(preserve_mask)[0], args.max_teacher_preserve_samples, rng)
    preserve_obs = flat_obs[preserve_indices]
    preserve_actions = policy_actions(old_policy, preserve_obs, hidden_dim, args.policy_action_batch_size)
    preserve_count = append_samples(
        obs_parts,
        action_parts,
        weight_parts,
        flag_parts,
        preserve_obs,
        preserve_actions,
        args.preserve_weight,
        False,
        args.mirror,
    )

    if not obs_parts:
        empty_obs, empty_actions, empty_weights, empty_flags = empty_dataset()
        return empty_obs, empty_actions, empty_weights, empty_flags, {
            "source": "teacher-trajectory",
            "correctionCandidates": int(np.sum(masks["correction"])),
            "preserveCandidates": int(np.sum(preserve_mask)),
            "correctionSamples": 0,
            "preserveSamples": 0,
        }

    return (
        np.concatenate(obs_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(action_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(weight_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(flag_parts, axis=0).astype(bool, copy=False),
        {
            "source": "teacher-trajectory",
            "correctionCandidates": int(np.sum(masks["correction"])),
            "strictCatchCandidates": int(np.sum(masks["strictCatch"])),
            "centeredCatchCandidates": int(np.sum(masks["centeredCatch"])),
            "preserveCandidates": int(np.sum(preserve_mask)),
            "correctionSamples": int(correction_count),
            "preserveSamples": int(preserve_count),
            "label": str(args.teacher_correction_label),
            "mirror": bool(args.mirror),
        },
    )


def empty_dataset() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    return (
        np.zeros((0, OBS_DIM), dtype=np.float32),
        np.zeros((0,), dtype=np.float32),
        np.zeros((0,), dtype=np.float32),
        np.zeros((0,), dtype=bool),
    )


def collect_learner_correction_dataset(
    mjcf_xml: str,
    policy,
    old_policy,
    links: int,
    hidden_dim: int,
    args: argparse.Namespace,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, list[dict]]:
    obs_parts: list[np.ndarray] = []
    action_parts: list[np.ndarray] = []
    weight_parts: list[np.ndarray] = []
    flag_parts: list[np.ndarray] = []
    summaries = []
    for pass_index in range(int(args.learner_replay_passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.rollout_steps,
            args.replay_pose,
            args.force_scale,
            args.seed + 500_000 + pass_index,
            hidden_dim,
            stochastic=bool(args.learner_stochastic),
            random_horizon=bool(args.random_horizon),
            min_horizon=args.min_horizon,
            max_horizon=args.max_horizon,
        )
        observations = rollout["buffers"]["obs"].reshape(-1, OBS_DIM).astype(np.float32, copy=False)
        masks = catch_mask(observations, args.catch_angle, args.catch_omega, args.catch_cart, args.centered_cart)
        correction_indices = sample_indices(np.where(masks["correction"])[0], args.max_learner_correction_samples, rng)
        correction_obs = observations[correction_indices]
        correction_actions = expert_stabilizer_action_from_obs(correction_obs, args.force_scale)
        correction_count = append_samples(
            obs_parts,
            action_parts,
            weight_parts,
            flag_parts,
            correction_obs,
            correction_actions,
            args.learner_correction_weight,
            True,
            args.mirror,
        )

        preserve_mask = masks["pumpPreserve"] | masks["approachPreserve"]
        preserve_indices = sample_indices(np.where(preserve_mask)[0], args.max_learner_preserve_samples, rng)
        preserve_obs = observations[preserve_indices]
        preserve_actions = policy_actions(old_policy, preserve_obs, hidden_dim, args.policy_action_batch_size)
        preserve_count = append_samples(
            obs_parts,
            action_parts,
            weight_parts,
            flag_parts,
            preserve_obs,
            preserve_actions,
            args.preserve_weight,
            False,
            args.mirror,
        )
        summary = {
            "pass": int(pass_index + 1),
            "rollout": rollout["summary"],
            "correctionCandidates": int(np.sum(masks["correction"])),
            "strictCatchCandidates": int(np.sum(masks["strictCatch"])),
            "centeredCatchCandidates": int(np.sum(masks["centeredCatch"])),
            "preserveCandidates": int(np.sum(preserve_mask)),
            "correctionSamples": int(correction_count),
            "preserveSamples": int(preserve_count),
        }
        summaries.append(summary)
        print(json.dumps({"learnerReplay": summary}, sort_keys=True), flush=True)

    if not obs_parts:
        return (*empty_dataset(), summaries)
    return (
        np.concatenate(obs_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(action_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(weight_parts, axis=0).astype(np.float32, copy=False),
        np.concatenate(flag_parts, axis=0).astype(bool, copy=False),
        summaries,
    )


def train_catch_correction_bc(
    policy,
    old_policy,
    obs: np.ndarray,
    actions: np.ndarray,
    weights: np.ndarray,
    correction_flags: np.ndarray,
    anchor_obs: np.ndarray,
    args: argparse.Namespace,
    hidden_dim: int,
) -> list[dict]:
    import torch

    if obs.shape[0] == 0:
        return []
    policy.train()
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    obs_t = torch.as_tensor(obs, dtype=torch.float32)
    actions_t = torch.as_tensor(actions, dtype=torch.float32)
    weights_t = torch.as_tensor(weights, dtype=torch.float32)
    correction_t = torch.as_tensor(correction_flags, dtype=torch.bool)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    marker_epochs = {0, max(0, int(args.bc_epochs) // 2), max(0, int(args.bc_epochs) - 1)}
    losses = []
    batch_size = min(int(args.batch_size), obs_t.shape[0])
    for epoch in range(int(args.bc_epochs)):
        indices = torch.randint(0, obs_t.shape[0], (batch_size,))
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        predicted, _, _, _ = policy(obs_t[indices], hidden, deterministic=True)
        predicted = predicted.reshape(-1)
        bc_loss = (weights_t[indices] * (predicted - actions_t[indices]).pow(2)).mean()
        correction_mask = correction_t[indices]
        saturation_loss = torch.tensor(0.0, dtype=torch.float32)
        if bool(torch.any(correction_mask)) and float(args.catch_action_penalty) > 0.0:
            correction_actions = predicted[correction_mask]
            excess = torch.relu(torch.abs(correction_actions) - float(args.catch_action_abs_target))
            saturation_loss = excess.pow(2).mean()
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
            bc_loss
            + float(args.catch_action_penalty) * saturation_loss
            + float(args.hold_anchor_weight) * anchor_loss
        )
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(args.grad_clip)).detach())
        optimizer.step()
        if epoch in marker_epochs:
            losses.append(
                {
                    "epoch": int(epoch + 1),
                    "loss": float(loss.detach()),
                    "bcLoss": float(bc_loss.detach()),
                    "saturationLoss": float(saturation_loss.detach()),
                    "holdAnchorLoss": float(anchor_loss.detach()),
                    "gradNorm": grad_norm,
                }
            )
    policy.eval()
    return losses


def dataset_summary(obs: np.ndarray, actions: np.ndarray, weights: np.ndarray, correction_flags: np.ndarray) -> dict:
    if obs.shape[0] == 0:
        return {
            "samples": 0,
            "correctionSamples": 0,
            "preserveSamples": 0,
            "actionAbsMean": 0.0,
            "actionAbsMax": 0.0,
            "weightMean": 0.0,
            "weightMax": 0.0,
        }
    return {
        "samples": int(obs.shape[0]),
        "correctionSamples": int(np.sum(correction_flags)),
        "preserveSamples": int(np.sum(~correction_flags)),
        "actionAbsMean": float(np.mean(np.abs(actions))),
        "actionAbsMax": float(np.max(np.abs(actions))),
        "weightMean": float(np.mean(weights)),
        "weightMax": float(np.max(weights)),
        "qualityMean": float(np.mean(hold_quality(obs))),
        "qualityMax": float(np.max(hold_quality(obs))),
    }


def run_catch_correction_bc(mjcf_xml: str, args: argparse.Namespace) -> dict:
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
        args.eval_pose,
    )
    teacher_obs, teacher_actions, teacher_metadata = load_trajectory(args.teacher_trajectory)
    teacher_dataset = build_teacher_correction_dataset(
        teacher_obs,
        teacher_actions,
        old_policy,
        hidden_dim,
        args,
        rng,
    )
    teacher_obs_s, teacher_action_s, teacher_weight_s, teacher_flag_s, teacher_summary = teacher_dataset
    learner_obs_s, learner_action_s, learner_weight_s, learner_flag_s, learner_summaries = collect_learner_correction_dataset(
        mjcf_xml,
        policy,
        old_policy,
        links,
        hidden_dim,
        args,
        rng,
    )
    obs = np.concatenate([teacher_obs_s, learner_obs_s], axis=0).astype(np.float32, copy=False)
    actions = np.concatenate([teacher_action_s, learner_action_s], axis=0).astype(np.float32, copy=False)
    weights = np.concatenate([teacher_weight_s, learner_weight_s], axis=0).astype(np.float32, copy=False)
    correction_flags = np.concatenate([teacher_flag_s, learner_flag_s], axis=0).astype(bool, copy=False)
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if obs.shape[0] == 0:
        losses = []
        after_eval = before_eval
        status = "no-correction-samples"
    else:
        losses = train_catch_correction_bc(policy, old_policy, obs, actions, weights, correction_flags, anchor_obs, args, hidden_dim)
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
        status = "catch-correction-bc-finished"

    if args.write_checkpoint and obs.shape[0] > 0:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-catch-correction-bc-policy-checkpoint-v1",
                "policyStateDict": policy.state_dict(),
                "links": links,
                "hiddenDim": hidden_dim,
                "obsDim": int(OBS_DIM),
                "forceScale": float(args.force_scale),
                "policyKind": policy_kind,
                "seed": int(args.seed),
                "sourceCheckpoint": str(args.warmstart_checkpoint),
                "teacherTrajectory": str(args.teacher_trajectory),
                "bestDownEvaluation": after_eval["down"],
                "bestStochasticDownEvaluation": after_eval["stochasticDown"],
            },
            args.write_checkpoint,
        )

    return {
        "schema": "six-pendulum-mjwarp-catch-correction-bc-v1",
        "status": status,
        "algorithm": "teacher-and-learner-catch-correction-with-pump-preservation",
        "links": links,
        "nworld": int(args.nworld),
        "rolloutSteps": int(args.rollout_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "teacherTrajectory": teacher_metadata,
        "teacherSelection": teacher_summary,
        "learnerReplay": learner_summaries,
        "dataset": dataset_summary(obs, actions, weights, correction_flags),
        "holdAnchor": hold_anchor,
        "bc": {
            "epochs": int(args.bc_epochs),
            "learningRate": float(args.learning_rate),
            "batchSize": int(args.batch_size),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "catchActionPenalty": float(args.catch_action_penalty),
            "catchActionAbsTarget": float(args.catch_action_abs_target),
            "losses": losses,
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "evalPose": str(args.eval_pose),
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
            "Teacher/controller labels are only a correction dataset; counted proof is the held-out learned exact-down evaluation.",
            "Correction samples target low-action upright stabilization around near-top/catch states.",
            "Pump and approach samples preserve the old learned policy action so the AWR whip is not overwritten.",
            "This is a local pre-Modal gate; do not scale until deterministic exact-down improves.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Catch correction BC for MJWarp one-link exact down-start.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=1600)
    parser.add_argument("--learner-replay-passes", type=int, default=4)
    parser.add_argument("--learner-stochastic", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--teacher-trajectory", type=Path, default=DEFAULT_TEACHER_TRAJECTORY)
    parser.add_argument("--teacher-correction-label", choices=["trajectory", "stabilizer"], default="stabilizer")
    parser.add_argument("--max-teacher-correction-samples", type=int, default=2048)
    parser.add_argument("--max-teacher-preserve-samples", type=int, default=2048)
    parser.add_argument("--max-learner-correction-samples", type=int, default=768)
    parser.add_argument("--max-learner-preserve-samples", type=int, default=768)
    parser.add_argument("--teacher-correction-weight", type=float, default=5.0)
    parser.add_argument("--learner-correction-weight", type=float, default=7.0)
    parser.add_argument("--preserve-weight", type=float, default=0.35)
    parser.add_argument("--catch-angle", type=float, default=0.62)
    parser.add_argument("--catch-omega", type=float, default=5.0)
    parser.add_argument("--catch-cart", type=float, default=2.25)
    parser.add_argument("--centered-cart", type=float, default=1.4)
    parser.add_argument("--mirror", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--hold-anchor-steps", type=int, default=1024)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.10)
    parser.add_argument("--bc-epochs", type=int, default=16)
    parser.add_argument("--batch-size", type=int, default=768)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--policy-action-batch-size", type=int, default=2048)
    parser.add_argument("--learning-rate", type=float, default=4e-6)
    parser.add_argument("--grad-clip", type=float, default=0.5)
    parser.add_argument("--catch-action-penalty", type=float, default=0.05)
    parser.add_argument("--catch-action-abs-target", type=float, default=0.55)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--replay-pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--eval-pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--random-horizon", action="store_true")
    parser.add_argument("--min-horizon", type=int, default=128)
    parser.add_argument("--max-horizon", type=int, default=768)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_catch_correction_bc(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
