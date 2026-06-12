#!/usr/bin/env python3
import argparse
import copy
import hashlib
import json
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_device_rollout import build_torch_policy
from six_pendulum_mjwarp_gpu_kernels import (
    DEFAULT_ACTION_SCALE,
    HARD_RAIL_BOUNDARY,
    MAX_LINKS,
    OBS_DIM,
    WarpScoreKernel,
    record_policy_scalars_kernel,
    record_rollout_obs_kernel,
    record_rollout_scalars_kernel,
    record_rollout_state_kernel,
)


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-train.json"
)


def expert_stabilizer_action_from_obs(obs: np.ndarray, force_scale: float) -> np.ndarray:
    x = obs[:, 0]
    cart_velocity = obs[:, 1] * 5.0
    theta = np.arctan2(obs[:, 3], obs[:, 4])
    angular_velocity = obs[:, 7] * 8.0
    force = -(8.0 * x + 4.0 * cart_velocity - 60.0 * theta - 16.0 * angular_velocity)
    return np.clip(force / force_scale, -1.0, 1.0).astype(np.float32)


def wrap_angle_np(angle: np.ndarray) -> np.ndarray:
    return ((angle + np.pi) % (2 * np.pi)) - np.pi


def energy_teacher_action_from_state(qpos: np.ndarray, qvel: np.ndarray, force_scale: float) -> np.ndarray:
    theta = wrap_angle_np(qpos[:, 1])
    omega = qvel[:, 1]
    x = qpos[:, 0]
    v = qvel[:, 0]
    energy = (1.0 / 6.0) * omega**2 + (9.8 / 2.0) * np.cos(theta)
    target_energy = 9.8 / 2.0
    pump_acc = 12.0 * (energy - target_energy) * omega * np.cos(theta)
    near_bottom = (np.abs(omega) < 0.2) & (np.abs(theta) > np.pi - 0.5)
    pump_acc = np.where(near_bottom, 30.0, pump_acc)
    acceleration = np.clip(pump_acc - 0.6 * v - 0.05 * x, -30.0, 30.0)
    catch = (np.abs(theta) < 0.36) & (np.abs(omega) < 3.0)
    stabilizer_force = -(8.0 * x + 4.0 * v - 60.0 * theta - 16.0 * omega)
    swing_force = acceleration * 6.75
    force = np.where(catch, stabilizer_force, swing_force)
    return np.clip(force / force_scale, -1.0, 1.0).astype(np.float32)


def energy_teacher_action_from_obs_torch(obs, force_scale: float):
    import torch

    theta = torch.atan2(obs[..., 3], obs[..., 4])
    omega = obs[..., 7] * 8.0
    x = obs[..., 0]
    v = obs[..., 1] * 5.0
    energy = (1.0 / 6.0) * omega.pow(2) + (9.8 / 2.0) * torch.cos(theta)
    target_energy = 9.8 / 2.0
    pump_acc = 12.0 * (energy - target_energy) * omega * torch.cos(theta)
    near_bottom = (torch.abs(omega) < 0.2) & (torch.abs(theta) > torch.pi - 0.5)
    pump_acc = torch.where(near_bottom, torch.full_like(pump_acc, 30.0), pump_acc)
    acceleration = torch.clamp(pump_acc - 0.6 * v - 0.05 * x, -30.0, 30.0)
    catch = (torch.abs(theta) < 0.36) & (torch.abs(omega) < 3.0)
    stabilizer_force = -(8.0 * x + 4.0 * v - 60.0 * theta - 16.0 * omega)
    swing_force = acceleration * 6.75
    force = torch.where(catch, stabilizer_force, swing_force)
    return torch.clamp(force / float(force_scale), -1.0, 1.0)


def load_parameterized_teacher_configs(source: Path, limit: int) -> list[dict]:
    root = json.loads(source.read_text())
    raw_configs = []
    if root.get("bestConfig"):
        raw_configs.append(root["bestConfig"])
    raw_configs.extend(root.get("topConfigs", []))
    raw_configs.extend(item.get("config", {}) for item in root.get("configSummaries", []))
    if root.get("training", {}).get("bestConfig"):
        raw_configs.append(root["training"]["bestConfig"])
    raw_configs.extend(root.get("training", {}).get("topConfigs", []))
    raw_configs.extend(item.get("config", {}) for item in root.get("training", {}).get("configSummaries", []))
    configs = []
    seen = set()
    for raw_config in raw_configs:
        if not raw_config:
            continue
        key = json.dumps(raw_config, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        configs.append(raw_config)
        if len(configs) >= int(limit):
            break
    if not configs:
        raise ValueError(f"No parameterized teacher configs found in {source}")
    return configs


def summarize_phase_diagnostics(
    observations: np.ndarray,
    actions: np.ndarray,
    control_dt: float = 0.0025,
) -> dict:
    observations = np.asarray(observations, dtype=np.float32)
    actions = np.asarray(actions, dtype=np.float32)
    if observations.size == 0 or actions.size == 0:
        return {"samples": 0, "phaseCounts": {}, "phaseFractions": {}}
    if observations.ndim != 3:
        raise ValueError("Expected observations with shape [steps, worlds, obs]")
    if actions.ndim == 3 and actions.shape[-1] == 1:
        actions = actions[:, :, 0]
    if actions.ndim != 2:
        raise ValueError("Expected actions with shape [steps, worlds]")

    x = observations[:, :, 0]
    v = observations[:, :, 1] * 5.0
    theta = np.arctan2(observations[:, :, 3], observations[:, :, 4])
    omega = observations[:, :, 7] * 8.0
    action_abs = np.abs(actions)
    theta_abs = np.abs(theta)
    omega_abs = np.abs(omega)
    cart_abs = np.abs(x)
    catch = (theta_abs < 0.36) & (omega_abs < 3.0) & (cart_abs < 2.2)
    near_top = theta_abs < 0.5
    near_top_fast = near_top & ~catch
    bottom = theta_abs > 2.35
    pump = (theta_abs > 1.1) & ~bottom
    approach = (theta_abs <= 1.1) & ~near_top
    rail = cart_abs > 2.1
    saturated = action_abs >= 0.92
    phases = {
        "bottom": bottom,
        "pump": pump,
        "approach": approach,
        "nearTopFast": near_top_fast,
        "catch": catch,
        "rail": rail,
        "saturatedAction": saturated,
    }
    total = int(actions.size)
    phase_counts = {name: int(np.sum(mask)) for name, mask in phases.items()}
    phase_fractions = {name: (count / total if total else 0.0) for name, count in phase_counts.items()}
    action_by_phase = {}
    for name, mask in phases.items():
        if np.any(mask):
            action_by_phase[name] = {
                "meanAbs": float(np.mean(action_abs[mask])),
                "maxAbs": float(np.max(action_abs[mask])),
                "saturatedFraction": float(np.mean(saturated[mask])),
            }

    catch_indices = np.argwhere(catch)
    first_catch = None
    if catch_indices.size:
        step_index = int(catch_indices[0][0])
        world_index = int(catch_indices[0][1])
        first_catch = {
            "step": step_index,
            "seconds": float(step_index * control_dt),
            "world": world_index,
            "cart": float(x[step_index, world_index]),
            "cartAbs": float(cart_abs[step_index, world_index]),
            "cartVelocity": float(v[step_index, world_index]),
            "theta": float(theta[step_index, world_index]),
            "thetaAbs": float(theta_abs[step_index, world_index]),
            "omega": float(omega[step_index, world_index]),
            "omegaAbs": float(omega_abs[step_index, world_index]),
            "action": float(actions[step_index, world_index]),
            "actionAbs": float(action_abs[step_index, world_index]),
        }

    return {
        "samples": total,
        "phaseCounts": phase_counts,
        "phaseFractions": phase_fractions,
        "actionAbsMean": float(np.mean(action_abs)),
        "actionAbsMax": float(np.max(action_abs)),
        "saturatedActionFraction": float(np.mean(saturated)),
        "railFraction": float(np.mean(rail)),
        "catchWorldRate": float(np.mean(np.any(catch, axis=0))) if catch.size else 0.0,
        "nearTopWorldRate": float(np.mean(np.any(near_top, axis=0))) if near_top.size else 0.0,
        "firstCatch": first_catch,
        "actionByPhase": action_by_phase,
    }


def parameterized_teacher_action_from_obs(
    obs: np.ndarray,
    configs: list[dict],
    force_scale: float,
    last_actions: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    x = obs[:, 0]
    v = obs[:, 1] * 5.0
    theta = np.arctan2(obs[:, 3], obs[:, 4])
    omega = obs[:, 7] * 8.0
    energy = (1.0 / 6.0) * omega**2 + (9.8 / 2.0) * np.cos(theta)
    target_energy = 9.8 / 2.0
    action_candidates = []
    catch_scores = []
    next_last_actions = np.zeros((len(configs), obs.shape[0]), dtype=np.float32)
    if last_actions is None:
        last_actions = np.zeros_like(next_last_actions)
    for config_index, cfg in enumerate(configs):
        pump_acc = float(cfg["pump_sign"]) * float(cfg["pump_gain"]) * (energy - target_energy) * omega * np.cos(theta)
        near_bottom = (np.abs(omega) < float(cfg["kick_omega_window"])) & (
            np.abs(theta) > np.pi - float(cfg["kick_theta_window"])
        )
        pump_acc = np.where(near_bottom, float(cfg["kick_sign"]) * float(cfg["kick"]), pump_acc)
        acceleration = np.clip(
            pump_acc - float(cfg["cart_d"]) * v - float(cfg["cart_k"]) * x,
            -float(cfg["max_acceleration"]),
            float(cfg["max_acceleration"]),
        )
        catch = (
            (np.abs(theta) < float(cfg["catch_angle"]))
            & (np.abs(omega) < float(cfg["catch_omega"]))
            & (np.abs(x) < float(cfg["catch_cart_window"]))
        )
        swing_force = acceleration * float(cfg["swing_force_gain"])
        catch_force = (
            -float(cfg["catch_x_gain"]) * x
            - float(cfg["catch_v_gain"]) * v
            + float(cfg["catch_theta_gain"]) * theta
            + float(cfg["catch_omega_gain"]) * omega
        )
        action = np.clip(np.where(catch, catch_force, swing_force) / float(force_scale), -1.0, 1.0)
        smoothing = float(cfg.get("action_smoothing", 0.0))
        if smoothing > 0.0:
            action = smoothing * last_actions[config_index] + (1.0 - smoothing) * action
        action = np.clip(action, -1.0, 1.0)
        next_last_actions[config_index] = action.astype(np.float32)
        catch_margin = (
            float(cfg["catch_angle"])
            - np.abs(theta)
            + 0.12 * (float(cfg["catch_omega"]) - np.abs(omega))
            + 0.04 * (float(cfg["catch_cart_window"]) - np.abs(x))
        )
        action_candidates.append(action.astype(np.float32))
        catch_scores.append(np.where(catch, catch_margin, -1e9).astype(np.float32))
    candidates = np.stack(action_candidates, axis=0)
    scores = np.stack(catch_scores, axis=0)
    best_catch_index = np.argmax(scores, axis=0)
    has_catch = np.max(scores, axis=0) > -1e8
    best_actions = candidates[0].copy()
    best_actions[has_catch] = candidates[best_catch_index[has_catch], np.where(has_catch)[0]]
    return np.clip(best_actions, -1.0, 1.0).astype(np.float32), next_last_actions


def collect_energy_teacher_labeled_trajectory(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    steps: int,
    seed: int,
    hidden_dim: int,
    force_scale: float,
    pose: str = "exact-down",
) -> tuple[np.ndarray, np.ndarray, dict]:
    import torch
    from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv

    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=links,
        nworld=nworld,
        horizon=steps + 1,
        pose=pose,
        force_scale=force_scale,
        seed=seed,
    )
    obs, _ = env.reset(seed)
    hidden = torch.zeros(int(nworld), int(hidden_dim), dtype=torch.float32)
    obs_batches = []
    action_batches = []
    max_held = 0.0
    max_score = 0.0
    catch_events = 0
    terminal_count = 0
    truncation_count = 0
    for _ in range(int(steps)):
        teacher_action = energy_teacher_action_from_state(env.d.qpos.numpy(), env.d.qvel.numpy(), force_scale).reshape(nworld, 1)
        obs_batches.append(obs.copy())
        action_batches.append(teacher_action[:, 0].copy())
        if policy is None:
            action = teacher_action
        else:
            with torch.no_grad():
                action_torch, _, _, hidden = policy(
                    torch.as_tensor(obs, dtype=torch.float32),
                    hidden,
                    deterministic=False,
                )
            action = action_torch.detach().cpu().numpy().reshape(nworld, 1)
        obs, _, terminals, truncations, infos = env.step(action)
        done = terminals | truncations
        if policy is not None and np.any(done):
            hidden = hidden.clone()
            hidden[torch.as_tensor(done, dtype=torch.bool)] = 0.0
        terminal_count += int(np.sum(terminals))
        truncation_count += int(np.sum(truncations))
        max_held = max(max_held, max(info["maxHeldSeconds"] for info in infos))
        max_score = max(max_score, max(info["strictScore"] for info in infos))
        catch_events += sum(1 for info in infos if info.get("catchBasin", 0.0) > 0.0)
    env.close()
    return (
        np.stack(obs_batches),
        np.stack(action_batches),
        {
            "maxStrictScore": float(max_score),
            "maxHeldSeconds": float(max_held),
            "solvedOneSecond": bool(max_held >= 1.0),
            "catchEvents": int(catch_events),
            "terminalCount": int(terminal_count),
            "truncationCount": int(truncation_count),
            "pose": str(pose),
            "phaseDiagnostics": summarize_phase_diagnostics(np.stack(obs_batches), np.stack(action_batches)),
        },
    )


def collect_parameterized_teacher_labeled_trajectory(
    mjcf_xml: str,
    policy,
    configs: list[dict],
    links: int,
    nworld: int,
    steps: int,
    seed: int,
    hidden_dim: int,
    force_scale: float,
    pose: str = "exact-down",
) -> tuple[np.ndarray, np.ndarray, dict]:
    import torch
    from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv

    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=links,
        nworld=nworld,
        horizon=steps + 1,
        pose=pose,
        force_scale=force_scale,
        seed=seed,
    )
    obs, _ = env.reset(seed)
    hidden = torch.zeros(int(nworld), int(hidden_dim), dtype=torch.float32)
    obs_batches = []
    action_batches = []
    max_held = 0.0
    max_score = 0.0
    catch_events = 0
    terminal_count = 0
    truncation_count = 0
    last_actions = np.zeros((len(configs), int(nworld)), dtype=np.float32)
    for _ in range(int(steps)):
        teacher_values, last_actions = parameterized_teacher_action_from_obs(obs, configs, force_scale, last_actions)
        teacher_action = teacher_values.reshape(nworld, 1)
        obs_batches.append(obs.copy())
        action_batches.append(teacher_action[:, 0].copy())
        if policy is None:
            action = teacher_action
        else:
            with torch.no_grad():
                action_torch, _, _, hidden = policy(
                    torch.as_tensor(obs, dtype=torch.float32),
                    hidden,
                    deterministic=False,
                )
            action = action_torch.detach().cpu().numpy().reshape(nworld, 1)
        obs, _, terminals, truncations, infos = env.step(action)
        done = terminals | truncations
        if policy is not None and np.any(done):
            hidden = hidden.clone()
            hidden[torch.as_tensor(done, dtype=torch.bool)] = 0.0
        terminal_count += int(np.sum(terminals))
        truncation_count += int(np.sum(truncations))
        max_held = max(max_held, max(info["maxHeldSeconds"] for info in infos))
        max_score = max(max_score, max(info["strictScore"] for info in infos))
        catch_events += sum(1 for info in infos if info.get("catchBasin", 0.0) > 0.0)
    env.close()
    return (
        np.stack(obs_batches),
        np.stack(action_batches),
        {
            "maxStrictScore": float(max_score),
            "maxHeldSeconds": float(max_held),
            "solvedOneSecond": bool(max_held >= 1.0),
            "catchEvents": int(catch_events),
            "terminalCount": int(terminal_count),
            "truncationCount": int(truncation_count),
            "pose": str(pose),
            "phaseDiagnostics": summarize_phase_diagnostics(np.stack(obs_batches), np.stack(action_batches)),
        },
    )


def train_energy_teacher_bc_sequences(
    policy,
    trajectories: list[tuple[np.ndarray, np.ndarray]],
    epochs: int,
    hidden_dim: int,
    sequence_length: int,
    phase: str,
    learning_rate: float = 1e-3,
) -> list[dict]:
    import torch

    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    torch_trajectories = [
        (
            torch.as_tensor(observations, dtype=torch.float32),
            torch.as_tensor(actions, dtype=torch.float32),
        )
        for observations, actions in trajectories
    ]
    losses = []
    marker_epochs = {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}
    for epoch in range(int(epochs)):
        observations, actions = torch_trajectories[int(torch.randint(0, len(torch_trajectories), (1,)).item())]
        train_steps, train_worlds, _ = observations.shape
        chunk = max(8, min(int(sequence_length), train_steps))
        start = 0 if train_steps <= chunk else int(torch.randint(0, train_steps - chunk + 1, (1,)).item())
        worlds = torch.randperm(train_worlds)[: min(train_worlds, 16)]
        hidden = torch.zeros(len(worlds), int(hidden_dim), dtype=torch.float32)
        loss_terms = []
        for offset in range(chunk):
            predicted, _, _, hidden = policy(observations[start + offset, worlds], hidden, deterministic=True)
            loss_terms.append((predicted.reshape(-1) - actions[start + offset, worlds]).pow(2).mean())
        loss = torch.stack(loss_terms).mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7)
        optimizer.step()
        if epoch in marker_epochs:
            losses.append({"phase": phase, "epoch": epoch + 1, "loss": float(loss.detach())})
    return losses


