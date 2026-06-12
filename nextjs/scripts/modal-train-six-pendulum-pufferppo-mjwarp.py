#!/usr/bin/env python3
import argparse
import base64
import tempfile
import json
import time
from pathlib import Path

import modal


app = modal.App("six-pendulum-pufferppo-mjwarp-train")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "mujoco-warp==3.9.0.1",
    "numpy==2.2.6",
    "torch==2.7.1",
).add_local_file(
    "scripts/train_six_pendulum_mjwarp_device_ppo.py",
    "/root/train_six_pendulum_mjwarp_device_ppo.py",
).add_local_file(
    "scripts/six_pendulum_mjwarp_device_rollout.py",
    "/root/six_pendulum_mjwarp_device_rollout.py",
).add_local_file(
    "scripts/six_pendulum_mjwarp_gpu_kernels.py",
    "/root/six_pendulum_mjwarp_gpu_kernels.py",
).add_local_file(
    "scripts/run_six_pendulum_mjwarp_replay_ver_bc.py",
    "/root/run_six_pendulum_mjwarp_replay_ver_bc.py",
).add_local_file(
    "scripts/run_six_pendulum_mjwarp_filtered_bc.py",
    "/root/run_six_pendulum_mjwarp_filtered_bc.py",
).add_local_file(
    "scripts/run_six_pendulum_mjwarp_success_buffer_collect.py",
    "/root/run_six_pendulum_mjwarp_success_buffer_collect.py",
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
        "status": "pufferppo-contract-ready-local-mingru-smoke-gpu-puffer-integration-missing",
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
            "covered": "Links 1..6 observation, reward, potential, strict score, multi-link cumsum, bend penalties, catch basin, near-top-fast, whip flags, and cart terminal match the existing NumPy scorer.",
            "envIntegration": "SixPendulumMJWarpPufferEnv now uses Warp kernels for reset sampling/writes, action scaling, ctrl writes, score/reward/observation, cart terminal, truncation, held/max-held accumulation, and potential-delta reward; env-driver artifacts report resetBackend=warp-reset-kernel, scoreBackend=warp-score-kernel, and rolloutBackend=warp-post-step-kernel.",
            "deviceRollout": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout.json",
                "covered": "MJWarp loop can run reset/action/score/post-step kernels without per-step CPU metric reads; only summary arrays are copied after final synchronize.",
                "caveat": "The action source is a deterministic scripted Warp kernel for substrate proof only. It is not a learned policy and does not count toward solve.",
            },
            "rolloutBuffer": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:buffer",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-buffer.json",
                "covered": "Fixed-shape observation, reward, terminal, truncation, and action buffers are written on device each step and copied once after final synchronize.",
                "whyItMatters": "This is the trainer bridge: PufferPPO needs fixed rollout tensors, not per-step Python info dictionaries.",
            },
            "actionBuffer": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:action-buffer",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-action-buffer.json",
                "covered": "A fixed-shape external action tensor is copied before rollout and consumed by a Warp ctrl kernel each step without per-step CPU action writes.",
                "caveat": "The current tensor is deterministic and precomputed. It proves the policy-action interface only; it is not a learned policy and does not count toward solve.",
            },
            "torchPolicyBridge": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:torch-policy",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-torch-policy.json",
                "covered": "The rollout converts the current Warp observation buffer with wp.to_torch, runs a recurrent Torch actor-critic with per-world hidden state, converts normalized policy actions/logprobs/values back with wp.from_torch, records fixed-shape PPO buffers, then writes ctrl through a Warp action-vector kernel without NumPy action writes.",
                "caveat": "The local smoke policy is tiny and untrained, and local Mac execution uses Warp CPU. The next bridge is PufferPPO ownership of these buffers, minibatch update plumbing, and GPU stream/capture discipline.",
            },
            "ppoUpdateSmoke": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:ppo-update",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-ppo-update.json",
                "covered": "Three PPO epochs consume the fixed recurrent rollout buffers, recompute logprobs/values over the stored sequence, backpropagate through the recurrent actor-critic, and change parameters. The rollout buffer now records pre-action observations; the first PPO epoch reconstructs ratioMean=1.0 and ratioMax=1.0 in the smoke artifact.",
                "caveat": "This is a local CPU fixed-batch smoke update, not a PufferPPO training run and not a learned policy solve.",
            },
            "pufferMinGruPolicySmoke": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:puffer-mingru-policy",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-puffer-mingru-policy.json",
                "covered": "The Torch/Warp rollout can now run a Puffer-compatible MinGRU-style recurrent actor-critic with encode_observations, decode_actions, forward_eval, and a one-million-parameter target instead of only the tiny local GRU.",
                "caveat": "This is still a smoke update over one fixed batch on local Mac execution, not the full PufferPPO/MJWarp GPU sweep.",
            },
            "pufferMinGruPpoSmoke": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-smoke",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-smoke.json",
                "covered": "The repeated PPO trainer can now collect a stochastic rollout, update, and run deterministic down/hold evaluation with the same 1.07M-parameter MinGRU-style policy.",
                "caveat": "This is a one-update local CPU correctness smoke with short horizons. It proves training ownership of the source-thread policy scale, not a learned solve.",
            },
            "pufferMinGruHoldBcDiagnostics": {
                "flatBcCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-hold-bc-lr5e5",
                "flatBcArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-hold-bc-lr5e5.json",
                "sequenceBcCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-hold-seqbc-lr5e5",
                "sequenceBcArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-lr5e5.json",
                "longSequenceBcCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-hold-seqbc-long-lr3e5",
                "longSequenceBcArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-long-lr3e5.json",
                "downTransferCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-down-from-hold-lr3e5",
                "downTransferArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-down-from-hold-lr3e5.json",
                "covered": "Large MinGRU stabilizer warmup now has configurable BC learning rate and sequence BC. Lower LR fixes action saturation; sequence BC improves one-link hold; the longer sequence run solves held-out hold-start at 1.5075s.",
                "caveat": "Down-start transfer from the solved hold checkpoint still fails: pure down-start remains 0.0s and rail terminals dominate. Link two stays locked.",
            },
            "devicePpoTrain": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-train",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-train.json",
                "covered": "Repeated stochastic recurrent-policy collection, persistent PPO optimizer updates, and deterministic held-out down-start/hold-start evaluation after each update on the MJWarp rollout-buffer path.",
                "caveat": "Local Mac execution still uses Warp/MJWarp CPU and is a correctness path, not the final PufferPPO/MinGRU GPU sweep.",
            },
            "holdProbe": {
                "preferredCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-probe",
                "preferredArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-probe-f32.json",
                "comparisonCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-probe-f64",
                "comparisonArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-probe.json",
                "bcWarmupCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-bc-probe",
                "bcWarmupArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-bc-probe.json",
                "covered": "A three-update 2.56s-horizon hold-start probe at forceScale 32 reached held-out hold-start 0.435s with no cart terminal; the same probe at forceScale 64 reached only 0.3175s and all hold eval worlds hit cart terminal. After fixing PPO buffer observation timing and strengthening swing-up reward, a learned stabilizer BC warmup on the same recurrent device-buffer policy reached held-out hold-start 1.4425s.",
                "caveat": "BC warmup proves the policy can learn the top stabilizer, but it is curriculum progress only. Held-out down-start remains 0.0s and does not promote to link two.",
            },
            "policyReflection": {
                "consults": [
                    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/model-consults/hermes-pendulum-policy-reflection.md",
                    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/model-consults/gemini-pendulum-policy-reflection.md",
                    "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/model-consults/oracle-pendulum-policy-reflection.md",
                ],
                "diagnosis": "PPO tuple plumbing is now coherent: pre-action observations are stored with their sampled actions/logprobs, and ratio reconstruction is 1.0 on the first smoke epoch. The remaining blocker is pure down-start transfer: forceScale 120 mixed-start probes reach near-catch flashes up to 0.8825s inside curriculum rollouts, but held-out down-start remains 0.0s.",
                "nextCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-heavy-conservative",
            },
            "actionScaleDiagnostic": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:action-scale-diagnostic",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-action-scale-diagnostic.json",
                "covered": "Open-loop max-force probes from one-link down-start show forceScale 32 and 64 do not reach near-vertical in 1s; forceScale 120 reaches near-vertical at about 0.60s and 240 at about 0.335s, usually with cart-terminal risk.",
                "caveat": "This is an action-authority diagnostic, not a policy and not a solve.",
            },
            "randomHorizonSupport": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-rollout:random-horizon",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-random-horizon.json",
                "covered": "Per-world truncation horizons are sampled in the reset Warp kernel and consumed by the post-step Warp kernel without per-step host reads.",
                "trainCommand": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link1-random-horizon-recenter-f160",
                "trainArtifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-random-horizon-recenter-f160-20260611.json",
                "gate": "A train-only random-horizon continuation from the 0.8025s recenter-snap checkpoint regressed stochastic pure-down to 0.0125s. Do not enable broadly until whip/catch is reliable over the one-second solve gate.",
            },
            "catchGatedRewardDiagnostic": {
                "command": "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link1-catch-gated-recenter-f160",
                "artifact": "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-catch-gated-recenter-f160-20260611.json",
                "covered": "The reward now removes positive near-top-fast shaping and pays centered slow catch basin reward. Warp/NumPy parity passed for links 1..6.",
                "caveat": "Warmstarting the best 0.8025s stochastic checkpoint still regressed exact-down stochastic hold to 0.02s and deterministic exact down stayed 0.0s. Local PPO continuation is not preserving rare catch behavior.",
            },
            "notCovered": "True PufferLib/PufferPPO ownership of rollout minibatches, Modal GPU execution, large sweeps, and CUDA graph/APIC capture.",
        },
        "gpuKernelBlocker": {
            "currentEnv": "scripts/six_pendulum_mjwarp_env.py",
            "problem": "The standalone device-rollout smoke removes per-step CPU metric reads, but the current PufferEnv interface still returns NumPy observations/rewards/dones each step.",
            "whyItBlocksYacineSpeed": "Those remaining CPU transfers and Python-side bookkeeping still defeat MJWarp batched GPU throughput and cannot reach wallclock-first PufferPPO speed.",
            "requiredBeforeRealSweep": [
                "Replace the Python/PufferEnv CPU return interface with a Puffer-compatible rollout path that can keep tensors device-side.",
                "Keep fixed shapes for nworld, obs_dim, action_dim, and rollout horizon so CUDA graph capture is possible.",
                "Only then attach pufferlib.pufferl.PuffeRL to the vector env and run 4096+ worlds.",
            ],
        },
        "nextCommands": [
            "npm run train:six-pendulum:puffer-mjwarp:pufferppo-contract",
            "npm run train:six-pendulum:puffer-mjwarp:device-rollout:puffer-mingru-policy",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-smoke",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-hold-seqbc-lr5e5",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-hold-seqbc-long-lr3e5",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-down-from-hold-lr3e5",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link1-catch-gated-recenter-f160",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link1-random-horizon-recenter-f160",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-bc-probe",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-swingup-probe",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-swingup-conservative",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-heavy-conservative",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link2-diagnostic",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link3-diagnostic",
            "npm run train:six-pendulum:puffer-mjwarp:device-ppo-link4-diagnostic",
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


@app.function(image=image, gpu="L4", timeout=7200)
def run_device_ppo_dot(
    mjcf_xml: str,
    config: dict,
    warmstart_checkpoint_b64: str = "",
    success_replay_b64: str = "",
) -> str:
    from pathlib import Path

    from train_six_pendulum_mjwarp_device_ppo import train_device_ppo

    remote_dir = Path(tempfile.mkdtemp(prefix="six-pendulum-modal-"))
    warmstart_path = None
    if warmstart_checkpoint_b64:
        warmstart_path = remote_dir / "warmstart.pt"
        warmstart_path.write_bytes(base64.b64decode(warmstart_checkpoint_b64.encode("ascii")))
    success_replay_path = None
    if success_replay_b64:
        success_replay_path = remote_dir / "success-replay.npz"
        success_replay_path.write_bytes(base64.b64decode(success_replay_b64.encode("ascii")))
    checkpoint_path = remote_dir / "policy.pt"
    progress_path = remote_dir / "progress.json"

    print(
        json.dumps(
            {
                "phase": "modal-device-ppo-dot-start",
                "links": int(config.get("links", 1)),
                "nworld": int(config.get("nworld", 16)),
                "rolloutSteps": int(config.get("rolloutSteps", 256)),
                "evalSteps": int(config.get("evalSteps", 512)),
                "updates": int(config.get("updates", 2)),
                "rewardMode": str(config.get("rewardMode", "default")),
                "stochasticSuccessSnapshotPpoPasses": int(config.get("stochasticSuccessSnapshotPpoPasses", 0)),
                "stochasticSuccessSnapshotPpoSteps": int(config.get("stochasticSuccessSnapshotPpoSteps", 128)),
                "stochasticSuccessSequenceSilPasses": int(config.get("stochasticSuccessSequenceSilPasses", 0)),
                "stochasticSuccessSequenceSilEpochs": int(config.get("stochasticSuccessSequenceSilEpochs", 0)),
                "deterministicDaggerPasses": int(config.get("deterministicDaggerPasses", 0)),
                "deterministicDaggerEpochs": int(config.get("deterministicDaggerEpochs", 0)),
                "deterministicReplayDaggerPasses": int(config.get("deterministicReplayDaggerPasses", 0)),
                "deterministicReplayDaggerEpochs": int(config.get("deterministicReplayDaggerEpochs", 0)),
                "deterministicReplayDaggerMinStepSeparation": int(
                    config.get("deterministicReplayDaggerMinStepSeparation", 12)
                ),
                "deterministicReplayDaggerMaxCartAbs": float(config.get("deterministicReplayDaggerMaxCartAbs", 1.95)),
                "deterministicReplayDaggerLabelMode": str(
                    config.get("deterministicReplayDaggerLabelMode", "nearest-action")
                ),
                "deterministicReplayDaggerSuffixSteps": int(config.get("deterministicReplayDaggerSuffixSteps", 24)),
                "deterministicReplayDaggerUseReplayHidden": bool(
                    config.get("deterministicReplayDaggerUseReplayHidden", False)
                ),
                "successReplayEnabled": bool(success_replay_path is not None),
                "successReplayEpochs": int(config.get("successReplayEpochs", 0)),
            },
            sort_keys=True,
        ),
        flush=True,
    )
    result = train_device_ppo(
        mjcf_xml,
        int(config.get("links", 1)),
        int(config.get("nworld", 16)),
        int(config.get("rolloutSteps", 256)),
        int(config.get("evalSteps", 512)),
        int(config.get("updates", 2)),
        int(config.get("updateEpochs", 1)),
        str(config.get("pose", "down")),
        float(config.get("forceScale", 160.0)),
        int(config.get("seed", 426210)),
        int(config.get("hiddenDim", 128)),
        str(config.get("policyKind", "tiny-gru")),
        int(config.get("evalInterval", 1)),
        progress_path,
        int(config.get("bcStabilizerEpochs", 0)),
        int(config.get("bcStabilizerSteps", 1024)),
        float(config.get("bcStabilizerLearningRate", 1e-3)),
        int(config.get("bcStabilizerSequenceLength", 1)),
        int(config.get("bcEnergyTeacherEpochs", 0)),
        int(config.get("bcEnergyTeacherSteps", 1600)),
        int(config.get("bcEnergyTeacherSequenceLength", 160)),
        int(config.get("bcEnergyTeacherDaggerIterations", 0)),
        None,
        0,
        512,
        3e-5,
        None,
        0,
        1024,
        256,
        3e-5,
        1,
        8,
        float(config.get("learningRate", 3e-4)),
        float(config.get("entropyCoef", 0.01)),
        float(config.get("clipCoef", 0.2)),
        float(config.get("gamma", 0.995)),
        float(config.get("gaeLambda", 0.95)),
        int(config.get("evalStochasticPasses", 0)),
        checkpoint_path,
        warmstart_path,
        bool(config.get("allowWarmstartForceScaleMismatch", False)),
        int(config.get("eliteRolloutBcEpochs", 0)),
        float(config.get("eliteRolloutBcMinHeldSeconds", 1.0)),
        float(config.get("eliteRolloutBcLearningRate", 1e-4)),
        float(config.get("eliteRolloutBcFallbackMinHeldSeconds", 0.25)),
        int(config.get("eliteRolloutBcTopK", 2)),
        str(config.get("eliteRolloutBcWindowMode", "full")),
        int(config.get("eliteRolloutBcWindowPaddingSteps", 0)),
        float(config.get("eliteRolloutBcCatchAngle", 0.55)),
        float(config.get("eliteRolloutBcCatchSpeed", 3.2)),
        str(config.get("eliteRolloutBcObjective", "mse")),
        float(config.get("eliteRolloutBcWeightPower", 1.0)),
        int(config.get("stochasticSuccessBcPasses", 0)),
        int(config.get("stochasticSuccessBcEpochs", 0)),
        float(config.get("stochasticSuccessBcMinHeldSeconds", 1.0)),
        float(config.get("stochasticSuccessBcFallbackMinHeldSeconds", 0.8)),
        float(config.get("stochasticSuccessBcLearningRate", 1e-5)),
        int(config.get("stochasticSuccessBcTopK", 4)),
        str(config.get("stochasticSuccessBcWindowMode", "near-top")),
        int(config.get("stochasticSuccessBcWindowPaddingSteps", 24)),
        float(config.get("stochasticSuccessBcCatchAngle", 0.72)),
        float(config.get("stochasticSuccessBcCatchSpeed", 4.0)),
        str(config.get("stochasticSuccessBcObjective", "mse")),
        float(config.get("stochasticSuccessBcWeightPower", 1.0)),
        int(config.get("stochasticSuccessSnapshotPpoPasses", 0)),
        int(config.get("stochasticSuccessSnapshotPpoSteps", 128)),
        int(config.get("stochasticSuccessSnapshotPpoEpochs", 0)),
        float(config.get("stochasticSuccessSnapshotPpoLearningRate", 3e-5)),
        float(config.get("stochasticSuccessSnapshotPpoMinHeldSeconds", 1.0)),
        float(config.get("stochasticSuccessSnapshotPpoFallbackMinHeldSeconds", 0.5)),
        int(config.get("stochasticSuccessSnapshotPpoTopKWorlds", 4)),
        str(config.get("stochasticSuccessSnapshotPpoOffsets", "0,80,160,320")),
        int(config.get("stochasticSuccessSnapshotPpoMaxSnapshots", 16)),
        float(config.get("stochasticSuccessSnapshotPpoCatchAngle", 0.72)),
        float(config.get("stochasticSuccessSnapshotPpoCatchSpeed", 4.0)),
        int(config.get("stochasticSuccessSequenceSilPasses", 0)),
        int(config.get("stochasticSuccessSequenceSilEpochs", 0)),
        float(config.get("stochasticSuccessSequenceSilFallbackMinHeldSeconds", 0.8)),
        float(config.get("stochasticSuccessSequenceSilLearningRate", 3e-5)),
        int(config.get("stochasticSuccessSequenceSilTopKWorlds", 4)),
        int(config.get("stochasticSuccessSequenceSilBurnInSteps", 80)),
        float(config.get("stochasticSuccessSequenceSilBeta", 4.0)),
        float(config.get("stochasticSuccessSequenceSilMaxWeight", 12.0)),
        float(config.get("stochasticSuccessSequenceSilValueCoef", 0.1)),
        int(config.get("deterministicDaggerPasses", 0)),
        int(config.get("deterministicDaggerEpochs", 0)),
        int(config.get("deterministicDaggerContinuations", 4)),
        int(config.get("deterministicDaggerContinuationSteps", 192)),
        float(config.get("deterministicDaggerLearningRate", 3e-5)),
        int(config.get("deterministicDaggerMaxSnapshots", 12)),
        float(config.get("deterministicDaggerMinTeacherStrictScore", 70.0)),
        float(config.get("deterministicDaggerCatchAngle", 0.55)),
        float(config.get("deterministicDaggerCatchSpeed", 3.2)),
        float(config.get("deterministicDaggerGradClip", 0.5)),
        int(config.get("deterministicReplayDaggerPasses", 0)),
        int(config.get("deterministicReplayDaggerEpochs", 0)),
        float(config.get("deterministicReplayDaggerLearningRate", 3e-5)),
        int(config.get("deterministicReplayDaggerMaxSnapshots", 16)),
        int(config.get("deterministicReplayDaggerMaxCandidates", 4096)),
        int(config.get("deterministicReplayDaggerFutureActionOffset", 0)),
        float(config.get("deterministicReplayDaggerCatchAngle", 0.55)),
        float(config.get("deterministicReplayDaggerCatchSpeed", 3.2)),
        int(config.get("deterministicReplayDaggerMinStepSeparation", 12)),
        int(config.get("deterministicReplayDaggerMaxPerWorld", 4)),
        float(config.get("deterministicReplayDaggerDedupeEps", 1e-4)),
        float(config.get("deterministicReplayDaggerMaxCartAbs", 1.95)),
        str(config.get("deterministicReplayDaggerLabelMode", "nearest-action")),
        int(config.get("deterministicReplayDaggerSuffixSteps", 24)),
        bool(config.get("deterministicReplayDaggerUseReplayHidden", False)),
        float(config.get("deterministicReplayDaggerSequenceMseCoef", 1.0)),
        float(config.get("deterministicReplayDaggerSequenceNllCoef", 0.2)),
        float(config.get("deterministicReplayDaggerSequenceEntropyCoef", 0.0)),
        float(config.get("deterministicReplayDaggerGradClip", 0.5)),
        bool(config.get("randomHorizon", False)),
        int(config.get("minHorizon", 160)),
        int(config.get("maxHorizon", 512)),
        float(config.get("energyTeacherAnchorWeight", 0.0)),
        float(config.get("terminalBoundary", 2.35)),
        str(config.get("rewardMode", "default")),
        success_replay_path,
        int(config.get("successReplayEpochs", 0)),
        float(config.get("successReplayLearningRate", 1e-6)),
        float(config.get("successReplayMinSourceHeldSeconds", 1.0)),
        int(config.get("successReplayBurnInSteps", 160)),
        float(config.get("successReplayBeta", 3.0)),
        float(config.get("successReplayMaxWeight", 8.0)),
        float(config.get("successReplayEntropyCoef", 0.0005)),
        float(config.get("successReplayMseCoef", 0.25)),
        float(config.get("successReplayNllCoef", 1.0)),
        int(config.get("successReplayActionSmoothingRadius", 6)),
        float(config.get("successReplayGradClip", 0.5)),
        config.get("policyLogStdTarget"),
        bool(config.get("freezePolicyLogStd", False)),
    )
    payload = {
        "schema": "six-pendulum-modal-device-ppo-dot-result-v1",
        "status": "finished",
        "config": config,
        "result": result,
        "checkpointB64": base64.b64encode(checkpoint_path.read_bytes()).decode("ascii") if checkpoint_path.exists() else "",
        "sequenceReplayB64": base64.b64encode(progress_path.with_suffix(f".sequence-replay-update-{int(config.get('updates', 2))}.npz").read_bytes()).decode("ascii")
        if progress_path.with_suffix(f".sequence-replay-update-{int(config.get('updates', 2))}.npz").exists()
        else "",
        "progress": json.loads(progress_path.read_text()) if progress_path.exists() else None,
    }
    return json.dumps(payload)


@app.function(image=image, gpu="L4", timeout=5400)
def run_success_buffer_collect_dot(mjcf_xml: str, config: dict, warmstart_checkpoint_b64: str) -> str:
    from argparse import Namespace
    from pathlib import Path

    from run_six_pendulum_mjwarp_success_buffer_collect import run_success_buffer_collect

    remote_dir = Path(tempfile.mkdtemp(prefix="six-pendulum-success-buffer-"))
    warmstart_path = remote_dir / "warmstart.pt"
    warmstart_path.write_bytes(base64.b64decode(warmstart_checkpoint_b64.encode("ascii")))
    result_path = remote_dir / "success-buffer.json"
    replay_path = remote_dir / "success-buffer.npz"
    args = Namespace(
        links=int(config.get("links", 1)),
        nworld=int(config.get("nworld", 2048)),
        probe_nworld=int(config.get("probeNworld", 32)),
        passes=int(config.get("passes", 12)),
        eval_steps=int(config.get("evalSteps", 1600)),
        force_scale=float(config.get("forceScale", 160.0)),
        policy_hidden_dim=int(config.get("policyHiddenDim", 0)),
        seed=int(config.get("seed", 621900)),
        warmstart_checkpoint=warmstart_path,
        pose="exact-down",
        min_held_seconds=float(config.get("minHeldSeconds", 1.0)),
        top_k_per_pass=int(config.get("topKPerPass", 8)),
        random_horizon=bool(config.get("randomHorizon", False)),
        min_horizon=int(config.get("minHorizon", 160)),
        max_horizon=int(config.get("maxHorizon", 768)),
        terminal_boundary=float(config.get("terminalBoundary", 3.0)),
        reward_mode=str(config.get("rewardMode", "default")),
        include_eval=bool(config.get("includeEval", False)),
        eval_stochastic_passes=int(config.get("evalStochasticPasses", 4)),
        write_result=result_path,
        write_replay=replay_path,
    )
    print(
        json.dumps(
            {
                "phase": "modal-success-buffer-collect-start",
                "links": args.links,
                "nworld": args.nworld,
                "passes": args.passes,
                "evalSteps": args.eval_steps,
                "minHeldSeconds": args.min_held_seconds,
                "terminalBoundary": args.terminal_boundary,
            },
            sort_keys=True,
        ),
        flush=True,
    )
    result = run_success_buffer_collect(mjcf_xml, args)
    payload = {
        "schema": "six-pendulum-modal-success-buffer-collect-result-v1",
        "status": "finished",
        "config": config,
        "result": result,
        "replayB64": base64.b64encode(replay_path.read_bytes()).decode("ascii") if replay_path.exists() else "",
    }
    return json.dumps(payload)


def default_modal_dot_config(smoke: bool) -> dict:
    if smoke:
        return {
            "links": 1,
            "nworld": 4,
            "rolloutSteps": 64,
            "evalSteps": 160,
            "updates": 1,
            "updateEpochs": 1,
            "pose": "down",
            "forceScale": 160.0,
            "seed": 426210,
            "hiddenDim": 128,
            "policyKind": "tiny-gru",
            "learningRate": 3e-5,
            "entropyCoef": 0.02,
            "clipCoef": 0.05,
            "evalStochasticPasses": 1,
        }
    return {
        "links": 1,
        "nworld": 64,
        "rolloutSteps": 512,
        "evalSteps": 1200,
        "updates": 3,
        "updateEpochs": 2,
        "pose": "down",
        "forceScale": 160.0,
        "seed": 426510,
        "hiddenDim": 128,
        "policyKind": "tiny-gru",
        "learningRate": 1e-5,
        "entropyCoef": 0.04,
        "clipCoef": 0.03,
        "evalStochasticPasses": 4,
        "eliteRolloutBcEpochs": 0,
    }


def write_modal_dot_payload(payload: dict, write_result: Path, write_checkpoint: Path | None) -> dict:
    result = payload["result"]
    write_result.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_b64 = payload.get("checkpointB64") or ""
    checkpoint_written = False
    if checkpoint_b64 and write_checkpoint is not None:
        write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        write_checkpoint.write_bytes(base64.b64decode(checkpoint_b64.encode("ascii")))
        checkpoint_written = True
        result.setdefault("modalCheckpoint", {})["localPath"] = str(write_checkpoint)
    sequence_replay_b64 = payload.get("sequenceReplayB64") or ""
    sequence_replay_path = None
    if sequence_replay_b64:
        sequence_replay_path = write_result.with_suffix(".sequence-replay.npz")
        sequence_replay_path.write_bytes(base64.b64decode(sequence_replay_b64.encode("ascii")))
        result.setdefault("modalSequenceReplay", {})["localPath"] = str(sequence_replay_path)
    write_result.parent.mkdir(parents=True, exist_ok=True)
    write_result.write_text(json.dumps(result, indent=2) + "\n")
    meta_path = write_result.with_suffix(".modal-payload.json")
    payload_to_write = {
        **payload,
        "checkpointB64": f"<{len(checkpoint_b64)} base64 chars>" if checkpoint_b64 else "",
        "sequenceReplayB64": f"<{len(sequence_replay_b64)} base64 chars>" if sequence_replay_b64 else "",
    }
    meta_path.write_text(json.dumps(payload_to_write, indent=2) + "\n")
    return {
        "resultPath": str(write_result),
        "checkpointPath": str(write_checkpoint) if checkpoint_written and write_checkpoint is not None else None,
        "sequenceReplayPath": str(sequence_replay_path) if sequence_replay_path is not None else None,
        "payloadPath": str(meta_path),
        "promoteToNextLink": bool((result.get("gates") or {}).get("promoteToNextLink")),
    }


def write_success_buffer_payload(payload: dict, write_result: Path, write_replay: Path | None) -> dict:
    result = payload["result"]
    write_result.parent.mkdir(parents=True, exist_ok=True)
    replay_b64 = payload.get("replayB64") or ""
    replay_written = False
    if replay_b64 and write_replay is not None:
        write_replay.parent.mkdir(parents=True, exist_ok=True)
        write_replay.write_bytes(base64.b64decode(replay_b64.encode("ascii")))
        replay_written = True
        result.setdefault("modalReplay", {})["localPath"] = str(write_replay)
    write_result.write_text(json.dumps(result, indent=2) + "\n")
    meta_path = write_result.with_suffix(".modal-payload.json")
    payload_to_write = {
        **payload,
        "replayB64": f"<{len(replay_b64)} base64 chars>" if replay_b64 else "",
    }
    meta_path.write_text(json.dumps(payload_to_write, indent=2) + "\n")
    return {
        "resultPath": str(write_result),
        "replayPath": str(write_replay) if replay_written and write_replay is not None else None,
        "payloadPath": str(meta_path),
        "selectedWorlds": int(result.get("selectedWorlds", 0)),
        "bestHeldSeconds": float(result.get("bestHeldSeconds", 0.0)),
        "safeForDistill": bool((result.get("gates") or {}).get("safeForDistill")),
    }


def main():
    parser = argparse.ArgumentParser(description="Create or inspect the real six-pendulum PufferPPO/MJWarp training contract.")
    parser.add_argument("--total-timesteps", type=int, default=10_000_000)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=None)
    parser.add_argument("--modal-runtime", action="store_true")
    parser.add_argument("--modal-device-ppo-dot", action="store_true")
    parser.add_argument("--modal-success-buffer-collect", action="store_true")
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--dot-config", type=Path, default=None)
    parser.add_argument("--collector-config", type=Path, default=None)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=None)
    parser.add_argument("--success-replay-file", type=Path, default=None)
    parser.add_argument("--write-replay", type=Path, default=None)
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=2048)
    parser.add_argument("--passes", type=int, default=12)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--seed", type=int, default=621900)
    parser.add_argument("--min-held-seconds", type=float, default=1.0)
    parser.add_argument("--top-k-per-pass", type=int, default=8)
    parser.add_argument("--terminal-boundary", type=float, default=3.0)
    parser.add_argument("--random-horizon", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument("--min-horizon", type=int, default=160)
    parser.add_argument("--max-horizon", type=int, default=768)
    parser.add_argument("--reward-mode", type=str, default="default")
    args = parser.parse_args()

    if args.modal_device_ppo_dot:
        config = default_modal_dot_config(args.smoke)
        if args.dot_config is not None:
            config.update(json.loads(args.dot_config.read_text()))
        links = max(1, min(6, int(config.get("links", 1))))
        mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{links}_link.xml")
        if not mjcf_path.exists():
            raise FileNotFoundError(f"Missing MJCF file for Modal dot: {mjcf_path}")
        warmstart_b64 = ""
        if args.warmstart_checkpoint is not None:
            warmstart_b64 = base64.b64encode(args.warmstart_checkpoint.read_bytes()).decode("ascii")
        success_replay_b64 = ""
        if args.success_replay_file is not None:
            success_replay_b64 = base64.b64encode(args.success_replay_file.read_bytes()).decode("ascii")
        with modal.enable_output(), app.run():
            payload = json.loads(run_device_ppo_dot.remote(mjcf_path.read_text(), config, warmstart_b64, success_replay_b64))
        summary = write_modal_dot_payload(payload, args.write_result, args.write_checkpoint)
        print(json.dumps({"status": "modal-device-ppo-dot-finished", **summary}, indent=2))
        return

    if args.modal_success_buffer_collect:
        if args.warmstart_checkpoint is None:
            raise ValueError("--warmstart-checkpoint is required for --modal-success-buffer-collect")
        config = {
            "links": int(args.links),
            "nworld": int(args.nworld),
            "passes": int(args.passes),
            "evalSteps": int(args.eval_steps),
            "forceScale": float(args.force_scale),
            "seed": int(args.seed),
            "minHeldSeconds": float(args.min_held_seconds),
            "topKPerPass": int(args.top_k_per_pass),
            "terminalBoundary": float(args.terminal_boundary),
            "randomHorizon": bool(args.random_horizon),
            "minHorizon": int(args.min_horizon),
            "maxHorizon": int(args.max_horizon),
            "rewardMode": str(args.reward_mode),
        }
        if args.collector_config is not None:
            config.update(json.loads(args.collector_config.read_text()))
        links = max(1, min(6, int(config.get("links", 1))))
        mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{links}_link.xml")
        if not mjcf_path.exists():
            raise FileNotFoundError(f"Missing MJCF file for Modal collector: {mjcf_path}")
        warmstart_b64 = base64.b64encode(args.warmstart_checkpoint.read_bytes()).decode("ascii")
        with modal.enable_output(), app.run():
            payload = json.loads(run_success_buffer_collect_dot.remote(mjcf_path.read_text(), config, warmstart_b64))
        summary = write_success_buffer_payload(payload, args.write_result, args.write_replay)
        print(json.dumps({"status": "modal-success-buffer-collect-finished", **summary}, indent=2))
        return

    if args.modal_runtime:
        with modal.enable_output(), app.run():
            result = json.loads(inspect_pufferppo_runtime.remote(args.total_timesteps))
    else:
        result = build_contract(args.total_timesteps)

    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
