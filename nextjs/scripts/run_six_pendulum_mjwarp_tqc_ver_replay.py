#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor, hold_quality
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    DEFAULT_WARMSTART,
    evaluate_policy,
    load_policy_from_checkpoint,
    mirror_observations,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import collect_recurrent_rollout


DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-tqc-ver-replay-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-tqc-ver-replay-f160-20260611.pt"


def one_link_quality_mask(observations: np.ndarray) -> tuple[np.ndarray, dict]:
    theta = np.arctan2(observations[..., 3], observations[..., 4])
    omega = observations[..., 7] * 8.0
    cart_abs = np.abs(observations[..., 0])
    near_top = np.abs(theta) < 0.72
    catch = (np.abs(theta) < 0.42) & (np.abs(omega) < 4.2) & (cart_abs < 2.1)
    pump = (np.abs(theta) > 0.72) & (np.abs(theta) < 2.7) & (cart_abs < 1.9)
    usable = near_top | catch | pump
    return usable, {
        "nearTopSamples": int(np.sum(near_top)),
        "catchSamples": int(np.sum(catch)),
        "pumpSamples": int(np.sum(pump)),
        "usableSamples": int(np.sum(usable)),
    }


def flatten_rollout_transitions(buffers: dict, mirror: bool, quality_only: bool) -> tuple[np.ndarray, ...]:
    observations = buffers["obs"].astype(np.float32, copy=False)
    actions = buffers["actions"].astype(np.float32, copy=False)
    terminals = buffers["terminals"] > 0.5
    truncations = buffers["truncations"] > 0.5
    done = terminals | truncations
    next_observations = observations[1:]
    obs = observations[:-1]
    action = actions[:-1]
    not_done = (~done[:-1]).astype(np.float32)
    rewards = hold_quality(next_observations).astype(np.float32, copy=False)
    usable, quality_stats = one_link_quality_mask(obs)
    if quality_only:
        keep = usable
        if not np.any(keep):
            keep = np.ones(obs.shape[:2], dtype=bool)
    else:
        keep = np.ones(obs.shape[:2], dtype=bool)
    flat_obs = obs[keep].reshape(-1, OBS_DIM).astype(np.float32, copy=False)
    flat_next = next_observations[keep].reshape(-1, OBS_DIM).astype(np.float32, copy=False)
    flat_actions = action[keep].reshape(-1).astype(np.float32, copy=False)
    flat_rewards = rewards[keep].reshape(-1).astype(np.float32, copy=False)
    flat_not_done = not_done[keep].reshape(-1).astype(np.float32, copy=False)
    weights = np.ones_like(flat_rewards, dtype=np.float32)
    if flat_obs.shape[0]:
        theta = np.abs(np.arctan2(flat_obs[:, 3], flat_obs[:, 4]))
        omega = np.abs(flat_obs[:, 7] * 8.0)
        cart_abs = np.abs(flat_obs[:, 0])
        weights += (theta < 0.72).astype(np.float32) * 1.5
        weights += ((theta < 0.42) & (omega < 4.2) & (cart_abs < 2.1)).astype(np.float32) * 3.0
        weights += (flat_rewards > np.percentile(flat_rewards, 75)).astype(np.float32) * 1.0
        weights = weights / max(float(np.mean(weights)), 1e-6)
    if mirror and flat_obs.shape[0]:
        flat_obs = np.concatenate([flat_obs, mirror_observations(flat_obs.reshape(-1, 1, OBS_DIM)).reshape(-1, OBS_DIM)], axis=0)
        flat_next = np.concatenate(
            [flat_next, mirror_observations(flat_next.reshape(-1, 1, OBS_DIM)).reshape(-1, OBS_DIM)],
            axis=0,
        )
        flat_actions = np.concatenate([flat_actions, -flat_actions], axis=0)
        flat_rewards = np.concatenate([flat_rewards, flat_rewards], axis=0)
        flat_not_done = np.concatenate([flat_not_done, flat_not_done], axis=0)
        weights = np.concatenate([weights, weights], axis=0)
    stats = {
        **quality_stats,
        "transitionCount": int(flat_obs.shape[0]),
        "mirrorEnabled": bool(mirror),
        "qualityOnly": bool(quality_only),
        "rewardMean": float(np.mean(flat_rewards)) if flat_rewards.size else 0.0,
        "rewardMax": float(np.max(flat_rewards)) if flat_rewards.size else 0.0,
        "weightMean": float(np.mean(weights)) if weights.size else 0.0,
        "weightMax": float(np.max(weights)) if weights.size else 0.0,
    }
    return flat_obs, flat_actions, flat_rewards, flat_next, flat_not_done, weights.astype(np.float32), stats