def warmup_with_energy_teacher_bc(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    steps: int,
    epochs: int,
    seed: int,
    hidden_dim: int,
    force_scale: float,
    sequence_length: int = 160,
    dagger_iterations: int = 0,
    pose: str = "exact-down",
) -> dict:
    if epochs <= 0:
        return {"enabled": False}
    if links != 1:
        return {
            "enabled": False,
            "reason": "energy teacher is only defined for one link",
            "requestedLinks": int(links),
        }

    started = time.time()
    observations, actions, teacher_metadata = collect_energy_teacher_labeled_trajectory(
        mjcf_xml,
        None,
        links,
        nworld,
        steps,
        seed=seed,
        hidden_dim=hidden_dim,
        force_scale=force_scale,
        pose=pose,
    )
    trajectories = [(observations, actions)]
    learner_metadata = []
    losses = []
    phases = max(1, int(dagger_iterations) + 1)
    epochs_per_phase = max(1, int(epochs) // phases)
    losses.extend(
        train_energy_teacher_bc_sequences(
            policy,
            trajectories,
            epochs_per_phase,
            hidden_dim,
            sequence_length,
            "teacher",
        )
    )
    for iteration in range(max(0, int(dagger_iterations))):
        learner_obs, learner_actions, metadata = collect_energy_teacher_labeled_trajectory(
            mjcf_xml,
            policy,
            links,
            nworld,
            steps,
            seed=seed + iteration + 1,
            hidden_dim=hidden_dim,
            force_scale=force_scale,
            pose=pose,
        )
        trajectories.append((learner_obs, learner_actions))
        learner_metadata.append({"iteration": iteration + 1, **metadata})
        losses.extend(
            train_energy_teacher_bc_sequences(
                policy,
                trajectories,
                epochs_per_phase,
                hidden_dim,
                sequence_length,
                f"dagger-{iteration + 1}",
            )
        )

    return {
        "enabled": True,
        "epochs": int(epochs_per_phase * phases),
        "requestedEpochs": int(epochs),
        "steps": int(steps),
        "pose": str(pose),
        "samples": int(sum(traj_obs.shape[0] * traj_obs.shape[1] for traj_obs, _ in trajectories)),
        "trajectoryCount": int(len(trajectories)),
        "sequenceLength": int(max(8, min(int(sequence_length), observations.shape[0]))),
        "daggerIterations": int(max(0, int(dagger_iterations))),
        "elapsedSeconds": time.time() - started,
        "teacher": {
            "controller": "energy pump from down, stabilizer inside catch basin",
            **teacher_metadata,
        },
        "learnerRolloutLabels": learner_metadata,
        "losses": losses,
        "notes": [
            "This pretrains swing-up/catch from pure down-start; it still does not count as a learned-policy solve.",
            "DAgger iterations label states visited by the current learner with the energy teacher; held-out evaluation remains learned-policy only.",
            "Down-start promotion still requires held-out learned policy one-second hold from pure down-start.",
        ],
    }


def warmup_with_stabilizer_bc(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    steps: int,
    epochs: int,
    seed: int,
    hidden_dim: int,
    force_scale: float,
    learning_rate: float = 1e-3,
    sequence_length: int = 1,
) -> dict:
    if epochs <= 0:
        return {"enabled": False}
    import torch
    from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv

    started = time.time()
    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=links,
        nworld=nworld,
        horizon=steps + 1,
        pose="hold",
        force_scale=force_scale,
        seed=seed,
    )
    obs, _ = env.reset(seed)
    obs_batches = []
    action_batches = []
    expert_max_held = 0.0
    expert_max_score = 0.0
    for _ in range(int(steps)):
        action = expert_stabilizer_action_from_obs(obs, force_scale).reshape(nworld, 1)
        obs_batches.append(obs.copy())
        action_batches.append(action[:, 0].copy())
        obs, _, _, _, infos = env.step(action)
        expert_max_held = max(expert_max_held, max(info["maxHeldSeconds"] for info in infos))
        expert_max_score = max(expert_max_score, max(info["strictScore"] for info in infos))
    env.close()

    observations_np = np.stack(obs_batches)
    actions_np = np.stack(action_batches)
    if int(sequence_length) > 1:
        losses = train_energy_teacher_bc_sequences(
            policy,
            [(observations_np, actions_np)],
            epochs,
            hidden_dim,
            sequence_length,
            "stabilizer",
            learning_rate,
        )
        batch_size = min(int(nworld), 16)
    else:
        observations = torch.as_tensor(np.concatenate(obs_batches), dtype=torch.float32)
        actions = torch.as_tensor(np.concatenate(action_batches), dtype=torch.float32)
        optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
        losses = []
        batch_size = min(1024, len(observations))
        marker_epochs = {0, max(0, epochs // 4), max(0, epochs // 2), max(0, epochs - 1)}
        for epoch in range(int(epochs)):
            indices = torch.randperm(len(observations))[:batch_size]
            hidden = torch.zeros(len(indices), int(hidden_dim), dtype=torch.float32)
            predicted, _, _, _ = policy(observations[indices], hidden, deterministic=True)
            loss = (predicted.reshape(-1) - actions[indices]).pow(2).mean()
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7)
            optimizer.step()
            if epoch in marker_epochs:
                losses.append({"epoch": epoch + 1, "loss": float(loss.detach())})

    return {
        "enabled": True,
        "epochs": int(epochs),
        "learningRate": float(learning_rate),
        "sequenceLength": int(max(1, min(int(sequence_length), len(obs_batches)))),
        "steps": int(steps),
        "samples": int(observations_np.shape[0] * observations_np.shape[1]),
        "batchSize": int(batch_size),
        "elapsedSeconds": time.time() - started,
        "expert": {
            "controller": "force = -(8*x + 4*v - 60*theta - 16*omega)",
            "maxStrictScore": float(expert_max_score),
            "maxHeldSeconds": float(expert_max_held),
            "solvedOneSecond": bool(expert_max_held >= 1.0),
        },
        "losses": losses,
        "notes": [
            "This is learned stabilizer warmup for the policy, not a score-counting teacher solve.",
            "Down-start promotion still requires held-out learned policy one-second hold from pure down-start.",
        ],
    }


def warmup_with_trajectory_bc(
    policy,
    trajectory_file: Path | None,
    epochs: int,
    hidden_dim: int,
    sequence_length: int,
    learning_rate: float,
) -> dict:
    if trajectory_file is None or int(epochs) <= 0:
        return {"enabled": False}
    started = time.time()
    trajectory_files = sorted(trajectory_file.glob("*.npz")) if trajectory_file.is_dir() else [trajectory_file]
    trajectories = []
    file_summaries = []
    for path in trajectory_files:
        data = np.load(path)
        observations = np.asarray(data["observations"], dtype=np.float32)
        actions = np.asarray(data["actions"], dtype=np.float32)
        if observations.ndim == 2:
            observations = observations[:, None, :]
        if actions.ndim == 1:
            actions = actions[:, None]
        if observations.ndim != 3 or actions.ndim != 2:
            raise ValueError("Expected trajectory observations [steps, worlds, obs] and actions [steps, worlds]")
        if observations.shape[0] != actions.shape[0] or observations.shape[1] != actions.shape[1]:
            raise ValueError("Trajectory observation/action step or world dimensions do not match")
        if observations.shape[2] != OBS_DIM:
            raise ValueError(f"Trajectory obs dim {observations.shape[2]} does not match trainer obs dim {OBS_DIM}")
        trajectories.append((observations, actions))
        file_summaries.append(
            {
                "path": str(path),
                "steps": int(observations.shape[0]),
                "worlds": int(observations.shape[1]),
                "samples": int(observations.shape[0] * observations.shape[1]),
                "actionAbsMean": float(np.mean(np.abs(actions))),
                "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
            }
        )
    if not trajectories:
        raise ValueError(f"No .npz trajectory files found at {trajectory_file}")
    losses = train_energy_teacher_bc_sequences(
        policy,
        trajectories,
        epochs,
        hidden_dim,
        sequence_length,
        "trajectory",
        learning_rate,
    )
    return {
        "enabled": True,
        "path": str(trajectory_file),
        "trajectoryFiles": file_summaries,
        "epochs": int(epochs),
        "learningRate": float(learning_rate),
        "sequenceLength": int(max(8, min(int(sequence_length), max(item["steps"] for item in file_summaries)))),
        "trajectoryCount": int(len(trajectories)),
        "samples": int(sum(item["samples"] for item in file_summaries)),
        "actionAbsMean": float(np.mean([item["actionAbsMean"] for item in file_summaries])),
        "actionAbsMax": float(max(item["actionAbsMax"] for item in file_summaries)),
        "elapsedSeconds": time.time() - started,
        "losses": losses,
        "notes": [
            "This distills a saved MJWarp exact-down trajectory into the recurrent policy.",
            "The trajectory may come from a teacher/controller scaffold and still does not count as a learned solve.",
            "Only held-out learned down-start evaluation can promote the Puffer lane.",
        ],
    }


def warmup_with_parameterized_teacher_dagger(
    mjcf_xml: str,
    policy,
    teacher_source: Path | None,
    epochs: int,
    links: int,
    nworld: int,
    steps: int,
    seed: int,
    hidden_dim: int,
    force_scale: float,
    sequence_length: int,
    learning_rate: float,
    dagger_iterations: int,
    teacher_limit: int,
    pose: str = "exact-down",
) -> dict:
    if teacher_source is None or int(epochs) <= 0:
        return {"enabled": False}
    started = time.time()
    configs = load_parameterized_teacher_configs(teacher_source, teacher_limit)
    trajectories = []
    iteration_summaries = []
    losses = []
    iterations = max(1, int(dagger_iterations))
    epochs_per_iteration = max(1, int(epochs) // iterations)
    for iteration in range(iterations):
        observations, actions, summary = collect_parameterized_teacher_labeled_trajectory(
            mjcf_xml,
            policy if iteration > 0 else None,
            configs,
            links,
            nworld,
            steps,
            seed + 70_000 + iteration,
            hidden_dim,
            force_scale,
            pose,
        )
        trajectories.append((observations, actions))
        iteration_summaries.append(
            {
                "iteration": iteration + 1,
                "policyVisitedStates": bool(iteration > 0),
                "steps": int(observations.shape[0]),
                "worlds": int(observations.shape[1]),
                "samples": int(observations.shape[0] * observations.shape[1]),
                "actionAbsMean": float(np.mean(np.abs(actions))),
                "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
                "teacherRollout": summary,
            }
        )
        losses.extend(
            train_energy_teacher_bc_sequences(
                policy,
                trajectories,
                epochs_per_iteration,
                hidden_dim,
                sequence_length,
                f"parameterized-teacher-dagger-{iteration + 1}",
                learning_rate,
            )
        )
    return {
        "enabled": True,
        "source": str(teacher_source),
        "teacherConfigCount": int(len(configs)),
        "epochs": int(epochs_per_iteration * iterations),
        "requestedEpochs": int(epochs),
        "epochsPerIteration": int(epochs_per_iteration),
        "learningRate": float(learning_rate),
        "sequenceLength": int(max(8, min(int(sequence_length), int(steps)))),
        "daggerIterations": int(iterations),
        "stepsPerIteration": int(steps),
        "pose": str(pose),
        "samples": int(sum(item["samples"] for item in iteration_summaries)),
        "elapsedSeconds": time.time() - started,
        "iterations": iteration_summaries,
        "losses": losses,
        "notes": [
            "Labels exact-down states with the best parameterized swing-up teacher family.",
            "Later iterations label states visited by the current stochastic learner.",
            "This is a scaffolded training signal only; score still requires held-out learned down-start evaluation.",
        ],
    }


def collect_recurrent_rollout(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    steps: int,
    pose: str,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    stochastic: bool,
    random_horizon: bool = False,
    min_horizon: int = 160,
    max_horizon: int = 512,
    terminal_boundary: float = HARD_RAIL_BOUNDARY,
    reward_mode: str = "default",
    snapshot_qpos: np.ndarray | None = None,
    snapshot_qvel: np.ndarray | None = None,
    snapshot_last_actions: np.ndarray | None = None,
    snapshot_hidden: np.ndarray | None = None,
    record_hidden_states: bool = False,
) -> dict:
    import mujoco
    import mujoco_warp as mjw
    import torch
    import warp as wp

    started = time.time()
    mjm = mujoco.MjModel.from_xml_string(mjcf_xml)
    model = mjw.put_model(mjm)
    data = mjw.make_data(mjm, nworld=int(nworld))
    device = str(getattr(data.qpos, "device", "cpu"))
    torch_device = torch.device(device if device.startswith("cuda") else "cpu")
    policy.to(torch_device)
    state_width = int(mjm.nq)
    if int(mjm.nv) != state_width:
        raise ValueError(f"Snapshot recorder expects nq == nv for this cartpole MJCF; got nq={mjm.nq}, nv={mjm.nv}")
    runner = WarpScoreKernel(
        nworld=nworld,
        links=links,
        action_scale=force_scale,
        device=device,
        terminal_boundary=terminal_boundary,
        reward_mode=reward_mode,
    )
    horizon = max(1, int(steps) + 1)
    random_horizon_enabled = bool(random_horizon)
    if random_horizon_enabled:
        min_horizon = max(1, int(min_horizon))
        max_horizon = max(min_horizon, int(max_horizon))
    pose_hold = pose == "hold"
    snapshot_reset_enabled = snapshot_qpos is not None and snapshot_qvel is not None
    source_qpos_wp = None
    source_qvel_wp = None
    source_last_action_wp = None
    snapshot_hidden_torch = None
    reset_hidden_torch = None
    source_count = 0
    if snapshot_reset_enabled:
        snapshot_qpos_np = np.asarray(snapshot_qpos, dtype=np.float32)
        snapshot_qvel_np = np.asarray(snapshot_qvel, dtype=np.float32)
        if snapshot_qpos_np.ndim != 2 or snapshot_qpos_np.shape[1] != state_width:
            raise ValueError(f"snapshot_qpos must have shape (N, {state_width})")
        if snapshot_qvel_np.shape != snapshot_qpos_np.shape:
            raise ValueError("snapshot_qvel shape must match snapshot_qpos")
        if snapshot_qpos_np.shape[0] <= 0:
            raise ValueError("snapshot reset requires at least one source state")
        if snapshot_last_actions is None:
            snapshot_last_action_np = np.zeros(snapshot_qpos_np.shape[0], dtype=np.float32)
        else:
            snapshot_last_action_np = np.asarray(snapshot_last_actions, dtype=np.float32).reshape(-1)
            if snapshot_last_action_np.shape[0] != snapshot_qpos_np.shape[0]:
                raise ValueError("snapshot_last_actions length must match snapshot_qpos")
        if snapshot_hidden is not None:
            snapshot_hidden_np = np.asarray(snapshot_hidden, dtype=np.float32)
            if snapshot_hidden_np.ndim != 2 or snapshot_hidden_np.shape != (snapshot_qpos_np.shape[0], int(hidden_dim)):
                raise ValueError(f"snapshot_hidden must have shape (N, {int(hidden_dim)})")
            snapshot_hidden_torch = torch.as_tensor(snapshot_hidden_np, dtype=torch.float32, device=torch_device)
        source_qpos_wp = wp.array(snapshot_qpos_np, dtype=wp.float32, device=device)
        source_qvel_wp = wp.array(snapshot_qvel_np, dtype=wp.float32, device=device)
        source_last_action_wp = wp.array(snapshot_last_action_np, dtype=wp.float32, device=device)
        source_count = int(snapshot_qpos_np.shape[0])
    obs_buffer = wp.zeros(int(steps) * int(nworld) * OBS_DIM, dtype=wp.float32, device=device)
    reward_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    terminal_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    truncation_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    action_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    normalized_action_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    logprob_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    value_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    qpos_buffer = wp.zeros(int(steps) * int(nworld) * state_width, dtype=wp.float32, device=device)
    qvel_buffer = wp.zeros(int(steps) * int(nworld) * state_width, dtype=wp.float32, device=device)
    state_last_action_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
    hidden_buffer_torch = None
    if bool(record_hidden_states):
        hidden_buffer_torch = torch.empty(
            int(steps),
            int(nworld),
            int(hidden_dim),
            dtype=torch.float32,
            device=torch_device,
        )
    torch_hidden = torch.zeros(int(nworld), int(hidden_dim), dtype=torch.float32, device=torch_device)
    if snapshot_hidden_torch is not None:
        source_index_torch = torch.arange(int(nworld), device=torch_device) % int(source_count)
        reset_hidden_torch = snapshot_hidden_torch[source_index_torch].detach().clone()
        torch_hidden = reset_hidden_torch.clone()

    if snapshot_reset_enabled:
        runner.reset_from_snapshots(
            data.qpos,
            data.qvel,
            data.ctrl,
            source_qpos_wp,
            source_qvel_wp,
            source_last_action_wp,
            source_count,
            state_width,
            seed,
            reset_all=True,
            synchronize=False,
            cycle_sources=snapshot_hidden_torch is not None,
            random_horizon=random_horizon_enabled,
            min_horizon=min_horizon,
            max_horizon=max_horizon,
        )
    else:
        runner.reset_worlds(
            data.qpos,
            data.qvel,
            data.ctrl,
            pose,
            seed,
            reset_all=True,
            synchronize=False,
            random_horizon=random_horizon_enabled,
            min_horizon=min_horizon,
            max_horizon=max_horizon,
        )
    mjw.forward(model, data)
    runner.score_device(data.qpos, data.qvel, synchronize=False)
    runner.initialize_prev_potential_from_current(synchronize=False)

    for step_index in range(int(steps)):
        obs_torch = wp.to_torch(runner.obs_wp).reshape(int(nworld), OBS_DIM).to(torch_device)
        if hidden_buffer_torch is not None:
            hidden_buffer_torch[step_index].copy_(torch_hidden.detach())
        wp.launch(
            record_rollout_obs_kernel,
            dim=(int(nworld), OBS_DIM),
            inputs=[runner.obs_wp, int(step_index), int(nworld), obs_buffer],
            device=device,
        )
        wp.launch(
            record_rollout_state_kernel,
            dim=(int(nworld), state_width),
            inputs=[
                data.qpos,
                data.qvel,
                runner.last_action_wp,
                int(step_index),
                int(nworld),
                int(state_width),
                qpos_buffer,
                qvel_buffer,
                state_last_action_buffer,
            ],
            device=device,
        )
        with torch.no_grad():
            action_torch, logprob_torch, value_torch, torch_hidden = policy(
                obs_torch,
                torch_hidden,
                deterministic=not stochastic,
            )
        action_vector_wp = wp.from_torch(action_torch, dtype=wp.float32)
        logprob_wp = wp.from_torch(logprob_torch, dtype=wp.float32)
        value_wp = wp.from_torch(value_torch, dtype=wp.float32)
        runner.apply_action_vector(action_vector_wp, data.ctrl, synchronize=False)
        mjw.step(model, data)
        runner.score_device(data.qpos, data.qvel, synchronize=False)
        runner.post_step_device(pose_hold, horizon, synchronize=False)
        wp.launch(
            record_rollout_scalars_kernel,
            dim=int(nworld),
            inputs=[
                runner.final_reward_wp,
                runner.terminal_wp,
                runner.truncation_wp,
                runner.last_action_wp,
                int(step_index),
                int(nworld),
                reward_buffer,
                terminal_buffer,
                truncation_buffer,
                action_buffer,
            ],
            device=device,
        )
        wp.launch(
            record_policy_scalars_kernel,
            dim=int(nworld),
            inputs=[
                action_vector_wp,
                logprob_wp,
                value_wp,
                int(step_index),
                int(nworld),
                normalized_action_buffer,
                logprob_buffer,
                value_buffer,
            ],
            device=device,
        )
        done_torch = (
            (wp.to_torch(runner.terminal_wp) > 0.5) | (wp.to_torch(runner.truncation_wp) > 0.5)
        ).to(torch_device)
        if bool(done_torch.any()):
            torch_hidden = torch_hidden.clone()
            if reset_hidden_torch is not None:
                torch_hidden[done_torch] = reset_hidden_torch[done_torch]
            else:
                torch_hidden[done_torch] = 0.0
        if snapshot_reset_enabled:
            runner.reset_from_snapshots(
                data.qpos,
                data.qvel,
                data.ctrl,
                source_qpos_wp,
                source_qvel_wp,
                source_last_action_wp,
                source_count,
                state_width,
                seed,
                reset_all=False,
                synchronize=False,
                cycle_sources=snapshot_hidden_torch is not None,
                random_horizon=random_horizon_enabled,
                min_horizon=min_horizon,
                max_horizon=max_horizon,
            )
        else:
            runner.reset_worlds(
                data.qpos,
                data.qvel,
                data.ctrl,
                pose,
                seed,
                reset_all=False,
                synchronize=False,
                random_horizon=random_horizon_enabled,
                min_horizon=min_horizon,
                max_horizon=max_horizon,
            )
        mjw.forward(model, data)
        runner.score_device(data.qpos, data.qvel, synchronize=False)
        runner.sync_reset_potential(synchronize=False)

    wp.synchronize()
    control_dt = float(mjm.opt.timestep)
    strict_score = runner.rollout_max_strict_score_wp.numpy()
    max_held_steps = runner.rollout_max_held_steps_wp.numpy()
    reward_np = reward_buffer.numpy().reshape(int(steps), int(nworld))
    terminal_np = terminal_buffer.numpy().reshape(int(steps), int(nworld))
    truncation_np = truncation_buffer.numpy().reshape(int(steps), int(nworld))
    action_np = action_buffer.numpy().reshape(int(steps), int(nworld))
    normalized_action_np = normalized_action_buffer.numpy().reshape(int(steps), int(nworld))
    qpos_np = qpos_buffer.numpy().reshape(int(steps), int(nworld), state_width)
    qvel_np = qvel_buffer.numpy().reshape(int(steps), int(nworld), state_width)
    state_last_action_np = state_last_action_buffer.numpy().reshape(int(steps), int(nworld))
    obs_np = obs_buffer.numpy().reshape(int(steps), int(nworld), OBS_DIM)
    hidden_np = hidden_buffer_torch.detach().cpu().numpy() if hidden_buffer_torch is not None else None
    reset_hidden_np = reset_hidden_torch.detach().cpu().numpy() if reset_hidden_torch is not None else None
    cart_abs_np = np.abs(obs_np[:, :, 0])
    theta_np = np.arctan2(obs_np[:, :, 3], obs_np[:, :, 4])
    omega_np = obs_np[:, :, 7] * 8.0
    catch_basin_np = (np.abs(theta_np) < 0.36) & (np.abs(omega_np) < 3.0) & (cart_abs_np < 2.2)
    near_top_np = np.abs(theta_np) < 0.5
    rail_np = cart_abs_np > 2.1
    near_top_before_rail_np = near_top_np & (~rail_np)
    catch_before_rail_np = catch_basin_np & (~rail_np)
    first_catch = np.argwhere(catch_basin_np)
    first_near_top = np.argwhere(near_top_np)
    first_rail = np.argwhere(rail_np)
    horizon_steps = runner.horizon_steps_wp.numpy()

    result = {
        "summary": {
            "pose": pose,
            "rewardMode": str(reward_mode),
            "steps": int(steps),
            "nworld": int(nworld),
            "stochastic": bool(stochastic),
            "randomHorizonEnabled": random_horizon_enabled,
            "randomHorizonMinSteps": int(min_horizon) if random_horizon_enabled else 0,
            "randomHorizonMaxSteps": int(max_horizon) if random_horizon_enabled else 0,
            "randomHorizonCurrentMin": int(np.min(horizon_steps)) if random_horizon_enabled and horizon_steps.size else 0,
            "randomHorizonCurrentMax": int(np.max(horizon_steps)) if random_horizon_enabled and horizon_steps.size else 0,
            "snapshotResetEnabled": bool(snapshot_reset_enabled),
            "snapshotSourceCount": int(source_count),
            "snapshotHiddenRestored": bool(snapshot_hidden_torch is not None),
            "hiddenStatesRecorded": bool(hidden_np is not None),
            "elapsedSeconds": time.time() - started,
            "simulatedSteps": int(steps) * int(nworld),
            "sps": (int(steps) * int(nworld)) / max(time.time() - started, 1e-9),
            "rewardMean": float(np.mean(reward_np)),
            "actionAbsMean": float(np.mean(np.abs(action_np))),
            "actionAbsMax": float(np.max(np.abs(action_np))) if action_np.size else 0.0,
            "normalizedActionAbsMean": float(np.mean(np.abs(normalized_action_np))),
            "normalizedActionAbsMax": float(np.max(np.abs(normalized_action_np))) if normalized_action_np.size else 0.0,
            "cartAbsMean": float(np.mean(cart_abs_np)) if cart_abs_np.size else 0.0,
            "cartAbsMax": float(np.max(cart_abs_np)) if cart_abs_np.size else 0.0,
            "catchBasinStepCount": int(np.sum(catch_basin_np)),
            "catchBasinWorldRate": float(np.mean(np.any(catch_basin_np, axis=0))) if catch_basin_np.size else 0.0,
            "firstCatchSeconds": float(first_catch[0][0] * control_dt) if first_catch.size else None,
            "nearTopStepCount": int(np.sum(near_top_np)),
            "nearTopWorldRate": float(np.mean(np.any(near_top_np, axis=0))) if near_top_np.size else 0.0,
            "firstNearTopSeconds": float(first_near_top[0][0] * control_dt) if first_near_top.size else None,
            "railWorldRate": float(np.mean(np.any(rail_np, axis=0))) if rail_np.size else 0.0,
            "firstRailSeconds": float(first_rail[0][0] * control_dt) if first_rail.size else None,
            "nearTopBeforeRailWorldRate": float(np.mean(np.any(near_top_before_rail_np, axis=0)))
            if near_top_before_rail_np.size
            else 0.0,
            "catchBeforeRailWorldRate": float(np.mean(np.any(catch_before_rail_np, axis=0)))
            if catch_before_rail_np.size
            else 0.0,
            "phaseDiagnostics": summarize_phase_diagnostics(obs_np, normalized_action_np, control_dt),
            "terminalCount": int(np.sum(terminal_np > 0.5)),
            "truncationCount": int(np.sum(truncation_np > 0.5)),
            "maxStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
            "maxHeldSeconds": float(np.max(max_held_steps) * control_dt) if max_held_steps.size else 0.0,
            "solvedOneSecond": bool(max_held_steps.size and np.max(max_held_steps) * control_dt >= 1.0),
        },
        "buffers": {
            "obs": obs_np,
            "actions": normalized_action_np,
            "logprobs": logprob_buffer.numpy().reshape(int(steps), int(nworld)),
            "values": value_buffer.numpy().reshape(int(steps), int(nworld)),
            "rewards": reward_np,
            "terminals": terminal_np,
            "truncations": truncation_np,
            "qpos": qpos_np,
            "qvel": qvel_np,
            "stateLastActions": state_last_action_np,
            "maxHeldSecondsByWorld": max_held_steps.astype(np.float32) * control_dt,
            "maxStrictScoreByWorld": strict_score.astype(np.float32),
        },
    }
    if hidden_np is not None:
        result["buffers"]["hiddenStates"] = hidden_np
    if reset_hidden_np is not None:
        result["buffers"]["initialHidden"] = reset_hidden_np
        result["buffers"]["resetHidden"] = reset_hidden_np
    return result


def ppo_update(
    policy,
    optimizer,
    buffers: dict,
    hidden_dim: int,
    epochs: int,
    gamma: float,
    gae_lambda: float,
    clip_coef: float,
    entropy_coef: float,
    energy_teacher_anchor_weight: float = 0.0,
    force_scale: float = DEFAULT_ACTION_SCALE,
) -> dict:
    import torch

    device = next(policy.parameters()).device
    obs = torch.as_tensor(buffers["obs"], dtype=torch.float32, device=device)
    actions = torch.as_tensor(buffers["actions"], dtype=torch.float32, device=device)
    old_logprob = torch.as_tensor(buffers["logprobs"], dtype=torch.float32, device=device)
    old_value = torch.as_tensor(buffers["values"], dtype=torch.float32, device=device)
    rewards = torch.as_tensor(buffers["rewards"], dtype=torch.float32, device=device)
    done = torch.as_tensor(
        (buffers["terminals"] > 0.5) | (buffers["truncations"] > 0.5),
        dtype=torch.float32,
        device=device,
    )
    steps, nworld, _ = obs.shape
    initial_hidden = torch.zeros(nworld, int(hidden_dim), dtype=torch.float32, device=device)
    if "initialHidden" in buffers:
        initial_hidden = torch.as_tensor(buffers["initialHidden"], dtype=torch.float32, device=device)
        if tuple(initial_hidden.shape) != (nworld, int(hidden_dim)):
            raise ValueError(f"initialHidden must have shape ({nworld}, {int(hidden_dim)})")
    reset_hidden = torch.zeros(nworld, int(hidden_dim), dtype=torch.float32, device=device)
    if "resetHidden" in buffers:
        reset_hidden = torch.as_tensor(buffers["resetHidden"], dtype=torch.float32, device=device)
        if tuple(reset_hidden.shape) != (nworld, int(hidden_dim)):
            raise ValueError(f"resetHidden must have shape ({nworld}, {int(hidden_dim)})")
    advantages = torch.zeros(steps, nworld, dtype=torch.float32, device=device)
    last_gae = torch.zeros(nworld, dtype=torch.float32, device=device)
    next_value = old_value[-1] * (1.0 - done[-1])
    for step in range(steps - 1, -1, -1):
        next_nonterminal = 1.0 - done[step]
        delta = rewards[step] + gamma * next_value * next_nonterminal - old_value[step]
        last_gae = delta + gamma * gae_lambda * next_nonterminal * last_gae
        advantages[step] = last_gae
        next_value = old_value[step]
    returns = advantages + old_value
    normalized_advantage = (advantages - advantages.mean()) / (advantages.std() + 1e-6)

    before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    history = []
    for epoch_index in range(max(1, int(epochs))):
        hidden = initial_hidden.clone()
        logprob_steps = []
        value_steps = []
        entropy_steps = []
        deterministic_action_steps = []
        for step in range(steps):
            if float(energy_teacher_anchor_weight) > 0.0:
                deterministic_action, _, _, _ = policy(obs[step], hidden, deterministic=True)
                deterministic_action_steps.append(deterministic_action.reshape(-1))
            logprob, entropy, value, hidden = policy.evaluate_actions(obs[step], hidden, actions[step])
            logprob_steps.append(logprob)
            value_steps.append(value)
            entropy_steps.append(entropy)
            if step < steps - 1 and bool(done[step].any()):
                hidden = hidden.clone()
                hidden[done[step] > 0.5] = reset_hidden[done[step] > 0.5]
        new_logprob = torch.stack(logprob_steps)
        new_value = torch.stack(value_steps)
        entropy = torch.stack(entropy_steps)
        ratio = torch.exp(new_logprob - old_logprob)
        logratio = new_logprob - old_logprob
        approx_kl = ((ratio - 1.0) - logratio).mean()
        clipfrac = ((ratio - 1.0).abs() > float(clip_coef)).float().mean()
        policy_loss = torch.max(
            -normalized_advantage * ratio,
            -normalized_advantage * torch.clamp(ratio, 1.0 - clip_coef, 1.0 + clip_coef),
        ).mean()
        value_clipped = old_value + torch.clamp(new_value - old_value, -clip_coef, clip_coef)
        value_loss = 0.5 * torch.max((new_value - returns).pow(2), (value_clipped - returns).pow(2)).mean()
        entropy_loss = entropy.mean()
        teacher_anchor_loss = torch.tensor(0.0, dtype=torch.float32, device=device)
        if float(energy_teacher_anchor_weight) > 0.0 and deterministic_action_steps:
            teacher_actions = energy_teacher_action_from_obs_torch(obs, force_scale)
            deterministic_actions = torch.stack(deterministic_action_steps)
            teacher_anchor_loss = (deterministic_actions - teacher_actions).pow(2).mean()
        loss = (
            policy_loss
            + 0.5 * value_loss
            - float(entropy_coef) * entropy_loss
            + float(energy_teacher_anchor_weight) * teacher_anchor_loss
        )
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7).detach())
        optimizer.step()
        after_epoch = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
        history.append(
            {
                "epoch": epoch_index + 1,
                "policyLoss": float(policy_loss.detach()),
                "valueLoss": float(value_loss.detach()),
                "entropy": float(entropy_loss.detach()),
                "teacherAnchorLoss": float(teacher_anchor_loss.detach()),
                "loss": float(loss.detach()),
                "ratioMean": float(ratio.detach().mean()),
                "ratioMax": float(ratio.detach().max()),
                "approxKl": float(approx_kl.detach()),
                "clipFrac": float(clipfrac.detach()),
                "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                "gradNorm": grad_norm,
                "parameterDeltaL2": float(torch.linalg.vector_norm(after_epoch - before)),
            }
        )
    after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    return {
        "updateEpochs": int(max(1, int(epochs))),
        "gamma": float(gamma),
        "gaeLambda": float(gae_lambda),
        "clipCoef": float(clip_coef),
        "entropyCoef": float(entropy_coef),
        "energyTeacherAnchorWeight": float(energy_teacher_anchor_weight),
        "updatedParameters": bool(float(torch.linalg.vector_norm(after - before)) > 0.0),
        "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
        "advantageMean": float(advantages.mean()),
        "advantageStd": float(advantages.std()),
        "history": history,
    }


