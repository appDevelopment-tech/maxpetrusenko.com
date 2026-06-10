#!/usr/bin/env python3
import argparse
import json
import time
from pathlib import Path

import modal


app = modal.App("six-pendulum-pufferppo-mjwarp-train")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "mujoco-warp==3.9.0.1",
    "numpy==2.2.6",
    "pufferlib==3.0.0",
    "torch==2.7.1",
)


DEFAULT_OUTPUT = Path(
    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-pufferppo-contract.json"
)


def one_link_sweep_rows() -> list[dict]:
    rows = []
    for nworld in (4096, 8192):
        for rollout_steps in (256, 512):
            for force_scale in (120, 240):
                rows.append(
                    {
                        "experimentId": f"pufferppo-1link-n{nworld}-r{rollout_steps}-f{force_scale}",
                        "links": 1,
                        "nworld": nworld,
                        "rolloutSteps": rollout_steps,
                        "bpttHorizon": min(256, rollout_steps),
                        "forceScale": force_scale,
                        "learningRate": 0.00025,
                        "entropyCoef": 0.01,
                        "clipCoef": 0.2,
                        "policyParamsTarget": 1_000_000,
                        "randomizedEpisodeLength": False,
                        "promotionGate": "held-out down-start learned policy holds upright >= 1.0s",
                    }
                )
    return rows


def build_puffer_train_config(row: dict, total_timesteps: int) -> dict:
    batch_size = int(row["nworld"]) * int(row["bpttHorizon"])
    return {
        "seed": 426210,
        "torch_deterministic": False,
        "device": "cuda",
        "cpu_offload": False,
        "batch_size": batch_size,
        "bptt_horizon": int(row["bpttHorizon"]),
        "minibatch_size": min(batch_size, 262144),
        "max_minibatch_size": 65536,
        "total_timesteps": int(total_timesteps),
        "learning_rate": float(row["learningRate"]),
        "anneal_lr": True,
        "gamma": 0.995,
        "gae_lambda": 0.95,
        "update_epochs": 2,
        "clip_coef": float(row["clipCoef"]),
        "vf_clip_coef": 0.2,
        "ent_coef": float(row["entropyCoef"]),
        "vf_coef": 0.5,
        "max_grad_norm": 0.5,
        "use_rnn": True,
        "compile": False,
        "compile_mode": "default",
        "compile_fullgraph": False,
        "optimizer": "adam",
        "adam_beta1": 0.9,
        "adam_beta2": 0.999,
        "adam_eps": 1e-5,
        "precision": "float32",
        "prio_alpha": 0.7,
        "prio_beta0": 0.2,
        "vtrace_rho_clip": 1.0,
        "vtrace_c_clip": 1.0,
        "checkpoint_interval": 10,
        "env": "six-pendulum-mjwarp",
        "tag": row["experimentId"],
    }