def collect_tqc_replay(mjcf_xml: str, policy, args: argparse.Namespace, links: int, hidden_dim: int):
    parts = []
    summaries = []
    for pass_index in range(int(args.replay_passes)):
        rollout = collect_recurrent_rollout(
            mjcf_xml,
            policy,
            links,
            args.nworld,
            args.rollout_steps,
            "down",
            args.force_scale,
            args.seed + 200_000 + pass_index,
            hidden_dim,
            stochastic=True,
            random_horizon=bool(args.random_horizon),
            min_horizon=int(args.min_horizon),
            max_horizon=int(args.max_horizon),
        )
        transitions = flatten_rollout_transitions(rollout["buffers"], args.mirror, args.quality_only)
        parts.append(transitions[:6])
        summary = {
            "pass": pass_index + 1,
            "rollout": rollout["summary"],
            "transitions": transitions[6],
        }
        summaries.append(summary)
        print(json.dumps(summary, sort_keys=True), flush=True)
    if not parts:
        empty_obs = np.zeros((0, OBS_DIM), dtype=np.float32)
        empty = np.zeros((0,), dtype=np.float32)
        return empty_obs, empty, empty, empty_obs, empty, empty, summaries
    obs, actions, rewards, next_obs, not_done, weights = [
        np.concatenate([part[index] for part in parts], axis=0).astype(np.float32, copy=False)
        for index in range(6)
    ]
    weights = weights / max(float(np.mean(weights)), 1e-6)
    return obs, actions, rewards, next_obs, not_done, weights, summaries


