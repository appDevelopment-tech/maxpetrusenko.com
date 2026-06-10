import json
import math
import time

import modal


app = modal.App("six-pendulum-pezzza-chain-train")
image = modal.Image.debian_slim(python_version="3.11").pip_install("torch==2.7.1", "numpy==2.2.6")


@app.function(image=image, gpu="L4", timeout=7200)
def train_policy(
    smoke: bool = True,
    seed: int = 426410,
    links: int = 2,
    control_hz: int = 240,
    population: int = 1024,
    generations: int = 24,
) -> str:
    import torch

    started = time.time()
    safe_links = max(1, min(2, int(links)))
    safe_control_hz = max(60, min(480, int(control_hz)))
    safe_population = max(256, min(4096, int(population)))
    safe_generations = max(4, min(160, int(generations)))

    torch.manual_seed(seed + safe_links + safe_control_hz + safe_population + safe_generations)
    torch.set_float32_matmul_precision("high")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    dt = 1.0 / float(safe_control_hz)
    horizon_seconds = 7.0 if smoke else 14.0
    steps = int(horizon_seconds * safe_control_hz)
    hidden = 20
    knot_count = 32
    input_count = 4 + safe_links * 3 + max(0, safe_links - 1) * 2
    output_count = 1
    param_count = knot_count + input_count * hidden + hidden + hidden * output_count + output_count
    elite_count = max(32, min(256, safe_population // 16))
    action_scale = 42.0
    track_limit = 2.4
    hold_angle = 0.16
    bend_angle = 0.14

    mean = torch.zeros(param_count, device=device)
    sigma = torch.tensor(1.2, device=device)
    best_params = mean.clone()
    best_selection = torch.tensor(-1e9, device=device)

    def unpack(params):
        cursor = 0
        knots = params[:, cursor : cursor + knot_count]
        cursor += knot_count
        w1 = params[:, cursor : cursor + input_count * hidden].view(-1, input_count, hidden)
        cursor += input_count * hidden
        b1 = params[:, cursor : cursor + hidden]
        cursor += hidden
        w2 = params[:, cursor : cursor + hidden * output_count].view(-1, hidden, output_count)
        cursor += hidden * output_count
        b2 = params[:, cursor : cursor + output_count]
        return knots, w1, b1, w2, b2

    def policy(params, x, xdot, theta, omega, last_action, tick):
        knots, w1, b1, w2, b2 = unpack(params)
        t_norm = torch.full_like(x, float(tick) / max(steps - 1, 1))
        knot_pos = t_norm * float(knot_count - 1)
        left = torch.floor(knot_pos).long().clamp(0, knot_count - 1)
        right = (left + 1).clamp(0, knot_count - 1)
        mix = knot_pos - left.float()
        base = knots.gather(1, left.view(-1, 1)).squeeze(1) * (1.0 - mix) + knots.gather(1, right.view(-1, 1)).squeeze(1) * mix

        features = [x / track_limit, xdot / 6.0]
        for index in range(safe_links):
            features.extend([torch.sin(theta[:, index]), torch.cos(theta[:, index]), omega[:, index] / 10.0])
        for index in range(1, safe_links):
            relative = theta[:, index] - theta[:, index - 1]
            features.extend([torch.sin(relative), torch.cos(relative)])
        features.extend([last_action / action_scale, t_norm])
        obs = torch.stack(features, dim=1)
        h = torch.tanh(torch.bmm(obs.unsqueeze(1), w1).squeeze(1) + b1)
        feedback = torch.bmm(h.unsqueeze(1), w2).squeeze(1).squeeze(1) + b2.squeeze(1)
        return torch.tanh(base + feedback) * action_scale

    def initial_state(batch, active_links, pose):
        x = torch.randn(batch, device=device) * 0.025
        xdot = torch.randn(batch, device=device) * 0.04
        theta = torch.zeros((batch, safe_links), device=device)
        omega = torch.zeros((batch, safe_links), device=device)
        if pose == "hold":
            theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.08
            omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.08
        else:
            theta[:, :active_links] = math.pi + torch.randn(batch, active_links, device=device) * 0.04
            if active_links > 1:
                theta[:, 1:active_links] -= torch.arange(1, active_links, device=device).view(1, -1) * 0.05
            theta = torch.remainder(theta + math.pi, 2 * math.pi) - math.pi
            omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.05
        return x, xdot, theta, omega

    def step_chain(x, xdot, theta, omega, action, active_links, gravity, cart_damping, hinge_damping):
        active = torch.zeros((theta.shape[0], safe_links), device=device)
        active[:, :active_links] = 1.0
        force = action - cart_damping * xdot - 0.35 * x
        for index in range(active_links):
            force -= torch.sin(theta[:, index]) * (index + 1) * 0.11
        cart_acc = force
        xdot = torch.clamp(xdot + cart_acc * dt, -8.0, 8.0)
        x = torch.clamp(x + xdot * dt, -track_limit * 1.2, track_limit * 1.2)

        next_theta = theta.clone()
        next_omega = omega.clone()
        for index in range(active_links):
            length = 0.52 + index * 0.05
            prev = theta[:, index - 1] if index > 0 else theta[:, index]
            nxt = theta[:, index + 1] if index + 1 < active_links else theta[:, index]
            coupling = (prev + nxt - theta[:, index] * 2.0) * (1.65 + index * 0.25)
            drive = (-cart_acc * torch.cos(theta[:, index]) * (0.47 + index * 0.05)) / length
            angular_acc = gravity * torch.sin(theta[:, index]) / length + drive + coupling - hinge_damping * omega[:, index]
            next_omega[:, index] = torch.clamp(omega[:, index] + angular_acc * dt, -24.0, 24.0)
            next_theta[:, index] = torch.remainder(theta[:, index] + next_omega[:, index] * dt + math.pi, 2 * math.pi) - math.pi
        next_theta = next_theta * active
        next_omega = next_omega * active
        return x, xdot, next_theta, next_omega

    def strict_mask(x, theta, omega, active_links):
        active_theta = theta[:, :active_links]
        active_omega = omega[:, :active_links]
        max_upright = active_theta.abs().max(dim=1).values
        if active_links > 1:
            max_bend = (active_theta[:, 1:] - active_theta[:, :-1]).abs().max(dim=1).values
        else:
            max_bend = torch.zeros_like(max_upright)
        max_omega = active_omega.abs().max(dim=1).values
        return (max_upright < hold_angle) & (max_bend < bend_angle) & (max_omega < 4.5) & (x.abs() < 1.2)

    def evaluate(params, stage, validation=False):
        batch = params.shape[0]
        active_links = int(stage["links"])
        gravity = stage["gravity"]
        cart_damping = stage["cartDamping"]
        hinge_damping = stage["hingeDamping"]
        pose = stage.get("pose", "down")
        if stage.get("randomHorizon", False) and not validation:
            horizon_steps = torch.randint(int(steps * 0.65), steps + 1, (batch,), device=device)
        else:
            horizon_steps = torch.full((batch,), steps, device=device, dtype=torch.long)

        x, xdot, theta, omega = initial_state(batch, active_links, pose)
        reward = torch.zeros(batch, device=device)
        hold_run = torch.zeros(batch, device=device)
        max_hold = torch.zeros(batch, device=device)
        whiplash = torch.zeros(batch, device=device)
        center_bonus = torch.zeros(batch, device=device)
        bend_bonus = torch.zeros(batch, device=device)
        last_action = torch.zeros(batch, device=device)
        last_hold_run = torch.zeros(batch, device=device)
        action_delta_sum = torch.zeros(batch, device=device)

        for tick in range(steps):
            active_step = (tick < horizon_steps).float()
            action = policy(params, x, xdot, theta, omega, last_action, tick) * active_step
            x, xdot, theta, omega = step_chain(x, xdot, theta, omega, action, active_links, gravity, cart_damping, hinge_damping)
            active_theta = theta[:, :active_links]
            active_omega = omega[:, :active_links]
            upright_error = active_theta.abs().mean(dim=1)
            max_upright = active_theta.abs().max(dim=1).values
            if active_links > 1:
                bend_error = (active_theta[:, 1:] - active_theta[:, :-1]).abs().mean(dim=1)
                max_bend = (active_theta[:, 1:] - active_theta[:, :-1]).abs().max(dim=1).values
            else:
                bend_error = torch.zeros_like(upright_error)
                max_bend = torch.zeros_like(upright_error)
            strict = strict_mask(x, theta, omega, active_links)
            near_top = (max_upright < 0.72) & (max_bend < 0.55)
            whip_event = near_top.float() * (active_omega.abs().max(dim=1).values > 1.2).float() * (x.abs() < 1.55).float() * active_step
            hold_run = torch.where(strict & active_step.bool(), hold_run + dt, torch.zeros_like(hold_run))
            max_hold = torch.maximum(max_hold, hold_run)
            whiplash += whip_event * dt
            center_bonus += torch.relu(1.0 - x.abs() / track_limit) * dt * active_step
            bend_bonus += torch.exp(-bend_error * 3.0) * near_top.float() * dt * active_step

            loss_of_balance = ((last_hold_run > 0.12) & (~strict) & (max_upright < 0.4)).float()
            reward += torch.exp(-upright_error * 1.6 - bend_error * 2.8 - active_omega.abs().mean(dim=1) * 0.035) * 0.035 * active_step
            reward += torch.relu(torch.cos(active_theta).mean(dim=1) - 0.35) * torch.relu(active_omega.abs().mean(dim=1) - 0.6) * 0.018 * active_step
            reward += whip_event * 0.12
            reward += strict.float() * (0.75 + hold_run.pow(2.0) * 3.5) * active_step
            reward += bend_bonus * 0.18
            reward -= x.abs() * 0.008 * active_step
            reward -= (action / action_scale).square() * 0.0025 * active_step
            reward -= loss_of_balance * 0.35 * active_step
            action_delta_sum += (action - last_action).abs() * active_step
            last_action = action
            last_hold_run = hold_run

        smooth_penalty = action_delta_sum / max(steps, 1) / action_scale
        selection = (
            reward
            + max_hold * (150.0 + active_links * 40.0)
            + (max_hold >= 1.0).float() * (420.0 + active_links * 180.0)
            + whiplash.clamp(max=1.5) * (14.0 + active_links * 4.0)
            + center_bonus / horizon_seconds * 4.0
            + bend_bonus / horizon_seconds * (8.0 if active_links > 1 else 1.0)
            - smooth_penalty * 4.5
        )
        if validation:
            return {
                "selection": selection,
                "maxHoldSeconds": max_hold,
                "solvedOneSecond": (max_hold >= 1.0).float(),
                "whiplashSeconds": whiplash,
                "centerRatio": center_bonus / horizon_seconds,
                "bendRatio": bend_bonus / horizon_seconds,
                "smoothPenalty": smooth_penalty,
                "horizonSeconds": horizon_steps.float().mean() * dt,
            }
        return selection

    def summarize(metrics, active_links):
        max_hold = float(metrics["maxHoldSeconds"].mean().detach().cpu())
        max_hold_p10 = float(torch.quantile(metrics["maxHoldSeconds"], 0.1).detach().cpu())
        solved_rate = float(metrics["solvedOneSecond"].mean().detach().cpu())
        center_ratio = float(metrics["centerRatio"].mean().detach().cpu())
        bend_ratio = float(metrics["bendRatio"].mean().detach().cpu())
        smooth_penalty = float(metrics["smoothPenalty"].mean().detach().cpu())
        strict_score = 0.0
        if max_hold >= 1.0:
            strict_score = (
                100.0 * solved_rate
                + 10.0 * min(max_hold, horizon_seconds)
                + 5.0 * min(max_hold_p10, horizon_seconds)
                + (12.0 * bend_ratio if active_links > 1 else 0.0)
                - max(0.0, 0.62 - center_ratio) * 10.0
                - smooth_penalty
            )
        return {
            "strictScore": strict_score,
            "maxHoldSeconds": max_hold,
            "maxHoldSecondsP10": max_hold_p10,
            "solvedOneSecondRate": solved_rate,
            "whiplashSeconds": float(metrics["whiplashSeconds"].mean().detach().cpu()),
            "centerRatio": center_ratio,
            "bendRatio": bend_ratio,
            "smoothPenalty": smooth_penalty,
            "selection": float(metrics["selection"].mean().detach().cpu()),
            "horizonSeconds": float(metrics["horizonSeconds"].detach().cpu()),
        }

    stages = [
        {"name": "one-link-schema-pretrain", "links": 1, "pose": "down", "gravity": 7.2, "cartDamping": 0.14, "hingeDamping": 0.08, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-hold", "links": safe_links, "pose": "hold", "gravity": 4.8, "cartDamping": 0.20, "hingeDamping": 0.16, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-low-gravity", "links": safe_links, "pose": "down", "gravity": 4.8, "cartDamping": 0.18, "hingeDamping": 0.12, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-normal", "links": safe_links, "pose": "down", "gravity": 9.81, "cartDamping": 0.08, "hingeDamping": 0.03, "generations": safe_generations, "randomHorizon": True},
    ]

    history = []
    experiment_dots = []
    randomized_horizon_ready = False
    for stage in stages:
        for generation in range(stage["generations"]):
            stage_for_eval = {**stage, "randomHorizon": bool(stage.get("randomHorizon", False) and randomized_horizon_ready)}
            params = mean.view(1, -1) + torch.randn(safe_population, param_count, device=device) * sigma
            selection = evaluate(params, stage_for_eval)
            values, indices = torch.topk(selection, elite_count)
            elites = params[indices]
            mean = elites.mean(dim=0)
            sigma = torch.maximum(sigma * 0.965, torch.tensor(0.05, device=device))
            if values[0] > best_selection:
                best_selection = values[0]
                best_params = elites[0].clone()
            if generation % 4 == 0 or generation == stage["generations"] - 1:
                eval_params = best_params.view(1, -1).repeat(96 if smoke else 256, 1)
                metrics = evaluate(eval_params, stage, validation=True)
                summary = summarize(metrics, int(stage["links"]))
                if int(stage["links"]) == safe_links and summary["whiplashSeconds"] >= 0.10 and summary["solvedOneSecondRate"] < 0.5:
                    randomized_horizon_ready = True
                line = {
                    "stage": stage["name"],
                    "links": int(stage["links"]),
                    "pose": stage["pose"],
                    "gravity": stage["gravity"],
                    "randomizedHorizon": stage_for_eval["randomHorizon"],
                    "generation": generation,
                    "sigma": float(sigma.detach().cpu()),
                    "bestSelection": float(best_selection.detach().cpu()),
                    "eliteSelection": float(values[0].detach().cpu()),
                    "wallclockSeconds": round(time.time() - started, 3),
                    **summary,
                }
                print(json.dumps(line), flush=True)
                history.append(line)
                experiment_dots.append(
                    {
                        "runId": f"{seed}_chain_{safe_links}_{safe_control_hz}_{safe_population}_{safe_generations}_{stage['name']}_{generation}",
                        "algorithm": "modal-pezzza-style-chain-evolution",
                        "modelType": "pezzzaChainKnotMlp",
                        "links": safe_links,
                        "stage": stage["name"],
                        "seed": seed,
                        "wallclockSeconds": line["wallclockSeconds"],
                        "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else "cpu",
                        "train": {
                            "population": safe_population,
                            "eliteCount": elite_count,
                            "generations": safe_generations,
                            "controlHz": safe_control_hz,
                            "horizonSeconds": horizon_seconds,
                            "randomizedHorizon": stage_for_eval["randomHorizon"],
                        },
                        "metrics": summary,
                    }
                )
        mean = best_params * 0.70 + mean * 0.30

    final_stage = {"name": "validation-two-link-normal-down", "links": safe_links, "pose": "down", "gravity": 9.81, "cartDamping": 0.08, "hingeDamping": 0.03, "generations": 0, "randomHorizon": False}
    final_params = best_params.view(1, -1).repeat(256 if smoke else 1024, 1)
    final_metrics = evaluate(final_params, final_stage, validation=True)
    final_summary = summarize(final_metrics, safe_links)
    knots, w1, b1, w2, b2 = unpack(best_params.view(1, -1))

    output = {
        "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "policyVersion": 1,
        "algorithm": "modal-pezzza-style-chain-evolution",
        "environment": f"{safe_links}-link-vectorized-cartpole-down-start",
        "modelType": "pezzzaChainKnotMlp",
        "links": safe_links,
        "inputCount": input_count,
        "knotCount": knot_count,
        "hidden": hidden,
        "forceScale": action_scale,
        "controlHz": safe_control_hz,
        "dt": dt,
        "horizonSeconds": horizon_seconds,
        "knots": knots.squeeze(0).detach().cpu().tolist(),
        "layers": [
            {"weights": w1.squeeze(0).detach().cpu().tolist(), "bias": b1.squeeze(0).detach().cpu().tolist(), "activation": "tanh"},
            {"weights": w2.squeeze(0).detach().cpu().tolist(), "bias": b2.squeeze(0).detach().cpu().tolist(), "activation": "tanh"},
        ],
        "training": {
            "device": str(device),
            "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else "cpu",
            "torch": torch.__version__,
            "elapsedSeconds": round(time.time() - started, 3),
            "smoke": smoke,
            "seed": seed,
            "population": safe_population,
            "eliteCount": elite_count,
            "generations": safe_generations,
            "stages": stages,
            "history": history,
            "experimentDots": experiment_dots,
            "validation": final_summary,
            "score": "strictScore is zero unless mean maxHoldSeconds is at least 1.0; subsecond holds are diagnostic only",
            "nextGate": "do not promote to three links until two-link down-start solved rate and P10 hold pass",
        },
    }
    return json.dumps(output, indent=2)


@app.local_entrypoint()
def main(smoke: bool = True, links: int = 2, control_hz: int = 240, population: int = 1024, generations: int = 24):
    return train_policy.remote(smoke, 426410, links, control_hz, population, generations)