def elite_bc_window_mask(
    observations: np.ndarray,
    links: int,
    window_mode: str,
    window_padding_steps: int,
    catch_angle: float,
    catch_speed: float,
) -> np.ndarray:
    loss_mask = np.ones(observations.shape[:2], dtype=bool)
    if window_mode == "full":
        return loss_mask
    cart_abs = np.abs(observations[..., 0])
    max_angle = np.zeros(observations.shape[:2], dtype=np.float32)
    mean_speed = np.zeros(observations.shape[:2], dtype=np.float32)
    active_links = max(1, min(int(links), 6))
    for link_index in range(active_links):
        cursor = 3 + link_index * 5
        angle = np.abs(np.arctan2(observations[..., cursor], observations[..., cursor + 1]))
        speed = np.abs(observations[..., cursor + 4] * 8.0)
        max_angle = np.maximum(max_angle, angle.astype(np.float32, copy=False))
        mean_speed += speed.astype(np.float32, copy=False)
    mean_speed /= float(active_links)
    catch_mask = (max_angle < float(catch_angle)) & (mean_speed < float(catch_speed)) & (cart_abs < 2.2)
    near_top_mask = (max_angle < max(float(catch_angle), 0.72)) & (cart_abs < 2.35)
    if window_mode == "catch":
        loss_mask = catch_mask
    elif window_mode == "near-top":
        loss_mask = near_top_mask
    elif window_mode in {"success-prefix", "precatch-catch"}:
        loss_mask = np.zeros(observations.shape[:2], dtype=bool)
        padding = max(0, int(window_padding_steps))
        anchor_mask = catch_mask | near_top_mask
        for world_index in range(anchor_mask.shape[1]):
            anchor_steps = np.flatnonzero(anchor_mask[:, world_index])
            if anchor_steps.size == 0:
                continue
            anchor_step = int(anchor_steps[0])
            if window_mode == "success-prefix":
                start = 0
            else:
                start = max(0, anchor_step - padding)
            stop = min(anchor_mask.shape[0], anchor_step + padding + 1)
            loss_mask[start:stop, world_index] = True
        return loss_mask
    else:
        raise ValueError(f"Unsupported elite rollout BC window mode: {window_mode}")
    if int(window_padding_steps) > 0 and loss_mask.any():
        padded = loss_mask.copy()
        padding = int(window_padding_steps)
        for step_index in range(loss_mask.shape[0]):
            start = max(0, step_index - padding)
            stop = min(loss_mask.shape[0], step_index + padding + 1)
            padded[step_index] = np.any(loss_mask[start:stop], axis=0)
        loss_mask = padded
    return loss_mask


def elite_bc_window_quality(
    observations: np.ndarray,
    links: int,
    catch_angle: float,
    catch_speed: float,
) -> np.ndarray:
    cart_abs = np.abs(observations[..., 0])
    max_angle = np.zeros(observations.shape[:2], dtype=np.float32)
    mean_speed = np.zeros(observations.shape[:2], dtype=np.float32)
    active_links = max(1, min(int(links), 6))
    for link_index in range(active_links):
        cursor = 3 + link_index * 5
        angle = np.abs(np.arctan2(observations[..., cursor], observations[..., cursor + 1]))
        speed = np.abs(observations[..., cursor + 4] * 8.0)
        max_angle = np.maximum(max_angle, angle.astype(np.float32, copy=False))
        mean_speed += speed.astype(np.float32, copy=False)
    mean_speed /= float(active_links)
    angle_scale = max(float(catch_angle), 1e-3)
    speed_scale = max(float(catch_speed), 1e-3)
    angle_quality = np.clip(1.0 - max_angle / angle_scale, 0.0, 1.0)
    speed_quality = np.clip(1.0 - mean_speed / speed_scale, 0.0, 1.0)
    center_quality = np.clip(1.0 - cart_abs / 2.35, 0.0, 1.0)
    return (0.25 + angle_quality * speed_quality * center_quality).astype(np.float32, copy=False)


def elite_rollout_bc_update(
    policy,
    buffers: dict,
    hidden_dim: int,
    links: int,
    epochs: int,
    min_held_seconds: float,
    learning_rate: float,
    fallback_min_held_seconds: float,
    top_k: int,
    window_mode: str = "full",
    window_padding_steps: int = 0,
    catch_angle: float = 0.55,
    catch_speed: float = 3.2,
    objective: str = "mse",
    weight_power: float = 1.0,
) -> dict:
    import torch

    if int(epochs) <= 0:
        return {"enabled": False}
    held_seconds = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32)
    strict_score = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32)
    if held_seconds.size == 0:
        return {"enabled": True, "selectedWorlds": 0, "reason": "rollout did not expose per-world hold metrics"}
    elite_worlds = np.where(held_seconds >= float(min_held_seconds))[0]
    selector = "elite"
    if elite_worlds.size == 0:
        best_index = int(np.argmax(held_seconds))
        best_held = float(held_seconds[best_index])
        if best_held < float(fallback_min_held_seconds):
            if window_mode == "full":
                return {
                    "enabled": True,
                    "selectedWorlds": 0,
                    "minHeldSeconds": float(min_held_seconds),
                    "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
                    "bestHeldSeconds": best_held,
                    "bestStrictScore": float(strict_score[best_index]) if strict_score.size else 0.0,
                    "reason": "no rollout world reached elite or fallback hold threshold",
                }
            window_mask = elite_bc_window_mask(
                buffers["obs"],
                links,
                window_mode,
                window_padding_steps,
                catch_angle,
                catch_speed,
            )
            candidate = np.where(np.any(window_mask, axis=0))[0]
            if candidate.size == 0:
                return {
                    "enabled": True,
                    "selectedWorlds": 0,
                    "minHeldSeconds": float(min_held_seconds),
                    "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
                    "windowMode": window_mode,
                    "bestHeldSeconds": best_held,
                    "bestStrictScore": float(strict_score[best_index]) if strict_score.size else 0.0,
                    "reason": "no rollout world reached elite, fallback hold, or requested window threshold",
                }
            window_counts = np.sum(window_mask[:, candidate], axis=0)
            order = sorted(
                range(candidate.size),
                key=lambda offset: (
                    int(window_counts[offset]),
                    float(strict_score[candidate[offset]]) if strict_score.size else 0.0,
                    float(held_seconds[candidate[offset]]),
                ),
                reverse=True,
            )
            candidate_count = max(1, min(int(top_k), candidate.size))
            elite_worlds = candidate[np.asarray(order[:candidate_count], dtype=np.int64)]
            selector = "fallback-window-top-k"
        else:
            ordered = np.argsort(-held_seconds)
            candidate_count = max(1, min(int(top_k), held_seconds.size))
            elite_worlds = ordered[:candidate_count]
            selector = "fallback-top-k"

    device = next(policy.parameters()).device
    selected_obs_np = buffers["obs"][:, elite_worlds, :]
    loss_mask_np = elite_bc_window_mask(
        selected_obs_np,
        links,
        window_mode,
        window_padding_steps,
        catch_angle,
        catch_speed,
    )
    if not loss_mask_np.any():
        return {
            "enabled": True,
            "epochs": int(epochs),
            "learningRate": float(learning_rate),
            "minHeldSeconds": float(min_held_seconds),
            "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
            "topK": int(top_k),
            "selector": selector,
            "windowMode": window_mode,
            "selectedWorlds": int(elite_worlds.size),
            "selectedWorldIndices": [int(index) for index in elite_worlds.tolist()],
            "selectedLossSteps": 0,
            "reason": "selected elite worlds did not enter the requested catch window",
        }
    obs = torch.as_tensor(selected_obs_np, dtype=torch.float32, device=device)
    actions = torch.as_tensor(buffers["actions"][:, elite_worlds], dtype=torch.float32, device=device)
    done = torch.as_tensor(
        ((buffers["terminals"][:, elite_worlds] > 0.5) | (buffers["truncations"][:, elite_worlds] > 0.5)),
        dtype=torch.bool,
        device=device,
    )
    loss_mask = torch.as_tensor(loss_mask_np, dtype=torch.bool, device=device)
    weight_np = elite_bc_window_quality(selected_obs_np, links, catch_angle, catch_speed)
    if float(weight_power) != 1.0:
        weight_np = np.power(weight_np, max(float(weight_power), 0.0)).astype(np.float32, copy=False)
    weights = torch.as_tensor(weight_np, dtype=torch.float32, device=device)
    steps, selected_worlds, _ = obs.shape
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    marker_epochs = {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}
    losses = []
    before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for epoch_index in range(int(epochs)):
        hidden = torch.zeros(selected_worlds, int(hidden_dim), dtype=torch.float32, device=device)
        loss_terms = []
        for step_index in range(int(steps)):
            if objective == "nll":
                logprob, _entropy, _value, hidden = policy.evaluate_actions(obs[step_index], hidden, actions[step_index])
            else:
                predicted, _, _, hidden = policy(obs[step_index], hidden, deterministic=True)
            active = loss_mask[step_index]
            if bool(active.any()):
                active_weight = weights[step_index][active].detach()
                active_weight = active_weight / (active_weight.mean() + 1e-6)
                if objective == "nll":
                    loss_terms.append(((-logprob[active]) * active_weight).mean())
                elif objective == "mse":
                    loss_terms.append(
                        ((predicted.reshape(-1)[active] - actions[step_index][active]).pow(2) * active_weight).mean()
                    )
                else:
                    raise ValueError(f"Unsupported elite rollout BC objective: {objective}")
            if step_index < steps - 1 and bool(done[step_index].any()):
                hidden = hidden.clone()
                hidden[done[step_index]] = 0.0
        if not loss_terms:
            return {
                "enabled": True,
                "epochs": int(epochs),
                "learningRate": float(learning_rate),
                "selector": selector,
                "windowMode": window_mode,
                "selectedWorlds": int(selected_worlds),
                "selectedWorldIndices": [int(index) for index in elite_worlds.tolist()],
                "selectedLossSteps": 0,
                "reason": "no loss terms after applying catch window mask",
            }
        loss = torch.stack(loss_terms).mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7).detach())
        optimizer.step()
        if epoch_index in marker_epochs:
            losses.append({"epoch": epoch_index + 1, "loss": float(loss.detach()), "gradNorm": grad_norm})
    after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    selected_held = held_seconds[elite_worlds]
    selected_score = strict_score[elite_worlds] if strict_score.size else np.zeros_like(selected_held)
    return {
        "enabled": True,
        "epochs": int(epochs),
        "learningRate": float(learning_rate),
        "minHeldSeconds": float(min_held_seconds),
        "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
        "topK": int(top_k),
        "selector": selector,
        "windowMode": window_mode,
        "windowPaddingSteps": int(window_padding_steps),
        "catchAngle": float(catch_angle),
        "catchSpeed": float(catch_speed),
        "objective": str(objective),
        "weightPower": float(weight_power),
        "selectedWorlds": int(selected_worlds),
        "selectedWorldIndices": [int(index) for index in elite_worlds.tolist()],
        "selectedLossSteps": int(np.sum(loss_mask_np)),
        "selectedLossStepRate": float(np.mean(loss_mask_np)),
        "bestHeldSeconds": float(np.max(selected_held)) if selected_held.size else 0.0,
        "bestStrictScore": float(np.max(selected_score)) if selected_score.size else 0.0,
        "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
        "losses": losses,
    }


def replay_hold_quality(observations: np.ndarray, links: int) -> np.ndarray:
    cart_abs = np.abs(observations[..., 0])
    active_links = max(1, min(int(links), 6))
    max_angle = np.zeros(observations.shape[:2], dtype=np.float32)
    mean_speed = np.zeros(observations.shape[:2], dtype=np.float32)
    for link_index in range(active_links):
        cursor = 3 + link_index * 5
        theta_abs = np.abs(np.arctan2(observations[..., cursor], observations[..., cursor + 1]))
        omega_abs = np.abs(observations[..., cursor + 4] * 8.0)
        max_angle = np.maximum(max_angle, theta_abs.astype(np.float32, copy=False))
        mean_speed += omega_abs.astype(np.float32, copy=False)
    mean_speed /= float(active_links)
    near_top = max_angle < 0.5
    catch = (max_angle < 0.25) & (mean_speed < 2.5) & (cart_abs < 2.2)
    quality = 2.0 * catch.astype(np.float32) + 0.8 * near_top.astype(np.float32)
    quality -= 0.45 * np.minimum(max_angle / 0.8, 4.0).astype(np.float32)
    quality -= 0.14 * np.minimum(mean_speed / 5.0, 4.0).astype(np.float32)
    quality -= 0.20 * np.minimum(cart_abs / 2.35, 4.0).astype(np.float32)
    return quality.astype(np.float32, copy=False)


def smooth_replay_actions(actions: np.ndarray, radius: int) -> np.ndarray:
    if int(radius) <= 0:
        return actions.astype(np.float32, copy=False)
    radius = max(1, int(radius))
    steps = actions.shape[0]
    smoothed = np.empty_like(actions, dtype=np.float32)
    for step_index in range(steps):
        start = max(0, step_index - radius)
        stop = min(steps, step_index + radius + 1)
        smoothed[step_index] = np.mean(actions[start:stop], axis=0)
    return np.clip(smoothed, -1.0, 1.0).astype(np.float32, copy=False)


def load_success_replay_file(path: Path | None, links: int, min_source_held_seconds: float) -> dict:
    if path is None:
        return {"enabled": False}
    data = np.load(path)
    observations = np.asarray(data["obs"] if "obs" in data.files else data["observations"], dtype=np.float32)
    actions = np.asarray(data["actions"], dtype=np.float32)
    rewards = np.asarray(data["rewards"], dtype=np.float32) if "rewards" in data.files else replay_hold_quality(observations, links)
    terminals = np.asarray(data["terminals"], dtype=np.float32) if "terminals" in data.files else np.zeros(actions.shape, dtype=np.float32)
    truncations = np.asarray(data["truncations"], dtype=np.float32) if "truncations" in data.files else np.zeros(actions.shape, dtype=np.float32)
    if observations.ndim == 2:
        observations = observations[:, None, :]
    if actions.ndim == 1:
        actions = actions[:, None]
    if observations.ndim != 3 or actions.ndim != 2:
        raise ValueError("Success replay must contain obs [steps, worlds, obs] and actions [steps, worlds]")
    if observations.shape[:2] != actions.shape:
        raise ValueError("Success replay obs/actions shape mismatch")
    if observations.shape[2] != OBS_DIM:
        raise ValueError(f"Success replay obs dim {observations.shape[2]} does not match {OBS_DIM}")
    if rewards.shape != actions.shape:
        rewards = np.zeros(actions.shape, dtype=np.float32)
    if terminals.shape != actions.shape:
        terminals = np.zeros(actions.shape, dtype=np.float32)
    if truncations.shape != actions.shape:
        truncations = np.zeros(actions.shape, dtype=np.float32)
    selected_held = (
        np.asarray(data["selectedHeldSeconds"], dtype=np.float32).reshape(-1)
        if "selectedHeldSeconds" in data.files
        else np.zeros(actions.shape[1], dtype=np.float32)
    )
    selected_strict = (
        np.asarray(data["selectedStrictScore"], dtype=np.float32).reshape(-1)
        if "selectedStrictScore" in data.files
        else np.zeros(actions.shape[1], dtype=np.float32)
    )
    strongest = float(np.max(selected_held)) if selected_held.size else 0.0
    if strongest < float(min_source_held_seconds):
        return {
            "enabled": False,
            "path": str(path),
            "reason": "source replay below min source held seconds",
            "strongestSourceHoldSeconds": strongest,
            "minSourceHeldSeconds": float(min_source_held_seconds),
        }
    return {
        "enabled": True,
        "path": str(path),
        "observations": observations,
        "actions": actions,
        "rewards": rewards,
        "terminals": terminals,
        "truncations": truncations,
        "qpos": np.asarray(data["qpos"], dtype=np.float32) if "qpos" in data.files else None,
        "qvel": np.asarray(data["qvel"], dtype=np.float32) if "qvel" in data.files else None,
        "stateLastActions": np.asarray(data["stateLastActions"], dtype=np.float32)
        if "stateLastActions" in data.files
        else None,
        "hiddenStates": np.asarray(data["hiddenStates"], dtype=np.float32) if "hiddenStates" in data.files else None,
        "selectedHeldSeconds": selected_held,
        "selectedStrictScore": selected_strict,
        "steps": int(observations.shape[0]),
        "worlds": int(observations.shape[1]),
        "strongestSourceHoldSeconds": strongest,
        "strongestSourceStrictScore": float(np.max(selected_strict)) if selected_strict.size else 0.0,
    }


