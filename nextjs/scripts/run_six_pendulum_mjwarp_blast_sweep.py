#!/usr/bin/env python3
import argparse
import json
import time
from dataclasses import dataclass, asdict
from pathlib import Path

from train_six_pendulum_mjwarp_device_ppo import train_device_ppo


OUTPUT_DIR = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints"
)
SWEEP_DIR = Path("/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps")
RECENTER_CHECKPOINT = OUTPUT_DIR / "puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt"
STOCHASTIC_CHECKPOINT = OUTPUT_DIR / "puffer-mjwarp-device-ppo-link1-stochastic-candidate-f160-20260610.pt"
TEACHER_TRAJECTORY = OUTPUT_DIR / "puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.npz"
TEACHER_SOURCE = OUTPUT_DIR / "puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.json"


@dataclass(frozen=True)
class SweepVariant:
    name: str
    checkpoint: Path | None
    seed: int
    nworld: int = 8
    rollout_steps: int = 768
    eval_steps: int = 1200
    updates: int = 1
    update_epochs: int = 1
    force_scale: float = 160.0
    hidden_dim: int = 128
    learning_rate: float = 3e-5
    entropy_coef: float = 0.02
    clip_coef: float = 0.05
    gamma: float = 0.995
    gae_lambda: float = 0.95
    eval_stochastic_passes: int = 3
    elite_rollout_bc_epochs: int = 0
    elite_rollout_bc_fallback_min_held_seconds: float = 0.0
    elite_rollout_bc_top_k: int = 2
    elite_rollout_bc_window_mode: str = "full"
    elite_rollout_bc_window_padding_steps: int = 0
    elite_rollout_bc_catch_angle: float = 0.55
    elite_rollout_bc_catch_speed: float = 3.2
    bc_trajectory_epochs: int = 0
    bc_parameterized_teacher_epochs: int = 0
    bc_parameterized_teacher_dagger_iterations: int = 1


def score_result(result: dict) -> tuple[float, float, float, float]:
    down = result.get("bestDownEvaluation") or {}
    stochastic = result.get("bestStochasticDownEvaluation") or {}
    hold = result.get("bestHoldEvaluation") or {}
    return (
        float(down.get("maxHeldSeconds") or 0.0),
        float(stochastic.get("maxHeldSeconds") or 0.0),
        float(down.get("maxStrictScore") or 0.0),
        float(hold.get("maxHeldSeconds") or 0.0),
    )


def escape_xml(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def variant_payload(variant: SweepVariant) -> dict:
    payload = asdict(variant)
    if payload.get("checkpoint") is not None:
        payload["checkpoint"] = str(payload["checkpoint"])
    return payload


def write_svg(rows: list[dict], path: Path) -> None:
    width = 960
    height = 520
    margin_left = 72
    margin_right = 28
    margin_top = 36
    margin_bottom = 96
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom
    max_wall = max([row["wallclockSeconds"] for row in rows] + [1.0])
    max_score = max([row["selectionScore"] for row in rows] + [1.0])

    def x_pos(wallclock: float) -> float:
        return margin_left + (wallclock / max_wall) * plot_width

    def y_pos(score: float) -> float:
        return margin_top + plot_height - (score / max_score) * plot_height

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#f7f4ed"/>',
        f'<line x1="{margin_left}" y1="{margin_top + plot_height}" x2="{width - margin_right}" y2="{margin_top + plot_height}" stroke="#1f2933" stroke-width="1"/>',
        f'<line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_height}" stroke="#1f2933" stroke-width="1"/>',
        f'<text x="{margin_left}" y="24" font-family="Menlo, monospace" font-size="14" fill="#1f2933">MJWarp learned-policy blast sweep: x=wallclock, y=selection score</text>',
        f'<text x="{margin_left}" y="{height - 26}" font-family="Menlo, monospace" font-size="12" fill="#1f2933">selection score = 1000*downHold + 100*stochasticDownHold + strictScore</text>',
        f'<text x="14" y="{margin_top + 18}" font-family="Menlo, monospace" font-size="11" fill="#1f2933" transform="rotate(-90 14 {margin_top + 18})">score</text>',
        f'<text x="{width - 210}" y="{height - 48}" font-family="Menlo, monospace" font-size="11" fill="#1f2933">wallclock seconds</text>',
    ]
    for row in rows:
        x = x_pos(row["wallclockSeconds"])
        y = y_pos(row["selectionScore"])
        solved = row["downHeldSeconds"] >= 1.0
        fill = "#0f766e" if solved else "#b45309" if row["stochasticDownHeldSeconds"] > 0.0 else "#7f1d1d"
        radius = 8 if solved else 6
        label = escape_xml(row["name"])
        lines.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius}" fill="{fill}" opacity="0.88"/>')
        lines.append(f'<text x="{x + 8:.1f}" y="{y - 8:.1f}" font-family="Menlo, monospace" font-size="10" fill="#1f2933">{label}</text>')
    lines.append("</svg>")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n")


