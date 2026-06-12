#!/usr/bin/env python3
import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_env import SixPendulumMJWarpPufferEnv


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher-sweep-f160-20260611.json"
)


@dataclass(frozen=True)
class TeacherConfig:
    pump_gain: float
    pump_sign: float
    kick: float
    kick_sign: float
    kick_theta_window: float
    kick_omega_window: float
    max_acceleration: float
    cart_k: float
    cart_d: float
    swing_force_gain: float
    catch_angle: float
    catch_omega: float
    catch_cart_window: float
    catch_x_gain: float
    catch_v_gain: float
    catch_theta_gain: float
    catch_omega_gain: float
    action_smoothing: float


def wrap_angle(angle: np.ndarray) -> np.ndarray:
    return ((angle + np.pi) % (2 * np.pi)) - np.pi


def sample_configs(count: int, seed: int) -> list[TeacherConfig]:
    rng = np.random.default_rng(seed)
    configs = []
    for _ in range(int(count)):
        configs.append(
            TeacherConfig(
                pump_gain=float(rng.choice([6.0, 9.0, 12.0, 16.0, 22.0, 30.0])),
                pump_sign=float(rng.choice([-1.0, 1.0])),
                kick=float(rng.choice([18.0, 24.0, 30.0, 38.0, 48.0])),
                kick_sign=float(rng.choice([-1.0, 1.0])),
                kick_theta_window=float(rng.choice([0.35, 0.5, 0.7, 0.9])),
                kick_omega_window=float(rng.choice([0.1, 0.2, 0.35, 0.6])),
                max_acceleration=float(rng.choice([24.0, 30.0, 38.0, 48.0])),
                cart_k=float(rng.choice([0.02, 0.05, 0.09, 0.14])),
                cart_d=float(rng.choice([0.25, 0.45, 0.7, 1.0])),
                swing_force_gain=float(rng.choice([4.5, 6.75, 9.0, 12.0, 16.0])),
                catch_angle=float(rng.choice([0.24, 0.32, 0.42, 0.55, 0.7])),
                catch_omega=float(rng.choice([1.8, 2.5, 3.2, 4.2, 5.5])),
                catch_cart_window=float(rng.choice([0.65, 0.9, 1.2, 1.7, 2.2])),
                catch_x_gain=float(rng.choice([4.0, 6.0, 8.0, 12.0, 16.0])),
                catch_v_gain=float(rng.choice([2.5, 4.0, 6.0, 9.0])),
                catch_theta_gain=float(rng.choice([35.0, 50.0, 65.0, 85.0, 110.0])),
                catch_omega_gain=float(rng.choice([8.0, 12.0, 16.0, 24.0, 32.0])),
                action_smoothing=float(rng.choice([0.0, 0.15, 0.3, 0.5])),
            )
        )
    return configs


def actions_from_configs(
    qpos: np.ndarray,
    qvel: np.ndarray,
    last_action: np.ndarray,
    configs: list[TeacherConfig],
    force_scale: float,
) -> np.ndarray:
    theta = wrap_angle(qpos[:, 1])
    omega = qvel[:, 1]
    x = qpos[:, 0]
    v = qvel[:, 0]
    energy = (1.0 / 6.0) * omega**2 + (9.8 / 2.0) * np.cos(theta)
    target_energy = 9.8 / 2.0
    actions = np.zeros(len(configs), dtype=np.float32)
    for index, cfg in enumerate(configs):
        pump_acc = cfg.pump_sign * cfg.pump_gain * (energy[index] - target_energy) * omega[index] * np.cos(theta[index])
        near_bottom = abs(omega[index]) < cfg.kick_omega_window and abs(theta[index]) > np.pi - cfg.kick_theta_window
        if near_bottom:
            pump_acc = cfg.kick_sign * cfg.kick
        acceleration = np.clip(
            pump_acc - cfg.cart_d * v[index] - cfg.cart_k * x[index],
            -cfg.max_acceleration,
            cfg.max_acceleration,
        )
        catch = (
            abs(theta[index]) < cfg.catch_angle
            and abs(omega[index]) < cfg.catch_omega
            and abs(x[index]) < cfg.catch_cart_window
        )
        swing_force = acceleration * cfg.swing_force_gain
        catch_force = (
            -cfg.catch_x_gain * x[index]
            - cfg.catch_v_gain * v[index]
            + cfg.catch_theta_gain * theta[index]
            + cfg.catch_omega_gain * omega[index]
        )
        raw_action = float(np.clip((catch_force if catch else swing_force) / force_scale, -1.0, 1.0))
        if cfg.action_smoothing > 0.0:
            raw_action = cfg.action_smoothing * float(last_action[index]) + (1.0 - cfg.action_smoothing) * raw_action
        actions[index] = np.clip(raw_action, -1.0, 1.0)
    return actions


