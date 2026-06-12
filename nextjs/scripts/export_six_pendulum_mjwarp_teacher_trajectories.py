#!/usr/bin/env python3
import argparse
import json
import time
from dataclasses import asdict
from pathlib import Path

import numpy as np

from sweep_six_pendulum_mjwarp_energy_teacher import TeacherConfig, evaluate_configs, summarize


DEFAULT_SOURCE = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher-sweep-f160-20260611.json"
)
DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.json"
)


def load_teacher_configs(source: Path, limit: int) -> list[TeacherConfig]:
    root = json.loads(source.read_text())
    raw_configs = root.get("topConfigs", [])
    if root.get("bestConfig"):
        raw_configs = [root["bestConfig"], *raw_configs]
    raw_configs = [*raw_configs, *root.get("training", {}).get("topConfigs", [])]
    if root.get("training", {}).get("bestConfig"):
        raw_configs = [root["training"]["bestConfig"], *raw_configs]
    deduped = []
    seen = set()
    for raw_config in raw_configs:
        key = json.dumps(raw_config, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(TeacherConfig(**raw_config))
        if len(deduped) >= int(limit):
            break
    if not deduped:
        raise ValueError(f"No teacher configs found in {source}")
    return deduped


def export_trajectories(
    mjcf_xml: str,
    source: Path,
    links: int,
    steps: int,
    force_scale: float,
    seed: int,
    limit: int,
    pose: str,
    write_result: Path,
    write_trajectory: Path,
) -> dict:
    started = time.time()
    configs = load_teacher_configs(source, limit)
    observations = []
    actions = []
    config_summaries = []
    for index, config in enumerate(configs):
        _, metrics, trace = evaluate_configs(
            mjcf_xml,
            [config],
            links,
            steps,
            force_scale,
            seed + index,
            pose,
            trace_index=0,
        )
        summary = summarize(metrics, float(metrics["controlDt"]), metrics["rewards"], trace["actions"])
        observations.append(trace["observations"])
        actions.append(trace["actions"])
        config_summaries.append(
            {
                "index": index,
                "config": asdict(config),
                "validation": summary,
                "countsAsTeacherSuccess": bool(summary["bestWorldHoldSeconds"] >= 1.0),
            }
        )
        print(json.dumps(config_summaries[-1], sort_keys=True), flush=True)

    stacked_observations = np.stack(observations, axis=1).astype(np.float32)
    stacked_actions = np.stack(actions, axis=1).astype(np.float32)
    write_trajectory.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        write_trajectory,
        observations=stacked_observations,
        actions=stacked_actions,
        links=np.asarray([links], dtype=np.int32),
        force_scale=np.asarray([force_scale], dtype=np.float32),
        configs=np.asarray([json.dumps(item["config"], sort_keys=True) for item in config_summaries]),
        pose=np.asarray([pose]),
    )
    best_hold = max(item["validation"]["bestWorldHoldSeconds"] for item in config_summaries)
    solved_rate = sum(1 for item in config_summaries if item["validation"]["bestWorldHoldSeconds"] >= 1.0) / len(config_summaries)
    result = {
        "schema": "six-pendulum-mjwarp-teacher-trajectory-export-v1",
        "status": "finished",
        "algorithm": "parameterized-energy-whip-catch-teacher-trajectory-export",
        "source": str(source),
        "links": int(links),
        "steps": int(steps),
        "evalSeconds": float(steps) * 0.0025,
        "forceScale": float(force_scale),
        "pose": str(pose),
        "seed": int(seed),
        "trajectory": {
            "written": True,
            "path": str(write_trajectory),
            "format": "npz",
            "shape": {
                "observations": list(stacked_observations.shape),
                "actions": list(stacked_actions.shape),
            },
        },
        "training": {
            "profile": "exact-down-one-link-top-teacher-trajectory-export",
            "population": len(configs),
            "totalTimesteps": int(len(configs) * steps),
            "elapsedSeconds": time.time() - started,
            "validationByPose": {
                pose: {
                    "maxHoldSeconds": float(np.mean([item["validation"]["maxHoldSeconds"] for item in config_summaries])),
                    "bestWorldHoldSeconds": float(best_hold),
                    "solvedOneSecondRate": float(solved_rate),
                    "bestWorldStrictScore": float(
                        max(item["validation"]["bestWorldStrictScore"] for item in config_summaries)
                    ),
                }
            },
            "configSummaries": config_summaries,
        },
        "validationByPose": {
            pose: {
                "bestWorldHoldSeconds": float(best_hold),
                "solvedOneSecondRate": float(solved_rate),
            }
        },
        "gates": {
            "learnedPolicyOnly": False,
            "teacherScaffoldOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "teacherSolvedOneSecond": bool(best_hold >= 1.0),
            "promotePufferLane": False,
        },
    }
    write_result.parent.mkdir(parents=True, exist_ok=True)
    write_result.write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description="Export multiple MJWarp teacher trajectories from saved top configs.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--steps", type=int, default=2400)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--seed", type=int, default=526210)
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--write-trajectory",
        type=Path,
        default=Path(
            "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.npz"
        ),
    )
    args = parser.parse_args()

    if args.links != 1:
        raise ValueError("The current teacher trajectory exporter is one-link only")
    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    result = export_trajectories(
        mjcf_path.read_text(),
        args.source,
        args.links,
        args.steps,
        args.force_scale,
        args.seed,
        args.limit,
        args.pose,
        args.write_result,
        args.write_trajectory,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
