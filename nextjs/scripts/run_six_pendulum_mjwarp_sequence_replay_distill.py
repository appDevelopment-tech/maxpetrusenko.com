#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import hold_quality
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
    mirror_observations,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM


DEFAULT_REPLAY = (
    DEFAULT_CHECKPOINT_DIR
    / "puffer-mjwarp-device-ppo-link1-exactdown-awr-ppo-sil-smoke-20260612.sequence-replay-update-2.npz"
)
DEFAULT_WARMSTART = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-awr-ppo-sil-smoke-20260612.pt"
DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-sequence-replay-distill-20260612.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-exactdown-sequence-replay-distill-20260612.pt"


def discounted_future_max(values: np.ndarray, horizon: int) -> np.ndarray:
    result = np.zeros(values.shape, dtype=np.float32)
    steps = values.shape[0]
    for step in range(steps):
        stop = min(steps, step + max(2, int(horizon)))
        result[step] = np.max(values[step:stop], axis=0)
    return result


def phase_weights(observations: np.ndarray, catch_angle: float, catch_speed: float) -> np.ndarray:
    theta = np.abs(np.arctan2(observations[..., 3], observations[..., 4]))
    omega = np.abs(observations[..., 7] * 8.0)
    cart_abs = np.abs(observations[..., 0])
    bottom = theta > 2.35
    pump = (theta > 1.1) & ~bottom
    approach = (theta <= 1.1) & (theta >= catch_angle)
    near_top = (theta < catch_angle) & (omega >= catch_speed)
    catch = (theta < catch_angle) & (omega < catch_speed) & (cart_abs < 2.25)
    weights = np.ones(theta.shape, dtype=np.float32)
    weights[bottom] *= 0.9
    weights[pump] *= 1.25
    weights[approach] *= 1.6
    weights[near_top] *= 2.2
    weights[catch] *= 2.8
    return weights.astype(np.float32, copy=False)


def first_event_steps(observations: np.ndarray, catch_angle: float, catch_speed: float) -> dict:
    theta = np.abs(np.arctan2(observations[..., 3], observations[..., 4]))
    omega = np.abs(observations[..., 7] * 8.0)
    near_top = theta < catch_angle
    catch = near_top & (omega < catch_speed) & (np.abs(observations[..., 0]) < 2.25)
    events = []
    for world in range(observations.shape[1]):
        near_indices = np.where(near_top[:, world])[0]
        catch_indices = np.where(catch[:, world])[0]
        events.append(
            {
                "world": int(world),
                "firstNearTopStep": int(near_indices[0]) if near_indices.size else None,
                "firstCatchStep": int(catch_indices[0]) if catch_indices.size else None,
                "nearTopSteps": int(np.sum(near_top[:, world])),
                "catchSteps": int(np.sum(catch[:, world])),
            }
        )
    return {"worlds": events}