def build_quantile_critic(obs_dim: int, hidden_dim: int, quantiles: int):
    import torch

    class QuantileCritic(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.net = torch.nn.Sequential(
                torch.nn.Linear(int(obs_dim) + 1, int(hidden_dim)),
                torch.nn.LayerNorm(int(hidden_dim)),
                torch.nn.GELU(),
                torch.nn.Linear(int(hidden_dim), int(hidden_dim)),
                torch.nn.GELU(),
                torch.nn.Linear(int(hidden_dim), int(quantiles)),
            )

        def forward(self, obs, action):
            x = torch.cat([obs, action.reshape(-1, 1)], dim=-1)
            return self.net(x)

    return QuantileCritic()


def truncated_quantile_value(critics, obs, action, drop_top: int):
    import torch

    quantiles = torch.cat([critic(obs, action) for critic in critics], dim=-1)
    sorted_quantiles, _ = torch.sort(quantiles, dim=-1)
    keep = max(1, sorted_quantiles.shape[-1] - int(drop_top))
    return sorted_quantiles[:, :keep].mean(dim=-1), sorted_quantiles


def quantile_huber_loss(predicted, target, weights):
    import torch

    quantile_count = predicted.shape[-1]
    taus = (torch.arange(quantile_count, device=predicted.device, dtype=torch.float32) + 0.5) / quantile_count
    td_error = target[:, None, :] - predicted[:, :, None]
    abs_td = torch.abs(td_error)
    huber = torch.where(abs_td <= 1.0, 0.5 * td_error.pow(2), abs_td - 0.5)
    tau_weight = torch.abs(taus[None, :, None] - (td_error.detach() < 0.0).float())
    loss = (tau_weight * huber).mean(dim=(1, 2))
    return (loss * weights).mean()


def train_tqc_ver(policy, old_policy, replay, anchor_obs: np.ndarray, args: argparse.Namespace, hidden_dim: int):
    import torch
    import torch.nn.functional as F

    obs_np, actions_np, rewards_np, next_obs_np, not_done_np, weights_np, summaries = replay
    stats = {
        "transitionCount": int(obs_np.shape[0]),
        "rewardMean": float(np.mean(rewards_np)) if rewards_np.size else 0.0,
        "rewardMax": float(np.max(rewards_np)) if rewards_np.size else 0.0,
        "replayPasses": int(len(summaries)),
    }
    if obs_np.shape[0] == 0:
        return {"stats": stats, "criticLosses": [], "actorLosses": []}

    policy.train()
    critics = [build_quantile_critic(OBS_DIM, args.critic_hidden_dim, args.quantiles) for _ in range(args.critic_count)]
    target_critics = copy.deepcopy(critics)
    critic_params = [parameter for critic in critics for parameter in critic.parameters()]
    critic_optimizer = torch.optim.AdamW(critic_params, lr=float(args.critic_learning_rate), weight_decay=1e-5)
    actor_optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.actor_learning_rate), weight_decay=1e-5)

    obs = torch.as_tensor(obs_np, dtype=torch.float32)
    actions = torch.as_tensor(actions_np, dtype=torch.float32)
    rewards = torch.as_tensor(rewards_np, dtype=torch.float32)
    next_obs = torch.as_tensor(next_obs_np, dtype=torch.float32)
    not_done = torch.as_tensor(not_done_np, dtype=torch.float32)
    weights = torch.as_tensor(weights_np, dtype=torch.float32)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    batch_size = min(int(args.batch_size), obs.shape[0])
    critic_losses = []
    actor_losses = []
    actor_mask = rewards >= float(args.actor_min_reward)
    if int(actor_mask.sum().item()) < int(args.min_actor_samples):
        actor_mask = torch.ones_like(rewards, dtype=torch.bool)
    actor_obs = obs[actor_mask]
    stats["actorTransitionCount"] = int(actor_obs.shape[0])
    stats["actorMinReward"] = float(args.actor_min_reward)
    stats["actorFallbackAll"] = bool(actor_obs.shape[0] == obs.shape[0] and float(args.actor_min_reward) > -1000000.0)
    marker_critic = {0, max(0, int(args.critic_epochs) // 2), max(0, int(args.critic_epochs) - 1)}
    for epoch in range(int(args.critic_epochs)):
        indices = torch.randint(0, obs.shape[0], (batch_size,))
        batch_obs = obs[indices]
        batch_actions = actions[indices]
        batch_rewards = rewards[indices]
        batch_next_obs = next_obs[indices]
        batch_not_done = not_done[indices]
        batch_weights = weights[indices]
        with torch.no_grad():
            next_hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
            next_action, next_logprob, _, _ = policy(batch_next_obs, next_hidden, deterministic=False)
            next_value, next_quantiles = truncated_quantile_value(target_critics, batch_next_obs, next_action, args.drop_top)
            target = batch_rewards[:, None] + float(args.gamma) * batch_not_done[:, None] * (
                next_quantiles[:, : max(1, next_quantiles.shape[-1] - int(args.drop_top))]
                - float(args.alpha) * next_logprob[:, None]
            )
        critic_loss = torch.tensor(0.0, dtype=torch.float32)
        for critic in critics:
            predicted = critic(batch_obs, batch_actions)
            critic_loss = critic_loss + quantile_huber_loss(predicted, target, batch_weights)
        critic_loss = critic_loss / max(1, len(critics))
        critic_optimizer.zero_grad(set_to_none=True)
        critic_loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(critic_params, float(args.grad_clip)).detach())
        critic_optimizer.step()
        with torch.no_grad():
            tau = float(args.target_tau)
            for target_critic, critic in zip(target_critics, critics):
                for target_param, param in zip(target_critic.parameters(), critic.parameters()):
                    target_param.mul_(1.0 - tau).add_(param, alpha=tau)
        if epoch in marker_critic:
            critic_losses.append(
                {
                    "epoch": epoch + 1,
                    "criticLoss": float(critic_loss.detach()),
                    "targetMean": float(target.detach().mean()),
                    "targetMax": float(target.detach().max()),
                    "gradNorm": grad_norm,
                }
            )

    marker_actor = {0, max(0, int(args.actor_epochs) // 2), max(0, int(args.actor_epochs) - 1)}
    for epoch in range(int(args.actor_epochs)):
        actor_batch_size = min(batch_size, actor_obs.shape[0])
        indices = torch.randint(0, actor_obs.shape[0], (actor_batch_size,))
        batch_obs = actor_obs[indices]
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        if actor_batch_size != batch_size:
            hidden = torch.zeros(actor_batch_size, int(hidden_dim), dtype=torch.float32)
        action, logprob, _, _ = policy(batch_obs, hidden, deterministic=False)
        q_value, _quantiles = truncated_quantile_value(critics, batch_obs, action, args.drop_top)
        actor_loss = (float(args.alpha) * logprob - q_value).mean()
        anchor_loss = torch.tensor(0.0, dtype=torch.float32)
        if anchor_t is not None and float(args.hold_anchor_weight) > 0.0:
            anchor_count = min(int(args.anchor_batch_size), anchor_t.shape[0])
            anchor_indices = torch.randint(0, anchor_t.shape[0], (anchor_count,))
            anchor_batch = anchor_t[anchor_indices]
            anchor_hidden = torch.zeros(anchor_count, int(hidden_dim), dtype=torch.float32)
            with torch.no_grad():
                old_action, _, _, _ = old_policy(anchor_batch, anchor_hidden, deterministic=True)
            new_action, _, _, _ = policy(anchor_batch, anchor_hidden, deterministic=True)
            anchor_loss = F.mse_loss(new_action.reshape(-1), old_action.reshape(-1))
        loss = actor_loss + float(args.hold_anchor_weight) * anchor_loss
        actor_optimizer.zero_grad(set_to_none=True)
        loss.backward()
        grad_norm = float(torch.nn.utils.clip_grad_norm_(policy.parameters(), float(args.grad_clip)).detach())
        actor_optimizer.step()
        if epoch in marker_actor:
            actor_losses.append(
                {
                    "epoch": epoch + 1,
                    "loss": float(loss.detach()),
                    "actorLoss": float(actor_loss.detach()),
                    "anchorLoss": float(anchor_loss.detach()),
                    "qMean": float(q_value.detach().mean()),
                    "qMax": float(q_value.detach().max()),
                    "logprobMean": float(logprob.detach().mean()),
                    "gradNorm": grad_norm,
                    "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                }
            )
    policy.eval()
    return {"stats": stats, "criticLosses": critic_losses, "actorLosses": actor_losses}


def run_tqc_ver_replay(mjcf_xml: str, args: argparse.Namespace) -> dict:
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
        raise ValueError(f"Requested links {links} do not match warmstart links {checkpoint['links']}")
    if hidden_dim != int(checkpoint["hiddenDim"]):
        raise ValueError(f"Requested hidden dim {hidden_dim} does not match warmstart hidden dim {checkpoint['hiddenDim']}")

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
    )
    replay = collect_tqc_replay(mjcf_xml, policy, args, links, hidden_dim)
    anchor_obs, anchor_summary = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    tqc = train_tqc_ver(policy, old_policy, replay, anchor_obs, args, hidden_dim)
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
    )

    if args.write_checkpoint:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-tqc-ver-replay-policy-checkpoint-v1",
                "policyStateDict": policy.state_dict(),
                "links": links,
                "hiddenDim": hidden_dim,
                "obsDim": int(OBS_DIM),
                "forceScale": float(args.force_scale),
                "policyKind": policy_kind,
                "seed": int(args.seed),
                "sourceCheckpoint": str(args.warmstart_checkpoint),
                "bestDownEvaluation": after_eval["down"],
                "bestStochasticDownEvaluation": after_eval["stochasticDown"],
            },
            args.write_checkpoint,
        )

    return {
        "schema": "six-pendulum-mjwarp-tqc-ver-replay-v1",
        "status": "tqc-ver-replay-finished",
        "algorithm": "tqc-distributional-critic-virtual-experience-replay",
        "links": links,
        "nworld": int(args.nworld),
        "rolloutSteps": int(args.rollout_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "replay": {
            "passes": int(args.replay_passes),
            "mirrorEnabled": bool(args.mirror),
            "qualityOnly": bool(args.quality_only),
            "passSummaries": replay[6],
        },
        "holdAnchor": anchor_summary,
        "tqc": {
            "criticCount": int(args.critic_count),
            "quantiles": int(args.quantiles),
            "dropTop": int(args.drop_top),
            "alpha": float(args.alpha),
            "actorMinReward": float(args.actor_min_reward),
            "minActorSamples": int(args.min_actor_samples),
            "criticEpochs": int(args.critic_epochs),
            "actorEpochs": int(args.actor_epochs),
            "criticLearningRate": float(args.critic_learning_rate),
            "actorLearningRate": float(args.actor_learning_rate),
            "stats": tqc["stats"],
            "criticLosses": tqc["criticLosses"],
            "actorLosses": tqc["actorLosses"],
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "checkpoint": {"written": bool(args.write_checkpoint), "path": str(args.write_checkpoint) if args.write_checkpoint else None},
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
            "This is the first local TQC-style distributional critic lane after PPO, BC, AWR, AWAC, and IQL failed.",
            "Replay is collected from learned-policy exact-down rollouts and mirrored as virtual experience replay.",
            "No teacher or scripted controller is counted; only held-out learned exact-down evaluation can promote.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="TQC/VER-style off-policy replay repair for MJWarp one-link down-start.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--rollout-steps", type=int, default=1600)
    parser.add_argument("--replay-passes", type=int, default=6)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--mirror", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--quality-only", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--random-horizon", action="store_true")
    parser.add_argument("--min-horizon", type=int, default=128)
    parser.add_argument("--max-horizon", type=int, default=768)
    parser.add_argument("--critic-count", type=int, default=2)
    parser.add_argument("--quantiles", type=int, default=25)
    parser.add_argument("--drop-top", type=int, default=6)
    parser.add_argument("--critic-hidden-dim", type=int, default=256)
    parser.add_argument("--critic-epochs", type=int, default=120)
    parser.add_argument("--actor-epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=2048)
    parser.add_argument("--critic-learning-rate", type=float, default=0.0001)
    parser.add_argument("--actor-learning-rate", type=float, default=0.000003)
    parser.add_argument("--gamma", type=float, default=0.997)
    parser.add_argument("--target-tau", type=float, default=0.01)
    parser.add_argument("--alpha", type=float, default=0.02)
    parser.add_argument("--actor-min-reward", type=float, default=-1000000000.0)
    parser.add_argument("--min-actor-samples", type=int, default=512)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.10)
    parser.add_argument("--hold-anchor-steps", type=int, default=768)
    parser.add_argument("--anchor-batch-size", type=int, default=1024)
    parser.add_argument("--grad-clip", type=float, default=0.7)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_tqc_ver_replay(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