def summarize(metrics: dict, control_dt: float, rewards: np.ndarray, actions: np.ndarray) -> dict:
    max_hold = np.asarray(metrics["maxHeldSeconds"], dtype=np.float32)
    strict_score = np.asarray(metrics["maxStrictScore"], dtype=np.float32)
    solved = max_hold >= 1.0
    return {
        "maxHoldSeconds": float(np.mean(max_hold)) if max_hold.size else 0.0,
        "maxHoldSecondsP10": float(np.quantile(max_hold, 0.1)) if max_hold.size else 0.0,
        "bestWorldHoldSeconds": float(np.max(max_hold)) if max_hold.size else 0.0,
        "bestWorldStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
        "solvedOneSecondRate": float(np.mean(solved.astype(np.float32))) if solved.size else 0.0,
        "rewardMean": float(np.mean(rewards)) if rewards.size else 0.0,
        "whiplashSeconds": float(np.mean(metrics["whipSeconds"])) if max_hold.size else 0.0,
        "catchEvents": int(np.sum(metrics["catchEvents"])) if max_hold.size else 0,
        "terminalCount": int(np.sum(metrics["terminalCount"])) if max_hold.size else 0,
        "centerRatio": float(np.mean(metrics["centerRatio"])) if max_hold.size else 0.0,
        "actionAbsMean": float(np.mean(np.abs(actions))) if actions.size else 0.0,
        "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
        "controlDt": float(control_dt),
    }


def evaluate_configs(
    mjcf_xml: str,
    configs: list[TeacherConfig],
    links: int,
    steps: int,
    force_scale: float,
    seed: int,
    pose: str,
    trace_index: int | None = None,
) -> tuple[np.ndarray, dict, dict | None]:
    env = SixPendulumMJWarpPufferEnv(
        mjcf_xml,
        links=links,
        nworld=len(configs),
        horizon=steps + 1,
        pose=pose,
        force_scale=force_scale,
        seed=seed,
    )
    obs, _ = env.reset(seed)
    rewards = np.zeros(len(configs), dtype=np.float32)
    max_held = np.zeros(len(configs), dtype=np.float32)
    max_score = np.zeros(len(configs), dtype=np.float32)
    whip_seconds = np.zeros(len(configs), dtype=np.float32)
    catch_events = np.zeros(len(configs), dtype=np.int32)
    terminal_count = np.zeros(len(configs), dtype=np.int32)
    center_sum = np.zeros(len(configs), dtype=np.float32)
    active = np.ones(len(configs), dtype=bool)
    last_action = np.zeros(len(configs), dtype=np.float32)
    action_trace = []
    obs_trace = []

    for _ in range(int(steps)):
        qpos = env.d.qpos.numpy()
        qvel = env.d.qvel.numpy()
        action = actions_from_configs(qpos, qvel, last_action, configs, force_scale)
        action = np.where(active, action, 0.0).astype(np.float32)
        if trace_index is not None:
            obs_trace.append(obs[int(trace_index)].copy())
            action_trace.append(action[int(trace_index)].copy())
        obs, reward, terminals, truncations, infos = env.step(action.reshape(len(configs), 1))
        rewards += np.where(active, reward, 0.0)
        info_hold = np.asarray([info["maxHeldSeconds"] for info in infos], dtype=np.float32)
        info_score = np.asarray([info["strictScore"] for info in infos], dtype=np.float32)
        info_whip = np.asarray([info["whip"] for info in infos], dtype=np.float32)
        info_catch = np.asarray([info["catchBasin"] for info in infos], dtype=np.float32)
        max_held = np.maximum(max_held, np.where(active, info_hold, 0.0))
        max_score = np.maximum(max_score, np.where(active, info_score, 0.0))
        whip_seconds += np.where(active & (info_whip > 0.5), env.control_dt, 0.0).astype(np.float32)
        catch_events += (active & (info_catch > 0.5)).astype(np.int32)
        terminal_count += (active & terminals).astype(np.int32)
        center_sum += np.where(active, np.maximum(0.0, 1.0 - np.abs(obs[:, 0]) / 2.35), 0.0)
        active &= ~(terminals | truncations)
        last_action = action

    center_ratio = center_sum / max(1, int(steps))
    selection = (
        rewards
        + max_held * 220.0
        + (max_held >= 1.0).astype(np.float32) * 1200.0
        + max_score * 1.0
        + np.minimum(whip_seconds, 1.5) * 20.0
        + center_ratio * 12.0
        + catch_events.astype(np.float32) * 0.03
        - terminal_count.astype(np.float32) * 1.25
    )
    metrics = {
        "maxHeldSeconds": max_held,
        "maxStrictScore": max_score,
        "whipSeconds": whip_seconds,
        "catchEvents": catch_events,
        "terminalCount": terminal_count,
        "centerRatio": center_ratio,
    }
    trace = None
    if trace_index is not None:
        trace = {
            "observations": np.asarray(obs_trace, dtype=np.float32),
            "actions": np.asarray(action_trace, dtype=np.float32),
        }
    control_dt = float(env.control_dt)
    env.close()
    return selection, {**metrics, "rewards": rewards, "controlDt": control_dt}, trace