def load_replay_file(path: Path, mirror: bool) -> tuple[list[dict], list[dict]]:
    data = np.load(path)
    observations = np.asarray(data["obs"] if "obs" in data.files else data["observations"], dtype=np.float32)
    actions = np.asarray(data["actions"], dtype=np.float32)
    rewards = np.asarray(data["rewards"], dtype=np.float32) if "rewards" in data.files else hold_quality(observations)
    terminals = np.asarray(data["terminals"], dtype=np.float32) if "terminals" in data.files else np.zeros(actions.shape, dtype=np.float32)
    truncations = np.asarray(data["truncations"], dtype=np.float32) if "truncations" in data.files else np.zeros(actions.shape, dtype=np.float32)
    if observations.ndim == 2:
        observations = observations[:, None, :]
    if actions.ndim == 1:
        actions = actions[:, None]
    if observations.ndim != 3 or actions.ndim != 2:
        raise ValueError("Replay must contain observations [steps, worlds, obs] and actions [steps, worlds]")
    if observations.shape[:2] != actions.shape:
        raise ValueError("Replay observation/action dimensions do not match")
    if observations.shape[2] != OBS_DIM:
        raise ValueError(f"Replay obs dim {observations.shape[2]} does not match {OBS_DIM}")
    if rewards.shape != actions.shape:
        rewards = np.zeros(actions.shape, dtype=np.float32)
    if terminals.shape != actions.shape:
        terminals = np.zeros(actions.shape, dtype=np.float32)
    if truncations.shape != actions.shape:
        truncations = np.zeros(actions.shape, dtype=np.float32)

    trajectories = [
        {
            "source": str(path),
            "observations": observations,
            "actions": actions,
            "rewards": rewards,
            "terminals": terminals,
            "truncations": truncations,
            "mirrored": False,
        }
    ]
    if mirror:
        trajectories.append(
            {
                "source": str(path),
                "observations": mirror_observations(observations),
                "actions": (-actions).astype(np.float32, copy=False),
                "rewards": rewards.copy(),
                "terminals": terminals.copy(),
                "truncations": truncations.copy(),
                "mirrored": True,
            }
        )
    metadata = {
        "path": str(path),
        "steps": int(observations.shape[0]),
        "worlds": int(observations.shape[1]),
        "samples": int(observations.shape[0] * observations.shape[1]),
        "mirror": bool(mirror),
        "selectedHeldSeconds": np.asarray(data["selectedHeldSeconds"], dtype=np.float32).reshape(-1).tolist()
        if "selectedHeldSeconds" in data.files
        else [],
        "selectedStrictScore": np.asarray(data["selectedStrictScore"], dtype=np.float32).reshape(-1).tolist()
    if "selectedStrictScore" in data.files
        else [],
        "eventSteps": first_event_steps(observations, 0.5, 3.2),
        "actionAbsMean": float(np.mean(np.abs(actions))) if actions.size else 0.0,
        "actionAbsMax": float(np.max(np.abs(actions))) if actions.size else 0.0,
    }
    return trajectories, [metadata]


def build_training_weights(trajectory: dict, args: argparse.Namespace) -> np.ndarray:
    observations = trajectory["observations"]
    rewards = trajectory["rewards"]
    quality = hold_quality(observations)
    future_quality = discounted_future_max(quality, args.future_quality_horizon)
    future_reward = discounted_future_max(rewards, args.future_reward_horizon)
    quality_component = future_quality - np.mean(future_quality)
    reward_component = future_reward - np.mean(future_reward)
    combined = (
        float(args.quality_weight) * quality_component
        + float(args.reward_weight) * reward_component
    )
    combined = combined / (float(np.std(combined)) + 1e-6)
    weights = np.exp(combined / max(float(args.beta), 1e-6))
    weights = np.clip(weights, float(args.min_weight), float(args.max_weight)).astype(np.float32)
    weights *= phase_weights(observations, args.catch_angle, args.catch_speed)
    if args.prefix_boost_steps > 0:
        events = first_event_steps(observations, args.catch_angle, args.catch_speed)["worlds"]
        for event in events:
            world = int(event["world"])
            catch_step = event["firstCatchStep"]
            if catch_step is None:
                catch_step = event["firstNearTopStep"]
            if catch_step is None:
                continue
            start = max(0, int(catch_step) - int(args.prefix_boost_steps))
            stop = min(weights.shape[0], int(catch_step) + int(args.post_catch_boost_steps))
            weights[start:stop, world] *= float(args.prefix_boost)
    done = (trajectory["terminals"] > 0.5) | (trajectory["truncations"] > 0.5)
    weights[done] *= 0.2
    return np.clip(weights, float(args.min_weight), float(args.final_max_weight)).astype(np.float32)


