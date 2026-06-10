#!/usr/bin/env python3
import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import pufferlib


DEFAULT_ACTION_SCALE = 32.0
MAX_LINKS = 6
OBS_DIM = 3 + MAX_LINKS * 5
SCORE_MAX_UPRIGHT_ANGLE = 0.16
SCORE_MAX_CHAIN_BEND = 0.14


def score_batch(qpos, qvel, last_action, links: int, action_scale: float = DEFAULT_ACTION_SCALE) -> dict:
    safe_links = max(1, min(MAX_LINKS, int(links)))
    relative = ((qpos[:, 1 : 1 + safe_links] + np.pi) % (2 * np.pi)) - np.pi
    absolute = np.cumsum(relative, axis=1)
    absolute = ((absolute + np.pi) % (2 * np.pi)) - np.pi
    rel_vel = qvel[:, 1 : 1 + safe_links]
    abs_vel = np.cumsum(rel_vel, axis=1)

    max_upright_error = np.max(np.abs(absolute), axis=1)
    max_bend_error = np.max(np.abs(relative[:, 1:]), axis=1) if safe_links > 1 else np.zeros(qpos.shape[0])
    mean_upright_error = np.mean(np.abs(absolute), axis=1)
    mean_speed = np.mean(np.abs(abs_vel), axis=1)
    mean_tip_height = np.mean((np.cos(absolute) + 1.0) * 0.5, axis=1)
    energy = np.mean(0.5 * (abs_vel * 0.28) ** 2 + np.cos(absolute), axis=1)
    energy_error = np.abs(energy - 1.0)
    near_top = (max_upright_error < SCORE_MAX_UPRIGHT_ANGLE) & (max_bend_error < SCORE_MAX_CHAIN_BEND)
    catch_basin = (max_upright_error < 0.55) & (max_bend_error < 0.34) & (mean_speed < 3.2)
    near_top_fast = (max_upright_error < 0.72) & (mean_speed > 1.2)
    strict_score = np.where(
        near_top,
        np.clip(
            100.0
            - np.sum(np.abs(absolute) * np.arange(1, safe_links + 1), axis=1) * 12.0
            - max_bend_error * 30.0
            - np.sum(np.abs(abs_vel), axis=1) * 2.5
            - np.abs(qpos[:, 0]) * 8.0,
            0.0,
            100.0,
        ),
        0.0,
    )
    dense_alignment = np.exp(-mean_upright_error * 1.15 - max_bend_error * 2.0 - mean_speed * 0.08)
    whip = (np.abs(absolute[:, -1]) < 0.65) & (mean_speed > 1.0)
    reward = mean_tip_height * 0.08 + dense_alignment * 0.1 + (strict_score / 100.0) ** 2 * 1.8
    reward += np.where(whip, 0.1, 0.0)
    reward += np.where(near_top_fast, 0.18, 0.0)
    reward += np.where(catch_basin, 0.26, 0.0)
    reward -= np.abs(qpos[:, 0]) * 0.015
    reward -= (last_action / action_scale) ** 2 * 0.002
    potential = mean_tip_height - 0.035 * energy_error - 0.025 * np.abs(qpos[:, 0])

    obs = np.zeros((qpos.shape[0], OBS_DIM), dtype=np.float32)
    obs[:, 0] = qpos[:, 0]
    obs[:, 1] = qvel[:, 0] / 5.0
    obs[:, 2] = last_action / action_scale
    cursor = 3
    for index in range(MAX_LINKS):
        if index < safe_links:
            obs[:, cursor] = np.sin(absolute[:, index])
            obs[:, cursor + 1] = np.cos(absolute[:, index])
            obs[:, cursor + 2] = np.sin(relative[:, index])
            obs[:, cursor + 3] = np.cos(relative[:, index])
            obs[:, cursor + 4] = abs_vel[:, index] / 8.0
        cursor += 5

    return {
        "observation": obs,
        "reward": reward.astype(np.float32),
        "strictScore": strict_score.astype(np.float32),
        "meanTipHeight": mean_tip_height.astype(np.float32),
        "energyError": energy_error.astype(np.float32),
        "potential": potential.astype(np.float32),
        "maxUprightError": max_upright_error.astype(np.float32),
        "maxChainBend": max_bend_error.astype(np.float32),
        "catchBasin": catch_basin.astype(np.float32),
        "nearTopFast": near_top_fast.astype(np.float32),
        "whip": whip.astype(np.float32),
    }


