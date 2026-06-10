#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_gpu_kernels import (
    DEFAULT_ACTION_SCALE,
    OBS_DIM,
    WarpScoreKernel,
    record_rollout_obs_kernel,
    record_rollout_scalars_kernel,
)


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout.json"
)


def run_device_rollout(
    mjcf_xml: str,
    links: int = 1,
    nworld: int = 128,
    steps: int = 256,
    pose: str = "down",
    force_scale: float = DEFAULT_ACTION_SCALE,
    seed: int = 426210,
    random_horizon: bool = False,
    min_horizon: int = 160,
    max_horizon: int = 512,
    record_buffer: bool = False,
) -> dict:
    import mujoco
    import mujoco_warp as mjw
    import warp as wp

    started = time.time()
    mjm = mujoco.MjModel.from_xml_string(mjcf_xml)
    model = mjw.put_model(mjm)
    data = mjw.make_data(mjm, nworld=int(nworld))
    device = str(getattr(data.qpos, "device", "cpu"))
    runner = WarpScoreKernel(
        nworld=nworld,
        links=links,
        action_scale=force_scale,
        device=device,
        terminal_boundary=2.35,
    )
    horizon = max(1, int(steps) + 1)
    random_horizon_enabled = bool(random_horizon)
    if random_horizon_enabled:
        min_horizon = max(1, int(min_horizon))
        max_horizon = max(min_horizon, int(max_horizon))
    pose_hold = pose == "hold"
    obs_buffer = None
    reward_buffer = None
    terminal_buffer = None
    truncation_buffer = None
    action_buffer = None
    if record_buffer:
        obs_buffer = wp.zeros(int(steps) * int(nworld) * OBS_DIM, dtype=wp.float32, device=device)
        reward_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
        terminal_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
        truncation_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)
        action_buffer = wp.zeros(int(steps) * int(nworld), dtype=wp.float32, device=device)

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
        runner.apply_scripted_actions(data.ctrl, step_index, steps, synchronize=False)
        mjw.step(model, data)
        runner.score_device(data.qpos, data.qvel, synchronize=False)
        runner.post_step_device(pose_hold, horizon, synchronize=False)
        if record_buffer:
            wp.launch(
                record_rollout_obs_kernel,
                dim=(int(nworld), OBS_DIM),
                inputs=[runner.obs_wp, int(step_index), int(nworld), obs_buffer],
                device=device,
            )
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
    elapsed = time.time() - started
    strict_score = runner.rollout_max_strict_score_wp.numpy()
    max_held_steps = runner.rollout_max_held_steps_wp.numpy()
    final_reward = runner.final_reward_wp.numpy()
    reset_count = runner.reset_count_wp.numpy()
    terminal = runner.terminal_wp.numpy()
    truncation = runner.truncation_wp.numpy()
    horizon_steps = runner.horizon_steps_wp.numpy()
    control_dt = float(mjm.opt.timestep)
    simulated_steps = int(nworld) * int(steps)
    rollout_buffer_summary = {
        "enabled": False,
        "fixedShape": True,
    }
    if record_buffer:
        obs_np = obs_buffer.numpy().reshape(int(steps), int(nworld), OBS_DIM)
        reward_np = reward_buffer.numpy().reshape(int(steps), int(nworld))
        terminal_np = terminal_buffer.numpy().reshape(int(steps), int(nworld))
        truncation_np = truncation_buffer.numpy().reshape(int(steps), int(nworld))
        action_np = action_buffer.numpy().reshape(int(steps), int(nworld))
        rollout_buffer_summary = {
            "enabled": True,
            "fixedShape": True,
            "observationShape": [int(steps), int(nworld), OBS_DIM],
            "rewardShape": [int(steps), int(nworld)],
            "terminalShape": [int(steps), int(nworld)],
            "truncationShape": [int(steps), int(nworld)],
            "actionShape": [int(steps), int(nworld)],
            "observationFinite": bool(np.isfinite(obs_np).all()),
            "rewardFinite": bool(np.isfinite(reward_np).all()),
            "actionFinite": bool(np.isfinite(action_np).all()),
            "rewardMean": float(np.mean(reward_np)),
            "terminalCount": int(np.sum(terminal_np > 0.5)),
            "truncationCount": int(np.sum(truncation_np > 0.5)),
            "actionAbsMax": float(np.max(np.abs(action_np))) if action_np.size else 0.0,
            "bytes": int(obs_np.nbytes + reward_np.nbytes + terminal_np.nbytes + truncation_np.nbytes + action_np.nbytes),
            "cpuReads": "rollout buffers copied once after final synchronize",
        }

    return {
        "schema": "six-pendulum-mjwarp-device-rollout-smoke-v1",
        "status": "device-rollout-smoke-passed",
        "links": int(links),
        "nworld": int(nworld),
        "steps": int(steps),
        "pose": pose,
        "forceScale": float(force_scale),
        "seed": int(seed),
        "device": device,
        "elapsedSeconds": elapsed,
        "simulatedSteps": simulated_steps,
        "sps": simulated_steps / elapsed if elapsed > 0 else 0.0,
        "controlDt": control_dt,
        "scoreBackend": "warp-score-kernel",
        "rolloutBackend": "warp-post-step-kernel-device-loop",
        "resetBackend": "warp-reset-kernel",
        "actionBackend": "warp-scripted-action-kernel",
        "randomHorizonEnabled": random_horizon_enabled,
        "randomHorizonMinSteps": int(min_horizon) if random_horizon_enabled else 0,
        "randomHorizonMaxSteps": int(max_horizon) if random_horizon_enabled else 0,
        "randomHorizonCurrentMin": int(np.min(horizon_steps)) if random_horizon_enabled and horizon_steps.size else 0,
        "randomHorizonCurrentMax": int(np.max(horizon_steps)) if random_horizon_enabled and horizon_steps.size else 0,
        "rolloutBuffer": rollout_buffer_summary,
        "cpuMetricReadsPerStep": 0,
        "cpuStateWritesPerStep": 0,
        "cpuReads": "summary arrays only after final synchronize",
        "maxStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
        "maxHeldSeconds": float(np.max(max_held_steps) * control_dt) if max_held_steps.size else 0.0,
        "solvedOneSecond": bool(max_held_steps.size and np.max(max_held_steps) * control_dt >= 1.0),
        "rewardMean": float(np.mean(final_reward)) if final_reward.size else 0.0,
        "resetCountMean": float(np.mean(reset_count)) if reset_count.size else 0.0,
        "resetCountMax": int(np.max(reset_count)) if reset_count.size else 0,
        "terminalWorlds": int(np.sum(terminal > 0.5)) if terminal.size else 0,
        "truncatedWorlds": int(np.sum(truncation > 0.5)) if truncation.size else 0,
        "notes": [
            "This is a device-rollout substrate smoke, not training and not a learned policy.",
            "The action source is a deterministic Warp scripted-action kernel only to exercise ctrl writes through MJWarp.",
            "Strict score still requires continuous upright hold; subsecond flashes do not count.",
            "Randomized per-world horizons are opt-in and should stay disabled until a learned policy shows whip behavior.",
            "Rollout buffer recording is fixed-shape plumbing for a future trainer, not policy learning.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Run a six-pendulum MJWarp rollout smoke without per-step CPU metric reads.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=128)
    parser.add_argument("--steps", type=int, default=256)
    parser.add_argument("--pose", choices=["down", "hold", "mixed"], default="down")
    parser.add_argument("--force-scale", type=float, default=DEFAULT_ACTION_SCALE)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--random-horizon", action="store_true")
    parser.add_argument("--min-horizon", type=int, default=160)
    parser.add_argument("--max-horizon", type=int, default=512)
    parser.add_argument("--record-buffer", action="store_true")
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_device_rollout(
        mjcf_xml=mjcf_path.read_text(),
        links=args.links,
        nworld=args.nworld,
        steps=args.steps,
        pose=args.pose,
        force_scale=args.force_scale,
        seed=args.seed,
        random_horizon=args.random_horizon,
        min_horizon=args.min_horizon,
        max_horizon=args.max_horizon,
        record_buffer=args.record_buffer,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