def success_replay_aux_update(
    policy,
    replay: dict,
    hidden_dim: int,
    links: int,
    epochs: int,
    learning_rate: float,
    burn_in_steps: int,
    beta: float,
    max_weight: float,
    entropy_coef: float,
    mse_coef: float,
    nll_coef: float,
    action_smoothing_radius: int,
    grad_clip: float,
) -> dict:
    import torch

    if not replay.get("enabled") or int(epochs) <= 0:
        return {"enabled": bool(replay.get("enabled", False)), "updated": False, "reason": replay.get("reason", "disabled")}
    device = next(policy.parameters()).device
    observations = replay["observations"]
    actions = replay["actions"]
    smoothed_actions = smooth_replay_actions(actions, action_smoothing_radius)
    rewards = replay["rewards"]
    done_np = (replay["terminals"] > 0.5) | (replay["truncations"] > 0.5)
    quality = replay_hold_quality(observations, links)
    future_quality = np.zeros_like(quality, dtype=np.float32)
    future_reward = np.zeros_like(rewards, dtype=np.float32)
    running_quality = np.full(quality.shape[1], -1e6, dtype=np.float32)
    running_reward = np.zeros(rewards.shape[1], dtype=np.float32)
    for step_index in range(quality.shape[0] - 1, -1, -1):
        running_quality = np.maximum(running_quality, quality[step_index])
        running_reward = rewards[step_index] + 0.997 * running_reward * (1.0 - done_np[step_index].astype(np.float32))
        future_quality[step_index] = running_quality
        future_reward[step_index] = running_reward
    combined = future_quality + 0.1 * future_reward
    combined = (combined - np.mean(combined)) / (np.std(combined) + 1e-6)
    weights = np.exp(combined / max(float(beta), 1e-6))
    weights = np.clip(weights, 0.15, max(0.2, float(max_weight))).astype(np.float32)
    theta_abs = np.abs(np.arctan2(observations[..., 3], observations[..., 4]))
    catch_boost = theta_abs < 0.55
    weights[catch_boost] *= 1.6
    weights[done_np] *= 0.2
    weights = np.clip(weights, 0.05, max(0.2, float(max_weight))).astype(np.float32)

    obs_t = torch.as_tensor(observations, dtype=torch.float32, device=device)
    action_t = torch.as_tensor(actions, dtype=torch.float32, device=device)
    smooth_action_t = torch.as_tensor(smoothed_actions, dtype=torch.float32, device=device)
    done_t = torch.as_tensor(done_np, dtype=torch.bool, device=device)
    weight_t = torch.as_tensor(weights, dtype=torch.float32, device=device)
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    steps, worlds, _ = obs_t.shape
    burn_in = min(max(0, int(burn_in_steps)), max(0, int(steps) - 1))
    marker_epochs = {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}
    losses = []
    before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for epoch_index in range(int(epochs)):
        hidden = torch.zeros(worlds, int(hidden_dim), dtype=torch.float32, device=device)
        with torch.no_grad():
            for step_index in range(burn_in):
                _logprob, _entropy, _value, hidden = policy.evaluate_actions(obs_t[step_index], hidden, action_t[step_index])
                if step_index < steps - 1 and bool(done_t[step_index].any()):
                    hidden = hidden.clone()
                    hidden[done_t[step_index]] = 0.0
        hidden = hidden.detach()
        nll_terms = []
        mse_terms = []
        entropy_terms = []
        for step_index in range(burn_in, int(steps)):
            predicted, _logprob_sampled, _value, hidden_for_pred = policy(obs_t[step_index], hidden, deterministic=True)
            logprob, entropy, _value2, hidden = policy.evaluate_actions(obs_t[step_index], hidden, action_t[step_index])
            active_weight = weight_t[step_index].detach()
            active_weight = active_weight / (active_weight.mean() + 1e-6)
            nll_terms.append((-logprob * active_weight).mean())
            mse_terms.append(((predicted.reshape(-1) - smooth_action_t[step_index]).pow(2) * active_weight).mean())
            entropy_terms.append(entropy.mean())
            # Keep the recurrent state from the evaluate_actions path; prediction uses the same input hidden.
            del hidden_for_pred
            if step_index < steps - 1 and bool(done_t[step_index].any()):
                hidden = hidden.clone()
                hidden[done_t[step_index]] = 0.0
        nll_loss = torch.stack(nll_terms).mean()
        mse_loss = torch.stack(mse_terms).mean()
        entropy_loss = torch.stack(entropy_terms).mean()
        loss = float(nll_coef) * nll_loss + float(mse_coef) * mse_loss - float(entropy_coef) * entropy_loss
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(grad_clip)).detach())
        optimizer.step()
        if epoch_index in marker_epochs:
            losses.append(
                {
                    "epoch": int(epoch_index + 1),
                    "loss": float(loss.detach()),
                    "nllLoss": float(nll_loss.detach()),
                    "mseLoss": float(mse_loss.detach()),
                    "entropy": float(entropy_loss.detach()),
                    "gradNorm": grad_norm,
                    "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                }
            )
    after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    return {
        "enabled": True,
        "updated": True,
        "path": str(replay.get("path")),
        "epochs": int(epochs),
        "learningRate": float(learning_rate),
        "burnInSteps": int(burn_in),
        "beta": float(beta),
        "maxWeight": float(max_weight),
        "entropyCoef": float(entropy_coef),
        "mseCoef": float(mse_coef),
        "nllCoef": float(nll_coef),
        "actionSmoothingRadius": int(action_smoothing_radius),
        "worlds": int(worlds),
        "steps": int(steps),
        "strongestSourceHoldSeconds": float(replay.get("strongestSourceHoldSeconds", 0.0)),
        "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
        "weightMean": float(np.mean(weights)),
        "weightMax": float(np.max(weights)),
        "losses": losses,
    }


def configure_policy_log_std(policy, target: float | None, freeze: bool) -> dict:
    import torch

    if not hasattr(policy, "log_std"):
        return {"available": False, "target": target, "freeze": bool(freeze)}
    before = float(policy.log_std.detach().reshape(-1)[0])
    if target is not None:
        with torch.no_grad():
            policy.log_std.fill_(float(target))
    if bool(freeze):
        policy.log_std.requires_grad_(False)
    after = float(policy.log_std.detach().reshape(-1)[0])
    return {
        "available": True,
        "before": before,
        "after": after,
        "target": None if target is None else float(target),
        "freeze": bool(freeze),
        "requiresGrad": bool(policy.log_std.requires_grad),
    }


def stochastic_success_bc_update(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    passes: int,
    epochs: int,
    min_held_seconds: float,
    fallback_min_held_seconds: float,
    learning_rate: float,
    top_k: int,
    window_mode: str,
    window_padding_steps: int,
    catch_angle: float,
    catch_speed: float,
    objective: str,
    weight_power: float,
    terminal_boundary: float,
) -> dict:
    if int(passes) <= 0 or int(epochs) <= 0:
        return {"enabled": False}
    rollouts = [
        collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            "exact-down",
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=True,
            terminal_boundary=terminal_boundary,
            record_hidden_states=True,
        )
        for pass_index in range(int(passes))
    ]
    summaries = [rollout["summary"] for rollout in rollouts]
    best_index = max(
        range(len(rollouts)),
        key=lambda index: (
            float(summaries[index].get("maxHeldSeconds", 0.0)),
            float(summaries[index].get("maxStrictScore", 0.0)),
            float(summaries[index].get("nearTopStepCount", 0.0)),
        ),
    )
    best_summary = summaries[best_index]
    best_held = float(best_summary.get("maxHeldSeconds", 0.0))
    if best_held < float(fallback_min_held_seconds):
        return {
            "enabled": True,
            "passes": int(passes),
            "epochs": int(epochs),
            "bestPassIndex": int(best_index),
            "bestSummary": best_summary,
            "passSummaries": summaries,
            "distill": {
                "enabled": True,
                "selectedWorlds": 0,
                "reason": "no stochastic pass reached the success BC fallback threshold",
            },
        }
    distill = elite_rollout_bc_update(
        policy,
        rollouts[best_index]["buffers"],
        hidden_dim,
        links,
        epochs,
        min_held_seconds,
        learning_rate,
        fallback_min_held_seconds,
        top_k,
        window_mode,
        window_padding_steps,
        catch_angle,
        catch_speed,
        objective,
        weight_power,
    )
    return {
        "enabled": True,
        "passes": int(passes),
        "epochs": int(epochs),
        "minHeldSeconds": float(min_held_seconds),
        "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
        "learningRate": float(learning_rate),
        "topK": int(top_k),
        "windowMode": str(window_mode),
        "windowPaddingSteps": int(window_padding_steps),
        "catchAngle": float(catch_angle),
        "catchSpeed": float(catch_speed),
        "objective": str(objective),
        "weightPower": float(weight_power),
        "bestPassIndex": int(best_index),
        "bestSummary": best_summary,
        "passSummaries": summaries,
        "distill": distill,
    }


