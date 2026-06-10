#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np
import warp as wp


DEFAULT_ACTION_SCALE = 32.0
MAX_LINKS = 6
OBS_DIM = 3 + MAX_LINKS * 5
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
def score_obs_kernel(
    qpos: wp.array2d(dtype=wp.float32),
    qvel: wp.array2d(dtype=wp.float32),
    last_action: wp.array(dtype=wp.float32),
    links: int,
    action_scale: float,
    terminal_boundary: float,
    obs: wp.array(dtype=wp.float32),
    reward: wp.array(dtype=wp.float32),
    strict_score: wp.array(dtype=wp.float32),
    potential: wp.array(dtype=wp.float32),
    mean_tip_height: wp.array(dtype=wp.float32),
    energy_error: wp.array(dtype=wp.float32),
    catch_basin: wp.array(dtype=wp.float32),
    near_top_fast: wp.array(dtype=wp.float32),
    whip: wp.array(dtype=wp.float32),
    terminal: wp.array(dtype=wp.float32),
):
    i = wp.tid()
    x = qpos[i, 0]
    xvel = qvel[i, 0]
    running_angle = 0.0
    running_velocity = 0.0
    max_upright_error = 0.0
    max_bend_error = 0.0
    sum_upright_error = 0.0
    sum_speed = 0.0
    sum_tip_height = 0.0
    sum_energy = 0.0
    weighted_upright_error = 0.0
    sum_abs_velocity = 0.0
    terminal_upright_error = 0.0

    for link in range(MAX_LINKS):
        obs_base = i * OBS_DIM + 3 + link * 5
        if link < links:
            relative = wrap_angle(qpos[i, 1 + link])
            running_angle = wrap_angle(running_angle + relative)
            running_velocity += qvel[i, 1 + link]
            abs_angle = wp.abs(running_angle)
            abs_velocity = wp.abs(running_velocity)
            height = (wp.cos(running_angle) + 1.0) * 0.5
            energy = 0.5 * (running_velocity * 0.28) * (running_velocity * 0.28) + wp.cos(running_angle)

            max_upright_error = wp.max(max_upright_error, abs_angle)
            if link > 0:
                max_bend_error = wp.max(max_bend_error, wp.abs(relative))
            sum_upright_error += abs_angle
            sum_speed += abs_velocity
            sum_tip_height += height
            sum_energy += energy
            weighted_upright_error += abs_angle * float(link + 1)
            sum_abs_velocity += abs_velocity
            terminal_upright_error = abs_angle

            obs[obs_base] = wp.sin(running_angle)
            obs[obs_base + 1] = wp.cos(running_angle)
            obs[obs_base + 2] = wp.sin(relative)
            obs[obs_base + 3] = wp.cos(relative)
            obs[obs_base + 4] = running_velocity / 8.0

    link_count = float(links)
    mean_upright_error = sum_upright_error / link_count
    mean_speed = sum_speed / link_count
    height = sum_tip_height / link_count
    energy_gap = wp.abs(sum_energy / link_count - 1.0)

    near_top = max_upright_error < 0.16 and max_bend_error < 0.14
    in_catch_basin = max_upright_error < 0.55 and max_bend_error < 0.34 and mean_speed < 3.2
    is_near_top_fast = max_upright_error < 0.72 and mean_speed > 1.2
    is_whip = terminal_upright_error < 0.65 and mean_speed > 1.0

    score = 0.0
    if near_top:
        score = 100.0 - weighted_upright_error * 12.0 - max_bend_error * 30.0 - sum_abs_velocity * 2.5 - wp.abs(x) * 8.0
        score = wp.min(wp.max(score, 0.0), 100.0)

    dense_alignment = wp.exp(-mean_upright_error * 1.15 - max_bend_error * 2.0 - mean_speed * 0.08)
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

    base = i * OBS_DIM
    obs[base] = x
    obs[base + 1] = xvel / 5.0
    obs[base + 2] = action_fraction

    reward[i] = shaped_reward
    strict_score[i] = score
    potential[i] = height - 0.035 * energy_gap - 0.025 * wp.abs(x)
    mean_tip_height[i] = height
    energy_error[i] = energy_gap
    catch_basin[i] = 1.0 if in_catch_basin else 0.0
    near_top_fast[i] = 1.0 if is_near_top_fast else 0.0
    whip[i] = 1.0 if is_whip else 0.0
    terminal[i] = 1.0 if wp.abs(x) > terminal_boundary else 0.0


