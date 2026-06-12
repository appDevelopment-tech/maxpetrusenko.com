#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import numpy as np

from six_pendulum_mjwarp_env import OBS_DIM, SixPendulumMJWarpPufferEnv


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-es-teacher-1link-smoke.json"
)


def unpack(params: np.ndarray, input_dim: int, hidden_dim: int, knot_count: int) -> tuple[np.ndarray, ...]:
    cursor = 0
    knots = params[:, cursor : cursor + knot_count]
    cursor += knot_count
    w1 = params[:, cursor : cursor + input_dim * hidden_dim].reshape(-1, input_dim, hidden_dim)
    cursor += input_dim * hidden_dim
    b1 = params[:, cursor : cursor + hidden_dim]
    cursor += hidden_dim
    w2 = params[:, cursor : cursor + hidden_dim].reshape(-1, hidden_dim, 1)
    cursor += hidden_dim
    b2 = params[:, cursor : cursor + 1]
    return knots, w1, b1, w2, b2


def policy_actions(
    params: np.ndarray,
    obs: np.ndarray,
    last_action: np.ndarray,
    step_index: int,
    steps: int,
    hidden_dim: int,
    knot_count: int,
) -> np.ndarray:
    input_dim = 7
    knots, w1, b1, w2, b2 = unpack(params, input_dim, hidden_dim, knot_count)
    t_norm = float(step_index) / max(1, int(steps) - 1)
    knot_pos = t_norm * float(knot_count - 1)
    left = int(np.floor(knot_pos))
    right = min(left + 1, knot_count - 1)
    mix = knot_pos - float(left)
    base = knots[:, left] * (1.0 - mix) + knots[:, right] * mix
    features = np.stack(
        [
            obs[:, 0] / 2.35,
            obs[:, 1],
            obs[:, 3],
            obs[:, 4],
            obs[:, 7],
            last_action,
            np.full(obs.shape[0], t_norm, dtype=np.float32),
        ],
        axis=1,
    )
    hidden = np.tanh(np.einsum("bi,bih->bh", features, w1) + b1)
    feedback = np.einsum("bh,bho->bo", hidden, w2)[:, 0] + b2[:, 0]
    return np.tanh(base + feedback).astype(np.float32)


def summarize_validation(metrics: dict, horizon_seconds: float) -> dict:
    max_hold = np.asarray(metrics["maxHeldSeconds"], dtype=np.float32)
    strict_score = np.asarray(metrics["maxStrictScore"], dtype=np.float32)
    solved = (max_hold >= 1.0).astype(np.float32)
    center_ratio = np.asarray(metrics["centerRatio"], dtype=np.float32)
    smooth_penalty = np.asarray(metrics["smoothPenalty"], dtype=np.float32)
    mean_hold = float(np.mean(max_hold))
    hold_p10 = float(np.quantile(max_hold, 0.1))
    solved_rate = float(np.mean(solved))
    score = 0.0
    if mean_hold >= 1.0:
        rail_penalty = max(0.0, 0.62 - float(np.mean(center_ratio))) * 10.0
        score = (
            100.0 * solved_rate
            + 10.0 * min(mean_hold, horizon_seconds)
            + 5.0 * min(hold_p10, horizon_seconds)
            - rail_penalty
            - float(np.mean(smooth_penalty))
        )
    return {
        "strictScore": float(score),
        "maxHoldSeconds": mean_hold,
        "maxHoldSecondsP10": hold_p10,
        "bestWorldHoldSeconds": float(np.max(max_hold)) if max_hold.size else 0.0,
        "bestWorldStrictScore": float(np.max(strict_score)) if strict_score.size else 0.0,
        "solvedOneSecondRate": solved_rate,
        "whiplashSeconds": float(np.mean(metrics["whipSeconds"])),
        "catchEvents": int(np.sum(metrics["catchEvents"])),
        "centerRatio": float(np.mean(center_ratio)),
        "smoothPenalty": float(np.mean(smooth_penalty)),
        "terminalCount": int(np.sum(metrics["terminalCount"])),
    }


def evaluate_population(
    mjcf_xml: str,
    params: np.ndarray,
    links: int,
    steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    knot_count: int,
    record_best_index: int | None = None,
) -> tuple[np.ndarray, dict, dict | None]:
    nworld = int(params.shape[0])
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
    reward_sum = np.zeros(nworld, dtype=np.float32)
    max_held = np.zeros(nworld, dtype=np.float32)
    max_score = np.zeros(nworld, dtype=np.float32)
    whip_seconds = np.zeros(nworld, dtype=np.float32)
    catch_events = np.zeros(nworld, dtype=np.int32)
    terminal_count = np.zeros(nworld, dtype=np.int32)
    center_sum = np.zeros(nworld, dtype=np.float32)
    smooth_sum = np.zeros(nworld, dtype=np.float32)
    active = np.ones(nworld, dtype=bool)
    last_action = np.zeros(nworld, dtype=np.float32)
    trace_obs = []
    trace_actions = []

    for step_index in range(int(steps)):
        action = policy_actions(params, obs, last_action, step_index, steps, hidden_dim, knot_count)
        action = np.where(active, action, 0.0).astype(np.float32)
        if record_best_index is not None:
            trace_obs.append(obs[int(record_best_index)].copy())
            trace_actions.append(action[int(record_best_index)].copy())
        obs, rewards, terminals, truncations, infos = env.step(action.reshape(nworld, 1))
        reward_sum += np.where(active, rewards, 0.0)
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
        smooth_sum += np.where(active, np.abs(action - last_action), 0.0)
        active &= ~(terminals | truncations)
        last_action = action

    horizon_seconds = float(steps) * env.control_dt
    smooth_penalty = smooth_sum / max(1, int(steps)) / max(1e-6, float(force_scale))
    center_ratio = center_sum / max(1, int(steps))
    selection = (
        reward_sum
        + max_held * 180.0
        + (max_held >= 1.0).astype(np.float32) * 850.0
        + max_score * 0.8
        + np.minimum(whip_seconds, 1.5) * 18.0
        + center_ratio * 8.0
        - smooth_penalty * 6.0
        - terminal_count.astype(np.float32) * 1.5
    )
    metrics = {
        "rewardSum": reward_sum,
        "selection": selection,
        "maxHeldSeconds": max_held,
        "maxStrictScore": max_score,
        "whipSeconds": whip_seconds,
        "catchEvents": catch_events,
        "centerRatio": center_ratio,
        "smoothPenalty": smooth_penalty,
        "terminalCount": terminal_count,
    }
    trace = None
    if record_best_index is not None:
        trace = {
            "observations": np.asarray(trace_obs, dtype=np.float32),
            "actions": np.asarray(trace_actions, dtype=np.float32),
        }
    env.close()
    return selection, metrics, trace


