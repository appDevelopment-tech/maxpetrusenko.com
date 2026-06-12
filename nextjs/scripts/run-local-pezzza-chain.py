import argparse
import importlib.util
import json
import subprocess
from pathlib import Path


SCRIPT_PATH = Path("scripts/modal-train-six-pendulum-pezzza-chain.py")
DEFAULT_OUTPUT_PATH = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-2link-local-bridge-mini.json"
)
INITIAL_POLICY_PATH = Path("app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json")
DEFAULT_RENDERER_PATH = Path("scripts/render_pezzza_chain_policy.py")
DEFAULT_RENDERER_OUTPUT_DIR = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress"
)
DEFAULT_RENDERER_PYTHON = "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11"


def load_module():
    spec = importlib.util.spec_from_file_location("pezzza_chain", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_renderer_gate(args, links: int) -> dict:
    basename = args.renderer_basename or f"{args.write_result.stem}-renderer-gate"
    command = [
        args.renderer_python,
        str(args.renderer_script),
        "--policy",
        str(args.write_result),
        "--output-dir",
        str(args.renderer_output_dir),
        "--basename",
        basename,
        "--expected-links",
        str(links),
        "--stride",
        str(args.renderer_stride),
    ]
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    rendered = json.loads(completed.stdout)
    hold_seconds = float(rendered["maxHoldSeconds"])
    rendered["passedRendererGate"] = hold_seconds >= args.renderer_min_hold_seconds
    rendered["rendererMinHoldSeconds"] = args.renderer_min_hold_seconds
    if not rendered["passedRendererGate"]:
        raise SystemExit(
            json.dumps(
                {
                    "error": "renderer_gate_failed",
                    "policy": str(args.write_result),
                    "rendererHoldSeconds": hold_seconds,
                    "rendererMinHoldSeconds": args.renderer_min_hold_seconds,
                    "rendererResult": str(args.renderer_output_dir / f"{basename}.json"),
                    "video": rendered.get("video"),
                },
                indent=2,
            )
        )
    return rendered


def main():
    parser = argparse.ArgumentParser(description="Run the Pezzza-style chain trainer locally without Modal.")
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--initial-policy", type=Path, default=INITIAL_POLICY_PATH)
    parser.add_argument("--seed", type=int, default=426410)
    parser.add_argument("--links", type=int, default=2)
    parser.add_argument("--control-hz", type=int, default=60)
    parser.add_argument("--population", type=int, default=256)
    parser.add_argument("--generations", type=int, default=4)
    parser.add_argument("--action-scale", type=float, default=42.0)
    parser.add_argument("--cart-center-spring", type=float, default=0.35)
    parser.add_argument("--include-disturbance-training", action="store_true")
    parser.add_argument("--policy-clock-seconds", type=float, default=0.0)
    parser.add_argument("--preserve-feedback-time", action="store_true")
    parser.add_argument("--remote", action="store_true", help="Run the Modal function remotely instead of locally.")
    parser.add_argument("--no-smoke", action="store_true")
    parser.add_argument("--renderer-gate", action="store_true", help="Require scalar renderer proof after exporting the policy.")
    parser.add_argument("--renderer-script", type=Path, default=DEFAULT_RENDERER_PATH)
    parser.add_argument("--renderer-output-dir", type=Path, default=DEFAULT_RENDERER_OUTPUT_DIR)
    parser.add_argument("--renderer-basename", default="")
    parser.add_argument("--renderer-python", default=DEFAULT_RENDERER_PYTHON)
    parser.add_argument("--renderer-stride", type=int, default=2)
    parser.add_argument("--renderer-min-hold-seconds", type=float, default=1.0)
    args = parser.parse_args()

    module = load_module()
    runner = module.train_policy.remote if args.remote else module.train_policy.local
    result = runner(
        not args.no_smoke,
        args.seed,
        args.links,
        args.control_hz,
        args.population,
        args.generations,
        args.initial_policy.read_text(),
        args.action_scale,
        args.cart_center_spring,
        args.include_disturbance_training,
        args.policy_clock_seconds,
        args.preserve_feedback_time,
    )
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(result)
    root = json.loads(result)
    summary = {
        "path": str(args.write_result),
        "algorithm": root["algorithm"],
        "device": root["training"]["device"],
        "gpu": root["training"]["gpu"],
        "elapsedSeconds": root["training"]["elapsedSeconds"],
        "validation": root["training"]["validation"],
    }
    if args.renderer_gate:
        summary["rendererGate"] = run_renderer_gate(args, int(root["links"]))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
