#!/usr/bin/env python3
import argparse
import json
import time
from itertools import product
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-whip-plan-sweep.json"
)
DEFAULT_REPLAY = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-whip-plan-sweep-best.npz"
)


def seconds_to_steps(values: list[float], control_dt: float) -> list[int]:
    return [max(1, int(round(float(value) / control_dt))) for value in values]


def build_plan_specs(args, control_dt: float) -> list[dict]:
    side_steps = seconds_to_steps(args.side_seconds, control_dt)
    reverse_steps = seconds_to_steps(args.reverse_seconds, control_dt)
    brake_steps = seconds_to_steps(args.brake_seconds, control_dt)
    specs = []
    catch_params = [(0.0, 0.0, 0.0, 0.0)]
    if args.tail_controller in {"pd", "stabilizer"}:
        catch_params = list(product(args.catch_kp, args.catch_kd, args.catch_cart_kp, args.catch_cart_kd))
    for sign, side, reverse, brake, side_mag, reverse_mag, brake_mag, catch_param in product(
        [-1.0, 1.0],
        side_steps,
        reverse_steps,
        brake_steps,
        args.side_magnitudes,
        args.reverse_magnitudes,
        args.brake_magnitudes,
        catch_params,
    ):
        catch_kp, catch_kd, catch_cart_kp, catch_cart_kd = catch_param
        specs.append(
            {
                "sign": float(sign),
                "sideSteps": int(side),
                "reverseSteps": int(reverse),
                "brakeSteps": int(brake),
                "sideSeconds": float(side * control_dt),
                "reverseSeconds": float(reverse * control_dt),
                "brakeSeconds": float(brake * control_dt),
                "sideMagnitude": float(side_mag),
                "reverseMagnitude": float(reverse_mag),
                "brakeMagnitude": float(brake_mag),
                "tailController": args.tail_controller,
                "catchKp": float(catch_kp),
                "catchKd": float(catch_kd),
                "catchCartKp": float(catch_cart_kp),
                "catchCartKd": float(catch_cart_kd),
            }
        )
    return specs


def catch_tail_action(spec: dict, obs: np.ndarray, links: int, force_scale: float) -> np.ndarray:
    safe_links = max(1, min(6, int(links)))
    angles = []
    omegas = []
    for link in range(safe_links):
        base = 3 + link * 5
        angles.append(np.arctan2(obs[:, base], obs[:, base + 1]))
        omegas.append(obs[:, base + 4] * 8.0)
    theta = np.mean(np.stack(angles, axis=0), axis=0)
    omega = np.mean(np.stack(omegas, axis=0), axis=0)
    x = obs[:, 0]
    xvel = obs[:, 1] * 5.0
    if spec.get("tailController") == "stabilizer":
        force = (
            spec["catchKp"] * theta
            + spec["catchKd"] * omega
            - spec["catchCartKp"] * x
            - spec["catchCartKd"] * xvel
        )
    else:
        force = (
            -spec["catchKp"] * theta
            - spec["catchKd"] * omega
            - spec["catchCartKp"] * x
            - spec["catchCartKd"] * xvel
        )
    return np.clip(force / float(force_scale), -1.0, 1.0).astype(np.float32)


def action_for_step(spec: dict, step_index: int, obs: np.ndarray | None = None, links: int = 1, force_scale: float = 1.0) -> np.ndarray | float:
    side_end = spec["sideSteps"]
    reverse_end = side_end + spec["reverseSteps"]
    brake_end = reverse_end + spec["brakeSteps"]
    sign = spec["sign"]
    if step_index < side_end:
        return sign * spec["sideMagnitude"]
    if step_index < reverse_end:
        return -sign * spec["reverseMagnitude"]
    if step_index < brake_end:
        return sign * spec["brakeMagnitude"]
    if spec.get("tailController") == "pd" and obs is not None:
        return catch_tail_action(spec, obs, links, force_scale)
    return 0.0


