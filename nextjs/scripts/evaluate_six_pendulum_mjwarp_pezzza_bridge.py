#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv


DEFAULT_POLICY = Path("app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json")
DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-pezzza-bridge-1link.json"
)


def run_policy(policy: dict, obs: np.ndarray, last_force: np.ndarray, step_index: int, control_dt: float) -> np.ndarray:
    knots = np.asarray(policy["knots"], dtype=np.float32)
    layers = policy["layers"]
    w1 = np.asarray(layers[0]["weights"], dtype=np.float32)
    b1 = np.asarray(layers[0]["bias"], dtype=np.float32)
    w2 = np.asarray(layers[1]["weights"], dtype=np.float32)
    b2 = np.asarray(layers[1]["bias"], dtype=np.float32)
    force_scale = float(policy["forceScale"])
    horizon_seconds = float(policy.get("horizonSeconds") or policy.get("training", {}).get("horizonSeconds") or 8.0)
    knot_count = int(policy.get("knotCount") or len(knots))
    t_norm = np.full(obs.shape[0], min(max((float(step_index) * control_dt) / horizon_seconds, 0.0), 1.0), dtype=np.float32)
    knot_pos = t_norm * float(max(0, knot_count - 1))
    left = np.floor(knot_pos).astype(np.int32)
    right = np.minimum(left + 1, max(0, knot_count - 1))
    mix = knot_pos - left.astype(np.float32)
    base = knots[left] * (1.0 - mix) + knots[right] * mix
    features = [obs[:, 0] / 2.4, (obs[:, 1] * 5.0) / 6.0, obs[:, 3], obs[:, 4], (obs[:, 7] * 8.0) / 10.0, last_force / force_scale]
    expected_with_time = 7
    feedback_uses_time = policy.get("feedbackUsesTime", w1.shape[0] >= expected_with_time)
    if feedback_uses_time:
        features.append(t_norm)
    features = np.stack(features, axis=1)
    hidden = np.tanh(features @ w1 + b1)
    feedback = (hidden @ w2 + b2)[:, 0]
    return np.tanh(base + feedback).astype(np.float32) * force_scale


def summarize(metrics: dict, rewards: np.ndarray, force_history: np.ndarray, control_dt: float) -> dict:
    max_hold = np.asarray(metrics["maxHeldSeconds"], dtype=np.float32)
    strict_score = np.asarray(metrics["maxStrictScore"], dtype=np.float32)
    solved = max_hold >= 1.0
    return {
        "rewardMean": float(np.mean(rewards)) if rewards.size else 0.0,
        "bestWorldHoldSeconds": float(np.max(max_hold)) if max_hold.size else 0.0,
        "meanHoldSeconds": float(np.mean(max_hold)) if max_hold.size else 0.0,
        "p10HoldSeconds": float(np.quantile(max_hold, 0.1)) if max_hold.size else 0.0,
        "bestWorldStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
        "solvedOneSecondRate": float(np.mean(solved.astype(np.float32))) if solved.size else 0.0,
        "forceAbsMean": float(np.mean(np.abs(force_history))) if force_history.size else 0.0,
        "forceAbsMax": float(np.max(np.abs(force_history))) if force_history.size else 0.0,
        "whiplashSeconds": float(np.mean(metrics["whipSeconds"])) if "whipSeconds" in metrics else 0.0,
        "catchEvents": int(np.sum(metrics["catchEvents"])) if "catchEvents" in metrics else 0,
        "terminalCount": int(np.sum(metrics["terminalCount"])) if "terminalCount" in metrics else 0,
        "controlDt": float(control_dt),
    }