def build_contract(total_timesteps: int = 10_000_000) -> dict:
    rows = one_link_sweep_rows()
    representative = rows[-1]
    return {
        "schema": "six-pendulum-pufferppo-mjwarp-contract-v1",
        "status": "pufferppo-contract-ready-score-kernel-parity-env-integration-missing",
        "createdAtUnix": time.time(),
        "algorithm": "PufferPPO",
        "policyFamily": "PufferNet/MinGRU target, local smoke uses PufferLib Default+RNN API until PufferNet is wired",
        "sourceThreadClaims": {
            "pufferPPO": True,
            "pufferMinGRU": True,
            "policyParamsApprox": 1_000_000,
            "mujocoWarp": True,
            "apicCudaGraphCapture": True,
            "reportedExperiments": 3600,
            "reportedFastConfigSps": 18_000_000,
            "randomizedEpisodeLengthOnlyAfterWhip": True,
        },
        "hardGates": {
            "startLinks": 1,
            "learnedPolicyOnly": True,
            "strictHoldSeconds": 1.0,
            "teacherDoesNotCount": True,
            "linkTwoLockedUntilOneLinkPasses": True,
            "randomizedEpisodeLengthLockedUntilWhipExists": True,
        },
        "sweepRows": rows,
        "representativePufferTrainConfig": build_puffer_train_config(representative, total_timesteps),
        "gpuKernelProgress": {
            "firstParityGate": "scripts/six_pendulum_mjwarp_gpu_kernels.py",
            "command": "npm run train:six-pendulum:puffer-mjwarp:gpu-score-smoke",
            "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-gpu-score-kernel-smoke.json",
            "covered": "One-link observation, reward, potential, strict score, catch basin, near-top-fast, and whip flags match the existing NumPy scorer.",
            "notCovered": "Reset, ctrl writes, terminal/truncation, held-step accumulation, potential-delta reward, multi-link cumsum, and Puffer rollout integration.",
        },
        "gpuKernelBlocker": {
            "currentEnv": "scripts/six_pendulum_mjwarp_env.py",
            "problem": "Current env calls d.qpos.numpy(), d.qvel.numpy(), d.ctrl.assign(numpy), and wp.synchronize() in step/reset/reward paths.",
            "whyItBlocksYacineSpeed": "Those CPU transfers and synchronizations defeat MJWarp batched GPU throughput and cannot reach wallclock-first PufferPPO speed.",
            "requiredBeforeRealSweep": [
                "Move reset sampling into Warp arrays or a fixed GPU-side reset kernel.",
                "Move action scaling and ctrl writes into GPU-side arrays.",
                "Move observation, reward, terminal, truncation, held-step, strict-score, whip, and catch-basin math into Warp kernels.",
                "Keep fixed shapes for nworld, obs_dim, action_dim, and rollout horizon so CUDA graph capture is possible.",
                "Only then attach pufferlib.pufferl.PuffeRL to the vector env and run 4096+ worlds.",
            ],
        },
        "nextCommands": [
            "npm run train:six-pendulum:puffer-mjwarp:pufferppo-contract",
            "doppler run --project api_keys --config dev -- modal run --write-result /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-pufferppo-runtime.json scripts/modal-train-six-pendulum-pufferppo-mjwarp.py::inspect_pufferppo_runtime",
        ],
    }


@app.function(image=image, gpu="L4", timeout=1800)
def inspect_pufferppo_runtime(total_timesteps: int = 10_000_000) -> str:
    import pufferlib
    import pufferlib.models
    import pufferlib.pufferl
    import pufferlib.sweep
    import torch
    import warp as wp
    import mujoco_warp as mjw

    contract = build_contract(total_timesteps)
    contract["status"] = "pufferppo-runtime-inspected-score-kernel-parity-env-integration-missing"
    contract["runtime"] = {
        "torch": getattr(torch, "__version__", "unknown"),
        "torchCudaAvailable": bool(torch.cuda.is_available()),
        "torchCudaDeviceCount": int(torch.cuda.device_count()),
        "pufferlib": getattr(pufferlib, "__version__", "unknown"),
        "mujocoWarp": getattr(mjw, "__version__", "unknown"),
        "warp": getattr(wp, "__version__", "unknown"),
        "devices": [str(device) for device in wp.get_devices()],
        "pufferPpoClass": f"{pufferlib.pufferl.PuffeRL.__module__}.{pufferlib.pufferl.PuffeRL.__name__}",
        "defaultPolicyClass": f"{pufferlib.models.Default.__module__}.{pufferlib.models.Default.__name__}",
        "sweepClass": f"{pufferlib.sweep.Protein.__module__}.{pufferlib.sweep.Protein.__name__}",
    }
    return json.dumps(contract, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Create or inspect the real six-pendulum PufferPPO/MJWarp training contract.")
    parser.add_argument("--total-timesteps", type=int, default=10_000_000)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--modal-runtime", action="store_true")
    args = parser.parse_args()

    if args.modal_runtime:
        result = json.loads(inspect_pufferppo_runtime.remote(args.total_timesteps))
    else:
        result = build_contract(args.total_timesteps)

    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
