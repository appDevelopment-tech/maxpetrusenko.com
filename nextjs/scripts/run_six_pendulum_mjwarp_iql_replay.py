#!/usr/bin/env python3
import argparse
import copy
import json
import time
from pathlib import Path

import numpy as np

from run_six_pendulum_mjwarp_awac_replay import TwinCriticBuilder, flatten_window_transitions
from run_six_pendulum_mjwarp_awr_sequence import attach_window_returns
from run_six_pendulum_mjwarp_filtered_bc import collect_hold_anchor
from run_six_pendulum_mjwarp_phase_balanced_bc import DEFAULT_TEACHER_SOURCE, DEFAULT_WARMSTART
from run_six_pendulum_mjwarp_phase_sequence_bc import select_phase_windows
from run_six_pendulum_mjwarp_replay_ver_bc import (
    DEFAULT_CHECKPOINT_DIR,
    evaluate_policy,
    load_policy_from_checkpoint,
)
from six_pendulum_mjwarp_gpu_kernels import OBS_DIM
from train_six_pendulum_mjwarp_device_ppo import (
    collect_parameterized_teacher_labeled_trajectory,
    load_parameterized_teacher_configs,
)


DEFAULT_OUTPUT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-iql-replay-f160-20260611.json"
DEFAULT_CHECKPOINT = DEFAULT_CHECKPOINT_DIR / "puffer-mjwarp-device-ppo-link1-iql-replay-f160-20260611.pt"


def expectile_loss(diff, expectile: float):
    import torch

    weight = torch.where(diff > 0.0, float(expectile), 1.0 - float(expectile))
    return weight * diff.pow(2)


def build_value_net(obs_dim: int, hidden_dim: int):
    import torch

    return torch.nn.Sequential(
        torch.nn.Linear(int(obs_dim), int(hidden_dim)),
        torch.nn.LayerNorm(int(hidden_dim)),
        torch.nn.GELU(),
        torch.nn.Linear(int(hidden_dim), int(hidden_dim)),
        torch.nn.GELU(),
        torch.nn.Linear(int(hidden_dim), 1),
    )


