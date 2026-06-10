#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np
import warp as wp

from six_pendulum_mjwarp_env import DEFAULT_ACTION_SCALE, OBS_DIM, score_batch


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-gpu-score-kernel-smoke.json"
)


@wp.func
def wrap_angle(angle: float):
    two_pi = 6.283185307179586
    pi = 3.141592653589793
    shifted = angle + pi
    shifted = shifted - two_pi * wp.floor(shifted / two_pi)
    return shifted - pi


@wp.kernel
def one_link_score_obs_kernel(
    qpos: wp.array(dtype=wp.float32),
    qvel: wp.array(dtype=wp.float32),
    last_action: wp.array(dtype=wp.float32),
    action_scale: float,
    obs: wp.array(dtype=wp.float32),
    reward: wp.array(dtype=wp.float32),
    strict_score: wp.array(dtype=wp.float32),
    potential: wp.array(dtype=wp.float32),
    mean_tip_height: wp.array(dtype=wp.float32),
    energy_error: wp.array(dtype=wp.float32),
    catch_basin: wp.array(dtype=wp.float32),
    near_top_fast: wp.array(dtype=wp.float32),
    whip: wp.array(dtype=wp.float32),
):
    i = wp.tid()
    x = qpos[i * 2]
    xvel = qvel[i * 2]
    relative = wrap_angle(qpos[i * 2 + 1])
    absolute = relative
    rel_vel = qvel[i * 2 + 1]
    abs_vel = rel_vel
    max_upright_error = wp.abs(absolute)
    mean_speed = wp.abs(abs_vel)
    height = (wp.cos(absolute) + 1.0) * 0.5
    energy = 0.5 * (abs_vel * 0.28) * (abs_vel * 0.28) + wp.cos(absolute)
    energy_gap = wp.abs(energy - 1.0)

    near_top = max_upright_error < 0.16
    in_catch_basin = max_upright_error < 0.55 and mean_speed < 3.2
    is_near_top_fast = max_upright_error < 0.72 and mean_speed > 1.2
    is_whip = max_upright_error < 0.65 and mean_speed > 1.0

    score = 0.0
    if near_top:
        score = 100.0 - max_upright_error * 12.0 - mean_speed * 2.5 - wp.abs(x) * 8.0
        score = wp.min(wp.max(score, 0.0), 100.0)

    dense_alignment = wp.exp(-max_upright_error * 1.15 - mean_speed * 0.08)
    action_fraction = last_action[i] / action_scale
    shaped_reward = height * 0.08 + dense_alignment * 0.1 + (score / 100.0) * (score / 100.0) * 1.8
    if is_whip:
        shaped_reward += 0.1
    if is_near_top_fast:
        shaped_reward += 0.18
    if in_catch_basin:
        shaped_reward += 0.26
    shaped_reward -= wp.abs(x) * 0.015
    shaped_reward -= action_fraction * action_fraction * 0.002

    base = i * 33
    obs[base] = x
    obs[base + 1] = xvel / 5.0
    obs[base + 2] = action_fraction
    obs[base + 3] = wp.sin(absolute)
    obs[base + 4] = wp.cos(absolute)
    obs[base + 5] = wp.sin(relative)
    obs[base + 6] = wp.cos(relative)
    obs[base + 7] = abs_vel / 8.0

    reward[i] = shaped_reward
    strict_score[i] = score
    potential[i] = height - 0.035 * energy_gap - 0.025 * wp.abs(x)
    mean_tip_height[i] = height
    energy_error[i] = energy_gap
    catch_basin[i] = 1.0 if in_catch_basin else 0.0
    near_top_fast[i] = 1.0 if is_near_top_fast else 0.0
    whip[i] = 1.0 if is_whip else 0.0