def summarize_world(
    obs_history: np.ndarray,
    reward_history: np.ndarray,
    action_history: np.ndarray,
    terminal_history: np.ndarray,
    info_history: list[list[dict]],
    world: int,
    links: int,
    control_dt: float,
) -> dict:
    obs = obs_history[:, world, :]
    rewards = reward_history[:, world]
    actions = action_history[:, world]
    terminals = terminal_history[:, world]
    infos = [step_infos[world] for step_infos in info_history]
    cos_columns = [4 + index * 5 for index in range(max(1, min(6, int(links))))]
    visible_cos = obs[:, cos_columns]
    mean_tip_height = np.mean((visible_cos + 1.0) * 0.5, axis=1)
    max_height = float(np.max(mean_tip_height))
    near_top_steps = int(sum(1 for info in infos if info.get("strictScore", 0.0) > 0.0))
    catch_steps = int(sum(1 for info in infos if info.get("catchBasin", 0.0) > 0.5))
    whip_steps = int(sum(1 for info in infos if info.get("whip", 0.0) > 0.5))
    max_held = float(max(info.get("maxHeldSeconds", 0.0) for info in infos))
    max_score = float(max(info.get("strictScore", 0.0) for info in infos))
    max_abs_x = float(np.max(np.abs(obs[:, 0])))
    terminal_step = int(np.argmax(terminals > 0.5)) if bool(np.any(terminals > 0.5)) else -1
    rank_score = (
        max_height * 10.0
        + catch_steps * 0.05
        + near_top_steps * 0.2
        + max_held * 25.0
        + max_score * 0.1
        - max(0.0, max_abs_x - 2.35) * 8.0
        - (1.0 if terminal_step >= 0 else 0.0) * 2.0
    )
    return {
        "world": int(world),
        "rankScore": float(rank_score),
        "rewardSum": float(np.sum(rewards)),
        "maxMeanTipHeight": max_height,
        "maxStrictScore": max_score,
        "maxHeldSeconds": max_held,
        "nearTopSteps": near_top_steps,
        "catchBasinSteps": catch_steps,
        "whipSteps": whip_steps,
        "maxAbsCart": max_abs_x,
        "terminalStep": terminal_step,
        "firstTerminalSeconds": float(terminal_step * control_dt) if terminal_step >= 0 else None,
        "actionMeanAbs": float(np.mean(np.abs(actions))),
        "actionMaxAbs": float(np.max(np.abs(actions))),
    }