def run_sweep(
    mjcf_xml: str,
    links: int,
    pose: str,
    configs: int,
    rounds: int,
    keep: int,
    steps: int,
    force_scale: float,
    seed: int,
    write_trajectory: Path | None,
) -> dict:
    started = time.time()
    candidates = sample_configs(configs, seed)
    best_configs: list[TeacherConfig] = []
    best_selection = np.asarray([], dtype=np.float32)
    history = []

    for round_index in range(int(rounds)):
        selection, metrics, _ = evaluate_configs(
            mjcf_xml,
            candidates,
            links,
            steps,
            force_scale,
            seed + round_index,
            pose,
        )
        order = np.argsort(selection)[-int(keep) :][::-1]
        best_configs = [candidates[int(index)] for index in order]
        best_selection = selection[order]
        summary = summarize(metrics, float(metrics["controlDt"]), metrics["rewards"], np.zeros((1,), dtype=np.float32))
        history.append(
            {
                "round": round_index + 1,
                "configCount": len(candidates),
                "bestSelection": float(np.max(selection)),
                "meanSelection": float(np.mean(selection)),
                "bestWorldHoldSeconds": summary["bestWorldHoldSeconds"],
                "bestWorldStrictScore": summary["bestWorldStrictScore"],
                "solvedWorlds": int(np.sum(metrics["maxHeldSeconds"] >= 1.0)),
                "catchEvents": summary["catchEvents"],
                "terminalCount": summary["terminalCount"],
            }
        )
        print(json.dumps(history[-1], sort_keys=True), flush=True)
        fresh_count = max(0, int(configs) - len(best_configs))
        candidates = best_configs + sample_configs(fresh_count, seed + 10_000 + round_index)

    selection, metrics, trace = evaluate_configs(
        mjcf_xml,
        best_configs,
        links,
        steps,
        force_scale,
        seed + 100_000,
        pose,
        trace_index=None,
    )
    best_index = int(np.argmax(selection)) if selection.size else 0
    _, _, trace = evaluate_configs(
        mjcf_xml,
        [best_configs[best_index]],
        links,
        steps,
        force_scale,
        seed + 100_000,
        pose,
        trace_index=0,
    )
    validation = summarize(
        metrics,
        float(metrics["controlDt"]),
        metrics["rewards"],
        trace["actions"] if trace is not None else np.zeros((1,), dtype=np.float32),
    )
    trajectory = {"written": False}
    if write_trajectory is not None and trace is not None:
        write_trajectory.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            write_trajectory,
            observations=trace["observations"],
            actions=trace["actions"],
            links=np.asarray([links], dtype=np.int32),
            pose=np.asarray([pose]),
            force_scale=np.asarray([force_scale], dtype=np.float32),
            config=np.asarray([json.dumps(asdict(best_configs[best_index]), sort_keys=True)]),
        )
        trajectory = {"written": True, "path": str(write_trajectory), "format": "npz"}

    return {
        "schema": "six-pendulum-mjwarp-energy-teacher-sweep-v1",
        "status": "finished",
        "algorithm": "parameterized-energy-whip-catch-teacher-sweep",
        "links": int(links),
        "pose": pose,
        "nworld": int(configs),
        "steps": int(steps),
        "evalSeconds": float(steps) * float(metrics["controlDt"]),
        "forceScale": float(force_scale),
        "seed": int(seed),
        "training": {
            "profile": f"{pose}-one-link-teacher-discovery",
            "population": int(configs),
            "generations": int(rounds),
            "totalTimesteps": int(configs) * int(rounds) * int(steps),
            "elapsedSeconds": time.time() - started,
            "history": history,
            "validationByPose": {pose: validation},
            "trajectory": trajectory,
            "bestConfig": asdict(best_configs[best_index]) if best_configs else {},
            "topConfigs": [asdict(config) for config in best_configs[: min(8, len(best_configs))]],
        },
        "validationByPose": {pose: validation},
        "gates": {
            "learnedPolicyOnly": False,
            "teacherScaffoldOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "teacherSolvedOneSecond": bool(validation["bestWorldHoldSeconds"] >= 1.0),
            "promotePufferLane": False,
        },
        "notes": [
            f"This searches a parameterized controller inside the same MJWarp {pose} task.",
            "It is trajectory discovery/scaffold only; it is not a learned policy solve.",
            "Use any successful trajectory only for later distillation or RL curriculum evidence.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Sweep parameterized energy/whip/catch teachers inside MJWarp.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--configs", type=int, default=64)
    parser.add_argument("--rounds", type=int, default=3)
    parser.add_argument("--keep", type=int, default=12)
    parser.add_argument("--steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-trajectory", type=Path, default=None)
    args = parser.parse_args()

    if args.links != 1:
        raise ValueError("The current energy teacher sweep is one-link only")
    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    result = run_sweep(
        mjcf_path.read_text(),
        args.links,
        args.pose,
        args.configs,
        args.rounds,
        args.keep,
        args.steps,
        args.force_scale,
        args.seed,
        args.write_trajectory,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