def deterministic_batch(nworld: int, action_scale: float, seed: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    qpos = np.zeros((nworld, 2), dtype=np.float32)
    qvel = np.zeros((nworld, 2), dtype=np.float32)
    qpos[:, 0] = rng.uniform(-0.35, 0.35, nworld).astype(np.float32)
    qpos[:, 1] = rng.uniform(-3.8, 3.8, nworld).astype(np.float32)
    qvel[:, 0] = rng.uniform(-1.4, 1.4, nworld).astype(np.float32)
    qvel[:, 1] = rng.uniform(-7.5, 7.5, nworld).astype(np.float32)
    last_action = rng.uniform(-action_scale, action_scale, nworld).astype(np.float32)

    anchors = np.asarray([-0.15, -0.01, 0.0, 0.01, 0.15, 0.54, 0.64, 0.71, np.pi], dtype=np.float32)
    for index, angle in enumerate(anchors[:nworld]):
        qpos[index, 0] = np.float32((index - 4) * 0.035)
        qpos[index, 1] = angle
        qvel[index, 1] = np.float32((index - 4) * 0.55)
        last_action[index] = np.float32((index - 4) * action_scale / 8.0)

    return qpos, qvel, last_action


def run_kernel(qpos: np.ndarray, qvel: np.ndarray, last_action: np.ndarray, action_scale: float, device: str) -> dict:
    nworld = qpos.shape[0]
    qpos_wp = wp.array(qpos.reshape(-1), dtype=wp.float32, device=device)
    qvel_wp = wp.array(qvel.reshape(-1), dtype=wp.float32, device=device)
    last_action_wp = wp.array(last_action, dtype=wp.float32, device=device)
    obs_wp = wp.zeros(nworld * OBS_DIM, dtype=wp.float32, device=device)
    reward_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    strict_score_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    potential_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    mean_tip_height_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    energy_error_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    catch_basin_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    near_top_fast_wp = wp.zeros(nworld, dtype=wp.float32, device=device)
    whip_wp = wp.zeros(nworld, dtype=wp.float32, device=device)

    wp.launch(
        one_link_score_obs_kernel,
        dim=nworld,
        inputs=[
            qpos_wp,
            qvel_wp,
            last_action_wp,
            float(action_scale),
            obs_wp,
            reward_wp,
            strict_score_wp,
            potential_wp,
            mean_tip_height_wp,
            energy_error_wp,
            catch_basin_wp,
            near_top_fast_wp,
            whip_wp,
        ],
        device=device,
    )
    wp.synchronize()
    return {
        "observation": obs_wp.numpy().reshape(nworld, OBS_DIM),
        "reward": reward_wp.numpy(),
        "strictScore": strict_score_wp.numpy(),
        "meanTipHeight": mean_tip_height_wp.numpy(),
        "energyError": energy_error_wp.numpy(),
        "potential": potential_wp.numpy(),
        "catchBasin": catch_basin_wp.numpy(),
        "nearTopFast": near_top_fast_wp.numpy(),
        "whip": whip_wp.numpy(),
    }


def max_abs_error(expected: np.ndarray, actual: np.ndarray) -> float:
    return float(np.max(np.abs(expected.astype(np.float32) - actual.astype(np.float32))))


def main():
    parser = argparse.ArgumentParser(description="Parity-test one-link six-pendulum score/obs math in a Warp kernel.")
    parser.add_argument("--nworld", type=int, default=512)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--action-scale", type=float, default=DEFAULT_ACTION_SCALE)
    parser.add_argument("--tolerance", type=float, default=2e-5)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    started = time.time()
    wp.init()
    qpos, qvel, last_action = deterministic_batch(args.nworld, args.action_scale, args.seed)
    expected = score_batch(qpos, qvel, last_action, links=1, action_scale=args.action_scale)
    actual = run_kernel(qpos, qvel, last_action, args.action_scale, args.device)

    keys = ["observation", "reward", "strictScore", "meanTipHeight", "energyError", "potential", "catchBasin", "nearTopFast", "whip"]
    errors = {key: max_abs_error(expected[key], actual[key]) for key in keys}
    max_error = max(errors.values())
    passed = max_error <= args.tolerance
    result = {
        "schema": "six-pendulum-mjwarp-one-link-score-kernel-smoke-v1",
        "status": "passed" if passed else "failed",
        "createdAtUnix": time.time(),
        "elapsedSeconds": time.time() - started,
        "links": 1,
        "nworld": args.nworld,
        "device": args.device,
        "warpVersion": getattr(wp, "__version__", "unknown"),
        "actionScale": args.action_scale,
        "tolerance": args.tolerance,
        "maxError": max_error,
        "errors": errors,
        "coveredTerms": [
            "observation",
            "reward",
            "strictScore",
            "potential",
            "meanTipHeight",
            "energyError",
            "catchBasin",
            "nearTopFast",
            "whip",
        ],
        "integrationStatus": "score and observation math parity only; reset, ctrl write, terminal, held-step, and puffer rollout integration still pending",
    }
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