class SixPendulumMJWarpPufferEnv(pufferlib.PufferEnv):
    def __init__(
        self,
        mjcf_xml: str,
        links: int = 1,
        nworld: int = 4,
        horizon: int = 400,
        pose: str = "down",
        force_scale: float = DEFAULT_ACTION_SCALE,
        seed: int | None = 426210,
        buf=None,
    ):
        import mujoco
        import mujoco_warp as mjw

        self.links = max(1, min(MAX_LINKS, int(links)))
        self.nworld = max(1, int(nworld))
        self.horizon = max(1, int(horizon))
        self.pose = pose
        self.force_scale = float(force_scale)
        self.rng = np.random.default_rng(seed)
        self.num_agents = self.nworld
        self.single_observation_space = pufferlib.gymnasium.spaces.Box(low=-np.inf, high=np.inf, shape=(OBS_DIM,), dtype=np.float32)
        self.single_action_space = pufferlib.gymnasium.spaces.Box(low=-1.0, high=1.0, shape=(1,), dtype=np.float32)
        self.mujoco = mujoco
        self.mjw = mjw
        self.mjm = mujoco.MjModel.from_xml_string(mjcf_xml)
        self.m = mjw.put_model(self.mjm)
        self.d = mjw.make_data(self.mjm, nworld=self.nworld)
        self.elapsed = np.zeros(self.nworld, dtype=np.int32)
        self.held_steps = np.zeros(self.nworld, dtype=np.int32)
        self.max_held_steps = np.zeros(self.nworld, dtype=np.int32)
        self.last_action = np.zeros(self.nworld, dtype=np.float32)
        self.prev_potential = np.zeros(self.nworld, dtype=np.float32)
        self.control_dt = float(self.mjm.opt.timestep)
        self.observations = np.zeros((self.nworld, OBS_DIM), dtype=np.float32)
        self.rewards = np.zeros(self.nworld, dtype=np.float32)
        self.terminals = np.zeros(self.nworld, dtype=bool)
        self.truncations = np.zeros(self.nworld, dtype=bool)
        self.masks = np.ones(self.nworld, dtype=bool)
        super().__init__(buf=buf)

    def _reset_arrays(self, indices, pose: str):
        qpos = self.d.qpos.numpy()
        qvel = self.d.qvel.numpy()
        indices = np.asarray(indices, dtype=np.int32)
        qpos[indices, :] = 0.0
        qvel[indices, :] = 0.0
        base = self.rng.uniform(-0.045, 0.045, len(indices)).astype(np.float32)
        qpos[indices, 0] = base
        qvel[indices, 0] = self.rng.uniform(-0.05, 0.05, len(indices)).astype(np.float32)
        if pose == "hold":
            for index in range(self.links):
                qpos[indices, 1 + index] = self.rng.uniform(-0.035, 0.035, len(indices)).astype(np.float32) * (index + 1)
                qvel[indices, 1 + index] = self.rng.uniform(-0.06, 0.06, len(indices)).astype(np.float32)
        elif pose == "mixed":
            selector = np.arange(len(indices)) % 4
            for index in range(self.links):
                qpos[indices[selector == 0], 1 + index] = math.pi - index * 0.05 + self.rng.uniform(-0.08, 0.08, int(np.sum(selector == 0)))
                qpos[indices[selector == 1], 1 + index] = 0.75 * math.pi - index * 0.04 + self.rng.uniform(-0.08, 0.08, int(np.sum(selector == 1)))
                qpos[indices[selector == 2], 1 + index] = 0.42 * math.pi - index * 0.03 + self.rng.uniform(-0.07, 0.07, int(np.sum(selector == 2)))
                qpos[indices[selector == 3], 1 + index] = self.rng.uniform(-0.035, 0.035, int(np.sum(selector == 3))) * (index + 1)
            qvel[indices[selector == 0], 1 : 1 + self.links] = self.rng.uniform(-0.12, 0.12, (int(np.sum(selector == 0)), self.links))
            qvel[indices[selector == 1], 1 : 1 + self.links] = self.rng.uniform(-1.45, -0.8, (int(np.sum(selector == 1)), self.links))
            qvel[indices[selector == 2], 1 : 1 + self.links] = self.rng.uniform(-0.85, -0.25, (int(np.sum(selector == 2)), self.links))
            qvel[indices[selector == 3], 1 : 1 + self.links] = self.rng.uniform(-0.06, 0.06, (int(np.sum(selector == 3)), self.links))
        else:
            down_noise = self.rng.uniform(-0.08, 0.08, len(indices)).astype(np.float32)
            for index in range(self.links):
                qpos[indices, 1 + index] = math.pi - index * 0.05 + down_noise
                qvel[indices, 1 + index] = self.rng.uniform(-0.08, 0.08, len(indices)).astype(np.float32)
        self.d.qpos.assign(qpos)
        self.d.qvel.assign(qvel)
        self.elapsed[indices] = 0
        self.held_steps[indices] = 0
        self.max_held_steps[indices] = 0
        self.last_action[indices] = 0.0

    def reset(self, seed=None):
        import warp as wp

        if seed is not None:
            self.rng = np.random.default_rng(seed)
        self._reset_arrays(np.arange(self.nworld), self.pose)
        self.mjw.forward(self.m, self.d)
        wp.synchronize()
        metrics = score_batch(self.d.qpos.numpy(), self.d.qvel.numpy(), self.last_action, self.links, self.force_scale)
        self.prev_potential[:] = metrics["potential"]
        self.observations[:] = metrics["observation"]
        self.rewards.fill(0.0)
        self.terminals.fill(False)
        self.truncations.fill(False)
        return self.observations, self._infos(metrics)

    def step(self, actions):
        import warp as wp

        action = np.asarray(actions, dtype=np.float32).reshape(self.nworld, -1)[:, 0]
        action = np.clip(action, -1.0, 1.0) * self.force_scale
        self.d.ctrl.assign(action.reshape(self.nworld, 1).astype(np.float32))
        self.last_action = action.astype(np.float32)
        self.mjw.step(self.m, self.d)
        wp.synchronize()
        self.elapsed += 1
        metrics = score_batch(self.d.qpos.numpy(), self.d.qvel.numpy(), self.last_action, self.links, self.force_scale)
        self.observations[:] = metrics["observation"]
        potential_delta = np.clip(metrics["potential"] - self.prev_potential, -0.18, 0.28)
        self.prev_potential[:] = metrics["potential"]
        if self.pose == "hold":
            self.rewards[:] = metrics["reward"]
        else:
            self.rewards[:] = metrics["reward"] + potential_delta.astype(np.float32) * 1.2
        is_held = metrics["strictScore"] > 82.0
        self.held_steps = np.where(is_held, self.held_steps + 1, 0)
        self.max_held_steps = np.maximum(self.max_held_steps, self.held_steps)
        self.terminals[:] = np.abs(self.d.qpos.numpy()[:, 0]) > 2.35
        self.truncations[:] = self.elapsed >= self.horizon
        done = self.terminals | self.truncations
        if np.any(done):
            self._reset_arrays(np.flatnonzero(done), self.pose)
            self.mjw.forward(self.m, self.d)
            wp.synchronize()
            reset_metrics = score_batch(self.d.qpos.numpy(), self.d.qvel.numpy(), self.last_action, self.links, self.force_scale)
            self.prev_potential[np.flatnonzero(done)] = reset_metrics["potential"][np.flatnonzero(done)]
        return self.observations, self.rewards, self.terminals, self.truncations, self._infos(metrics)

    def _infos(self, metrics):
        return [
            {
                "strictScore": float(metrics["strictScore"][index]),
                "heldSeconds": float(self.held_steps[index] * self.control_dt),
                "maxHeldSeconds": float(self.max_held_steps[index] * self.control_dt),
                "whip": float(metrics["whip"][index]),
                "catchBasin": float(metrics["catchBasin"][index]),
                "nearTopFast": float(metrics["nearTopFast"][index]),
                "energyError": float(metrics["energyError"][index]),
            }
            for index in range(self.nworld)
        ]

    def close(self):
        return None