def train_es_teacher(
    mjcf_xml: str,
    links: int,
    population: int,
    generations: int,
    steps: int,
    force_scale: float,
    seed: int,
    hidden_dim: int,
    knot_count: int,
    elite_fraction: float,
    write_trajectory: Path | None,
) -> dict:
    started = time.time()
    rng = np.random.default_rng(seed)
    input_dim = 7
    param_count = knot_count + input_dim * hidden_dim + hidden_dim + hidden_dim + 1
    elite_count = max(4, min(population, int(population * elite_fraction)))
    mean = np.zeros(param_count, dtype=np.float32)
    sigma = 1.0
    best_params = mean.copy()
    best_selection = -1e9
    history = []

    for generation in range(int(generations)):
        candidates = mean.reshape(1, -1) + rng.normal(0.0, sigma, size=(population, param_count)).astype(np.float32)
        selection, metrics, _ = evaluate_population(
            mjcf_xml, candidates, links, steps, force_scale, seed + generation, hidden_dim, knot_count
        )
        elite_indices = np.argsort(selection)[-elite_count:]
        elites = candidates[elite_indices]
        mean = elites.mean(axis=0).astype(np.float32)
        sigma = max(0.045, sigma * 0.92)
        generation_best_index = int(np.argmax(selection))
        if float(selection[generation_best_index]) > best_selection:
            best_selection = float(selection[generation_best_index])
            best_params = candidates[generation_best_index].copy()
        summary = summarize_validation(metrics, float(steps) * 0.0025)
        history.append(
            {
                "generation": generation + 1,
                "sigma": float(sigma),
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

    validation_batch = np.repeat(best_params.reshape(1, -1), max(8, min(population, 32)), axis=0)
    _, validation_metrics, trace = evaluate_population(
        mjcf_xml,
        validation_batch,
        links,
        steps,
        force_scale,
        seed + 100_000,
        hidden_dim,
        knot_count,
        record_best_index=0,
    )
    validation = summarize_validation(validation_metrics, float(steps) * 0.0025)
    trajectory = {"written": False}
    if write_trajectory is not None and trace is not None:
        write_trajectory.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            write_trajectory,
            observations=trace["observations"],
            actions=trace["actions"],
            params=best_params.astype(np.float32),
            links=np.asarray([links], dtype=np.int32),
            force_scale=np.asarray([force_scale], dtype=np.float32),
        )
        trajectory = {"written": True, "path": str(write_trajectory), "format": "npz"}

    return {
        "schema": "six-pendulum-mjwarp-es-teacher-v1",
        "status": "finished",
        "algorithm": "mjwarp-exact-down-cem-teacher",
        "links": int(links),
        "modelType": "time-knot-plus-feedback-controller",
        "training": {
            "population": int(population),
            "generations": int(generations),
            "steps": int(steps),
            "horizonSeconds": float(steps) * 0.0025,
            "forceScale": float(force_scale),
            "seed": int(seed),
            "hiddenDim": int(hidden_dim),
            "knotCount": int(knot_count),
            "paramCount": int(param_count),
            "eliteCount": int(elite_count),
            "elapsedSeconds": time.time() - started,
            "validationByPose": {"down": validation},
            "history": history,
            "trajectory": trajectory,
        },
        "gates": {
            "teacherDoesNotCountAsLearnedPolicy": True,
            "strictOneSecondRequiredForDistillationPromotion": True,
            "teacherSolvedOneSecond": bool(validation["bestWorldHoldSeconds"] >= 1.0),
        },
        "notes": [
            "This is an exact-down trajectory teacher for the MJWarp task, not a learned PPO policy.",
            "Use successful trajectories for sequence distillation only after held-out exact-down validation crosses one second.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Train a one-link exact-down MJWarp CEM teacher.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--generations", type=int, default=6)
    parser.add_argument("--steps", type=int, default=768)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--hidden-dim", type=int, default=16)
    parser.add_argument("--knot-count", type=int, default=24)
    parser.add_argument("--elite-fraction", type=float, default=0.125)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-trajectory", type=Path, default=None)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = train_es_teacher(
        mjcf_path.read_text(),
        args.links,
        args.population,
        args.generations,
        args.steps,
        args.force_scale,
        args.seed,
        args.hidden_dim,
        args.knot_count,
        args.elite_fraction,
        args.write_trajectory,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
