#!/usr/bin/env python3
import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.distributions import Normal

from six_pendulum_mjwarp_env import OBS_DIM, SixPendulumMJWarpPufferEnv


class TinyRecurrentPolicy(nn.Module):
    def __init__(self, obs_dim: int = OBS_DIM, hidden_dim: int = 64):
        super().__init__()
        self.encoder = nn.Sequential(nn.Linear(obs_dim, hidden_dim), nn.Tanh())
        self.gru = nn.GRUCell(hidden_dim, hidden_dim)
        self.actor = nn.Linear(hidden_dim, 1)
        self.critic = nn.Linear(hidden_dim, 1)
        self.log_std = nn.Parameter(torch.tensor([-0.35]))

    def forward(self, obs, hidden):
        encoded = self.encoder(obs)
        next_hidden = self.gru(encoded, hidden)
        mean = torch.tanh(self.actor(next_hidden))
        value = self.critic(next_hidden).squeeze(-1)
        std = self.log_std.exp().expand_as(mean)
        return mean, std, value, next_hidden


def evaluate(policy, mjcf_xml: str, links: int, nworld: int, steps: int, pose: str) -> dict:
    env = SixPendulumMJWarpPufferEnv(mjcf_xml, links=links, nworld=nworld, horizon=steps + 1, pose=pose)
    obs, infos = env.reset()
    hidden = torch.zeros(nworld, policy.gru.hidden_size)
    reward_sum = np.zeros(nworld, dtype=np.float32)
    max_score = 0.0
    max_held = 0.0
    with torch.no_grad():
        for _ in range(steps):
            obs_tensor = torch.as_tensor(obs, dtype=torch.float32)
            mean, _, _, hidden = policy(obs_tensor, hidden)
            obs, rewards, terminals, truncations, infos = env.step(mean.numpy())
            done = torch.as_tensor(terminals | truncations, dtype=torch.bool)
            if bool(done.any()):
                hidden[done] = 0.0
            reward_sum += rewards
            max_score = max(max_score, max(info["strictScore"] for info in infos))
            max_held = max(max_held, max(info["maxHeldSeconds"] for info in infos))
    env.close()
    return {
        "pose": pose,
        "steps": steps,
        "rewardMean": float(np.mean(reward_sum)),
        "maxStrictScore": float(max_score),
        "maxHeldSeconds": float(max_held),
        "solvedOneSecond": bool(max_held >= 1.0),
    }


def train(mjcf_xml: str, links: int, nworld: int, rollout_steps: int, updates: int, pose: str, seed: int) -> dict:
    torch.manual_seed(seed)
    np.random.seed(seed)
    started = time.time()
    env = SixPendulumMJWarpPufferEnv(mjcf_xml, links=links, nworld=nworld, horizon=rollout_steps + 1, pose=pose)
    policy = TinyRecurrentPolicy()
    optimizer = torch.optim.AdamW(policy.parameters(), lr=3e-4, weight_decay=1e-5)
    obs, infos = env.reset()
    hidden = torch.zeros(nworld, policy.gru.hidden_size)
    history = []
    gamma = 0.985

    for update_index in range(updates):
        logprobs = []
        values = []
        rewards = []
        entropies = []
        max_score = 0.0
        max_held = 0.0
        reward_sum = np.zeros(nworld, dtype=np.float32)
        hidden = hidden.detach()

        for _ in range(rollout_steps):
            obs_tensor = torch.as_tensor(obs, dtype=torch.float32)
            mean, std, value, next_hidden = policy(obs_tensor, hidden)
            dist = Normal(mean, std)
            action = dist.sample()
            logprob = dist.log_prob(action).sum(dim=-1)
            entropy = dist.entropy().sum(dim=-1)
            obs, reward, terminals, truncations, infos = env.step(action.detach().numpy())
            done = torch.as_tensor(terminals | truncations, dtype=torch.bool)
            hidden_for_next_step = next_hidden.detach().clone()
            if bool(done.any()):
                hidden_for_next_step[done] = 0.0
            hidden = hidden_for_next_step
            logprobs.append(logprob)
            values.append(value)
            rewards.append(torch.as_tensor(reward, dtype=torch.float32))
            entropies.append(entropy)
            reward_sum += reward
            max_score = max(max_score, max(info["strictScore"] for info in infos))
            max_held = max(max_held, max(info["maxHeldSeconds"] for info in infos))

        returns = []
        running = torch.zeros(nworld)
        for reward in reversed(rewards):
            running = reward + gamma * running
            returns.append(running)
        returns.reverse()
        returns_tensor = torch.stack(returns)
        values_tensor = torch.stack(values)
        logprob_tensor = torch.stack(logprobs)
        entropy_tensor = torch.stack(entropies)
        advantage = returns_tensor - values_tensor.detach()
        advantage = (advantage - advantage.mean()) / (advantage.std() + 1e-6)

        policy_loss = -(logprob_tensor * advantage).mean()
        value_loss = (returns_tensor - values_tensor).pow(2).mean()
        entropy_bonus = entropy_tensor.mean()
        loss = policy_loss + 0.35 * value_loss - 0.004 * entropy_bonus
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.7)
        optimizer.step()

        history.append(
            {
                "update": update_index + 1,
                "loss": float(loss.detach()),
                "policyLoss": float(policy_loss.detach()),
                "valueLoss": float(value_loss.detach()),
                "entropy": float(entropy_bonus.detach()),
                "rewardMean": float(np.mean(reward_sum)),
                "maxStrictScore": float(max_score),
                "maxHeldSeconds": float(max_held),
                "solvedOneSecond": bool(max_held >= 1.0),
            }
        )

    env.close()
    hold_eval = evaluate(policy, mjcf_xml, links, nworld, rollout_steps, "hold")
    down_eval = evaluate(policy, mjcf_xml, links, nworld, rollout_steps, "down")
    return {
        "schema": "six-pendulum-mjwarp-local-recurrent-ppo-smoke-v1",
        "status": "training-smoke-passed",
        "algorithm": "tiny-local-recurrent-policy-gradient",
        "links": links,
        "nworld": nworld,
        "rolloutSteps": rollout_steps,
        "updates": updates,
        "pose": pose,
        "seed": seed,
        "elapsedSeconds": time.time() - started,
        "parameterCount": int(sum(parameter.numel() for parameter in policy.parameters())),
        "history": history,
        "evaluation": {
            "hold": hold_eval,
            "down": down_eval,
        },
        "gates": {
            "strictOneSecondRequired": True,
            "promoteToNextLink": bool(down_eval["solvedOneSecond"]),
        },
        "nextRequiredWork": [
            "Run this loop on GPU with larger nworld and proper PPO minibatch updates.",
            "Replace this tiny GRU with Puffer MinGRU/PufferNet when GPU is available.",
            "Promote link count only after down-start held-out validation exceeds one second.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Run a tiny local recurrent PPO smoke on the MJWarp env adapter.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=4)
    parser.add_argument("--rollout-steps", type=int, default=96)
    parser.add_argument("--updates", type=int, default=3)
    parser.add_argument("--pose", choices=["down", "hold"], default="hold")
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument(
        "--write-result",
        type=Path,
        default=Path("/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-local-ppo-smoke.json"),
    )
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = train(mjcf_path.read_text(), args.links, args.nworld, args.rollout_steps, args.updates, args.pose, args.seed)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