def train_iql_replay(policy, old_policy, transitions, anchor_obs: np.ndarray, args: argparse.Namespace, hidden_dim: int):
    import torch
    import torch.nn.functional as F

    obs_np, actions_np, rewards_np, next_obs_np, phase_weights_np, stats = transitions
    if obs_np.shape[0] == 0:
        return {"stats": stats, "criticLosses": [], "valueLosses": [], "actorLosses": []}

    policy.train()
    critic = TwinCriticBuilder.build(OBS_DIM, int(args.critic_hidden_dim))
    value_net = build_value_net(OBS_DIM, int(args.value_hidden_dim))
    critic_optimizer = torch.optim.AdamW(critic.parameters(), lr=float(args.critic_learning_rate), weight_decay=1e-5)
    value_optimizer = torch.optim.AdamW(value_net.parameters(), lr=float(args.value_learning_rate), weight_decay=1e-5)
    actor_optimizer = torch.optim.AdamW(policy.parameters(), lr=float(args.actor_learning_rate), weight_decay=1e-5)

    obs = torch.as_tensor(obs_np, dtype=torch.float32)
    actions = torch.as_tensor(actions_np, dtype=torch.float32)
    rewards = torch.as_tensor(rewards_np, dtype=torch.float32)
    next_obs = torch.as_tensor(next_obs_np, dtype=torch.float32)
    phase_weights = torch.as_tensor(phase_weights_np, dtype=torch.float32)
    anchor_t = torch.as_tensor(anchor_obs, dtype=torch.float32) if anchor_obs.shape[0] else None
    batch_size = min(int(args.batch_size), obs.shape[0])

    critic_losses = []
    value_losses = []
    marker_critic = {0, max(0, int(args.critic_epochs) // 2), max(0, int(args.critic_epochs) - 1)}
    for epoch in range(int(args.critic_epochs)):
        indices = torch.randint(0, obs.shape[0], (batch_size,))
        batch_obs = obs[indices]
        batch_actions = actions[indices]
        batch_rewards = rewards[indices]
        batch_next_obs = next_obs[indices]
        batch_weights = phase_weights[indices]

        q1, q2 = critic(batch_obs, batch_actions)
        with torch.no_grad():
            q_min = torch.minimum(q1, q2)
        v = value_net(batch_obs).reshape(-1)
        value_loss = (expectile_loss(q_min - v, float(args.expectile)) * batch_weights).mean()
        value_optimizer.zero_grad(set_to_none=True)
        value_loss.backward()
        value_grad_norm = float(torch.nn.utils.clip_grad_norm_(value_net.parameters(), float(args.grad_clip)).detach())
        value_optimizer.step()

        with torch.no_grad():
            next_v = value_net(batch_next_obs).reshape(-1)
            target_q = batch_rewards + float(args.gamma) * next_v
        q1, q2 = critic(batch_obs, batch_actions)
        critic_loss = ((q1 - target_q).pow(2) + (q2 - target_q).pow(2)) * batch_weights
        critic_loss = critic_loss.mean()
        critic_optimizer.zero_grad(set_to_none=True)
        critic_loss.backward()
        critic_grad_norm = float(torch.nn.utils.clip_grad_norm_(critic.parameters(), float(args.grad_clip)).detach())
        critic_optimizer.step()

        if epoch in marker_critic:
            critic_losses.append(
                {
                    "epoch": epoch + 1,
                    "criticLoss": float(critic_loss.detach()),
                    "targetQMean": float(target_q.mean()),
                    "q1Mean": float(q1.detach().mean()),
                    "q2Mean": float(q2.detach().mean()),
                    "gradNorm": critic_grad_norm,
                }
            )
            value_losses.append(
                {
                    "epoch": epoch + 1,
                    "valueLoss": float(value_loss.detach()),
                    "valueMean": float(v.detach().mean()),
                    "datasetQMean": float(q_min.detach().mean()),
                    "expectile": float(args.expectile),
                    "gradNorm": value_grad_norm,
                }
            )

    actor_losses = []
    marker_actor = {0, max(0, int(args.actor_epochs) // 2), max(0, int(args.actor_epochs) - 1)}
    for epoch in range(int(args.actor_epochs)):
        indices = torch.randint(0, obs.shape[0], (batch_size,))
        batch_obs = obs[indices]
        batch_actions = actions[indices]
        batch_weights = phase_weights[indices]
        hidden = torch.zeros(batch_size, int(hidden_dim), dtype=torch.float32)
        logprob, entropy, _value, _next_hidden = policy.evaluate_actions(batch_obs, hidden, batch_actions)
        with torch.no_grad():
            q1, q2 = critic(batch_obs, batch_actions)
            q_min = torch.minimum(q1, q2)
            v = value_net(batch_obs).reshape(-1)
            advantage = q_min - v
            iql_weight = torch.exp(advantage / max(float(args.advantage_beta), 1e-6))
            iql_weight = torch.clamp(iql_weight, min=float(args.min_weight), max=float(args.max_weight))
            iql_weight = iql_weight * batch_weights
        actor_loss = -(iql_weight * logprob).mean() - float(args.entropy_coef) * entropy.mean()
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
                    "entropy": float(entropy.detach().mean()),
                    "anchorLoss": float(anchor_loss.detach()),
                    "advantageMean": float(advantage.mean()),
                    "advantageMax": float(advantage.max()),
                    "weightMean": float(iql_weight.mean()),
                    "weightMax": float(iql_weight.max()),
                    "gradNorm": grad_norm,
                    "logStd": float(getattr(policy, "log_std").detach().reshape(-1)[0]) if hasattr(policy, "log_std") else None,
                }
            )
    policy.eval()
    return {"stats": stats, "criticLosses": critic_losses, "valueLosses": value_losses, "actorLosses": actor_losses}


def run_iql_replay(mjcf_xml: str, args: argparse.Namespace) -> dict:
    import torch

    started = time.time()
    torch.manual_seed(int(args.seed))
    np.random.seed(int(args.seed))
    rng = np.random.default_rng(int(args.seed))
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
    configs = load_parameterized_teacher_configs(args.teacher_source, args.teacher_limit)
    batches = []
    rollout_summaries = []
    for iteration in range(int(args.dagger_iterations)):
        observations, actions, summary = collect_parameterized_teacher_labeled_trajectory(
            mjcf_xml,
            policy if iteration > 0 else None,
            configs,
            links,
            args.nworld,
            args.teacher_steps,
            args.seed + 600_000 + iteration,
            hidden_dim,
            args.force_scale,
        )
        source_name = "teacher-visited" if iteration == 0 else f"learner-visited-{iteration}"
        batches.append((source_name, observations, actions))
        rollout_summaries.append(
            {
                "iteration": iteration + 1,
                "source": source_name,
                "policyVisitedStates": bool(iteration > 0),
                "teacherRollout": summary,
            }
        )
        print(json.dumps(rollout_summaries[-1], sort_keys=True), flush=True)

    windows, window_summary = select_phase_windows(
        batches,
        args.window_steps,
        args.pre_steps,
        args.max_windows_per_phase,
        rng,
    )
    returns_summary = attach_window_returns(windows, args.gamma)
    transitions = flatten_window_transitions(windows)
    anchor_obs, hold_anchor = collect_hold_anchor(mjcf_xml, old_policy, args, links, hidden_dim)
    if transitions[0].shape[0] == 0:
        iql = {"stats": transitions[-1], "criticLosses": [], "valueLosses": [], "actorLosses": []}
        after_eval = before_eval
        status = "no-iql-transitions"
    else:
        iql = train_iql_replay(policy, old_policy, transitions, anchor_obs, args, hidden_dim)
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
        status = "iql-replay-finished"

    if args.write_checkpoint and transitions[0].shape[0] > 0:
        args.write_checkpoint.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "schema": "six-pendulum-mjwarp-iql-replay-policy-checkpoint-v1",
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
        "schema": "six-pendulum-mjwarp-iql-replay-v1",
        "status": status,
        "algorithm": "phase-balanced-parameterized-teacher-dagger-iql-in-sample-critic-replay",
        "links": links,
        "nworld": int(args.nworld),
        "teacherSteps": int(args.teacher_steps),
        "evalSteps": int(args.eval_steps),
        "seed": int(args.seed),
        "forceScale": float(args.force_scale),
        "policyKind": policy_kind,
        "policyParameters": int(sum(parameter.numel() for parameter in policy.parameters())),
        "warmstartCheckpoint": checkpoint,
        "teacherSource": str(args.teacher_source),
        "teacherConfigCount": int(len(configs)),
        "daggerIterations": int(args.dagger_iterations),
        "rollouts": rollout_summaries,
        "sequenceReplay": window_summary,
        "returns": returns_summary,
        "transitions": iql["stats"],
        "holdAnchor": hold_anchor,
        "iql": {
            "criticHiddenDim": int(args.critic_hidden_dim),
            "valueHiddenDim": int(args.value_hidden_dim),
            "criticEpochs": int(args.critic_epochs),
            "actorEpochs": int(args.actor_epochs),
            "batchSize": int(args.batch_size),
            "criticLearningRate": float(args.critic_learning_rate),
            "valueLearningRate": float(args.value_learning_rate),
            "actorLearningRate": float(args.actor_learning_rate),
            "gamma": float(args.gamma),
            "expectile": float(args.expectile),
            "advantageBeta": float(args.advantage_beta),
            "minWeight": float(args.min_weight),
            "maxWeight": float(args.max_weight),
            "entropyCoef": float(args.entropy_coef),
            "holdAnchorWeight": float(args.hold_anchor_weight),
            "criticLosses": iql["criticLosses"],
            "valueLosses": iql["valueLosses"],
            "actorLosses": iql["actorLosses"],
        },
        "evaluationBefore": before_eval,
        "evaluationAfter": after_eval,
        "checkpoint": {
            "written": bool(args.write_checkpoint and transitions[0].shape[0] > 0),
            "path": str(args.write_checkpoint) if args.write_checkpoint and transitions[0].shape[0] > 0 else None,
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
            "IQL is added because AWAC still used current-policy actions for a Q baseline, which can overestimate unsupported actions.",
            "This lane fits in-sample V and Q on teacher/learner transitions, then extracts the actor with advantage-weighted behavior cloning.",
            "Teacher labels remain scaffolding only; only held-out learned exact down-start evaluation can count.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="IQL-style in-sample critic replay repair for MJWarp one-link down-start.")
    parser.add_argument("--links", type=int, default=1)
    parser.add_argument("--nworld", type=int, default=8)
    parser.add_argument("--teacher-steps", type=int, default=1024)
    parser.add_argument("--dagger-iterations", type=int, default=2)
    parser.add_argument("--eval-steps", type=int, default=1600)
    parser.add_argument("--force-scale", type=float, default=160.0)
    parser.add_argument("--policy-hidden-dim", type=int, default=0)
    parser.add_argument("--seed", type=int, default=426210)
    parser.add_argument("--warmstart-checkpoint", type=Path, default=DEFAULT_WARMSTART)
    parser.add_argument("--teacher-source", type=Path, default=DEFAULT_TEACHER_SOURCE)
    parser.add_argument("--teacher-limit", type=int, default=8)
    parser.add_argument("--window-steps", type=int, default=256)
    parser.add_argument("--pre-steps", type=int, default=192)
    parser.add_argument("--max-windows-per-phase", type=int, default=64)
    parser.add_argument("--hold-anchor-steps", type=int, default=1024)
    parser.add_argument("--hold-anchor-weight", type=float, default=0.08)
    parser.add_argument("--critic-hidden-dim", type=int, default=256)
    parser.add_argument("--value-hidden-dim", type=int, default=256)
    parser.add_argument("--critic-epochs", type=int, default=80)
    parser.add_argument("--actor-epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=2048)
    parser.add_argument("--anchor-batch-size", type=int, default=512)
    parser.add_argument("--critic-learning-rate", type=float, default=0.0001)
    parser.add_argument("--value-learning-rate", type=float, default=0.0001)
    parser.add_argument("--actor-learning-rate", type=float, default=0.000004)
    parser.add_argument("--gamma", type=float, default=0.997)
    parser.add_argument("--expectile", type=float, default=0.75)
    parser.add_argument("--advantage-beta", type=float, default=1.0)
    parser.add_argument("--min-weight", type=float, default=0.05)
    parser.add_argument("--max-weight", type=float, default=6.0)
    parser.add_argument("--entropy-coef", type=float, default=0.002)
    parser.add_argument("--grad-clip", type=float, default=0.7)
    parser.add_argument("--eval-stochastic-passes", type=int, default=4)
    parser.add_argument("--write-result", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    args = parser.parse_args()

    mjcf_path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{args.links}_link.xml")
    if not mjcf_path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {mjcf_path}")
    result = run_iql_replay(mjcf_path.read_text(), args)
    args.write_result.parent.mkdir(parents=True, exist_ok=True)
    args.write_result.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