def variant_result_row(variant: SweepVariant, artifact: Path, result: dict) -> dict:
    down = result.get("bestDownEvaluation") or {}
    stochastic = result.get("bestStochasticDownEvaluation") or {}
    hold = result.get("bestHoldEvaluation") or {}
    down_held = float(down.get("maxHeldSeconds") or 0.0)
    stochastic_held = float(stochastic.get("maxHeldSeconds") or 0.0)
    strict_score = float(down.get("maxStrictScore") or 0.0)
    selection_score = down_held * 1000.0 + stochastic_held * 100.0 + strict_score
    return {
        "name": variant.name,
        "artifact": str(artifact),
        "checkpoint": str(variant.checkpoint) if variant.checkpoint else None,
        "seed": int(variant.seed),
        "wallclockSeconds": float(result.get("elapsedSeconds") or 0.0),
        "selectionScore": float(selection_score),
        "downHeldSeconds": down_held,
        "downStrictScore": strict_score,
        "downSolvedOneSecond": bool(down.get("solvedOneSecond")),
        "stochasticDownHeldSeconds": stochastic_held,
        "stochasticDownSolvedPasses": int(stochastic.get("solvedPasses") or 0),
        "stochasticDownPasses": int(stochastic.get("passes") or 0),
        "holdHeldSeconds": float(hold.get("maxHeldSeconds") or 0.0),
        "holdSolvedOneSecond": bool(hold.get("solvedOneSecond")),
        "promoteToNextLink": bool((result.get("gates") or {}).get("promoteToNextLink")),
        "params": variant_payload(variant),
    }