def run_sweep(args) -> dict:
    started = time.time()
    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    mjcf_xml = mjcf_path.read_text()
    probe_env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=args.links,
        nworld=1,
        horizon=args.steps + 1,
        pose=args.pose,
        force_scale=args.force_scale,
        seed=args.seed,
    )
    control_dt = float(probe_env.control_dt)
    probe_env.close()
    specs = build_plan_specs(args, control_dt)
    if args.max_plans > 0:
        specs = specs[: args.max_plans]
    if not specs:
        raise ValueError("No action plans generated")
    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=args.links,
        nworld=len(specs),
        horizon=args.steps + 1,
        pose=args.pose,
        force_scale=args.force_scale,
        seed=args.seed,
    )
    obs, _infos = env.reset(seed=args.seed)
    obs_history = np.zeros((args.steps, len(specs), obs.shape[-1]), dtype=np.float32)
    reward_history = np.zeros((args.steps, len(specs)), dtype=np.float32)
    action_history = np.zeros((args.steps, len(specs)), dtype=np.float32)
    terminal_history = np.zeros((args.steps, len(specs)), dtype=np.float32)
    info_history = []
    for step_index in range(args.steps):
        actions = []
        for world_index, spec in enumerate(specs):
            action = action_for_step(spec, step_index, obs[world_index : world_index + 1], args.links, args.force_scale)
            if isinstance(action, np.ndarray):
                actions.append(float(action[0]))
            else:
                actions.append(float(action))
        actions = np.asarray(actions, dtype=np.float32).reshape(len(specs), 1)
        obs, rewards, terminals, _truncations, infos = env.step(actions)
        obs_history[step_index] = obs
        reward_history[step_index] = rewards
        action_history[step_index] = actions[:, 0]
        terminal_history[step_index] = terminals.astype(np.float32)
        info_history.append(infos)
    control_dt = float(env.control_dt)
    env.close()
    summaries = [
        summarize_world(obs_history, reward_history, action_history, terminal_history, info_history, index, args.links, control_dt)
        for index in range(len(specs))
    ]
    for summary, spec in zip(summaries, specs):
        summary["plan"] = spec
    summaries.sort(key=lambda item: item["rankScore"], reverse=True)
    best = summaries[0]
    if args.write_replay:
        best_world = int(best["world"])
        args.write_replay.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            args.write_replay,
            schema=np.asarray("puffer-mjwarp-whip-plan-sweep-replay-v1"),
            links=np.asarray(args.links, dtype=np.int32),
            pose=np.asarray(args.pose),
            forceScale=np.asarray(args.force_scale, dtype=np.float32),
            controlDt=np.asarray(control_dt, dtype=np.float32),
            obs=obs_history[:, best_world : best_world + 1, :],
            observations=obs_history[:, best_world : best_world + 1, :],
            rewards=reward_history[:, best_world],
            actions=action_history[:, best_world : best_world + 1],
            terminals=terminal_history[:, best_world],
            plan=np.asarray(json.dumps(best["plan"])),
            summary=np.asarray(json.dumps(best)),
        )
    return {
        "schema": "puffer-mjwarp-whip-plan-sweep-v1",
        "status": "completed",
        "links": int(args.links),
        "pose": args.pose,
        "forceScale": float(args.force_scale),
        "steps": int(args.steps),
        "controlDt": control_dt,
        "planCount": len(specs),
        "elapsedSeconds": time.time() - started,
        "best": best,
        "top": summaries[: min(args.top_k, len(summaries))],
        "notes": [
            "Open-loop side-load/reverse/brake diagnostic only; not a counted learned policy.",
            "Optional PD catch tail is a teacher diagnostic only; it is never a counted learned policy.",
            "Use this to falsify whether the exact-down environment can produce Kache-style whip before expensive PPO sweeps.",
            "Counted solve still requires autonomous learned exact-down strict hold for at least one second.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Sweep open-loop side-load/reverse/brake whip plans in the MJWarp pendulum env.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--steps", type=int, default=600)
    parser.add_argument("--pose", choices=["down", "exact-down", "hold", "mixed", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--force-scale", type=float, default=300.0)
    parser.add_argument("--seed", type=int, default=426710)
    parser.add_argument("--max-plans", type=int, default=0)
    parser.add_argument("--top-k", type=int, default=12)
    parser.add_argument("--side-seconds", type=float, nargs="+", default=[0.18, 0.28, 0.40, 0.55])
    parser.add_argument("--reverse-seconds", type=float, nargs="+", default=[0.18, 0.30, 0.45, 0.65])
    parser.add_argument("--brake-seconds", type=float, nargs="+", default=[0.0, 0.10, 0.20, 0.35])
    parser.add_argument("--side-magnitudes", type=float, nargs="+", default=[0.35, 0.55, 0.75, 0.95])
    parser.add_argument("--reverse-magnitudes", type=float, nargs="+", default=[0.45, 0.70, 0.95, 1.0])
    parser.add_argument("--brake-magnitudes", type=float, nargs="+", default=[0.0, 0.25, 0.50])
    parser.add_argument("--tail-controller", choices=["none", "pd", "stabilizer"], default="none")
    parser.add_argument("--catch-kp", type=float, nargs="+", default=[80.0])
    parser.add_argument("--catch-kd", type=float, nargs="+", default=[18.0])
    parser.add_argument("--catch-cart-kp", type=float, nargs="+", default=[10.0])
    parser.add_argument("--catch-cart-kd", type=float, nargs="+", default=[12.0])
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-replay", type=Path, default=DEFAULT_REPLAY)
    args = parser.parse_args()
    result = run_sweep(args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
