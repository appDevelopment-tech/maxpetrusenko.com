#!/usr/bin/env python3
import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv


DEFAULT_POLICY = Path("app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json")
DEFAULT_MJCF = Path("app/ailab/six-pendulum-cartpole/mjcf/cartpole_1_link.xml")
DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/six-pendulum-env-dynamics-compare-20260611.json"
)


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def wrap_angle(value: float) -> float:
    return math.atan2(math.sin(value), math.cos(value))


def pezzza_force(policy: dict, state: dict) -> float:
    knots = np.asarray(policy["knots"], dtype=np.float32)
    w1 = np.asarray(policy["layers"][0]["weights"], dtype=np.float32)
    b1 = np.asarray(policy["layers"][0]["bias"], dtype=np.float32)
    w2 = np.asarray(policy["layers"][1]["weights"], dtype=np.float32)
    b2 = np.asarray(policy["layers"][1]["bias"], dtype=np.float32)
    force_scale = float(policy["forceScale"])
    horizon_seconds = float(policy.get("horizonSeconds") or policy.get("training", {}).get("horizonSeconds") or 8.0)
    knot_count = int(policy.get("knotCount") or len(knots))
    t_norm = clamp(float(state["time"]) / horizon_seconds, 0.0, 1.0)
    knot_pos = t_norm * float(max(0, knot_count - 1))
    left = int(math.floor(knot_pos))
    right = min(left + 1, max(0, knot_count - 1))
    mix = knot_pos - float(left)
    base = float(knots[left]) * (1.0 - mix) + float(knots[right]) * mix
    features = [
        float(state["x"]) / 2.4,
        float(state["xdot"]) / 6.0,
        math.sin(float(state["theta"])),
        math.cos(float(state["theta"])),
        float(state["omega"]) / 10.0,
        float(state["last_action"]) / force_scale,
    ]
    expected_with_time = 7
    feedback_uses_time = policy.get("feedbackUsesTime", w1.shape[0] >= expected_with_time)
    if feedback_uses_time:
        features.append(t_norm)
    features = np.asarray(features, dtype=np.float32)
    hidden = np.tanh(features @ w1 + b1)
    feedback = float((hidden @ w2 + b2)[0])
    return math.tanh(base + feedback) * force_scale


def pezzza_step(policy: dict, state: dict, dt: float) -> tuple[dict, float]:
    force = pezzza_force(policy, state)
    cart_mass = 1.0
    pole_mass = 0.1
    length = 0.5
    total_mass = cart_mass + pole_mass
    gravity = 9.81
    cart_damping = 0.08
    hinge_damping = 0.02
    theta = float(state["theta"])
    omega = float(state["omega"])
    damped_force = force - cart_damping * float(state["xdot"]) - 0.35 * float(state["x"])
    temp = (damped_force + pole_mass * length * omega**2 * math.sin(theta)) / total_mass
    theta_acc = (
        (gravity * math.sin(theta) - math.cos(theta) * temp)
        / (length * (4.0 / 3.0 - (pole_mass * math.cos(theta) ** 2) / total_mass))
        - hinge_damping * omega
    )
    cart_acc = temp - (pole_mass * length * theta_acc * math.cos(theta)) / total_mass
    xdot = clamp(float(state["xdot"]) + cart_acc * dt, -8.0, 8.0)
    x = clamp(float(state["x"]) + xdot * dt, -2.88, 2.88)
    next_omega = clamp(omega + theta_acc * dt, -22.0, 22.0)
    next_theta = wrap_angle(theta + next_omega * dt)
    return {
        "x": x,
        "xdot": xdot,
        "theta": next_theta,
        "omega": next_omega,
        "time": float(state["time"]) + dt,
        "last_action": force,
    }, force


def mjwarp_state(env: SixPendulumMJWarpPufferEnv) -> dict:
    qpos = env.d.qpos.numpy()[0]
    qvel = env.d.qvel.numpy()[0]
    return {
        "x": float(qpos[0]),
        "xdot": float(qvel[0]),
        "theta": wrap_angle(float(qpos[1])),
        "omega": float(qvel[1]),
        "time": float(env.elapsed[0]) * float(env.control_dt),
        "last_action": float(env.last_action[0]),
    }