def evaluate_bridge(
    mjcf_xml: str,
    policy: dict,
    links: int,
    nworld: int,
    steps: int,
    force_scale: float,
    force_multiplier: float,
    seed: int,
    write_trajectory: Path | None,
) -> dict:
    started = time.time()
    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=links,
        nworld=nworld,
        horizon=steps + 1,
        pose="down",
        force_scale=force_scale,
        seed=seed,
    )
    obs, _ = env.reset(seed)
    rewards = []
    force_history = []
    obs_trace = []
    action_trace = []
    last_force = np.zeros(nworld, dtype=np.float32)
    max_held = np.zeros(nworld, dtype=np.float32)
    max_score = np.zeros(nworld, dtype=np.float32)
    whip_seconds = np.zeros(nworld, dtype=np.float32)
    catch_events = np.zeros(nworld, dtype=np.int32)
    terminal_count = np.zeros(nworld, dtype=np.int32)
    active = np.ones(nworld, dtype=bool)

    for step_index in range(int(steps)):
        force = run_policy(policy, obs, last_force, step_index, env.control_dt) * float(force_multiplier)
        force = np.where(active, force, 0.0).astype(np.float32)
        action = np.clip(force / float(force_scale), -1.0, 1.0).reshape(nworld, 1).astype(np.float32)
        obs_trace.append(obs.copy())
        action_trace.append(action[:, 0].copy())
        obs, reward, terminals, truncations, infos = env.step(action)
        rewards.append(np.where(active, reward, 0.0))
        info_hold = np.asarray([info["maxHeldSeconds"] for info in infos], dtype=np.float32)
        info_score = np.asarray([info["strictScore"] for info in infos], dtype=np.float32)
        info_whip = np.asarray([info["whip"] for info in infos], dtype=np.float32)
        info_catch = np.asarray([info["catchBasin"] for info in infos], dtype=np.float32)
        max_held = np.maximum(max_held, np.where(active, info_hold, 0.0))
        max_score = np.maximum(max_score, np.where(active, info_score, 0.0))
        whip_seconds += np.where(active & (info_whip > 0.5), env.control_dt, 0.0).astype(np.float32)
        catch_events += (active & (info_catch > 0.5)).astype(np.int32)
        terminal_count += (active & terminals).astype(np.int32)
        force_history.append(force.copy())
        last_force = force
        active &= ~(terminals | truncations)

    metrics = {
        "maxHeldSeconds": max_held,
        "maxStrictScore": max_score,
        "whipSeconds": whip_seconds,
        "catchEvents": catch_events,
        "terminalCount": terminal_count,
    }
    validation = summarize(metrics, np.asarray(rewards, dtype=np.float32), np.asarray(force_history, dtype=np.float32), env.control_dt)
    trajectory = {"written": False}
    if write_trajectory is not None:
        write_trajectory.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            write_trajectory,
            observations=np.asarray(obs_trace, dtype=np.float32),
            actions=np.asarray(action_trace, dtype=np.float32),
            links=np.asarray([links], dtype=np.int32),
            force_scale=np.asarray([force_scale], dtype=np.float32),
        )
        trajectory = {"written": True, "path": str(write_trajectory), "format": "npz"}
    env.close()
    return {
        "schema": "six-pendulum-mjwarp-pezzza-bridge-eval-v1",
        "status": "finished",
        "algorithm": "learned-pezzza-policy-evaluated-in-mjwarp",
        "links": int(links),
        "nworld": int(nworld),
        "steps": int(steps),
        "evalSeconds": float(steps) * float(validation["controlDt"]),
        "forceScale": float(force_scale),
        "forceMultiplier": float(force_multiplier),
        "seed": int(seed),
        "elapsedSeconds": time.time() - started,
        "sourcePolicy": {
            "path": str(DEFAULT_POLICY),
            "algorithm": policy.get("algorithm"),
            "modelType": policy.get("modelType"),
            "policyValidationMaxHoldSeconds": policy.get("training", {}).get("validation", {}).get("maxHoldSeconds"),
            "policyValidationSolvedOneSecondRate": policy.get("training", {}).get("validation", {}).get("solvedOneSecondRate"),
            "policyForceScale": policy.get("forceScale"),
            "policyControlHz": policy.get("controlHz"),
        },
        "training": {
            "validationByPose": {"down": validation},
            "trajectory": trajectory,
        },
        "validationByPose": {"down": validation},
        "gates": {
            "learnedPolicyOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "transferSolvedOneSecond": bool(validation["bestWorldHoldSeconds"] >= 1.0),
            "promotePufferLane": False,
        },
        "notes": [
            "This evaluates a learned Pezzza evolutionary policy inside the MJWarp task; it is not PPO training.",
            "If it fails, the likely issue is simulator/control mismatch between Pezzza's force cartpole and MJWarp.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate the learned Pezzza one-link policy inside MJWarp.")
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=32)
    parser.add_argument("--steps", type=int, default=3200)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--force-multiplier", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-trajectory", type=Path, default=None)
    args = parser.parse_args()

    if args.links != 1:
        raise ValueError("The current Pezzza source policy is one-link only")
    policy = json.loads(args.policy.read_text())
    if policy.get("algorithm") != "modal-pezzza-style-evolution" or policy.get("modelType") != "pezzzaKnotMlp":
        raise ValueError("Expected modal-pezzza-style-evolution pezzzaKnotMlp policy")
    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    result = evaluate_bridge(
        mjcf_path.read_text(),
        policy,
        args.links,
        args.nworld,
        args.steps,
        args.force_scale,
        args.force_multiplier,
        args.seed,
        args.write_trajectory,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