def deterministic_batch(nworld: int, action_scale: float, seed: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    qpos = np.zeros((nworld, 1 + MAX_LINKS), dtype=np.float32)
    qvel = np.zeros((nworld, 1 + MAX_LINKS), dtype=np.float32)
    qpos[:, 0] = rng.uniform(-0.35, 0.35, nworld).astype(np.float32)
    qpos[:, 1:] = rng.uniform(-3.8, 3.8, (nworld, MAX_LINKS)).astype(np.float32)
    qvel[:, 0] = rng.uniform(-1.4, 1.4, nworld).astype(np.float32)
    qvel[:, 1:] = rng.uniform(-7.5, 7.5, (nworld, MAX_LINKS)).astype(np.float32)
    last_action = rng.uniform(-action_scale, action_scale, nworld).astype(np.float32)

    anchors = np.asarray([-0.15, -0.01, 0.0, 0.01, 0.15, 0.54, 0.64, 0.71, np.pi], dtype=np.float32)
    for index, angle in enumerate(anchors[:nworld]):
        qpos[index, 0] = np.float32((index - 4) * 0.035)
        qpos[index, 1] = angle
        qvel[index, 1] = np.float32((index - 4) * 0.55)
        qpos[index, 2:] = np.float32(angle / 8.0)
        qvel[index, 2:] = np.float32((index - 4) * 0.07)
        last_action[index] = np.float32((index - 4) * action_scale / 8.0)
    if nworld > 2:
        qpos[-2, 0] = np.float32(-2.7)
        qpos[-1, 0] = np.float32(2.6)

    return qpos, qvel, last_action


class WarpScoreKernel:
    def __init__(
        self,
        nworld: int,
        links: int,
        action_scale: float = DEFAULT_ACTION_SCALE,
        device: str = "cpu",
        terminal_boundary: float = 2.35,
    ):
        self.nworld = int(nworld)
        self.links = max(1, min(MAX_LINKS, int(links)))
        self.action_scale = float(action_scale)
        self.device = device
        self.terminal_boundary = float(terminal_boundary)
        self.last_action_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.obs_wp = wp.zeros(self.nworld * OBS_DIM, dtype=wp.float32, device=self.device)
        self.reward_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.strict_score_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.potential_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.mean_tip_height_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.energy_error_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.catch_basin_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.near_top_fast_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.whip_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)
        self.terminal_wp = wp.zeros(self.nworld, dtype=wp.float32, device=self.device)

    def score_from_warp_arrays(self, qpos_wp, qvel_wp, last_action: np.ndarray) -> dict:
        self.last_action_wp.assign(np.asarray(last_action, dtype=np.float32).reshape(self.nworld))
        self.obs_wp.zero_()
        wp.launch(
            score_obs_kernel,
            dim=self.nworld,
            inputs=[
                qpos_wp,
                qvel_wp,
                self.last_action_wp,
                int(self.links),
                float(self.action_scale),
                float(self.terminal_boundary),
                self.obs_wp,
                self.reward_wp,
                self.strict_score_wp,
                self.potential_wp,
                self.mean_tip_height_wp,
                self.energy_error_wp,
                self.catch_basin_wp,
                self.near_top_fast_wp,
                self.whip_wp,
                self.terminal_wp,
            ],
            device=self.device,
        )
        wp.synchronize()
        return self.to_numpy()

    def to_numpy(self) -> dict:
        return {
            "observation": self.obs_wp.numpy().reshape(self.nworld, OBS_DIM),
            "reward": self.reward_wp.numpy(),
            "strictScore": self.strict_score_wp.numpy(),
            "meanTipHeight": self.mean_tip_height_wp.numpy(),
            "energyError": self.energy_error_wp.numpy(),
            "potential": self.potential_wp.numpy(),
            "catchBasin": self.catch_basin_wp.numpy(),
            "nearTopFast": self.near_top_fast_wp.numpy(),
            "whip": self.whip_wp.numpy(),
            "terminal": self.terminal_wp.numpy(),
        }


def run_kernel(qpos: np.ndarray, qvel: np.ndarray, last_action: np.ndarray, links: int, action_scale: float, device: str) -> dict:
    runner = WarpScoreKernel(qpos.shape[0], links, action_scale, device)
    qpos_wp = wp.array(qpos, dtype=wp.float32, device=device)
    qvel_wp = wp.array(qvel, dtype=wp.float32, device=device)
    return runner.score_from_warp_arrays(qpos_wp, qvel_wp, last_action)


def max_abs_error(expected: np.ndarray, actual: np.ndarray) -> float:
    return float(np.max(np.abs(expected.astype(np.float32) - actual.astype(np.float32))))


def main():
    from six_pendulum_mjwarp_env import score_batch

    parser = argparse.ArgumentParser(description="Parity-test six-pendulum score/obs math in a Warp kernel.")
    parser.add_argument("--nworld", type=int, default=512)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--action-scale", type=float, default=DEFAULT_ACTION_SCALE)
    parser.add_argument("--max-links", type=int, default=MAX_LINKS)
    parser.add_argument("--tolerance", type=float, default=2e-5)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    started = time.time()
    wp.init()
    qpos, qvel, last_action = deterministic_batch(args.nworld, args.action_scale, args.seed)
    keys = ["observation", "reward", "strictScore", "meanTipHeight", "energyError", "potential", "catchBasin", "nearTopFast", "whip", "terminal"]
    link_errors = []
    max_links = max(1, min(MAX_LINKS, args.max_links))
    for links in range(1, max_links + 1):
        expected = score_batch(qpos, qvel, last_action, links=links, action_scale=args.action_scale)
        expected["terminal"] = (np.abs(qpos[:, 0]) > 2.35).astype(np.float32)
        actual = run_kernel(qpos, qvel, last_action, links, args.action_scale, args.device)
        errors = {key: max_abs_error(expected[key], actual[key]) for key in keys}
        link_errors.append(
            {
                "links": links,
                "maxError": max(errors.values()),
                "errors": errors,
            }
        )

    max_error = max(entry["maxError"] for entry in link_errors)
    passed = max_error <= args.tolerance
    result = {
        "schema": "six-pendulum-mjwarp-score-kernel-smoke-v2",
        "status": "passed" if passed else "failed",
        "createdAtUnix": time.time(),
        "elapsedSeconds": time.time() - started,
        "linksCovered": list(range(1, max_links + 1)),
        "nworld": args.nworld,
        "device": args.device,
        "warpVersion": getattr(wp, "__version__", "unknown"),
        "actionScale": args.action_scale,
        "tolerance": args.tolerance,
        "maxError": max_error,
        "linkErrors": link_errors,
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
            "terminal",
        ],
        "integrationStatus": "score, observation, and cart terminal math parity for links 1..6; reset, ctrl write, held-step, and puffer rollout integration still pending",
    }
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