def build_variants(limit: int) -> list[SweepVariant]:
    variants = [
        SweepVariant(
            name="recenter-low-lr",
            checkpoint=RECENTER_CHECKPOINT,
            seed=620101,
            learning_rate=1e-5,
            entropy_coef=0.035,
            clip_coef=0.03,
            update_epochs=2,
        ),
        SweepVariant(
            name="recenter-mid-entropy",
            checkpoint=RECENTER_CHECKPOINT,
            seed=620102,
            learning_rate=2e-5,
            entropy_coef=0.045,
            clip_coef=0.05,
            update_epochs=1,
        ),
        SweepVariant(
            name="recenter-elite-fallback",
            checkpoint=RECENTER_CHECKPOINT,
            seed=620103,
            learning_rate=2e-5,
            entropy_coef=0.03,
            clip_coef=0.04,
            elite_rollout_bc_epochs=25,
            elite_rollout_bc_fallback_min_held_seconds=0.02,
            elite_rollout_bc_top_k=3,
        ),
        SweepVariant(
            name="stochastic-candidate-low-lr",
            checkpoint=STOCHASTIC_CHECKPOINT,
            seed=620104,
            learning_rate=1e-5,
            entropy_coef=0.04,
            clip_coef=0.03,
            update_epochs=2,
        ),
        SweepVariant(
            name="stochastic-candidate-elite",
            checkpoint=STOCHASTIC_CHECKPOINT,
            seed=620105,
            learning_rate=2e-5,
            entropy_coef=0.035,
            clip_coef=0.04,
            elite_rollout_bc_epochs=25,
            elite_rollout_bc_fallback_min_held_seconds=0.02,
            elite_rollout_bc_top_k=3,
        ),
        SweepVariant(
            name="stochastic-catch-window",
            checkpoint=STOCHASTIC_CHECKPOINT,
            seed=620107,
            learning_rate=1e-5,
            entropy_coef=0.045,
            clip_coef=0.03,
            update_epochs=2,
            elite_rollout_bc_epochs=40,
            elite_rollout_bc_fallback_min_held_seconds=0.01,
            elite_rollout_bc_top_k=4,
            elite_rollout_bc_window_mode="catch",
            elite_rollout_bc_window_padding_steps=18,
            elite_rollout_bc_catch_angle=0.62,
            elite_rollout_bc_catch_speed=3.6,
        ),
        SweepVariant(
            name="stochastic-neartop-window",
            checkpoint=STOCHASTIC_CHECKPOINT,
            seed=620108,
            learning_rate=1e-5,
            entropy_coef=0.035,
            clip_coef=0.03,
            update_epochs=2,
            elite_rollout_bc_epochs=35,
            elite_rollout_bc_fallback_min_held_seconds=0.01,
            elite_rollout_bc_top_k=4,
            elite_rollout_bc_window_mode="near-top",
            elite_rollout_bc_window_padding_steps=12,
        ),
        SweepVariant(
            name="teacher-static-no-learner-dagger",
            checkpoint=None,
            seed=620106,
            learning_rate=3e-5,
            entropy_coef=0.02,
            clip_coef=0.05,
            eval_steps=1600,
            bc_trajectory_epochs=90,
            bc_parameterized_teacher_epochs=90,
            bc_parameterized_teacher_dagger_iterations=1,
        ),
    ]
    return variants[: max(1, int(limit))]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a local one-link MJWarp PPO blast sweep and rank dots.")
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--tag", default=time.strftime("%Y%m%d-%H%M%S"))
    parser.add_argument("--write-summary", type=Path, default=None)
    parser.add_argument("--write-svg", type=Path, default=None)
    args = parser.parse_args()

    mjcf_path = Path("app/ailab/six-pendulum-cartpole/mjcf/cartpole_1_link.xml")
    mjcf_xml = mjcf_path.read_text()
    rows = []
    started = time.time()
    for index, variant in enumerate(build_variants(args.limit), start=1):
        artifact = OUTPUT_DIR / f"puffer-mjwarp-device-ppo-link1-blast-{args.tag}-{index:02d}-{variant.name}.json"
        checkpoint = OUTPUT_DIR / f"puffer-mjwarp-device-ppo-link1-blast-{args.tag}-{index:02d}-{variant.name}.pt"
        print(json.dumps({"event": "start", "index": index, "variant": variant_payload(variant), "artifact": str(artifact)}), flush=True)
        result = train_device_ppo(
            mjcf_xml,
            1,
            variant.nworld,
            variant.rollout_steps,
            variant.eval_steps,
            variant.updates,
            variant.update_epochs,
            "down",
            variant.force_scale,
            variant.seed,
            variant.hidden_dim,
            "tiny-gru",
            1,
            artifact,
            0,
            1024,
            1e-3,
            1,
            0,
            1600,
            160,
            0,
            TEACHER_TRAJECTORY if variant.bc_trajectory_epochs > 0 else None,
            variant.bc_trajectory_epochs,
            512,
            3e-5,
            TEACHER_SOURCE if variant.bc_parameterized_teacher_epochs > 0 else None,
            variant.bc_parameterized_teacher_epochs,
            1024,
            256,
            3e-5,
            variant.bc_parameterized_teacher_dagger_iterations,
            8,
            variant.learning_rate,
            variant.entropy_coef,
            variant.clip_coef,
            variant.gamma,
            variant.gae_lambda,
            variant.eval_stochastic_passes,
            checkpoint,
            variant.checkpoint,
            False,
            variant.elite_rollout_bc_epochs,
            1.0,
            1e-4,
            variant.elite_rollout_bc_fallback_min_held_seconds,
            variant.elite_rollout_bc_top_k,
            variant.elite_rollout_bc_window_mode,
            variant.elite_rollout_bc_window_padding_steps,
            variant.elite_rollout_bc_catch_angle,
            variant.elite_rollout_bc_catch_speed,
            False,
            160,
            512,
            0.0,
        )
        artifact.write_text(json.dumps(result, indent=2) + "\n")
        row = variant_result_row(variant, artifact, result)
        rows.append(row)
        print(json.dumps({"event": "finish", "row": row}, sort_keys=True), flush=True)
    ranked = sorted(
        rows,
        key=lambda row: (
            row["downHeldSeconds"],
            row["stochasticDownHeldSeconds"],
            row["downStrictScore"],
            row["holdHeldSeconds"],
        ),
        reverse=True,
    )
    summary = {
        "schema": "six-pendulum-mjwarp-blast-sweep-v1",
        "status": "finished",
        "tag": args.tag,
        "elapsedSeconds": time.time() - started,
        "variants": len(rows),
        "best": ranked[0] if ranked else None,
        "ranked": ranked,
        "gates": {
            "learnedPolicyOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "promoteToNextLink": bool(ranked and ranked[0]["downHeldSeconds"] >= 1.0),
        },
    }
    summary_path = args.write_summary or (SWEEP_DIR / f"puffer-mjwarp-blast-sweep-{args.tag}.json")
    svg_path = args.write_svg or (SWEEP_DIR / f"puffer-mjwarp-blast-sweep-{args.tag}.svg")
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    write_svg(ranked, svg_path)
    print(json.dumps({"event": "summary", "summary": str(summary_path), "svg": str(svg_path), "best": summary["best"]}, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