def stochastic_success_sequence_sil_update(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    passes: int,
    epochs: int,
    fallback_min_held_seconds: float,
    learning_rate: float,
    top_k_worlds: int,
    burn_in_steps: int,
    beta: float,
    max_weight: float,
    value_coef: float,
    terminal_boundary: float,
    replay_output_path: Path | None = None,
) -> dict:
    import torch

    if int(passes) <= 0 or int(epochs) <= 0:
        return {"enabled": False}
    print(
        json.dumps(
            {
                "phase": "stochastic-success-sequence-sil-start",
                "passes": int(passes),
                "evalSteps": int(eval_steps),
                "nworld": int(nworld),
                "burnInSteps": int(burn_in_steps),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    rollouts = []
    for pass_index in range(int(passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            "exact-down",
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=True,
            terminal_boundary=terminal_boundary,
            record_hidden_states=False,
        )
        rollouts.append(rollout)
        print(
            json.dumps(
                {
                    "phase": "stochastic-success-sequence-sil-pass",
                    "pass": int(pass_index + 1),
                    "passes": int(passes),
                    "maxHeldSeconds": float(rollout["summary"].get("maxHeldSeconds", 0.0)),
                    "maxStrictScore": float(rollout["summary"].get("maxStrictScore", 0.0)),
                    "elapsedSeconds": float(rollout["summary"].get("elapsedSeconds", 0.0)),
                },
                sort_keys=True,
            ),
            flush=True,
        )
    summaries = [rollout["summary"] for rollout in rollouts]
    best_index = max(
        range(len(rollouts)),
        key=lambda index: (
            float(summaries[index].get("maxHeldSeconds", 0.0)),
            float(summaries[index].get("maxStrictScore", 0.0)),
            float(summaries[index].get("nearTopStepCount", 0.0)),
        ),
    )
    buffers = rollouts[best_index]["buffers"]
    held_seconds = np.asarray(buffers.get("maxHeldSecondsByWorld", []), dtype=np.float32)
    strict_score = np.asarray(buffers.get("maxStrictScoreByWorld", []), dtype=np.float32)
    if held_seconds.size == 0:
        return {
            "enabled": True,
            "passes": int(passes),
            "epochs": int(epochs),
            "bestPassIndex": int(best_index),
            "bestSummary": summaries[best_index],
            "passSummaries": summaries,
            "selectedWorlds": 0,
            "reason": "selected rollout did not expose per-world hold metrics",
        }
    eligible = np.where(held_seconds >= float(fallback_min_held_seconds))[0]
    selector = "fallback-held"
    if eligible.size == 0:
        return {
            "enabled": True,
            "passes": int(passes),
            "epochs": int(epochs),
            "bestPassIndex": int(best_index),
            "bestSummary": summaries[best_index],
            "passSummaries": summaries,
            "selectedWorlds": 0,
            "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
            "bestHeldSeconds": float(np.max(held_seconds)) if held_seconds.size else 0.0,
            "bestStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
            "reason": "no stochastic pass world reached sequence SIL fallback threshold",
        }
    ordered = sorted(
        eligible.tolist(),
        key=lambda world: (
            float(held_seconds[world]),
            float(strict_score[world]) if strict_score.size else 0.0,
        ),
        reverse=True,
    )
    selected_worlds = np.asarray(ordered[: max(1, min(int(top_k_worlds), len(ordered)))], dtype=np.int64)
    device = next(policy.parameters()).device
    obs = torch.as_tensor(buffers["obs"][:, selected_worlds, :], dtype=torch.float32, device=device)
    actions = torch.as_tensor(buffers["actions"][:, selected_worlds], dtype=torch.float32, device=device)
    rewards = torch.as_tensor(buffers["rewards"][:, selected_worlds], dtype=torch.float32, device=device)
    old_values = torch.as_tensor(buffers["values"][:, selected_worlds], dtype=torch.float32, device=device)
    done = torch.as_tensor(
        (
            (buffers["terminals"][:, selected_worlds] > 0.5)
            | (buffers["truncations"][:, selected_worlds] > 0.5)
        ),
        dtype=torch.bool,
        device=device,
    )
    steps, selected_count, _ = obs.shape
    returns = torch.zeros(steps, selected_count, dtype=torch.float32, device=device)
    running = old_values[-1] * (~done[-1]).float()
    for step_index in range(steps - 1, -1, -1):
        running = rewards[step_index] + 0.995 * running * (~done[step_index]).float()
        returns[step_index] = running
    baseline = returns.mean()
    advantage = returns - baseline
    positive = torch.clamp(advantage, min=0.0)
    scale = max(float(beta), 1e-6)
    weights = torch.clamp(torch.exp(positive / scale), min=1.0, max=max(float(max_weight), 1.0)).detach()
    burn_in = max(0, min(int(burn_in_steps), max(0, int(steps) - 1)))
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    marker_epochs = {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}
    losses = []
    before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for epoch_index in range(int(epochs)):
        hidden = torch.zeros(selected_count, int(hidden_dim), dtype=torch.float32, device=device)
        if burn_in > 0:
            with torch.no_grad():
                for step_index in range(burn_in):
                    _logprob, _entropy, _value, hidden = policy.evaluate_actions(
                        obs[step_index],
                        hidden,
                        actions[step_index],
                    )
                    if step_index < steps - 1 and bool(done[step_index].any()):
                        hidden = hidden.clone()
                        hidden[done[step_index]] = 0.0
            hidden = hidden.detach()
        logprob_terms = []
        value_terms = []
        entropy_terms = []
        for step_index in range(burn_in, int(steps)):
            logprob, entropy, value, hidden = policy.evaluate_actions(obs[step_index], hidden, actions[step_index])
            active_weights = weights[step_index]
            active_weights = active_weights / (active_weights.mean() + 1e-6)
            logprob_terms.append((-logprob * active_weights).mean())
            value_terms.append((value.reshape(-1) - returns[step_index].detach()).pow(2).mean())
            entropy_terms.append(entropy.mean())
            if step_index < steps - 1 and bool(done[step_index].any()):
                hidden = hidden.clone()
                hidden[done[step_index]] = 0.0
        actor_loss = torch.stack(logprob_terms).mean()
        value_loss = torch.stack(value_terms).mean()
        entropy_loss = torch.stack(entropy_terms).mean()
        loss = actor_loss + float(value_coef) * value_loss - 0.001 * entropy_loss
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7).detach())
        optimizer.step()
        if epoch_index in marker_epochs:
            losses.append(
                {
                    "epoch": int(epoch_index + 1),
                    "loss": float(loss.detach()),
                    "actorLoss": float(actor_loss.detach()),
                    "valueLoss": float(value_loss.detach()),
                    "entropy": float(entropy_loss.detach()),
                    "gradNorm": grad_norm,
                }
            )
    after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    selected_held = held_seconds[selected_worlds]
    selected_score = strict_score[selected_worlds] if strict_score.size else np.zeros_like(selected_held)
    replay_written = None
    if replay_output_path is not None:
        replay_output_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            replay_output_path,
            obs=buffers["obs"][:, selected_worlds, :].astype(np.float32, copy=False),
            actions=buffers["actions"][:, selected_worlds].astype(np.float32, copy=False),
            rewards=buffers["rewards"][:, selected_worlds].astype(np.float32, copy=False),
            values=buffers["values"][:, selected_worlds].astype(np.float32, copy=False),
            terminals=buffers["terminals"][:, selected_worlds].astype(np.float32, copy=False),
            truncations=buffers["truncations"][:, selected_worlds].astype(np.float32, copy=False),
            qpos=buffers.get("qpos", np.zeros((0,), dtype=np.float32))[:, selected_worlds, :].astype(np.float32, copy=False)
            if "qpos" in buffers
            else np.zeros((0,), dtype=np.float32),
            qvel=buffers.get("qvel", np.zeros((0,), dtype=np.float32))[:, selected_worlds, :].astype(np.float32, copy=False)
            if "qvel" in buffers
            else np.zeros((0,), dtype=np.float32),
            stateLastActions=buffers.get("stateLastActions", np.zeros((0,), dtype=np.float32))[:, selected_worlds].astype(
                np.float32,
                copy=False,
            )
            if "stateLastActions" in buffers
            else np.zeros((0,), dtype=np.float32),
            selectedWorlds=selected_worlds.astype(np.int64, copy=False),
            selectedHeldSeconds=selected_held.astype(np.float32, copy=False),
            selectedStrictScore=selected_score.astype(np.float32, copy=False),
            bestPassIndex=np.asarray([best_index], dtype=np.int64),
            fallbackMinHeldSeconds=np.asarray([float(fallback_min_held_seconds)], dtype=np.float32),
        )
        replay_written = {
            "written": True,
            "path": str(replay_output_path),
            "format": "npz",
        }
    update = {
        "enabled": True,
        "passes": int(passes),
        "epochs": int(epochs),
        "bestPassIndex": int(best_index),
        "bestSummary": summaries[best_index],
        "passSummaries": summaries,
        "selector": selector,
        "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
        "learningRate": float(learning_rate),
        "topKWorlds": int(top_k_worlds),
        "selectedWorlds": int(selected_count),
        "selectedWorldIndices": [int(world) for world in selected_worlds.tolist()],
        "selectedBestHeldSeconds": float(np.max(selected_held)) if selected_held.size else 0.0,
        "selectedBestStrictScore": float(np.max(selected_score)) if selected_score.size else 0.0,
        "burnInSteps": int(burn_in),
        "beta": float(beta),
        "maxWeight": float(max_weight),
        "valueCoef": float(value_coef),
        "returnMean": float(returns.detach().mean()),
        "returnMax": float(returns.detach().max()),
        "weightMean": float(weights.detach().mean()),
        "weightMax": float(weights.detach().max()),
        "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
        "replay": replay_written or {"written": False},
        "losses": losses,
    }
    print(
        json.dumps(
            {
                "phase": "stochastic-success-sequence-sil-update",
                "selectedWorlds": update["selectedWorlds"],
                "selectedBestHeldSeconds": update["selectedBestHeldSeconds"],
                "parameterDeltaL2": update["parameterDeltaL2"],
            },
            sort_keys=True,
        ),
        flush=True,
    )
    return update


def parse_step_offsets(offsets: str | list[int] | tuple[int, ...]) -> list[int]:
    if isinstance(offsets, str):
        values = [value.strip() for value in offsets.split(",") if value.strip()]
        return [max(0, int(value)) for value in values] or [0]
    return [max(0, int(value)) for value in offsets] or [0]


def select_snapshot_curriculum_states(
    buffers: dict,
    links: int,
    min_held_seconds: float,
    fallback_min_held_seconds: float,
    top_k_worlds: int,
    offsets: str | list[int] | tuple[int, ...],
    max_snapshots: int,
    catch_angle: float,
    catch_speed: float,
) -> dict:
    required = ("obs", "qpos", "qvel", "stateLastActions", "maxHeldSecondsByWorld", "maxStrictScoreByWorld")
    missing = [key for key in required if key not in buffers]
    if missing:
        return {"enabled": True, "selectedSnapshots": 0, "reason": f"missing buffers: {', '.join(missing)}"}
    observations = buffers["obs"]
    qpos = buffers["qpos"]
    qvel = buffers["qvel"]
    last_actions = buffers["stateLastActions"]
    hidden_states = buffers.get("hiddenStates")
    held_seconds = np.asarray(buffers["maxHeldSecondsByWorld"], dtype=np.float32)
    strict_score = np.asarray(buffers["maxStrictScoreByWorld"], dtype=np.float32)
    if observations.size == 0 or held_seconds.size == 0:
        return {"enabled": True, "selectedSnapshots": 0, "reason": "empty rollout buffers"}

    catch_mask = elite_bc_window_mask(observations, links, "catch", 0, catch_angle, catch_speed)
    near_top_mask = elite_bc_window_mask(observations, links, "near-top", 0, catch_angle, catch_speed)
    anchor_mask = catch_mask | near_top_mask
    eligible = np.where((held_seconds >= float(min_held_seconds)) & np.any(anchor_mask, axis=0))[0]
    selector = "held-success"
    if eligible.size == 0:
        eligible = np.where((held_seconds >= float(fallback_min_held_seconds)) & np.any(anchor_mask, axis=0))[0]
        selector = "fallback-held-anchor"
    if eligible.size == 0:
        eligible = np.where(np.any(anchor_mask, axis=0))[0]
        selector = "anchor-only"
    if eligible.size == 0:
        best_index = int(np.argmax(held_seconds)) if held_seconds.size else -1
        return {
            "enabled": True,
            "selectedSnapshots": 0,
            "minHeldSeconds": float(min_held_seconds),
            "fallbackMinHeldSeconds": float(fallback_min_held_seconds),
            "bestHeldSeconds": float(held_seconds[best_index]) if best_index >= 0 else 0.0,
            "bestStrictScore": float(strict_score[best_index]) if best_index >= 0 and strict_score.size else 0.0,
            "reason": "no rollout world reached catch or near-top anchor",
        }

    ordered = sorted(
        eligible.tolist(),
        key=lambda world: (
            float(held_seconds[world]),
            float(strict_score[world]) if strict_score.size else 0.0,
            int(np.sum(anchor_mask[:, world])),
        ),
        reverse=True,
    )
    selected_worlds = ordered[: max(1, min(int(top_k_worlds), len(ordered)))]
    step_offsets = parse_step_offsets(offsets)
    selected_qpos = []
    selected_qvel = []
    selected_last_actions = []
    selected_hidden = []
    selected_meta = []
    for world in selected_worlds:
        anchor_steps = np.flatnonzero(anchor_mask[:, world])
        if anchor_steps.size == 0:
            continue
        anchor_step = int(anchor_steps[0])
        for offset in step_offsets:
            source_step = max(0, anchor_step - int(offset))
            selected_qpos.append(qpos[source_step, world].astype(np.float32, copy=True))
            selected_qvel.append(qvel[source_step, world].astype(np.float32, copy=True))
            selected_last_actions.append(np.float32(last_actions[source_step, world]))
            if hidden_states is not None:
                selected_hidden.append(hidden_states[source_step, world].astype(np.float32, copy=True))
            selected_meta.append(
                {
                    "world": int(world),
                    "anchorStep": int(anchor_step),
                    "sourceStep": int(source_step),
                    "offset": int(offset),
                    "heldSeconds": float(held_seconds[world]),
                    "strictScore": float(strict_score[world]) if strict_score.size else 0.0,
                }
            )
            if len(selected_qpos) >= int(max_snapshots):
                break
        if len(selected_qpos) >= int(max_snapshots):
            break
    if not selected_qpos:
        return {"enabled": True, "selectedSnapshots": 0, "selector": selector, "reason": "selected worlds had no anchors"}
    result = {
        "enabled": True,
        "selector": selector,
        "selectedSnapshots": int(len(selected_qpos)),
        "selectedWorlds": [int(world) for world in selected_worlds],
        "offsets": [int(offset) for offset in step_offsets],
        "bestHeldSeconds": float(max(held_seconds[selected_worlds])) if selected_worlds else 0.0,
        "bestStrictScore": float(max(strict_score[selected_worlds])) if selected_worlds and strict_score.size else 0.0,
        "metadata": selected_meta[: min(16, len(selected_meta))],
        "qpos": np.stack(selected_qpos).astype(np.float32, copy=False),
        "qvel": np.stack(selected_qvel).astype(np.float32, copy=False),
        "lastActions": np.asarray(selected_last_actions, dtype=np.float32),
    }
    if selected_hidden:
        result["hidden"] = np.stack(selected_hidden).astype(np.float32, copy=False)
        result["hiddenStateIncluded"] = True
    else:
        result["hiddenStateIncluded"] = False
    return result


def stochastic_success_snapshot_ppo_update(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    passes: int,
    snapshot_steps: int,
    update_epochs: int,
    learning_rate: float,
    gamma: float,
    gae_lambda: float,
    clip_coef: float,
    entropy_coef: float,
    min_held_seconds: float,
    fallback_min_held_seconds: float,
    top_k_worlds: int,
    offsets: str,
    max_snapshots: int,
    catch_angle: float,
    catch_speed: float,
    terminal_boundary: float,
) -> dict:
    import torch

    if int(passes) <= 0 or int(snapshot_steps) <= 0 or int(update_epochs) <= 0:
        return {"enabled": False}
    print(
        json.dumps(
            {
                "phase": "stochastic-success-snapshot-ppo-start",
                "passes": int(passes),
                "evalSteps": int(eval_steps),
                "snapshotSteps": int(snapshot_steps),
                "nworld": int(nworld),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    rollouts = []
    for pass_index in range(int(passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            "exact-down",
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=True,
            terminal_boundary=terminal_boundary,
            record_hidden_states=True,
        )
        rollouts.append(rollout)
        print(
            json.dumps(
                {
                    "phase": "stochastic-success-snapshot-ppo-pass",
                    "pass": int(pass_index + 1),
                    "passes": int(passes),
                    "maxHeldSeconds": float(rollout["summary"].get("maxHeldSeconds", 0.0)),
                    "maxStrictScore": float(rollout["summary"].get("maxStrictScore", 0.0)),
                    "hiddenStatesRecorded": bool(rollout["summary"].get("hiddenStatesRecorded", False)),
                    "elapsedSeconds": float(rollout["summary"].get("elapsedSeconds", 0.0)),
                },
                sort_keys=True,
            ),
            flush=True,
        )
    summaries = [rollout["summary"] for rollout in rollouts]
    best_index = max(
        range(len(rollouts)),
        key=lambda index: (
            float(summaries[index].get("maxHeldSeconds", 0.0)),
            float(summaries[index].get("maxStrictScore", 0.0)),
            float(summaries[index].get("nearTopStepCount", 0.0)),
        ),
    )
    selected = select_snapshot_curriculum_states(
        rollouts[best_index]["buffers"],
        links,
        min_held_seconds,
        fallback_min_held_seconds,
        top_k_worlds,
        offsets,
        max_snapshots,
        catch_angle,
        catch_speed,
    )
    print(
        json.dumps(
            {
                "phase": "stochastic-success-snapshot-ppo-selection",
                "bestPassIndex": int(best_index),
                "selectedSnapshots": int(selected.get("selectedSnapshots", 0)),
                "hiddenStateIncluded": bool(selected.get("hiddenStateIncluded", False)),
                "bestHeldSeconds": float(selected.get("bestHeldSeconds", 0.0)),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    if int(selected.get("selectedSnapshots", 0)) <= 0:
        return {
            "enabled": True,
            "passes": int(passes),
            "bestPassIndex": int(best_index),
            "bestSummary": summaries[best_index],
            "passSummaries": summaries,
            "selection": selected,
        }
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    snapshot_rollout = collect_recurrent_rollout(
        mjcf_xml,
        policy,
        links,
        nworld,
        snapshot_steps,
        "snapshot-curriculum",
        force_scale,
        seed + 70_000,
        hidden_dim,
        stochastic=True,
        terminal_boundary=terminal_boundary,
        snapshot_qpos=selected["qpos"],
        snapshot_qvel=selected["qvel"],
        snapshot_last_actions=selected["lastActions"],
        snapshot_hidden=selected.get("hidden"),
    )
    print(
        json.dumps(
            {
                "phase": "stochastic-success-snapshot-ppo-rollout",
                "maxHeldSeconds": float(snapshot_rollout["summary"].get("maxHeldSeconds", 0.0)),
                "snapshotHiddenRestored": bool(snapshot_rollout["summary"].get("snapshotHiddenRestored", False)),
                "snapshotSourceCount": int(snapshot_rollout["summary"].get("snapshotSourceCount", 0)),
                "elapsedSeconds": float(snapshot_rollout["summary"].get("elapsedSeconds", 0.0)),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    update = ppo_update(
        policy,
        optimizer,
        snapshot_rollout["buffers"],
        hidden_dim,
        update_epochs,
        gamma,
        gae_lambda,
        clip_coef,
        entropy_coef,
        0.0,
        force_scale,
    )
    print(
        json.dumps(
            {
                "phase": "stochastic-success-snapshot-ppo-update",
                "updatedParameters": bool(update.get("updatedParameters", False)),
                "parameterDeltaL2": float(update.get("parameterDeltaL2", 0.0)),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    return {
        "enabled": True,
        "passes": int(passes),
        "snapshotSteps": int(snapshot_steps),
        "updateEpochs": int(update_epochs),
        "learningRate": float(learning_rate),
        "bestPassIndex": int(best_index),
        "bestSummary": summaries[best_index],
        "passSummaries": summaries,
        "selection": {key: value for key, value in selected.items() if key not in {"qpos", "qvel", "lastActions", "hidden"}},
        "snapshotRollout": snapshot_rollout["summary"],
        "ppo": update,
    }


def select_deterministic_failure_snapshots(
    buffers: dict,
    max_snapshots: int,
    catch_angle: float,
    catch_speed: float,
    terminal_boundary: float,
    min_step_separation: int = 12,
    max_per_world: int = 4,
    dedupe_eps: float = 1e-4,
) -> dict:
    required = ("obs", "qpos", "qvel", "stateLastActions")
    missing = [key for key in required if key not in buffers]
    if missing:
        return {"enabled": True, "selectedSnapshots": 0, "reason": f"missing buffers: {', '.join(missing)}"}
    observations = buffers["obs"]
    qpos = buffers["qpos"]
    qvel = buffers["qvel"]
    last_actions = buffers["stateLastActions"]
    hidden_states = buffers.get("hiddenStates")
    if observations.size == 0:
        return {"enabled": True, "selectedSnapshots": 0, "reason": "empty deterministic rollout"}

    theta_abs = np.abs(np.arctan2(observations[..., 3], observations[..., 4]))
    omega_abs = np.abs(observations[..., 7] * 8.0)
    cart_abs = np.abs(observations[..., 0])
    catch = (theta_abs < float(catch_angle)) & (omega_abs < float(catch_speed)) & (cart_abs < 2.2)
    near_top = theta_abs < max(float(catch_angle) * 1.6, 0.58)
    approach = theta_abs < 1.65
    pre_rail = cart_abs < min(2.05, max(0.25, float(terminal_boundary) * 0.88))
    centered = cart_abs < 1.7
    not_initial = np.arange(observations.shape[0])[:, None] > 8
    candidate = ((near_top & pre_rail) | (approach & centered)) & (~catch) & not_initial
    if not np.any(candidate):
        candidate = (near_top | approach) & pre_rail & (~catch) & not_initial
    if not np.any(candidate):
        candidate = approach & centered & (~catch) & not_initial
    if not np.any(candidate):
        return {
            "enabled": True,
            "selectedSnapshots": 0,
            "nearTopWorldRate": float(np.mean(np.any(near_top, axis=0))) if near_top.size else 0.0,
            "catchWorldRate": float(np.mean(np.any(catch, axis=0))) if catch.size else 0.0,
            "reason": "no centered/pre-rail near-top or approach deterministic failure states",
        }

    score = (
        2.0 * np.clip(1.15 - theta_abs, 0.0, 1.15)
        + 0.06 * np.clip(omega_abs, 0.0, 10.0)
        - 0.45 * cart_abs
        + near_top.astype(np.float32)
        + 0.35 * centered.astype(np.float32)
    )
    score = np.where(candidate, score, -1e9)
    candidate_rows = np.argwhere(candidate)
    if candidate_rows.size == 0:
        return {"enabled": True, "selectedSnapshots": 0, "reason": "candidate mask contained no rows"}
    row_scores = score[candidate_rows[:, 0], candidate_rows[:, 1]]
    order = np.argsort(row_scores)[::-1]
    chosen = []
    chosen_features = []
    world_counts: dict[int, int] = {}
    max_world_count = max(1, int(max_per_world))
    min_sep = max(0, int(min_step_separation))
    dedupe_threshold = max(0.0, float(dedupe_eps))
    for row_index in order.tolist():
        step = int(candidate_rows[row_index, 0])
        world = int(candidate_rows[row_index, 1])
        if world_counts.get(world, 0) >= max_world_count:
            continue
        feature = np.asarray(
            [
                observations[step, world, 0] / 2.4,
                observations[step, world, 1],
                observations[step, world, 3],
                observations[step, world, 4],
                observations[step, world, 7],
            ],
            dtype=np.float32,
        )
        if chosen_features:
            distances = [float(np.sum((feature - existing) ** 2)) for existing in chosen_features]
            if min(distances) <= dedupe_threshold:
                continue
        if min_sep > 0 and any(abs(step - chosen_step) < min_sep for _score, chosen_step, _world in chosen):
            continue
        chosen.append((float(row_scores[row_index]), step, world))
        chosen_features.append(feature)
        world_counts[world] = world_counts.get(world, 0) + 1
        if len(chosen) >= max(1, int(max_snapshots)):
            break
    if not chosen:
        return {"enabled": True, "selectedSnapshots": 0, "reason": "candidate scoring selected no snapshots"}

    qpos_rows = []
    qvel_rows = []
    last_action_rows = []
    obs_rows = []
    hidden_rows = []
    metadata = []
    for rank, (item_score, step, world) in enumerate(chosen):
        qpos_rows.append(qpos[step, world].astype(np.float32, copy=True))
        qvel_rows.append(qvel[step, world].astype(np.float32, copy=True))
        last_action_rows.append(np.float32(last_actions[step, world]))
        obs_rows.append(observations[step, world].astype(np.float32, copy=True))
        if hidden_states is not None:
            hidden_rows.append(hidden_states[step, world].astype(np.float32, copy=True))
        metadata.append(
            {
                "rank": int(rank + 1),
                "step": int(step),
                "world": int(world),
                "score": float(item_score),
                "thetaAbs": float(theta_abs[step, world]),
                "omegaAbs": float(omega_abs[step, world]),
                "cartAbs": float(cart_abs[step, world]),
                "nearTop": bool(near_top[step, world]),
            }
        )
    result = {
        "enabled": True,
        "selectedSnapshots": int(len(qpos_rows)),
        "nearTopWorldRate": float(np.mean(np.any(near_top, axis=0))) if near_top.size else 0.0,
        "catchWorldRate": float(np.mean(np.any(catch, axis=0))) if catch.size else 0.0,
        "candidateCount": int(candidate_rows.shape[0]),
        "minStepSeparation": int(min_sep),
        "maxPerWorld": int(max_world_count),
        "dedupeEps": float(dedupe_threshold),
        "metadata": metadata[: min(16, len(metadata))],
        "qpos": np.stack(qpos_rows).astype(np.float32, copy=False),
        "qvel": np.stack(qvel_rows).astype(np.float32, copy=False),
        "lastActions": np.asarray(last_action_rows, dtype=np.float32),
        "obs": np.stack(obs_rows).astype(np.float32, copy=False),
    }
    if hidden_rows:
        result["hidden"] = np.stack(hidden_rows).astype(np.float32, copy=False)
        result["hiddenStateIncluded"] = True
    else:
        result["hiddenStateIncluded"] = False
    return result


def deterministic_failure_dagger_update(
    mjcf_xml: str,
    policy,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    passes: int,
    epochs: int,
    continuations: int,
    continuation_steps: int,
    learning_rate: float,
    max_snapshots: int,
    min_teacher_strict_score: float,
    catch_angle: float,
    catch_speed: float,
    terminal_boundary: float,
    grad_clip: float,
) -> dict:
    import torch
    import torch.nn.functional as F

    if int(passes) <= 0 or int(epochs) <= 0 or int(continuations) <= 0:
        return {"enabled": False}
    print(
        json.dumps(
            {
                "phase": "deterministic-failure-dagger-start",
                "passes": int(passes),
                "continuations": int(continuations),
                "continuationSteps": int(continuation_steps),
                "nworld": int(nworld),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    device = next(policy.parameters()).device
    pass_results = []
    before_all = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for pass_index in range(int(passes)):
        deterministic_rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            "exact-down",
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=False,
            terminal_boundary=terminal_boundary,
            record_hidden_states=True,
        )
        selected = select_deterministic_failure_snapshots(
            deterministic_rollout["buffers"],
            max_snapshots,
            catch_angle,
            catch_speed,
            terminal_boundary,
        )
        selected_count = int(selected.get("selectedSnapshots", 0))
        if selected_count <= 0:
            pass_results.append(
                {
                    "pass": int(pass_index + 1),
                    "deterministicSummary": deterministic_rollout["summary"],
                    "selection": selected,
                    "updated": False,
                }
            )
            continue

        continuation_nworld = max(selected_count, selected_count * max(1, int(continuations)))
        teacher_rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            continuation_nworld,
            continuation_steps,
            "snapshot-curriculum",
            force_scale,
            seed + 50_000 + pass_index,
            hidden_dim,
            stochastic=True,
            terminal_boundary=terminal_boundary,
            snapshot_qpos=selected["qpos"],
            snapshot_qvel=selected["qvel"],
            snapshot_last_actions=selected["lastActions"],
            snapshot_hidden=selected.get("hidden"),
        )
        teacher_actions = teacher_rollout["buffers"]["actions"]
        held = np.asarray(teacher_rollout["buffers"].get("maxHeldSecondsByWorld", []), dtype=np.float32)
        strict = np.asarray(teacher_rollout["buffers"].get("maxStrictScoreByWorld", []), dtype=np.float32)
        labels = []
        label_source_indices = []
        weights = []
        teacher_meta = []
        for source_index in range(selected_count):
            candidate_worlds = np.arange(source_index, continuation_nworld, selected_count, dtype=np.int64)
            if candidate_worlds.size == 0:
                continue
            best_world = max(
                candidate_worlds.tolist(),
                key=lambda world: (
                    float(held[world]) if held.size else 0.0,
                    float(strict[world]) if strict.size else 0.0,
                ),
            )
            best_held = float(held[best_world]) if held.size else 0.0
            best_strict = float(strict[best_world]) if strict.size else 0.0
            if best_strict < float(min_teacher_strict_score) and best_held < 0.25:
                continue
            label_source_indices.append(source_index)
            labels.append(np.float32(teacher_actions[0, best_world]))
            weights.append(np.float32(1.0 + min(best_strict / 100.0, 1.0) + 3.0 * min(best_held, 1.0)))
            teacher_meta.append(
                {
                    "source": int(source_index),
                    "world": int(best_world),
                    "heldSeconds": best_held,
                    "strictScore": best_strict,
                    "firstAction": float(teacher_actions[0, best_world]),
                }
            )
        if not labels:
            pass_results.append(
                {
                    "pass": int(pass_index + 1),
                    "deterministicSummary": deterministic_rollout["summary"],
                    "selection": {key: value for key, value in selected.items() if key not in {"qpos", "qvel", "lastActions", "hidden", "obs"}},
                    "teacherSummary": teacher_rollout["summary"],
                    "updated": False,
                    "reason": "no stochastic continuation met teacher strict/hold threshold",
                }
            )
            continue

        label_count = len(labels)
        source_indices_np = np.asarray(label_source_indices, dtype=np.int64)
        obs_t = torch.as_tensor(selected["obs"][source_indices_np], dtype=torch.float32, device=device)
        if selected.get("hidden") is not None:
            hidden_t = torch.as_tensor(selected["hidden"][source_indices_np], dtype=torch.float32, device=device)
        else:
            hidden_t = torch.zeros(label_count, int(hidden_dim), dtype=torch.float32, device=device)
        target_t = torch.as_tensor(np.asarray(labels, dtype=np.float32), dtype=torch.float32, device=device)
        weight_t = torch.as_tensor(np.asarray(weights, dtype=np.float32), dtype=torch.float32, device=device)
        weight_t = weight_t / (weight_t.mean() + 1e-6)
        before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
        losses = []
        for epoch_index in range(int(epochs)):
            predicted, _logprob, _value, _hidden = policy(obs_t, hidden_t, deterministic=True)
            loss_terms = F.smooth_l1_loss(predicted.reshape(-1), target_t, reduction="none") * weight_t
            loss = loss_terms.mean()
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(grad_clip)).detach())
            optimizer.step()
            if epoch_index in {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}:
                losses.append(
                    {
                        "epoch": int(epoch_index + 1),
                        "loss": float(loss.detach()),
                        "gradNorm": grad_norm,
                    }
                )
        after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
        pass_result = {
            "pass": int(pass_index + 1),
            "deterministicSummary": deterministic_rollout["summary"],
            "selection": {key: value for key, value in selected.items() if key not in {"qpos", "qvel", "lastActions", "hidden", "obs"}},
            "teacherSummary": teacher_rollout["summary"],
            "selectedSnapshots": int(selected_count),
            "labeledSnapshots": int(label_count),
            "learningRate": float(learning_rate),
            "epochs": int(epochs),
            "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
            "targetActionAbsMean": float(np.mean(np.abs(labels))) if labels else 0.0,
            "targetActionAbsMax": float(np.max(np.abs(labels))) if labels else 0.0,
            "weightMean": float(np.mean(weights)) if weights else 0.0,
            "weightMax": float(np.max(weights)) if weights else 0.0,
            "teacherLabels": teacher_meta[: min(16, len(teacher_meta))],
            "losses": losses,
            "updated": True,
        }
        print(
            json.dumps(
                {
                    "phase": "deterministic-failure-dagger-pass",
                    "pass": int(pass_index + 1),
                    "selectedSnapshots": int(selected_count),
                    "labeledSnapshots": int(label_count),
                    "teacherMaxHeldSeconds": float(teacher_rollout["summary"].get("maxHeldSeconds", 0.0)),
                    "parameterDeltaL2": pass_result["parameterDeltaL2"],
                },
                sort_keys=True,
            ),
            flush=True,
        )
        pass_results.append(pass_result)
    after_all = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    updated_passes = [item for item in pass_results if item.get("updated")]
    return {
        "enabled": True,
        "passes": int(passes),
        "epochs": int(epochs),
        "continuations": int(continuations),
        "continuationSteps": int(continuation_steps),
        "learningRate": float(learning_rate),
        "maxSnapshots": int(max_snapshots),
        "minTeacherStrictScore": float(min_teacher_strict_score),
        "catchAngle": float(catch_angle),
        "catchSpeed": float(catch_speed),
        "updatedPasses": int(len(updated_passes)),
        "parameterDeltaL2": float(torch.linalg.vector_norm(after_all - before_all)),
        "passSummaries": pass_results,
        "selector": "deterministic exact-down near-top/pre-rail failure states; label by best stochastic continuation first action",
    }


def replay_match_features(observations: np.ndarray) -> np.ndarray:
    obs = np.asarray(observations, dtype=np.float32)
    features = np.stack(
        [
            obs[..., 0] / 2.4,
            obs[..., 1],
            obs[..., 3],
            obs[..., 4],
            obs[..., 7],
        ],
        axis=-1,
    )
    return features.astype(np.float32, copy=False)


def label_snapshots_from_success_replay(
    selected: dict,
    replay: dict,
    max_replay_candidates: int,
    future_action_offset: int,
    catch_angle: float,
    catch_speed: float,
    max_cart_abs: float = 1.95,
    label_mode: str = "nearest-action",
    suffix_steps: int = 1,
    use_replay_hidden: bool = False,
) -> dict:
    if not replay.get("enabled"):
        return {"enabled": False, "labels": 0, "reason": replay.get("reason", "success replay disabled")}
    observations = replay.get("observations")
    actions = replay.get("actions")
    if observations is None or actions is None:
        return {"enabled": False, "labels": 0, "reason": "success replay missing observations/actions"}
    selected_obs = selected.get("obs")
    if selected_obs is None or int(selected.get("selectedSnapshots", 0)) <= 0:
        return {"enabled": True, "labels": 0, "reason": "no selected deterministic snapshots"}

    replay_obs = np.asarray(observations, dtype=np.float32)
    replay_actions = np.asarray(actions, dtype=np.float32)
    replay_hidden = replay.get("hiddenStates")
    if replay_hidden is not None:
        replay_hidden = np.asarray(replay_hidden, dtype=np.float32)
    steps, worlds, _ = replay_obs.shape
    selected_held = np.asarray(replay.get("selectedHeldSeconds", np.zeros(worlds)), dtype=np.float32).reshape(-1)
    selected_strict = np.asarray(replay.get("selectedStrictScore", np.zeros(worlds)), dtype=np.float32).reshape(-1)
    source_world_mask = selected_held >= 1.0
    if not np.any(source_world_mask):
        source_world_mask = selected_held > 0.0
    if not np.any(source_world_mask):
        source_world_mask = np.ones(worlds, dtype=bool)

    theta_abs = np.abs(np.arctan2(replay_obs[..., 3], replay_obs[..., 4]))
    omega_abs = np.abs(replay_obs[..., 7] * 8.0)
    cart_abs = np.abs(replay_obs[..., 0])
    label_cart_limit = max(0.2, float(max_cart_abs))
    catch = (theta_abs < float(catch_angle)) & (omega_abs < float(catch_speed)) & (cart_abs < label_cart_limit)
    approach = (theta_abs < 1.85) & (cart_abs < label_cart_limit)
    source_mask = approach & source_world_mask.reshape(1, -1)
    if not np.any(source_mask):
        source_mask = source_world_mask.reshape(1, -1).repeat(steps, axis=0)

    candidate_rows = np.argwhere(source_mask)
    if int(max_replay_candidates) > 0 and candidate_rows.shape[0] > int(max_replay_candidates):
        # Preserve the full temporal distribution. Keeping only the highest-quality
        # catch states makes approach-state DAgger labels jump to the wrong phase.
        sampled = np.linspace(0, candidate_rows.shape[0] - 1, int(max_replay_candidates), dtype=np.int64)
        candidate_rows = candidate_rows[sampled]
    candidate_features = replay_match_features(replay_obs[candidate_rows[:, 0], candidate_rows[:, 1], :])
    selected_features = replay_match_features(np.asarray(selected_obs, dtype=np.float32))

    labels = []
    obs_sequences = []
    action_sequences = []
    sequence_hidden = []
    weights = []
    matches = []
    sequence_mode = str(label_mode) == "suffix-sequence"
    sequence_steps = max(1, int(suffix_steps))
    for source_index, source_feature in enumerate(selected_features):
        distances = np.sum((candidate_features - source_feature.reshape(1, -1)) ** 2, axis=1)
        nearest = int(np.argmin(distances))
        replay_step = int(candidate_rows[nearest, 0])
        replay_world = int(candidate_rows[nearest, 1])
        action_step = min(steps - 1, replay_step + max(0, int(future_action_offset)))
        if sequence_mode and action_step + sequence_steps > steps:
            continue
        target_action = np.float32(replay_actions[action_step, replay_world])
        held = float(selected_held[replay_world]) if replay_world < selected_held.size else 0.0
        strict = float(selected_strict[replay_world]) if replay_world < selected_strict.size else 0.0
        labels.append(target_action)
        if sequence_mode:
            obs_sequences.append(replay_obs[action_step : action_step + sequence_steps, replay_world].astype(np.float32, copy=True))
            action_sequences.append(
                replay_actions[action_step : action_step + sequence_steps, replay_world].astype(np.float32, copy=True)
            )
            if bool(use_replay_hidden) and replay_hidden is not None:
                sequence_hidden.append(replay_hidden[action_step, replay_world].astype(np.float32, copy=True))
        weights.append(np.float32(1.0 + min(held, 2.0) + min(strict / 100.0, 1.0)))
        matches.append(
            {
                "source": int(source_index),
                "replayStep": replay_step,
                "actionStep": int(action_step),
                "replayWorld": replay_world,
                "distance": float(distances[nearest]),
                "heldSeconds": held,
                "strictScore": strict,
                "targetAction": float(target_action),
                "thetaAbs": float(theta_abs[replay_step, replay_world]),
                "omegaAbs": float(omega_abs[replay_step, replay_world]),
                "cartAbs": float(cart_abs[replay_step, replay_world]),
                "catch": bool(catch[replay_step, replay_world]),
            }
        )
    result = {
        "enabled": True,
        "labels": int(len(labels)),
        "labelsArray": np.asarray(labels, dtype=np.float32),
        "weightsArray": np.asarray(weights, dtype=np.float32),
        "matches": matches,
        "candidateCount": int(candidate_rows.shape[0]),
        "sourceWorlds": int(np.sum(source_world_mask)),
        "maxCartAbs": float(label_cart_limit),
        "labelMode": str(label_mode),
        "suffixSteps": int(sequence_steps) if sequence_mode else 1,
        "useReplayHidden": bool(use_replay_hidden),
        "replayHiddenAvailable": bool(replay_hidden is not None),
        "selector": "nearest solved success-buffer observation suffix",
    }
    if sequence_mode and obs_sequences and action_sequences:
        result["obsSequences"] = np.stack(obs_sequences).astype(np.float32, copy=False)
        result["actionSequences"] = np.stack(action_sequences).astype(np.float32, copy=False)
        if sequence_hidden and len(sequence_hidden) == len(obs_sequences):
            result["sequenceHidden"] = np.stack(sequence_hidden).astype(np.float32, copy=False)
    return result


def label_observation_sequences_from_success_replay(
    obs_sequences: np.ndarray,
    initial_hidden: np.ndarray | None,
    replay: dict,
    max_replay_candidates: int,
    future_action_offset: int,
    catch_angle: float,
    catch_speed: float,
    max_cart_abs: float = 1.95,
) -> dict:
    if not replay.get("enabled"):
        return {"enabled": False, "labels": 0, "reason": replay.get("reason", "success replay disabled")}
    observations = replay.get("observations")
    actions = replay.get("actions")
    if observations is None or actions is None:
        return {"enabled": False, "labels": 0, "reason": "success replay missing observations/actions"}
    source_obs = np.asarray(obs_sequences, dtype=np.float32)
    if source_obs.ndim != 3 or source_obs.shape[0] <= 0 or source_obs.shape[1] <= 0:
        return {"enabled": True, "labels": 0, "reason": "empty deterministic sequence observations"}

    replay_obs = np.asarray(observations, dtype=np.float32)
    replay_actions = np.asarray(actions, dtype=np.float32)
    steps, worlds, _ = replay_obs.shape
    selected_held = np.asarray(replay.get("selectedHeldSeconds", np.zeros(worlds)), dtype=np.float32).reshape(-1)
    selected_strict = np.asarray(replay.get("selectedStrictScore", np.zeros(worlds)), dtype=np.float32).reshape(-1)
    source_world_mask = selected_held >= 1.0
    if not np.any(source_world_mask):
        source_world_mask = selected_held > 0.0
    if not np.any(source_world_mask):
        source_world_mask = np.ones(worlds, dtype=bool)

    theta_abs = np.abs(np.arctan2(replay_obs[..., 3], replay_obs[..., 4]))
    omega_abs = np.abs(replay_obs[..., 7] * 8.0)
    cart_abs = np.abs(replay_obs[..., 0])
    label_cart_limit = max(0.2, float(max_cart_abs))
    approach = (theta_abs < 1.85) & (cart_abs < label_cart_limit)
    source_mask = approach & source_world_mask.reshape(1, -1)
    if not np.any(source_mask):
        source_mask = source_world_mask.reshape(1, -1).repeat(steps, axis=0)
    candidate_rows = np.argwhere(source_mask)
    if int(max_replay_candidates) > 0 and candidate_rows.shape[0] > int(max_replay_candidates):
        sampled = np.linspace(0, candidate_rows.shape[0] - 1, int(max_replay_candidates), dtype=np.int64)
        candidate_rows = candidate_rows[sampled]
    if candidate_rows.shape[0] <= 0:
        return {"enabled": True, "labels": 0, "reason": "success replay has no candidate rows"}

    candidate_features = replay_match_features(replay_obs[candidate_rows[:, 0], candidate_rows[:, 1], :])
    source_count, sequence_steps, _ = source_obs.shape
    action_sequences = np.zeros((source_count, sequence_steps), dtype=np.float32)
    weights = np.zeros(source_count, dtype=np.float32)
    matches = []
    for source_index in range(source_count):
        held_accum = 0.0
        strict_accum = 0.0
        first_match = None
        for step_index in range(sequence_steps):
            source_feature = replay_match_features(source_obs[source_index, step_index]).reshape(-1)
            distances = np.sum((candidate_features - source_feature.reshape(1, -1)) ** 2, axis=1)
            nearest = int(np.argmin(distances))
            replay_step = int(candidate_rows[nearest, 0])
            replay_world = int(candidate_rows[nearest, 1])
            action_step = min(steps - 1, replay_step + max(0, int(future_action_offset)))
            action_sequences[source_index, step_index] = np.float32(replay_actions[action_step, replay_world])
            held = float(selected_held[replay_world]) if replay_world < selected_held.size else 0.0
            strict = float(selected_strict[replay_world]) if replay_world < selected_strict.size else 0.0
            held_accum += held
            strict_accum += strict
            if first_match is None:
                first_match = {
                    "source": int(source_index),
                    "sourceStep": int(step_index),
                    "replayStep": replay_step,
                    "actionStep": int(action_step),
                    "replayWorld": replay_world,
                    "distance": float(distances[nearest]),
                    "heldSeconds": held,
                    "strictScore": strict,
                    "targetAction": float(action_sequences[source_index, step_index]),
                    "thetaAbs": float(theta_abs[replay_step, replay_world]),
                    "omegaAbs": float(omega_abs[replay_step, replay_world]),
                    "cartAbs": float(cart_abs[replay_step, replay_world]),
                }
        weights[source_index] = np.float32(
            1.0 + min(held_accum / max(1, sequence_steps), 2.0) + min(strict_accum / max(1, sequence_steps) / 100.0, 1.0)
        )
        if first_match is not None:
            matches.append(first_match)

    result = {
        "enabled": True,
        "labels": int(source_count),
        "labelsArray": action_sequences[:, 0].astype(np.float32, copy=False),
        "weightsArray": weights,
        "matches": matches,
        "candidateCount": int(candidate_rows.shape[0]),
        "sourceWorlds": int(np.sum(source_world_mask)),
        "maxCartAbs": float(label_cart_limit),
        "labelMode": "suffix-sequence",
        "sequenceSource": "deterministic-snapshot-rollout",
        "suffixSteps": int(sequence_steps),
        "useReplayHidden": False,
        "replayHiddenAvailable": bool(replay.get("hiddenStates") is not None),
        "selector": "deterministic failure snapshot rollout labeled by nearest solved success-buffer observations",
        "obsSequences": source_obs.astype(np.float32, copy=False),
        "actionSequences": action_sequences.astype(np.float32, copy=False),
    }
    if initial_hidden is not None:
        result["sequenceHidden"] = np.asarray(initial_hidden, dtype=np.float32)
    return result


def deterministic_success_replay_dagger_update(
    mjcf_xml: str,
    policy,
    replay: dict,
    links: int,
    nworld: int,
    eval_steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    passes: int,
    epochs: int,
    learning_rate: float,
    max_snapshots: int,
    max_replay_candidates: int,
    future_action_offset: int,
    catch_angle: float,
    catch_speed: float,
    min_step_separation: int,
    max_per_world: int,
    dedupe_eps: float,
    max_cart_abs: float,
    label_mode: str,
    suffix_steps: int,
    use_replay_hidden: bool,
    sequence_mse_coef: float,
    sequence_nll_coef: float,
    sequence_entropy_coef: float,
    terminal_boundary: float,
    grad_clip: float,
) -> dict:
    import torch
    import torch.nn.functional as F

    if int(passes) <= 0 or int(epochs) <= 0:
        return {"enabled": False}
    if not replay.get("enabled"):
        return {"enabled": False, "reason": replay.get("reason", "success replay disabled")}
    print(
        json.dumps(
            {
                "phase": "deterministic-success-replay-dagger-start",
                "passes": int(passes),
                "epochs": int(epochs),
                "nworld": int(nworld),
                "replayWorlds": int(replay.get("worlds", 0)),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    device = next(policy.parameters()).device
    pass_results = []
    before_all = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for pass_index in range(int(passes)):
        deterministic_rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            "exact-down",
            force_scale,
            seed + pass_index,
            hidden_dim,
            stochastic=False,
            terminal_boundary=terminal_boundary,
            record_hidden_states=True,
        )
        selected = select_deterministic_failure_snapshots(
            deterministic_rollout["buffers"],
            max_snapshots,
            catch_angle,
            catch_speed,
            terminal_boundary,
            min_step_separation,
            max_per_world,
            dedupe_eps,
        )
        selected_count = int(selected.get("selectedSnapshots", 0))
        if selected_count <= 0:
            pass_results.append(
                {
                    "pass": int(pass_index + 1),
                    "deterministicSummary": deterministic_rollout["summary"],
                    "selection": selected,
                    "updated": False,
                }
            )
            continue
        if str(label_mode) == "suffix-sequence":
            selected_limit = min(selected_count, int(max_snapshots))
            sequence_steps = max(1, int(suffix_steps))
            deterministic_sequence_rollout = collect_recurrent_rollout(
                mjcf_xml,
                policy,
                links,
                selected_limit,
                sequence_steps,
                "exact-down",
                force_scale,
                seed + 10000 + pass_index,
                hidden_dim,
                stochastic=False,
                terminal_boundary=terminal_boundary,
                snapshot_qpos=np.asarray(selected["qpos"][:selected_limit], dtype=np.float32),
                snapshot_qvel=np.asarray(selected["qvel"][:selected_limit], dtype=np.float32),
                snapshot_last_actions=np.asarray(selected["lastActions"][:selected_limit], dtype=np.float32),
                snapshot_hidden=np.asarray(selected["hidden"][:selected_limit], dtype=np.float32)
                if selected.get("hidden") is not None
                else None,
                record_hidden_states=True,
            )
            sequence_obs = np.asarray(deterministic_sequence_rollout["buffers"]["obs"], dtype=np.float32).transpose(1, 0, 2)
            sequence_initial_hidden = (
                np.asarray(deterministic_sequence_rollout["buffers"].get("initialHidden"), dtype=np.float32)
                if deterministic_sequence_rollout["buffers"].get("initialHidden") is not None
                else np.asarray(selected["hidden"][:selected_limit], dtype=np.float32)
                if selected.get("hidden") is not None
                else None
            )
            labels = label_observation_sequences_from_success_replay(
                sequence_obs,
                sequence_initial_hidden,
                replay,
                max_replay_candidates,
                future_action_offset,
                catch_angle,
                catch_speed,
                max_cart_abs,
            )
            labels["deterministicSequenceSummary"] = deterministic_sequence_rollout["summary"]
        else:
            labels = label_snapshots_from_success_replay(
                selected,
                replay,
                max_replay_candidates,
                future_action_offset,
                catch_angle,
                catch_speed,
                max_cart_abs,
                label_mode,
                suffix_steps,
                use_replay_hidden,
            )
        label_count = int(labels.get("labels", 0))
        if label_count <= 0:
            pass_results.append(
                {
                    "pass": int(pass_index + 1),
                    "deterministicSummary": deterministic_rollout["summary"],
                    "selection": {key: value for key, value in selected.items() if key not in {"qpos", "qvel", "lastActions", "hidden", "obs"}},
                    "labels": {
                        key: value
                        for key, value in labels.items()
                        if key not in {"labelsArray", "weightsArray", "obsSequences", "actionSequences", "sequenceHidden"}
                    },
                    "updated": False,
                    "reason": labels.get("reason", "no success replay labels"),
                }
            )
            continue

        weight_t = torch.as_tensor(labels["weightsArray"], dtype=torch.float32, device=device)
        weight_t = weight_t / (weight_t.mean() + 1e-6)
        sequence_mode = labels.get("obsSequences") is not None and labels.get("actionSequences") is not None
        if sequence_mode:
            obs_seq_t = torch.as_tensor(labels["obsSequences"], dtype=torch.float32, device=device)
            action_seq_t = torch.as_tensor(labels["actionSequences"], dtype=torch.float32, device=device)
            if labels.get("sequenceHidden") is not None:
                initial_hidden_t = torch.as_tensor(labels["sequenceHidden"], dtype=torch.float32, device=device)
            elif selected.get("hidden") is not None:
                initial_hidden_t = torch.as_tensor(selected["hidden"][:label_count], dtype=torch.float32, device=device)
            else:
                initial_hidden_t = torch.zeros(label_count, int(hidden_dim), dtype=torch.float32, device=device)
        else:
            obs_t = torch.as_tensor(selected["obs"][:label_count], dtype=torch.float32, device=device)
            if selected.get("hidden") is not None:
                hidden_t = torch.as_tensor(selected["hidden"][:label_count], dtype=torch.float32, device=device)
            else:
                hidden_t = torch.zeros(label_count, int(hidden_dim), dtype=torch.float32, device=device)
            target_t = torch.as_tensor(labels["labelsArray"], dtype=torch.float32, device=device)
        before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
        losses = []
        for epoch_index in range(int(epochs)):
            if sequence_mode:
                hidden = initial_hidden_t.clone()
                mse_terms = []
                nll_terms = []
                entropy_terms = []
                for step_index in range(obs_seq_t.shape[1]):
                    predicted, _logprob_sampled, _value, _hidden_for_pred = policy(
                        obs_seq_t[:, step_index],
                        hidden,
                        deterministic=True,
                    )
                    logprob, entropy, _value2, hidden = policy.evaluate_actions(
                        obs_seq_t[:, step_index],
                        hidden,
                        action_seq_t[:, step_index],
                    )
                    mse_terms.append(
                        F.smooth_l1_loss(predicted.reshape(-1), action_seq_t[:, step_index], reduction="none")
                    )
                    nll_terms.append(-logprob)
                    entropy_terms.append(entropy)
                mse_loss = (torch.stack(mse_terms, dim=1).mean(dim=1) * weight_t).mean()
                nll_loss = (torch.stack(nll_terms, dim=1).mean(dim=1) * weight_t).mean()
                entropy_loss = (torch.stack(entropy_terms, dim=1).mean(dim=1) * weight_t).mean()
                loss = (
                    float(sequence_mse_coef) * mse_loss
                    + float(sequence_nll_coef) * nll_loss
                    - float(sequence_entropy_coef) * entropy_loss
                )
            else:
                predicted, _logprob, _value, _hidden = policy(obs_t, hidden_t, deterministic=True)
                loss_terms = F.smooth_l1_loss(predicted.reshape(-1), target_t, reduction="none") * weight_t
                loss = loss_terms.mean()
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(grad_clip)).detach())
            optimizer.step()
            if epoch_index in {0, max(0, int(epochs) // 2), max(0, int(epochs) - 1)}:
                loss_row = {
                    "epoch": int(epoch_index + 1),
                    "loss": float(loss.detach()),
                    "gradNorm": grad_norm,
                }
                if sequence_mode:
                    loss_row.update(
                        {
                            "mseLoss": float(mse_loss.detach()),
                            "nllLoss": float(nll_loss.detach()),
                            "entropy": float(entropy_loss.detach()),
                        }
                    )
                losses.append(loss_row)
        after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
        pass_result = {
            "pass": int(pass_index + 1),
            "deterministicSummary": deterministic_rollout["summary"],
            "selection": {key: value for key, value in selected.items() if key not in {"qpos", "qvel", "lastActions", "hidden", "obs"}},
            "labels": {
                key: value
                for key, value in labels.items()
                if key not in {"labelsArray", "weightsArray", "obsSequences", "actionSequences", "sequenceHidden"}
            },
            "selectedSnapshots": int(selected_count),
            "labeledSnapshots": int(label_count),
            "learningRate": float(learning_rate),
            "epochs": int(epochs),
            "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
            "targetActionAbsMean": float(np.mean(np.abs(labels["labelsArray"]))),
            "targetActionAbsMax": float(np.max(np.abs(labels["labelsArray"]))),
            "weightMean": float(np.mean(labels["weightsArray"])),
            "weightMax": float(np.max(labels["weightsArray"])),
            "labelMode": str(labels.get("labelMode", label_mode)),
            "suffixSteps": int(labels.get("suffixSteps", 1)),
            "sequenceMode": bool(sequence_mode),
            "useReplayHidden": bool(labels.get("sequenceHidden") is not None),
            "losses": losses,
            "updated": True,
        }
        print(
            json.dumps(
                {
                    "phase": "deterministic-success-replay-dagger-pass",
                    "pass": int(pass_index + 1),
                    "selectedSnapshots": int(selected_count),
                    "labeledSnapshots": int(label_count),
                    "parameterDeltaL2": pass_result["parameterDeltaL2"],
                },
                sort_keys=True,
            ),
            flush=True,
        )
        pass_results.append(pass_result)
    after_all = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    updated_passes = [item for item in pass_results if item.get("updated")]
    return {
        "enabled": True,
        "passes": int(passes),
        "epochs": int(epochs),
        "learningRate": float(learning_rate),
        "maxSnapshots": int(max_snapshots),
        "maxReplayCandidates": int(max_replay_candidates),
        "futureActionOffset": int(future_action_offset),
        "catchAngle": float(catch_angle),
        "catchSpeed": float(catch_speed),
        "minStepSeparation": int(min_step_separation),
        "maxPerWorld": int(max_per_world),
        "dedupeEps": float(dedupe_eps),
        "maxCartAbs": float(max_cart_abs),
        "labelMode": str(label_mode),
        "suffixSteps": int(suffix_steps),
        "useReplayHidden": bool(use_replay_hidden),
        "sequenceMseCoef": float(sequence_mse_coef),
        "sequenceNllCoef": float(sequence_nll_coef),
        "sequenceEntropyCoef": float(sequence_entropy_coef),
        "updatedPasses": int(len(updated_passes)),
        "parameterDeltaL2": float(torch.linalg.vector_norm(after_all - before_all)),
        "passSummaries": pass_results,
        "selector": "deterministic exact-down failure states labeled by nearest solved success-buffer suffix",
    }


def is_better_eval(candidate: dict, incumbent: dict) -> bool:
    if int(candidate.get("passes", 0)) > 0 and int(incumbent.get("passes", 0)) == 0:
        return True
    return (
        candidate["maxHeldSeconds"] > incumbent["maxHeldSeconds"]
        or (
            candidate["maxHeldSeconds"] == incumbent["maxHeldSeconds"]
            and candidate["maxStrictScore"] > incumbent["maxStrictScore"]
        )
    )


def summarize_eval_passes(passes: list[dict]) -> dict:
    if not passes:
        return {
            "passes": 0,
            "maxHeldSeconds": 0.0,
            "maxStrictScore": 0.0,
            "solvedOneSecond": False,
            "solvedPasses": 0,
            "solvedPassRate": 0.0,
        }
    solved = [item for item in passes if item["solvedOneSecond"]]
    best = max(passes, key=lambda item: (item["maxHeldSeconds"], item["maxStrictScore"]))
    return {
        **best,
        "passes": len(passes),
        "solvedPasses": len(solved),
        "solvedPassRate": len(solved) / len(passes),
        "passSummaries": passes,
    }


def train_device_ppo(
    mjcf_xml: str,
    links: int,
    nworld: int,
    rollout_steps: int,
    eval_steps: int,
    updates: int,
    update_epochs: int,
    pose: str,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    policy_kind: str = "tiny-gru",
    eval_interval: int = 1,
    write_progress: Path | None = None,
    bc_stabilizer_epochs: int = 0,
    bc_stabilizer_steps: int = 1024,
    bc_stabilizer_learning_rate: float = 1e-3,
    bc_stabilizer_sequence_length: int = 1,
    bc_energy_teacher_epochs: int = 0,
    bc_energy_teacher_steps: int = 1600,
    bc_energy_teacher_sequence_length: int = 160,
    bc_energy_teacher_dagger_iterations: int = 0,
    bc_trajectory_file: Path | None = None,
    bc_trajectory_epochs: int = 0,
    bc_trajectory_sequence_length: int = 512,
    bc_trajectory_learning_rate: float = 3e-5,
    bc_parameterized_teacher_source: Path | None = None,
    bc_parameterized_teacher_epochs: int = 0,
    bc_parameterized_teacher_steps: int = 1024,
    bc_parameterized_teacher_sequence_length: int = 256,
    bc_parameterized_teacher_learning_rate: float = 3e-5,
    bc_parameterized_teacher_dagger_iterations: int = 1,
    bc_parameterized_teacher_limit: int = 8,
    learning_rate: float = 3e-4,
    entropy_coef: float = 0.01,
    clip_coef: float = 0.2,
    gamma: float = 0.995,
    gae_lambda: float = 0.95,
    eval_stochastic_passes: int = 0,
    write_checkpoint: Path | None = None,
    warmstart_checkpoint: Path | None = None,
    allow_warmstart_force_scale_mismatch: bool = False,
    elite_rollout_bc_epochs: int = 0,
    elite_rollout_bc_min_held_seconds: float = 1.0,
    elite_rollout_bc_learning_rate: float = 1e-4,
    elite_rollout_bc_fallback_min_held_seconds: float = 0.25,
    elite_rollout_bc_top_k: int = 2,
    elite_rollout_bc_window_mode: str = "full",
    elite_rollout_bc_window_padding_steps: int = 0,
    elite_rollout_bc_catch_angle: float = 0.55,
    elite_rollout_bc_catch_speed: float = 3.2,
    elite_rollout_bc_objective: str = "mse",
    elite_rollout_bc_weight_power: float = 1.0,
    stochastic_success_bc_passes: int = 0,
    stochastic_success_bc_epochs: int = 0,
    stochastic_success_bc_min_held_seconds: float = 1.0,
    stochastic_success_bc_fallback_min_held_seconds: float = 0.8,
    stochastic_success_bc_learning_rate: float = 1e-5,
    stochastic_success_bc_top_k: int = 4,
    stochastic_success_bc_window_mode: str = "near-top",
    stochastic_success_bc_window_padding_steps: int = 24,
    stochastic_success_bc_catch_angle: float = 0.72,
    stochastic_success_bc_catch_speed: float = 4.0,
    stochastic_success_bc_objective: str = "mse",
    stochastic_success_bc_weight_power: float = 1.0,
    stochastic_success_snapshot_ppo_passes: int = 0,
    stochastic_success_snapshot_ppo_steps: int = 128,
    stochastic_success_snapshot_ppo_epochs: int = 0,
    stochastic_success_snapshot_ppo_learning_rate: float = 3e-5,
    stochastic_success_snapshot_ppo_min_held_seconds: float = 1.0,
    stochastic_success_snapshot_ppo_fallback_min_held_seconds: float = 0.5,
    stochastic_success_snapshot_ppo_top_k_worlds: int = 4,
    stochastic_success_snapshot_ppo_offsets: str = "0,80,160,320",
    stochastic_success_snapshot_ppo_max_snapshots: int = 16,
    stochastic_success_snapshot_ppo_catch_angle: float = 0.72,
    stochastic_success_snapshot_ppo_catch_speed: float = 4.0,
    stochastic_success_sequence_sil_passes: int = 0,
    stochastic_success_sequence_sil_epochs: int = 0,
    stochastic_success_sequence_sil_fallback_min_held_seconds: float = 0.8,
    stochastic_success_sequence_sil_learning_rate: float = 3e-5,
    stochastic_success_sequence_sil_top_k_worlds: int = 4,
    stochastic_success_sequence_sil_burn_in_steps: int = 80,
    stochastic_success_sequence_sil_beta: float = 4.0,
    stochastic_success_sequence_sil_max_weight: float = 12.0,
    stochastic_success_sequence_sil_value_coef: float = 0.1,
    deterministic_dagger_passes: int = 0,
    deterministic_dagger_epochs: int = 0,
    deterministic_dagger_continuations: int = 4,
    deterministic_dagger_continuation_steps: int = 192,
    deterministic_dagger_learning_rate: float = 3e-5,
    deterministic_dagger_max_snapshots: int = 12,
    deterministic_dagger_min_teacher_strict_score: float = 70.0,
    deterministic_dagger_catch_angle: float = 0.55,
    deterministic_dagger_catch_speed: float = 3.2,
    deterministic_dagger_grad_clip: float = 0.5,
    deterministic_replay_dagger_passes: int = 0,
    deterministic_replay_dagger_epochs: int = 0,
    deterministic_replay_dagger_learning_rate: float = 3e-5,
    deterministic_replay_dagger_max_snapshots: int = 16,
    deterministic_replay_dagger_max_candidates: int = 4096,
    deterministic_replay_dagger_future_action_offset: int = 0,
    deterministic_replay_dagger_catch_angle: float = 0.55,
    deterministic_replay_dagger_catch_speed: float = 3.2,
    deterministic_replay_dagger_min_step_separation: int = 12,
    deterministic_replay_dagger_max_per_world: int = 4,
    deterministic_replay_dagger_dedupe_eps: float = 1e-4,
    deterministic_replay_dagger_max_cart_abs: float = 1.95,
    deterministic_replay_dagger_label_mode: str = "nearest-action",
    deterministic_replay_dagger_suffix_steps: int = 24,
    deterministic_replay_dagger_use_replay_hidden: bool = False,
    deterministic_replay_dagger_sequence_mse_coef: float = 1.0,
    deterministic_replay_dagger_sequence_nll_coef: float = 0.2,
    deterministic_replay_dagger_sequence_entropy_coef: float = 0.0,
    deterministic_replay_dagger_grad_clip: float = 0.5,
    random_horizon: bool = False,
    min_horizon: int = 160,
    max_horizon: int = 512,
    energy_teacher_anchor_weight: float = 0.0,
    terminal_boundary: float = HARD_RAIL_BOUNDARY,
    reward_mode: str = "default",
    success_replay_file: Path | None = None,
    success_replay_epochs: int = 0,
    success_replay_learning_rate: float = 1e-6,
    success_replay_min_source_held_seconds: float = 1.0,
    success_replay_burn_in_steps: int = 160,
    success_replay_beta: float = 3.0,
    success_replay_max_weight: float = 8.0,
    success_replay_entropy_coef: float = 0.0005,
    success_replay_mse_coef: float = 0.25,
    success_replay_nll_coef: float = 1.0,
    success_replay_action_smoothing_radius: int = 6,
    success_replay_grad_clip: float = 0.5,
    policy_log_std_target: float | None = None,
    freeze_policy_log_std: bool = False,
) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(seed))
    np.random.seed(int(seed))
    mjcf_hash = hashlib.sha256(mjcf_xml.encode("utf-8")).hexdigest()
    policy = build_torch_policy(OBS_DIM, hidden_dim, seed, recurrent=True, policy_kind=policy_kind)
    warmstart = {"enabled": False}
    if warmstart_checkpoint is not None:
        checkpoint = torch.load(warmstart_checkpoint, map_location="cpu")
        checkpoint_links = int(checkpoint.get("links", links))
        checkpoint_hidden = int(checkpoint.get("hiddenDim", hidden_dim))
        checkpoint_obs_dim = int(checkpoint.get("obsDim", OBS_DIM))
        checkpoint_force_scale = float(checkpoint.get("forceScale", force_scale))
        checkpoint_policy_kind = str(checkpoint.get("policyKind", "tiny-gru"))
        if checkpoint_links != int(links):
            raise ValueError(f"Warmstart links {checkpoint_links} does not match requested links {links}")
        if checkpoint_hidden != int(hidden_dim):
            raise ValueError(f"Warmstart hiddenDim {checkpoint_hidden} does not match requested hiddenDim {hidden_dim}")
        if checkpoint_obs_dim != int(OBS_DIM):
            raise ValueError(f"Warmstart obsDim {checkpoint_obs_dim} does not match trainer obsDim {OBS_DIM}")
        if abs(checkpoint_force_scale - float(force_scale)) > 1e-6 and not allow_warmstart_force_scale_mismatch:
            raise ValueError(
                f"Warmstart forceScale {checkpoint_force_scale} does not match requested forceScale {force_scale}"
            )
        if checkpoint_policy_kind != str(policy_kind):
            raise ValueError(f"Warmstart policyKind {checkpoint_policy_kind} does not match requested policyKind {policy_kind}")
        policy.load_state_dict(checkpoint["policyStateDict"])
        warmstart = {
            "enabled": True,
            "path": str(warmstart_checkpoint),
            "links": checkpoint_links,
            "hiddenDim": checkpoint_hidden,
            "obsDim": checkpoint_obs_dim,
            "forceScale": checkpoint_force_scale,
            "requestedForceScale": float(force_scale),
            "forceScaleMismatchAllowed": bool(allow_warmstart_force_scale_mismatch),
            "policyKind": checkpoint_policy_kind,
            "bestDownEvaluation": checkpoint.get("bestDownEvaluation"),
            "bestStochasticDownEvaluation": checkpoint.get("bestStochasticDownEvaluation"),
        }
    policy_log_std = configure_policy_log_std(policy, policy_log_std_target, freeze_policy_log_std)
    energy_teacher_warmup = warmup_with_energy_teacher_bc(
        mjcf_xml,
        policy,
        links,
        nworld,
        bc_energy_teacher_steps,
        bc_energy_teacher_epochs,
        seed,
        hidden_dim,
        force_scale,
        bc_energy_teacher_sequence_length,
        bc_energy_teacher_dagger_iterations,
        pose,
    )
    bc_warmup = warmup_with_stabilizer_bc(
        mjcf_xml,
        policy,
        links,
        nworld,
        bc_stabilizer_steps,
        bc_stabilizer_epochs,
        seed,
        hidden_dim,
        force_scale,
        bc_stabilizer_learning_rate,
        bc_stabilizer_sequence_length,
    )
    trajectory_warmup = warmup_with_trajectory_bc(
        policy,
        bc_trajectory_file,
        bc_trajectory_epochs,
        hidden_dim,
        bc_trajectory_sequence_length,
        bc_trajectory_learning_rate,
    )
    parameterized_teacher_warmup = warmup_with_parameterized_teacher_dagger(
        mjcf_xml,
        policy,
        bc_parameterized_teacher_source,
        bc_parameterized_teacher_epochs,
        links,
        nworld,
        bc_parameterized_teacher_steps,
        seed,
        hidden_dim,
        force_scale,
        bc_parameterized_teacher_sequence_length,
        bc_parameterized_teacher_learning_rate,
        bc_parameterized_teacher_dagger_iterations,
        bc_parameterized_teacher_limit,
        pose,
    )
    success_replay = load_success_replay_file(success_replay_file, links, success_replay_min_source_held_seconds)
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(learning_rate), weight_decay=1e-5)
    history = []
    best_down = {"maxHeldSeconds": 0.0, "maxStrictScore": 0.0, "solvedOneSecond": False}
    best_hold = {"maxHeldSeconds": 0.0, "maxStrictScore": 0.0, "solvedOneSecond": False}
    best_stochastic_down = {
        "passes": 0,
        "maxHeldSeconds": 0.0,
        "maxStrictScore": 0.0,
        "solvedOneSecond": False,
        "solvedPasses": 0,
        "solvedPassRate": 0.0,
    }
    best_stochastic_hold = {
        "passes": 0,
        "maxHeldSeconds": 0.0,
        "maxStrictScore": 0.0,
        "solvedOneSecond": False,
        "solvedPasses": 0,
        "solvedPassRate": 0.0,
    }
    best_down_policy_state = None
    best_down_checkpoint_update = 0
    checkpoint_written = {"written": False}

    def clone_policy_state_dict() -> dict:
        return {key: value.detach().cpu().clone() for key, value in policy.state_dict().items()}

    def build_result(status: str) -> dict:
        return {
            "schema": "six-pendulum-mjwarp-device-ppo-training-v1",
            "status": status,
            "algorithm": "local-recurrent-ppo-on-mjwarp-rollout-buffers",
            "links": int(links),
            "nworld": int(nworld),
            "rolloutSteps": int(rollout_steps),
            "rolloutSeconds": float(rollout_steps) * 0.0025,
            "evalSteps": int(eval_steps),
            "evalSeconds": float(eval_steps) * 0.0025,
            "updates": int(updates),
            "completedUpdates": len(history),
            "updateEpochs": int(update_epochs),
            "evalInterval": max(1, int(eval_interval)),
            "pose": pose,
            "seed": int(seed),
            "forceScale": float(force_scale),
            "terminalBoundary": float(terminal_boundary),
            "rewardMode": str(reward_mode),
            "mjcfSha256": mjcf_hash,
            "policyKind": str(policy_kind),
            "policyLogStd": policy_log_std,
            "randomHorizonTraining": {
                "enabled": bool(random_horizon),
                "minSteps": int(min_horizon) if random_horizon else 0,
                "maxSteps": int(max_horizon) if random_horizon else 0,
                "appliesTo": "training rollouts only; held-out down/hold eval uses fixed horizons",
            },
            "bcStabilizerWarmup": bc_warmup,
            "bcEnergyTeacherWarmup": energy_teacher_warmup,
            "bcTrajectoryWarmup": trajectory_warmup,
            "bcParameterizedTeacherWarmup": parameterized_teacher_warmup,
            "successReplayAux": {
                "enabled": bool(success_replay.get("enabled") and int(success_replay_epochs) > 0),
                "path": str(success_replay_file) if success_replay_file is not None else None,
                "sourceLoaded": bool(success_replay.get("enabled")),
                "sourceReason": success_replay.get("reason"),
                "sourceWorlds": int(success_replay.get("worlds", 0)),
                "sourceSteps": int(success_replay.get("steps", 0)),
                "strongestSourceHoldSeconds": float(success_replay.get("strongestSourceHoldSeconds", 0.0)),
                "minSourceHeldSeconds": float(success_replay_min_source_held_seconds),
                "epochsPerUpdate": int(success_replay_epochs),
                "learningRate": float(success_replay_learning_rate),
                "burnInSteps": int(success_replay_burn_in_steps),
                "beta": float(success_replay_beta),
                "maxWeight": float(success_replay_max_weight),
                "entropyCoef": float(success_replay_entropy_coef),
                "mseCoef": float(success_replay_mse_coef),
                "nllCoef": float(success_replay_nll_coef),
                "actionSmoothingRadius": int(success_replay_action_smoothing_radius),
                "selector": "external exact-down stochastic learned-policy success buffer; auxiliary update after each PPO update",
            },
            "warmstartCheckpoint": warmstart,
            "eliteRolloutBc": {
                "enabled": bool(int(elite_rollout_bc_epochs) > 0),
                "epochs": int(elite_rollout_bc_epochs),
                "minHeldSeconds": float(elite_rollout_bc_min_held_seconds),
                "fallbackMinHeldSeconds": float(elite_rollout_bc_fallback_min_held_seconds),
                "topK": int(elite_rollout_bc_top_k),
                "learningRate": float(elite_rollout_bc_learning_rate),
                "windowMode": str(elite_rollout_bc_window_mode),
                "windowPaddingSteps": int(elite_rollout_bc_window_padding_steps),
                "catchAngle": float(elite_rollout_bc_catch_angle),
                "catchSpeed": float(elite_rollout_bc_catch_speed),
                "objective": str(elite_rollout_bc_objective),
                "weightPower": float(elite_rollout_bc_weight_power),
                "selector": "rollout worlds whose maxHeldSecondsByWorld reaches minHeldSeconds, or top-k worlds above fallbackMinHeldSeconds",
            },
            "stochasticSuccessBc": {
                "enabled": bool(int(stochastic_success_bc_passes) > 0 and int(stochastic_success_bc_epochs) > 0),
                "passes": int(stochastic_success_bc_passes),
                "epochs": int(stochastic_success_bc_epochs),
                "minHeldSeconds": float(stochastic_success_bc_min_held_seconds),
                "fallbackMinHeldSeconds": float(stochastic_success_bc_fallback_min_held_seconds),
                "learningRate": float(stochastic_success_bc_learning_rate),
                "topK": int(stochastic_success_bc_top_k),
                "windowMode": str(stochastic_success_bc_window_mode),
                "windowPaddingSteps": int(stochastic_success_bc_window_padding_steps),
                "catchAngle": float(stochastic_success_bc_catch_angle),
                "catchSpeed": float(stochastic_success_bc_catch_speed),
                "objective": str(stochastic_success_bc_objective),
                "weightPower": float(stochastic_success_bc_weight_power),
                "selector": "best stochastic down-start pass, then per-world solved/fallback elite selection with recurrent hidden-state burn-in",
            },
            "stochasticSuccessSnapshotPpo": {
                "enabled": bool(
                    int(stochastic_success_snapshot_ppo_passes) > 0
                    and int(stochastic_success_snapshot_ppo_epochs) > 0
                    and int(stochastic_success_snapshot_ppo_steps) > 0
                ),
                "passes": int(stochastic_success_snapshot_ppo_passes),
                "steps": int(stochastic_success_snapshot_ppo_steps),
                "epochs": int(stochastic_success_snapshot_ppo_epochs),
                "learningRate": float(stochastic_success_snapshot_ppo_learning_rate),
                "minHeldSeconds": float(stochastic_success_snapshot_ppo_min_held_seconds),
                "fallbackMinHeldSeconds": float(stochastic_success_snapshot_ppo_fallback_min_held_seconds),
                "topKWorlds": int(stochastic_success_snapshot_ppo_top_k_worlds),
                "offsets": str(stochastic_success_snapshot_ppo_offsets),
                "maxSnapshots": int(stochastic_success_snapshot_ppo_max_snapshots),
                "catchAngle": float(stochastic_success_snapshot_ppo_catch_angle),
                "catchSpeed": float(stochastic_success_snapshot_ppo_catch_speed),
                "selector": "real qpos/qvel snapshots before catch/near-top from the best stochastic down-start pass",
            },
            "stochasticSuccessSequenceSil": {
                "enabled": bool(
                    int(stochastic_success_sequence_sil_passes) > 0
                    and int(stochastic_success_sequence_sil_epochs) > 0
                ),
                "passes": int(stochastic_success_sequence_sil_passes),
                "epochs": int(stochastic_success_sequence_sil_epochs),
                "fallbackMinHeldSeconds": float(stochastic_success_sequence_sil_fallback_min_held_seconds),
                "learningRate": float(stochastic_success_sequence_sil_learning_rate),
                "topKWorlds": int(stochastic_success_sequence_sil_top_k_worlds),
                "burnInSteps": int(stochastic_success_sequence_sil_burn_in_steps),
                "beta": float(stochastic_success_sequence_sil_beta),
                "maxWeight": float(stochastic_success_sequence_sil_max_weight),
                "valueCoef": float(stochastic_success_sequence_sil_value_coef),
                "selector": "best stochastic down-start full episodes; recurrent burn-in from reset; positive-return weighted sampled-action NLL",
            },
            "deterministicFailureDagger": {
                "enabled": bool(int(deterministic_dagger_passes) > 0 and int(deterministic_dagger_epochs) > 0),
                "passes": int(deterministic_dagger_passes),
                "epochs": int(deterministic_dagger_epochs),
                "continuations": int(deterministic_dagger_continuations),
                "continuationSteps": int(deterministic_dagger_continuation_steps),
                "learningRate": float(deterministic_dagger_learning_rate),
                "maxSnapshots": int(deterministic_dagger_max_snapshots),
                "minTeacherStrictScore": float(deterministic_dagger_min_teacher_strict_score),
                "catchAngle": float(deterministic_dagger_catch_angle),
                "catchSpeed": float(deterministic_dagger_catch_speed),
                "selector": "deterministic exact-down near-top/pre-rail failure states labeled by best stochastic continuation first action",
            },
            "deterministicReplayDagger": {
                "enabled": bool(
                    int(deterministic_replay_dagger_passes) > 0 and int(deterministic_replay_dagger_epochs) > 0
                ),
                "passes": int(deterministic_replay_dagger_passes),
                "epochs": int(deterministic_replay_dagger_epochs),
                "learningRate": float(deterministic_replay_dagger_learning_rate),
                "maxSnapshots": int(deterministic_replay_dagger_max_snapshots),
                "maxReplayCandidates": int(deterministic_replay_dagger_max_candidates),
                "futureActionOffset": int(deterministic_replay_dagger_future_action_offset),
                "catchAngle": float(deterministic_replay_dagger_catch_angle),
                "catchSpeed": float(deterministic_replay_dagger_catch_speed),
                "minStepSeparation": int(deterministic_replay_dagger_min_step_separation),
                "maxPerWorld": int(deterministic_replay_dagger_max_per_world),
                "dedupeEps": float(deterministic_replay_dagger_dedupe_eps),
                "maxCartAbs": float(deterministic_replay_dagger_max_cart_abs),
                "labelMode": str(deterministic_replay_dagger_label_mode),
                "suffixSteps": int(deterministic_replay_dagger_suffix_steps),
                "useReplayHidden": bool(deterministic_replay_dagger_use_replay_hidden),
                "sequenceMseCoef": float(deterministic_replay_dagger_sequence_mse_coef),
                "sequenceNllCoef": float(deterministic_replay_dagger_sequence_nll_coef),
                "sequenceEntropyCoef": float(deterministic_replay_dagger_sequence_entropy_coef),
                "selector": "deterministic exact-down failure states labeled by nearest solved success-buffer suffix",
            },
            "ppoHyperparameters": {
                "learningRate": float(learning_rate),
                "bcStabilizerLearningRate": float(bc_stabilizer_learning_rate),
                "bcStabilizerSequenceLength": int(bc_stabilizer_sequence_length),
                "bcTrajectoryLearningRate": float(bc_trajectory_learning_rate),
                "bcTrajectorySequenceLength": int(bc_trajectory_sequence_length),
                "bcParameterizedTeacherLearningRate": float(bc_parameterized_teacher_learning_rate),
                "bcParameterizedTeacherSequenceLength": int(bc_parameterized_teacher_sequence_length),
                "bcParameterizedTeacherDaggerIterations": int(bc_parameterized_teacher_dagger_iterations),
                "bcParameterizedTeacherLimit": int(bc_parameterized_teacher_limit),
                "entropyCoef": float(entropy_coef),
                "clipCoef": float(clip_coef),
                "gamma": float(gamma),
                "gaeLambda": float(gae_lambda),
                "energyTeacherAnchorWeight": float(energy_teacher_anchor_weight if links == 1 else 0.0),
            },
            "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
            "policyPufferCompatible": bool(getattr(policy, "puffer_compatible", False)),
            "policyContractMethods": ["encode_observations", "decode_actions", "forward_eval"]
            if bool(getattr(policy, "puffer_compatible", False))
            else [],
            "elapsedSeconds": time.time() - started,
            "history": history,
            "bestDownEvaluation": best_down,
            "bestHoldEvaluation": best_hold,
            "bestStochasticDownEvaluation": best_stochastic_down,
            "bestStochasticHoldEvaluation": best_stochastic_hold,
            "checkpoint": checkpoint_written,
            "gates": {
                "learnedPolicyOnly": True,
                "strictOneSecondRequired": True,
                "subsecondDoesNotCount": True,
                "holdStartSolvedOneSecond": bool(best_hold["solvedOneSecond"]),
                "stochasticDownCandidateSolvedOneSecond": bool(best_stochastic_down["solvedOneSecond"]),
                "stochasticSolvedButDeterministicFailed": bool(
                    best_stochastic_down["solvedOneSecond"] and not best_down["solvedOneSecond"]
                ),
                "promoteToNextLink": bool(best_down["solvedOneSecond"]),
            },
            "notes": [
                "This repeatedly collects stochastic recurrent policy rollouts, updates the same policy with PPO, then evaluates deterministic down-start and hold-start behavior.",
                "Local Mac execution still reports a CPU Warp/MJWarp device; this is a correctness path before Modal/GPU scale.",
                "A score is counted only when held-out down-start maxHeldSeconds is at least one second.",
                "Partial progress is written after each update when writeProgress/writeResult is provided.",
            ],
        }

    def write_progress_result():
        if write_progress is None:
            return
        write_progress.parent.mkdir(parents=True, exist_ok=True)
        write_progress.write_text(json.dumps(build_result("device-ppo-training-running"), indent=2) + "\n")

    for update_index in range(int(updates)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            nworld,
            rollout_steps,
            pose,
            force_scale,
            seed + update_index,
            hidden_dim,
            stochastic=True,
            random_horizon=random_horizon,
            min_horizon=min_horizon,
            max_horizon=max_horizon,
            terminal_boundary=terminal_boundary,
            reward_mode=reward_mode,
        )
        update = ppo_update(
            policy,
            optimizer,
            rollout["buffers"],
            hidden_dim,
            update_epochs,
            gamma,
            gae_lambda,
            clip_coef,
            entropy_coef,
            energy_teacher_anchor_weight if links == 1 else 0.0,
            force_scale,
        )
        success_replay_aux = success_replay_aux_update(
            policy,
            success_replay,
            hidden_dim,
            links,
            success_replay_epochs,
            success_replay_learning_rate,
            success_replay_burn_in_steps,
            success_replay_beta,
            success_replay_max_weight,
            success_replay_entropy_coef,
            success_replay_mse_coef,
            success_replay_nll_coef,
            success_replay_action_smoothing_radius,
            success_replay_grad_clip,
        )
        elite_bc = elite_rollout_bc_update(
            policy,
            rollout["buffers"],
            hidden_dim,
            links,
            elite_rollout_bc_epochs,
            elite_rollout_bc_min_held_seconds,
            elite_rollout_bc_learning_rate,
            elite_rollout_bc_fallback_min_held_seconds,
            elite_rollout_bc_top_k,
            elite_rollout_bc_window_mode,
            elite_rollout_bc_window_padding_steps,
            elite_rollout_bc_catch_angle,
            elite_rollout_bc_catch_speed,
            elite_rollout_bc_objective,
            elite_rollout_bc_weight_power,
        )
        stochastic_success_bc = stochastic_success_bc_update(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            force_scale,
            seed + 50_000 + update_index * 1_000,
            hidden_dim,
            stochastic_success_bc_passes,
            stochastic_success_bc_epochs,
            stochastic_success_bc_min_held_seconds,
            stochastic_success_bc_fallback_min_held_seconds,
            stochastic_success_bc_learning_rate,
            stochastic_success_bc_top_k,
            stochastic_success_bc_window_mode,
            stochastic_success_bc_window_padding_steps,
            stochastic_success_bc_catch_angle,
            stochastic_success_bc_catch_speed,
            stochastic_success_bc_objective,
            stochastic_success_bc_weight_power,
            terminal_boundary,
        )
        stochastic_success_snapshot_ppo = stochastic_success_snapshot_ppo_update(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            force_scale,
            seed + 80_000 + update_index * 1_000,
            hidden_dim,
            stochastic_success_snapshot_ppo_passes,
            stochastic_success_snapshot_ppo_steps,
            stochastic_success_snapshot_ppo_epochs,
            stochastic_success_snapshot_ppo_learning_rate,
            gamma,
            gae_lambda,
            clip_coef,
            entropy_coef,
            stochastic_success_snapshot_ppo_min_held_seconds,
            stochastic_success_snapshot_ppo_fallback_min_held_seconds,
            stochastic_success_snapshot_ppo_top_k_worlds,
            stochastic_success_snapshot_ppo_offsets,
            stochastic_success_snapshot_ppo_max_snapshots,
            stochastic_success_snapshot_ppo_catch_angle,
            stochastic_success_snapshot_ppo_catch_speed,
            terminal_boundary,
        )
        stochastic_success_sequence_sil = stochastic_success_sequence_sil_update(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            force_scale,
            seed + 110_000 + update_index * 1_000,
            hidden_dim,
            stochastic_success_sequence_sil_passes,
            stochastic_success_sequence_sil_epochs,
            stochastic_success_sequence_sil_fallback_min_held_seconds,
            stochastic_success_sequence_sil_learning_rate,
            stochastic_success_sequence_sil_top_k_worlds,
            stochastic_success_sequence_sil_burn_in_steps,
            stochastic_success_sequence_sil_beta,
            stochastic_success_sequence_sil_max_weight,
            stochastic_success_sequence_sil_value_coef,
            terminal_boundary,
            write_progress.with_suffix(f".sequence-replay-update-{update_index + 1}.npz") if write_progress is not None else None,
        )
        deterministic_failure_dagger = deterministic_failure_dagger_update(
            mjcf_xml,
            policy,
            links,
            nworld,
            eval_steps,
            force_scale,
            seed + 140_000 + update_index * 1_000,
            hidden_dim,
            deterministic_dagger_passes,
            deterministic_dagger_epochs,
            deterministic_dagger_continuations,
            deterministic_dagger_continuation_steps,
            deterministic_dagger_learning_rate,
            deterministic_dagger_max_snapshots,
            deterministic_dagger_min_teacher_strict_score,
            deterministic_dagger_catch_angle,
            deterministic_dagger_catch_speed,
            terminal_boundary,
            deterministic_dagger_grad_clip,
        )
        deterministic_replay_dagger = deterministic_success_replay_dagger_update(
            mjcf_xml,
            policy,
            success_replay,
            links,
            nworld,
            eval_steps,
            force_scale,
            seed + 170_000 + update_index * 1_000,
            hidden_dim,
            deterministic_replay_dagger_passes,
            deterministic_replay_dagger_epochs,
            deterministic_replay_dagger_learning_rate,
            deterministic_replay_dagger_max_snapshots,
            deterministic_replay_dagger_max_candidates,
            deterministic_replay_dagger_future_action_offset,
            deterministic_replay_dagger_catch_angle,
            deterministic_replay_dagger_catch_speed,
            deterministic_replay_dagger_min_step_separation,
            deterministic_replay_dagger_max_per_world,
            deterministic_replay_dagger_dedupe_eps,
            deterministic_replay_dagger_max_cart_abs,
            deterministic_replay_dagger_label_mode,
            deterministic_replay_dagger_suffix_steps,
            deterministic_replay_dagger_use_replay_hidden,
            deterministic_replay_dagger_sequence_mse_coef,
            deterministic_replay_dagger_sequence_nll_coef,
            deterministic_replay_dagger_sequence_entropy_coef,
            terminal_boundary,
            deterministic_replay_dagger_grad_clip,
        )
        evaluation = {}
        should_eval = (update_index + 1) % max(1, int(eval_interval)) == 0 or update_index + 1 == int(updates)
        if should_eval:
            down_eval = collect_recurrent_rollout(
                mjcf_xml,
                policy,
                links,
                nworld,
                eval_steps,
                "exact-down",
                force_scale,
                seed + 10_000 + update_index,
                hidden_dim,
                stochastic=False,
                terminal_boundary=terminal_boundary,
                reward_mode=reward_mode,
            )["summary"]
            hold_eval = collect_recurrent_rollout(
                mjcf_xml,
                policy,
                links,
                nworld,
                eval_steps,
                "hold",
                force_scale,
                seed + 20_000 + update_index,
                hidden_dim,
                stochastic=False,
                terminal_boundary=terminal_boundary,
                reward_mode=reward_mode,
            )["summary"]
            stochastic_down = {}
            stochastic_hold = {}
            if eval_stochastic_passes > 0:
                stochastic_down = summarize_eval_passes(
                    [
                        collect_recurrent_rollout(
                            mjcf_xml,
                            policy,
                            links,
                            nworld,
                            eval_steps,
                            "exact-down",
                            force_scale,
                            seed + 30_000 + update_index * 1_000 + pass_index,
                            hidden_dim,
                            stochastic=True,
                            terminal_boundary=terminal_boundary,
                            reward_mode=reward_mode,
                        )["summary"]
                        for pass_index in range(int(eval_stochastic_passes))
                    ]
                )
                stochastic_hold = summarize_eval_passes(
                    [
                        collect_recurrent_rollout(
                            mjcf_xml,
                            policy,
                            links,
                            nworld,
                            eval_steps,
                            "hold",
                            force_scale,
                            seed + 40_000 + update_index * 1_000 + pass_index,
                            hidden_dim,
                            stochastic=True,
                            terminal_boundary=terminal_boundary,
                            reward_mode=reward_mode,
                        )["summary"]
                        for pass_index in range(int(eval_stochastic_passes))
                    ]
                )
            if is_better_eval(down_eval, best_down):
                best_down = copy.deepcopy(down_eval)
                best_down_policy_state = clone_policy_state_dict()
                best_down_checkpoint_update = int(update_index + 1)
            if is_better_eval(hold_eval, best_hold):
                best_hold = copy.deepcopy(hold_eval)
            if stochastic_down and is_better_eval(stochastic_down, best_stochastic_down):
                best_stochastic_down = copy.deepcopy(stochastic_down)
            if stochastic_hold and is_better_eval(stochastic_hold, best_stochastic_hold):
                best_stochastic_hold = copy.deepcopy(stochastic_hold)
            evaluation = {
                "down": down_eval,
                "hold": hold_eval,
            }
            if stochastic_down:
                evaluation["stochasticDown"] = stochastic_down
            if stochastic_hold:
                evaluation["stochasticHold"] = stochastic_hold
        history.append(
            {
                "update": update_index + 1,
                "rollout": rollout["summary"],
                "ppo": update,
                "successReplayAux": success_replay_aux,
                "eliteRolloutBc": elite_bc,
                "stochasticSuccessBc": stochastic_success_bc,
                "stochasticSuccessSnapshotPpo": stochastic_success_snapshot_ppo,
                "stochasticSuccessSequenceSil": stochastic_success_sequence_sil,
                "deterministicFailureDagger": deterministic_failure_dagger,
                "deterministicReplayDagger": deterministic_replay_dagger,
                "evaluation": evaluation,
                "countsTowardSolve": bool(evaluation.get("down", {}).get("solvedOneSecond", False)),
            }
        )
        print(
            json.dumps(
                {
                    "update": update_index + 1,
                    "rollout": rollout["summary"],
                    "successReplayAux": success_replay_aux,
                    "eliteRolloutBc": elite_bc,
                    "stochasticSuccessSequenceSil": stochastic_success_sequence_sil,
                    "deterministicFailureDagger": deterministic_failure_dagger,
                    "deterministicReplayDagger": deterministic_replay_dagger,
                    "evaluation": evaluation,
                },
                sort_keys=True,
            ),
            flush=True,
        )
        write_progress_result()

    if write_checkpoint is not None:
        write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        final_policy_state = clone_policy_state_dict()
        selected_policy_state = best_down_policy_state if best_down_policy_state is not None else final_policy_state
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-device-ppo-policy-checkpoint-v1",
                "policyStateDict": selected_policy_state,
                "finalPolicyStateDict": final_policy_state,
                "checkpointSelection": {
                    "policyStateDict": "best-down-evaluation" if best_down_policy_state is not None else "final-policy",
                    "bestDownCheckpointUpdate": int(best_down_checkpoint_update),
                },
                "links": int(links),
                "hiddenDim": int(hidden_dim),
                "obsDim": int(OBS_DIM),
                "forceScale": float(force_scale),
                "policyKind": str(policy_kind),
                "seed": int(seed),
                "bestDownEvaluation": best_down,
                "bestStochasticDownEvaluation": best_stochastic_down,
            },
            write_checkpoint,
        )
        checkpoint_written = {
            "written": True,
            "path": str(write_checkpoint),
            "format": "torch-save-state-dict",
        }

    return build_result("device-ppo-training-finished")


def main():
    parser = argparse.ArgumentParser(description="Train a recurrent PPO policy on MJWarp device rollout buffers.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=96)
    parser.add_argument("--eval-steps", type=int, default=480)
    parser.add_argument("--updates", type=int, default=4)
    parser.add_argument("--update-epochs", type=int, default=2)
    parser.add_argument("--pose", choices=["down", "exact-down", "hold", "mixed", "down-heavy", "down-whip"], default="down")
    parser.add_argument("--force-scale", type=float, default=DEFAULT_ACTION_SCALE)
    parser.add_argument("--policy-hidden-dim", type=int, default=64)
    parser.add_argument("--policy-kind", choices=["tiny-gru", "puffer-mingru"], default="tiny-gru")
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--eval-interval", type=int, default=1)
    parser.add_argument("--bc-stabilizer-epochs", type=int, default=0)
    parser.add_argument("--bc-stabilizer-steps", type=int, default=1024)
    parser.add_argument("--bc-stabilizer-learning-rate", type=float, default=1e-3)
    parser.add_argument("--bc-stabilizer-sequence-length", type=int, default=1)
    parser.add_argument("--bc-energy-teacher-epochs", type=int, default=0)
    parser.add_argument("--bc-energy-teacher-steps", type=int, default=1600)
    parser.add_argument("--bc-energy-teacher-sequence-length", type=int, default=160)
    parser.add_argument("--bc-energy-teacher-dagger-iterations", type=int, default=0)
    parser.add_argument("--bc-trajectory-file", type=Path, default=None)
    parser.add_argument("--bc-trajectory-epochs", type=int, default=0)
    parser.add_argument("--bc-trajectory-sequence-length", type=int, default=512)
    parser.add_argument("--bc-trajectory-learning-rate", type=float, default=3e-5)
    parser.add_argument("--bc-parameterized-teacher-source", type=Path, default=None)
    parser.add_argument("--bc-parameterized-teacher-epochs", type=int, default=0)
    parser.add_argument("--bc-parameterized-teacher-steps", type=int, default=1024)
    parser.add_argument("--bc-parameterized-teacher-sequence-length", type=int, default=256)
    parser.add_argument("--bc-parameterized-teacher-learning-rate", type=float, default=3e-5)
    parser.add_argument("--bc-parameterized-teacher-dagger-iterations", type=int, default=1)
    parser.add_argument("--bc-parameterized-teacher-limit", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--entropy-coef", type=float, default=0.01)
    parser.add_argument("--clip-coef", type=float, default=0.2)
    parser.add_argument("--gamma", type=float, default=0.995)
    parser.add_argument("--gae-lambda", type=float, default=0.95)
    parser.add_argument("--eval-stochastic-passes", type=int, default=0)
    parser.add_argument("--write-checkpoint", type=Path, default=None)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=None)
    parser.add_argument("--allow-warmstart-force-scale-mismatch", action="store_true")
    parser.add_argument("--elite-rollout-bc-epochs", type=int, default=0)
    parser.add_argument("--elite-rollout-bc-min-held-seconds", type=float, default=1.0)
    parser.add_argument("--elite-rollout-bc-learning-rate", type=float, default=1e-4)
    parser.add_argument("--elite-rollout-bc-fallback-min-held-seconds", type=float, default=0.25)
    parser.add_argument("--elite-rollout-bc-top-k", type=int, default=2)
    parser.add_argument(
        "--elite-rollout-bc-window-mode",
        choices=["full", "catch", "near-top", "success-prefix", "precatch-catch"],
        default="full",
    )
    parser.add_argument("--elite-rollout-bc-window-padding-steps", type=int, default=0)
    parser.add_argument("--elite-rollout-bc-catch-angle", type=float, default=0.55)
    parser.add_argument("--elite-rollout-bc-catch-speed", type=float, default=3.2)
    parser.add_argument("--elite-rollout-bc-objective", choices=["mse", "nll"], default="mse")
    parser.add_argument("--elite-rollout-bc-weight-power", type=float, default=1.0)
    parser.add_argument("--stochastic-success-bc-passes", type=int, default=0)
    parser.add_argument("--stochastic-success-bc-epochs", type=int, default=0)
    parser.add_argument("--stochastic-success-bc-min-held-seconds", type=float, default=1.0)
    parser.add_argument("--stochastic-success-bc-fallback-min-held-seconds", type=float, default=0.8)
    parser.add_argument("--stochastic-success-bc-learning-rate", type=float, default=1e-5)
    parser.add_argument("--stochastic-success-bc-top-k", type=int, default=4)
    parser.add_argument(
        "--stochastic-success-bc-window-mode",
        choices=["full", "catch", "near-top", "success-prefix", "precatch-catch"],
        default="near-top",
    )
    parser.add_argument("--stochastic-success-bc-window-padding-steps", type=int, default=24)
    parser.add_argument("--stochastic-success-bc-catch-angle", type=float, default=0.72)
    parser.add_argument("--stochastic-success-bc-catch-speed", type=float, default=4.0)
    parser.add_argument("--stochastic-success-bc-objective", choices=["mse", "nll"], default="mse")
    parser.add_argument("--stochastic-success-bc-weight-power", type=float, default=1.0)
    parser.add_argument("--stochastic-success-snapshot-ppo-passes", type=int, default=0)
    parser.add_argument("--stochastic-success-snapshot-ppo-steps", type=int, default=128)
    parser.add_argument("--stochastic-success-snapshot-ppo-epochs", type=int, default=0)
    parser.add_argument("--stochastic-success-snapshot-ppo-learning-rate", type=float, default=3e-5)
    parser.add_argument("--stochastic-success-snapshot-ppo-min-held-seconds", type=float, default=1.0)
    parser.add_argument("--stochastic-success-snapshot-ppo-fallback-min-held-seconds", type=float, default=0.5)
    parser.add_argument("--stochastic-success-snapshot-ppo-top-k-worlds", type=int, default=4)
    parser.add_argument("--stochastic-success-snapshot-ppo-offsets", default="0,80,160,320")
    parser.add_argument("--stochastic-success-snapshot-ppo-max-snapshots", type=int, default=16)
    parser.add_argument("--stochastic-success-snapshot-ppo-catch-angle", type=float, default=0.72)
    parser.add_argument("--stochastic-success-snapshot-ppo-catch-speed", type=float, default=4.0)
    parser.add_argument("--stochastic-success-sequence-sil-passes", type=int, default=0)
    parser.add_argument("--stochastic-success-sequence-sil-epochs", type=int, default=0)
    parser.add_argument("--stochastic-success-sequence-sil-fallback-min-held-seconds", type=float, default=0.8)
    parser.add_argument("--stochastic-success-sequence-sil-learning-rate", type=float, default=3e-5)
    parser.add_argument("--stochastic-success-sequence-sil-top-k-worlds", type=int, default=4)
    parser.add_argument("--stochastic-success-sequence-sil-burn-in-steps", type=int, default=80)
    parser.add_argument("--stochastic-success-sequence-sil-beta", type=float, default=4.0)
    parser.add_argument("--stochastic-success-sequence-sil-max-weight", type=float, default=12.0)
    parser.add_argument("--stochastic-success-sequence-sil-value-coef", type=float, default=0.1)
    parser.add_argument("--deterministic-dagger-passes", type=int, default=0)
    parser.add_argument("--deterministic-dagger-epochs", type=int, default=0)
    parser.add_argument("--deterministic-dagger-continuations", type=int, default=4)
    parser.add_argument("--deterministic-dagger-continuation-steps", type=int, default=192)
    parser.add_argument("--deterministic-dagger-learning-rate", type=float, default=3e-5)
    parser.add_argument("--deterministic-dagger-max-snapshots", type=int, default=12)
    parser.add_argument("--deterministic-dagger-min-teacher-strict-score", type=float, default=70.0)
    parser.add_argument("--deterministic-dagger-catch-angle", type=float, default=0.55)
    parser.add_argument("--deterministic-dagger-catch-speed", type=float, default=3.2)
    parser.add_argument("--deterministic-dagger-grad-clip", type=float, default=0.5)
    parser.add_argument("--deterministic-replay-dagger-passes", type=int, default=0)
    parser.add_argument("--deterministic-replay-dagger-epochs", type=int, default=0)
    parser.add_argument("--deterministic-replay-dagger-learning-rate", type=float, default=3e-5)
    parser.add_argument("--deterministic-replay-dagger-max-snapshots", type=int, default=16)
    parser.add_argument("--deterministic-replay-dagger-max-candidates", type=int, default=4096)
    parser.add_argument("--deterministic-replay-dagger-future-action-offset", type=int, default=0)
    parser.add_argument("--deterministic-replay-dagger-catch-angle", type=float, default=0.55)
    parser.add_argument("--deterministic-replay-dagger-catch-speed", type=float, default=3.2)
    parser.add_argument("--deterministic-replay-dagger-min-step-separation", type=int, default=12)
    parser.add_argument("--deterministic-replay-dagger-max-per-world", type=int, default=4)
    parser.add_argument("--deterministic-replay-dagger-dedupe-eps", type=float, default=1e-4)
    parser.add_argument("--deterministic-replay-dagger-max-cart-abs", type=float, default=1.95)
    parser.add_argument(
        "--deterministic-replay-dagger-label-mode",
        choices=["nearest-action", "suffix-sequence"],
        default="nearest-action",
    )
    parser.add_argument("--deterministic-replay-dagger-suffix-steps", type=int, default=24)
    parser.add_argument("--deterministic-replay-dagger-use-replay-hidden", action="store_true")
    parser.add_argument("--deterministic-replay-dagger-sequence-mse-coef", type=float, default=1.0)
    parser.add_argument("--deterministic-replay-dagger-sequence-nll-coef", type=float, default=0.2)
    parser.add_argument("--deterministic-replay-dagger-sequence-entropy-coef", type=float, default=0.0)
    parser.add_argument("--deterministic-replay-dagger-grad-clip", type=float, default=0.5)
    parser.add_argument("--random-horizon", action="store_true")
    parser.add_argument("--min-horizon", type=int, default=160)
    parser.add_argument("--max-horizon", type=int, default=512)
    parser.add_argument("--energy-teacher-anchor-weight", type=float, default=0.0)
    parser.add_argument("--mjcf", type=Path, default=None)
    parser.add_argument("--terminal-boundary", type=float, default=HARD_RAIL_BOUNDARY)
    parser.add_argument("--reward-mode", choices=["default", "dense-swingup"], default="default")
    parser.add_argument("--success-replay-file", type=Path, default=None)
    parser.add_argument("--success-replay-epochs", type=int, default=0)
    parser.add_argument("--success-replay-learning-rate", type=float, default=1e-6)
    parser.add_argument("--success-replay-min-source-held-seconds", type=float, default=1.0)
    parser.add_argument("--success-replay-burn-in-steps", type=int, default=160)
    parser.add_argument("--success-replay-beta", type=float, default=3.0)
    parser.add_argument("--success-replay-max-weight", type=float, default=8.0)
    parser.add_argument("--success-replay-entropy-coef", type=float, default=0.0005)
    parser.add_argument("--success-replay-mse-coef", type=float, default=0.25)
    parser.add_argument("--success-replay-nll-coef", type=float, default=1.0)
    parser.add_argument("--success-replay-action-smoothing-radius", type=int, default=6)
    parser.add_argument("--success-replay-grad-clip", type=float, default=0.5)
    parser.add_argument("--policy-log-std-target", type=float, default=None)
    parser.add_argument("--freeze-policy-log-std", action="store_true")
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    mjcf_path = args.mjcf or Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = train_device_ppo(
        mjcf_path.read_text(),
        args.links,
        args.nworld,
        args.rollout_steps,
        args.eval_steps,
        args.updates,
        args.update_epochs,
        args.pose,
        args.force_scale,
        args.seed,
        args.policy_hidden_dim,
        args.policy_kind,
        args.eval_interval,
        args.write_result,
        args.bc_stabilizer_epochs,
        args.bc_stabilizer_steps,
        args.bc_stabilizer_learning_rate,
        args.bc_stabilizer_sequence_length,
        args.bc_energy_teacher_epochs,
        args.bc_energy_teacher_steps,
        args.bc_energy_teacher_sequence_length,
        args.bc_energy_teacher_dagger_iterations,
        args.bc_trajectory_file,
        args.bc_trajectory_epochs,
        args.bc_trajectory_sequence_length,
        args.bc_trajectory_learning_rate,
        args.bc_parameterized_teacher_source,
        args.bc_parameterized_teacher_epochs,
        args.bc_parameterized_teacher_steps,
        args.bc_parameterized_teacher_sequence_length,
        args.bc_parameterized_teacher_learning_rate,
        args.bc_parameterized_teacher_dagger_iterations,
        args.bc_parameterized_teacher_limit,
        args.learning_rate,
        args.entropy_coef,
        args.clip_coef,
        args.gamma,
        args.gae_lambda,
        args.eval_stochastic_passes,
        args.write_checkpoint,
        args.warmstart_checkpoint,
        args.allow_warmstart_force_scale_mismatch,
        args.elite_rollout_bc_epochs,
        args.elite_rollout_bc_min_held_seconds,
        args.elite_rollout_bc_learning_rate,
        args.elite_rollout_bc_fallback_min_held_seconds,
        args.elite_rollout_bc_top_k,
        args.elite_rollout_bc_window_mode,
        args.elite_rollout_bc_window_padding_steps,
        args.elite_rollout_bc_catch_angle,
        args.elite_rollout_bc_catch_speed,
        args.elite_rollout_bc_objective,
        args.elite_rollout_bc_weight_power,
        args.stochastic_success_bc_passes,
        args.stochastic_success_bc_epochs,
        args.stochastic_success_bc_min_held_seconds,
        args.stochastic_success_bc_fallback_min_held_seconds,
        args.stochastic_success_bc_learning_rate,
        args.stochastic_success_bc_top_k,
        args.stochastic_success_bc_window_mode,
        args.stochastic_success_bc_window_padding_steps,
        args.stochastic_success_bc_catch_angle,
        args.stochastic_success_bc_catch_speed,
        args.stochastic_success_bc_objective,
        args.stochastic_success_bc_weight_power,
        args.stochastic_success_snapshot_ppo_passes,
        args.stochastic_success_snapshot_ppo_steps,
        args.stochastic_success_snapshot_ppo_epochs,
        args.stochastic_success_snapshot_ppo_learning_rate,
        args.stochastic_success_snapshot_ppo_min_held_seconds,
        args.stochastic_success_snapshot_ppo_fallback_min_held_seconds,
        args.stochastic_success_snapshot_ppo_top_k_worlds,
        args.stochastic_success_snapshot_ppo_offsets,
        args.stochastic_success_snapshot_ppo_max_snapshots,
        args.stochastic_success_snapshot_ppo_catch_angle,
        args.stochastic_success_snapshot_ppo_catch_speed,
        args.stochastic_success_sequence_sil_passes,
        args.stochastic_success_sequence_sil_epochs,
        args.stochastic_success_sequence_sil_fallback_min_held_seconds,
        args.stochastic_success_sequence_sil_learning_rate,
        args.stochastic_success_sequence_sil_top_k_worlds,
        args.stochastic_success_sequence_sil_burn_in_steps,
        args.stochastic_success_sequence_sil_beta,
        args.stochastic_success_sequence_sil_max_weight,
        args.stochastic_success_sequence_sil_value_coef,
        args.deterministic_dagger_passes,
        args.deterministic_dagger_epochs,
        args.deterministic_dagger_continuations,
        args.deterministic_dagger_continuation_steps,
        args.deterministic_dagger_learning_rate,
        args.deterministic_dagger_max_snapshots,
        args.deterministic_dagger_min_teacher_strict_score,
        args.deterministic_dagger_catch_angle,
        args.deterministic_dagger_catch_speed,
        args.deterministic_dagger_grad_clip,
        args.deterministic_replay_dagger_passes,
        args.deterministic_replay_dagger_epochs,
        args.deterministic_replay_dagger_learning_rate,
        args.deterministic_replay_dagger_max_snapshots,
        args.deterministic_replay_dagger_max_candidates,
        args.deterministic_replay_dagger_future_action_offset,
        args.deterministic_replay_dagger_catch_angle,
        args.deterministic_replay_dagger_catch_speed,
        args.deterministic_replay_dagger_min_step_separation,
        args.deterministic_replay_dagger_max_per_world,
        args.deterministic_replay_dagger_dedupe_eps,
        args.deterministic_replay_dagger_max_cart_abs,
        args.deterministic_replay_dagger_label_mode,
        args.deterministic_replay_dagger_suffix_steps,
        args.deterministic_replay_dagger_use_replay_hidden,
        args.deterministic_replay_dagger_sequence_mse_coef,
        args.deterministic_replay_dagger_sequence_nll_coef,
        args.deterministic_replay_dagger_sequence_entropy_coef,
        args.deterministic_replay_dagger_grad_clip,
        args.random_horizon,
        args.min_horizon,
        args.max_horizon,
        args.energy_teacher_anchor_weight,
        args.terminal_boundary,
        args.reward_mode,
        args.success_replay_file,
        args.success_replay_epochs,
        args.success_replay_learning_rate,
        args.success_replay_min_source_held_seconds,
        args.success_replay_burn_in_steps,
        args.success_replay_beta,
        args.success_replay_max_weight,
        args.success_replay_entropy_coef,
        args.success_replay_mse_coef,
        args.success_replay_nll_coef,
        args.success_replay_action_smoothing_radius,
        args.success_replay_grad_clip,
        args.policy_log_std_target,
        args.freeze_policy_log_std,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