def run_driver_smoke(
    mjcf_xml: str,
    links: int = 1,
    nworld: int = 4,
    steps: int = 128,
    pose: str = "down",
    force_scale: float = DEFAULT_ACTION_SCALE,
) -> dict:
    started = time.time()
    env = SixPendulumMJWarpPufferEnv(mjcf_xml, links=links, nworld=nworld, horizon=steps + 1, pose=pose, force_scale=force_scale)
    obs, infos = env.reset()
    max_score = 0.0
    max_held = 0.0
    reward_sum = np.zeros(env.nworld, dtype=np.float32)
    for step_index in range(steps):
        if pose == "hold":
            qpos = env.d.qpos.numpy()
            qvel = env.d.qvel.numpy()
            force = np.clip(-18.0 * qpos[:, 0] - 5.0 * qvel[:, 0], -force_scale, force_scale)
        else:
            phase = step_index / max(1, steps - 1)
            force = np.full(env.nworld, np.sin(phase * np.pi * 4.0) * 18.0, dtype=np.float32)
        actions = np.asarray(force, dtype=np.float32).reshape(env.nworld, 1) / force_scale
        obs, rewards, terminals, truncations, infos = env.step(actions)
        reward_sum += rewards
        max_score = max(max_score, max(info["strictScore"] for info in infos))
        max_held = max(max_held, max(info["maxHeldSeconds"] for info in infos))
    env.close()
    return {
        "schema": "six-pendulum-mjwarp-puffer-env-driver-smoke-v1",
        "status": "puffer-env-driver-smoke-passed",
        "links": links,
        "nworld": nworld,
        "steps": steps,
        "pose": pose,
        "elapsedSeconds": time.time() - started,
        "observationShape": list(obs.shape),
        "actionSpace": {"shape": list(env.single_action_space.shape), "low": -1.0, "high": 1.0},
        "forceScale": force_scale,
        "rewardMean": float(np.mean(reward_sum)),
        "maxStrictScore": float(max_score),
        "maxHeldSeconds": float(max_held),
        "solvedOneSecond": bool(max_held >= 1.0),
        "firstInfo": infos[0] if infos else {},
        "notes": [
            "This is an environment-driver smoke, not training.",
            f"Actions are normalized to [-1, 1] and scaled to cart force +/-{force_scale:g}.",
            "Strict score and one-second gate are preserved for lower-link promotion.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Run the six-pendulum MJWarp PufferEnv driver smoke.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=4)
    parser.add_argument("--steps", type=int, default=128)
    parser.add_argument("--pose", choices=["down", "hold", "mixed"], default="down")
    parser.add_argument("--force-scale", type=float, default=DEFAULT_ACTION_SCALE)
    parser.add_argument(
        "--write-result",
        type=Path,
        default=Path("/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-env-driver.json"),
    )
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_driver_smoke(mjcf_path.read_text(), args.links, args.nworld, args.steps, args.pose, args.force_scale)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