def train_sequence_replay_distill(policy, old_policy, trajectories: list[dict], args: argparse.Namespace, hidden_dim: int):
    import torch

    device = next(policy.parameters()).device
    optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.learning_rate), weight_decay=1e-5)
    torch_trajectories = []
    weight_summaries = []
    for trajectory in trajectories:
        weights = build_training_weights(trajectory, args)
        torch_trajectories.append(
            {
                "source": trajectory["source"],
                "mirrored": bool(trajectory["mirrored"]),
                "obs": torch.as_tensor(trajectory["observations"], dtype=torch.float32, device=device),
                "actions": torch.as_tensor(trajectory["actions"], dtype=torch.float32, device=device),
                "weights": torch.as_tensor(weights, dtype=torch.float32, device=device),
                "done": torch.as_tensor(
                    (trajectory["terminals"] > 0.5) | (trajectory["truncations"] > 0.5),
                    dtype=torch.bool,
                    device=device,
                ),
            }
        )
        weight_summaries.append(
            {
                "source": trajectory["source"],
                "mirrored": bool(trajectory["mirrored"]),
                "weightMean": float(np.mean(weights)),
                "weightMax": float(np.max(weights)),
                "weightMin": float(np.min(weights)),
            }
        )
    marker_epochs = {0, max(0, int(args.epochs) // 2), max(0, int(args.epochs) - 1)}
    losses = []
    before = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    for epoch in range(int(args.epochs)):
        order = torch.randperm(len(torch_trajectories)).tolist()
        epoch_losses = []
        epoch_actor = []
        epoch_anchor = []
        epoch_entropy = []
        for trajectory_index in order:
            item = torch_trajectories[int(trajectory_index)]
            obs = item["obs"]
            actions = item["actions"]
            weights = item["weights"]
            done = item["done"]
            steps, worlds, _ = obs.shape
            hidden = torch.zeros(worlds, int(hidden_dim), dtype=torch.float32, device=device)
            if int(args.burn_in_steps) > 0:
                burn_in = min(int(args.burn_in_steps), max(0, steps - 1))
                with torch.no_grad():
                    for step in range(burn_in):
                        _logprob, _entropy, _value, hidden = policy.evaluate_actions(obs[step], hidden, actions[step])
                        if step < steps - 1 and bool(done[step].any()):
                            hidden = hidden.clone()
                            hidden[done[step]] = 0.0
                hidden = hidden.detach()
            else:
                burn_in = 0
            logprob_terms = []
            entropy_terms = []
            anchor_terms = []
            step_stride = max(1, int(args.step_stride))
            for step in range(burn_in, int(steps), step_stride):
                logprob, entropy, _value, hidden = policy.evaluate_actions(obs[step], hidden, actions[step])
                active_weights = weights[step]
                active_weights = active_weights / (active_weights.mean() + 1e-6)
                logprob_terms.append((-logprob * active_weights).mean())
                entropy_terms.append(entropy.mean())
                if float(args.old_policy_anchor_weight) > 0.0:
                    with torch.no_grad():
                        old_action, _, _, _ = old_policy(obs[step], torch.zeros_like(hidden), deterministic=True)
                    new_action, _, _, _ = policy(obs[step], torch.zeros_like(hidden), deterministic=True)
                    theta = torch.abs(torch.atan2(obs[step, :, 3], obs[step, :, 4]))
                    outside_top = (theta > float(args.catch_angle)).float()
                    if torch.any(outside_top > 0):
                        anchor_terms.append(((new_action.reshape(-1) - old_action.reshape(-1)).pow(2) * outside_top).mean())
                if step < steps - 1 and bool(done[step].any()):
                    hidden = hidden.clone()
                    hidden[done[step]] = 0.0
            actor_loss = torch.stack(logprob_terms).mean()
            entropy_loss = torch.stack(entropy_terms).mean()
            anchor_loss = torch.stack(anchor_terms).mean() if anchor_terms else torch.tensor(0.0, device=device)
            loss = (
                actor_loss
                + float(args.old_policy_anchor_weight) * anchor_loss
                - float(args.entropy_coef) * entropy_loss
            )
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(args.grad_clip)).detach())
            optimizer.step()
            epoch_losses.append(float(loss.detach()))
            epoch_actor.append(float(actor_loss.detach()))
            epoch_anchor.append(float(anchor_loss.detach()))
            epoch_entropy.append(float(entropy_loss.detach()))
        if epoch in marker_epochs:
            losses.append(
                {
                    "epoch": int(epoch + 1),
                    "loss": float(np.mean(epoch_losses)) if epoch_losses else 0.0,
                    "actorLoss": float(np.mean(epoch_actor)) if epoch_actor else 0.0,
                    "anchorLoss": float(np.mean(epoch_anchor)) if epoch_anchor else 0.0,
                    "entropy": float(np.mean(epoch_entropy)) if epoch_entropy else 0.0,
                    "gradNorm": grad_norm,
                    "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                }
            )
    after = torch.cat([parameter.detach().flatten() for parameter in policy.parameters()])
    return {
        "epochs": int(args.epochs),
        "learningRate": float(args.learning_rate),
        "burnInSteps": int(args.burn_in_steps),
        "stepStride": int(args.step_stride),
        "beta": float(args.beta),
        "maxWeight": float(args.max_weight),
        "finalMaxWeight": float(args.final_max_weight),
        "entropyCoef": float(args.entropy_coef),
        "oldPolicyAnchorWeight": float(args.old_policy_anchor_weight),
        "weightSummaries": weight_summaries,
        "parameterDeltaL2": float(torch.linalg.vector_norm(after - before)),
        "losses": losses,
    }


def run_sequence_replay_distill(mjcf_xml: str, args: argparse.Namespace) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(args.seed))
    np.random.seed(int(args.seed))
    policy, checkpoint = load_policy_from_checkpoint(args.warmstart_checkpoint, args.seed, args.force_scale)
    old_policy = copy.deepcopy(policy)
    old_policy.eval()
    links = int(args.links or checkpoint["links"])
    hidden_dim = int(args.policy_hidden_dim or checkpoint["hiddenDim"])
    policy_kind = str(checkpoint["policyKind"])
    if links != int(checkpoint["links"]):
        raise ValueError(f"Requested links {links} do not match checkpoint links {checkpoint['links']}")
    if hidden_dim != int(checkpoint["hiddenDim"]):
        raise ValueError(f"Requested hidden dim {hidden_dim} does not match checkpoint hidden dim {checkpoint['hiddenDim']}")
    before_eval = evaluate_policy(
        mjcf_xml,
        policy,
        links,
        args.nworld,
        args.eval_steps,
        args.force_scale,
        args.seed + 100_000,
        hidden_dim,
        args.eval_stochastic_passes,
        args.eval_pose,
    )
    trajectories = []
    replay_metadata = []
    for replay_file in args.replay_files:
        loaded, metadata = load_replay_file(replay_file, args.mirror_replay)
        trajectories.extend(loaded)
        replay_metadata.extend(metadata)
    strongest_source_hold = 0.0
    for metadata in replay_metadata:
        source_holds = metadata.get("selectedHeldSeconds", [])
        if source_holds:
            strongest_source_hold = max(strongest_source_hold, float(max(source_holds)))
    if trajectories and strongest_source_hold < float(args.min_source_held_seconds):
        trajectories = []
        replay_metadata.append(
            {
                "sourceQualityGate": "failed",
                "minSourceHeldSeconds": float(args.min_source_held_seconds),
                "strongestSourceHoldSeconds": float(strongest_source_hold),
            }
        )
    if trajectories:
        distill = train_sequence_replay_distill(policy, old_policy, trajectories, args, hidden_dim)
        after_eval = evaluate_policy(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.eval_steps,
            args.force_scale,
            args.seed + 300_000,
            hidden_dim,
            args.eval_stochastic_passes,
            args.eval_pose,
        )
        status = "sequence-replay-distill-finished"
    else:
        distill = {"enabled": False, "reason": "no replay trajectories"}
        after_eval = before_eval
        status = "no-replay-trajectories"

    if args.write_checkpoint and trajectories:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-sequence-replay-distill-policy-checkpoint-v1",
                "policyStateDict": policy.state_dict(),
                "links": links,
                "hiddenDim": hidden_dim,
                "obsDim": int(OBS_DIM),
                "forceScale": float(args.force_scale),
                "policyKind": policy_kind,
                "seed": int(args.seed),
                "sourceCheckpoint": str(args.warmstart_checkpoint),
                "replayFiles": [str(path) for path in args.replay_files],
                "bestDownEvaluation": after_eval["down"],
                "bestStochasticDownEvaluation": after_eval["stochasticDown"],
            },
            args.write_checkpoint,
        )

    return {
        "schema": "six-pendulum-mjwarp-sequence-replay-distill-v1",
        "status": status,
        "algorithm": "full-stochastic-sequence-replay-actor-distillation",
        "links": links,
        "nworld": int(args.nworld),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "replays": replay_metadata,
        "distill": distill,
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "evalPose": str(args.eval_pose),
        "checkpoint": {
            "written": bool(args.write_checkpoint and trajectories),
            "path": str(args.write_checkpoint) if args.write_checkpoint and trajectories else None,
        },
        "elapsedSeconds": time.time() - started,
        "gates": {
            "learnedPolicyOnly": True,
            "strictOneSecondRequired": True,
            "subsecondDoesNotCount": True,
            "deterministicDownSolvedOneSecond": bool(after_eval["down"].get("solvedOneSecond", False)),
            "stochasticDownSolvedOneSecond": bool(after_eval["stochasticDown"].get("solvedOneSecond", False)),
            "promoteToNextLink": bool(after_eval["down"].get("solvedOneSecond", False)),
        },
        "notes": [
            "Replay actions come from stochastic learned-policy episodes; no runtime teacher/controller is used in counted eval.",
            "This actor-only variant removes the value-loss domination observed in the first sequence-SIL smoke.",
            "Held-out deterministic exact-down evaluation is the counted gate.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Distill saved stochastic full-sequence replay into deterministic MJWarp policy.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--replay-files", type=Path, nargs="+", default=[DEFAULT_REPLAY])
    parser.add_argument("--mirror-replay", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--min-source-held-seconds", type=float, default=1.0)
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--learning-rate", type=float, default=2e-6)
    parser.add_argument("--burn-in-steps", type=int, default=96)
    parser.add_argument("--step-stride", type=int, default=1)
    parser.add_argument("--future-quality-horizon", type=int, default=480)
    parser.add_argument("--future-reward-horizon", type=int, default=480)
    parser.add_argument("--quality-weight", type=float, default=1.0)
    parser.add_argument("--reward-weight", type=float, default=0.25)
    parser.add_argument("--beta", type=float, default=2.0)
    parser.add_argument("--min-weight", type=float, default=0.15)
    parser.add_argument("--max-weight", type=float, default=8.0)
    parser.add_argument("--final-max-weight", type=float, default=12.0)
    parser.add_argument("--catch-angle", type=float, default=0.5)
    parser.add_argument("--catch-speed", type=float, default=3.2)
    parser.add_argument("--prefix-boost-steps", type=int, default=320)
    parser.add_argument("--post-catch-boost-steps", type=int, default=240)
    parser.add_argument("--prefix-boost", type=float, default=1.8)
    parser.add_argument("--old-policy-anchor-weight", type=float, default=0.0)
    parser.add_argument("--entropy-coef", type=float, default=0.0005)
    parser.add_argument("--grad-clip", type=float, default=0.5)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--eval-pose", choices=["down", "exact-down", "down-heavy", "down-whip"], default="exact-down")
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_sequence_replay_distill(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