def state_delta(a: dict, b: dict) -> dict:
    return {
        "x": abs(float(a["x"]) - float(b["x"])),
        "xdot": abs(float(a["xdot"]) - float(b["xdot"])),
        "theta": abs(wrap_angle(float(a["theta"]) - float(b["theta"]))),
        "omega": abs(float(a["omega"]) - float(b["omega"])),
    }


def compare(args: argparse.Namespace) -> dict:
    policy = json.loads(args.policy.read_text())
    mjcf_path = args.mjcf
    env = SixPendulumMJWarpPufferEnv(
        mjcf_path.read_text(),
        links=1,
        nworld=1,
        horizon=int(args.steps) + 2,
        pose="down",
        force_scale=float(args.mjwarp_force_scale),
        seed=int(args.seed),
    )
    env.reset(args.seed)
    p_state = mjwarp_state(env)
    start_state = dict(p_state)
    rows = []
    max_delta = {"x": 0.0, "xdot": 0.0, "theta": 0.0, "omega": 0.0}
    terminal_step = None
    compared_steps = 0
    started = time.time()
    for step in range(int(args.steps)):
        compared_steps = step + 1
        p_state, force = pezzza_step(policy, p_state, float(env.control_dt))
        normalized = np.asarray([[clamp(force / float(args.mjwarp_force_scale), -1.0, 1.0)]], dtype=np.float32)
        _obs, _reward, terminals, truncations, infos = env.step(normalized)
        m_state = mjwarp_state(env)
        delta = state_delta(p_state, m_state)
        for key, value in delta.items():
            max_delta[key] = max(max_delta[key], float(value))
        if step < int(args.sample_steps) or terminals[0] or truncations[0]:
            rows.append(
                {
                    "step": step + 1,
                    "force": float(force),
                    "normalizedAction": float(normalized[0, 0]),
                    "pezzza": p_state,
                    "mjwarp": m_state,
                    "delta": delta,
                    "terminal": bool(terminals[0]),
                    "truncation": bool(truncations[0]),
                    "info": infos[0],
                }
            )
        if (terminals[0] or truncations[0]) and terminal_step is None:
            terminal_step = step + 1
            break
    env.close()
    return {
        "schema": "six-pendulum-env-dynamics-compare-v1",
        "status": "finished",
        "policy": {
            "path": str(args.policy),
            "algorithm": policy.get("algorithm"),
            "modelType": policy.get("modelType"),
            "forceScale": policy.get("forceScale"),
            "controlHz": policy.get("controlHz"),
            "validationMaxHoldSeconds": policy.get("training", {}).get("validation", {}).get("maxHoldSeconds"),
        },
        "mjwarp": {
            "forceScale": float(args.mjwarp_force_scale),
            "controlDt": float(env.control_dt),
            "terminalBoundary": 2.35,
            "mjcf": str(mjcf_path),
        },
        "startState": start_state,
        "stepsRequested": int(args.steps),
        "stepsCompared": int(compared_steps),
        "samplesIncluded": int(len(rows)),
        "terminalStep": terminal_step,
        "maxDelta": max_delta,
        "samples": rows,
        "elapsedSeconds": time.time() - started,
        "interpretation": [
            "Pezzza one-link browser policy is evaluated under its original hand-written dynamics and the MJWarp rigid-body dynamics from the same reset state.",
            "Large early deltas or immediate terminal mean the hosted policy cannot be used as a direct MJWarp checkpoint.",
            "This is an environment-alignment diagnostic, not a solve metric.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Compare hosted Pezzza one-link dynamics against MJWarp from identical reset/actions.")
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--mjcf", type=Path, default=DEFAULT_MJCF)
    parser.add_argument("--steps", type=int, default=400)
    parser.add_argument("--sample-steps", type=int, default=12)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--mjwarp-force-scale", type=float, default=160.0)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = compare(args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
