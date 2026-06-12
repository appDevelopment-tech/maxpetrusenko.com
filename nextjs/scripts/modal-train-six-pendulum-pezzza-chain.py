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
    initial_policy_json: str = "",
    action_scale_override: float = 42.0,
    cart_center_spring_override: float = 0.35,
    include_disturbance_training: bool = False,
    policy_clock_seconds_override: float = 0.0,
    preserve_feedback_time: bool = False,
) -> str:
    import torch

    started = time.time()
    safe_links = max(1, min(6, int(links)))
    safe_control_hz = max(60, min(480, int(control_hz)))
    safe_population = max(256, min(4096, int(population)))
    safe_generations = max(4, min(160, int(generations)))

    torch.manual_seed(seed + safe_links + safe_control_hz + safe_population + safe_generations)
    torch.set_float32_matmul_precision("high")
    if torch.cuda.is_available():
        device = torch.device("cuda")
        device_name = torch.cuda.get_device_name(0)
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        device_name = "apple-mps"
    else:
        device = torch.device("cpu")
        device_name = "cpu"

    dt = 1.0 / float(safe_control_hz)
    horizon_seconds = 7.0 if smoke else 14.0
    steps = int(horizon_seconds * safe_control_hz)
    hidden = 20
    knot_count = 32
    source_meta = {}
    if initial_policy_json:
        try:
            source_meta = json.loads(initial_policy_json)
        except json.JSONDecodeError:
            source_meta = {}
    source_links_meta = int(source_meta.get("links", 0) or 0)
    source_input_count_meta = int(source_meta.get("inputCount", 0) or 0)
    expected_source_with_time = 4 + max(1, source_links_meta) * 3 + max(0, source_links_meta - 1) * 2
    feedback_uses_time = bool(
        preserve_feedback_time
        and source_meta.get("algorithm") == "modal-pezzza-style-chain-evolution"
        and source_links_meta == safe_links
        and source_input_count_meta >= expected_source_with_time
    )
    input_count = (4 if feedback_uses_time else 3) + safe_links * 3 + max(0, safe_links - 1) * 2
    output_count = 1
    param_count = knot_count + input_count * hidden + hidden + hidden * output_count + output_count
    elite_count = max(48, min(256, safe_population // 12))
    action_scale = max(24.0, min(180.0, float(action_scale_override)))
    cart_center_spring = max(0.02, min(0.75, float(cart_center_spring_override)))
    track_limit = 2.4
    hold_angle = 0.16
    bend_angle = 0.14

    source_chain_warm_start = False
    policy_clock_seconds = horizon_seconds

    def build_warm_start(raw_json):
        nonlocal policy_clock_seconds, source_chain_warm_start
        if not raw_json:
            return None
        try:
            source = json.loads(raw_json)
        except json.JSONDecodeError:
            return None
        if (
            source.get("algorithm") == "modal-pezzza-style-chain-evolution"
            and 1 <= int(source.get("links", 0)) <= safe_links
            and source.get("knotCount") == knot_count
            and source.get("hidden") == hidden
            and source.get("layers")
            and source.get("knots")
        ):
            source_links = int(source["links"])
            source_input_count = int(source.get("inputCount", 4 + source_links * 3 + max(0, source_links - 1) * 2))
            warm = torch.zeros(param_count, device=device)
            source_knots = torch.tensor(source["knots"], device=device, dtype=torch.float32)
            source_w1 = torch.tensor(source["layers"][0]["weights"], device=device, dtype=torch.float32)
            source_b1 = torch.tensor(source["layers"][0]["bias"], device=device, dtype=torch.float32)
            source_w2 = torch.tensor(source["layers"][1]["weights"], device=device, dtype=torch.float32)
            source_b2 = torch.tensor(source["layers"][1]["bias"], device=device, dtype=torch.float32)
            source_force_scale = float(source.get("forceScale", source.get("training", {}).get("actionScale", action_scale)))
            force_rescale = max(0.20, min(5.0, source_force_scale / action_scale))
            policy_clock_seconds = max(dt, float(source.get("policyClockSeconds", source.get("horizonSeconds", source.get("training", {}).get("horizonSeconds", horizon_seconds)))))
            source_knots = source_knots * force_rescale
            source_w2 = source_w2 * force_rescale
            source_b2 = source_b2 * force_rescale
            dest_w1 = torch.zeros((input_count, hidden), device=device)
            shared_links = min(source_links, safe_links)
            direct_pairs = [(0, 0), (1, 1)]
            for index in range(shared_links):
                source_offset = 2 + index * 3
                dest_offset = 2 + index * 3
                direct_pairs.extend((source_offset + part, dest_offset + part) for part in range(3))
            source_rel_offset = 2 + source_links * 3
            dest_rel_offset = 2 + safe_links * 3
            for index in range(1, shared_links):
                source_offset = source_rel_offset + (index - 1) * 2
                dest_offset = dest_rel_offset + (index - 1) * 2
                direct_pairs.extend([(source_offset, dest_offset), (source_offset + 1, dest_offset + 1)])
            source_time_input_count = 4 + source_links * 3 + max(0, source_links - 1) * 2
            source_last_action_index = source_input_count - 2 if source_input_count >= source_time_input_count else source_input_count - 1
            dest_last_action_index = input_count - 2 if feedback_uses_time else input_count - 1
            direct_pairs.append((source_last_action_index, dest_last_action_index))
            if feedback_uses_time and source_input_count >= source_time_input_count:
                direct_pairs.append((source_input_count - 1, input_count - 1))
            for source_index, dest_index in direct_pairs:
                if source_index < source_w1.shape[0] and dest_index < dest_w1.shape[0]:
                    dest_w1[dest_index, :] = source_w1[source_index, :]
            if source_links < safe_links:
                last_source_link = 2 + (source_links - 1) * 3
                last_source_rel = source_rel_offset + max(0, source_links - 2) * 2
                for index in range(source_links, safe_links):
                    dest_offset = 2 + index * 3
                    dest_w1[dest_offset + 0, :] = source_w1[last_source_link + 0, :] * 0.35
                    dest_w1[dest_offset + 1, :] = source_w1[last_source_link + 1, :] * 0.35
                    dest_w1[dest_offset + 2, :] = source_w1[last_source_link + 2, :] * 0.25
                    rel_offset = dest_rel_offset + (index - 1) * 2
                    if source_links > 1 and last_source_rel + 1 < source_w1.shape[0]:
                        dest_w1[rel_offset + 0, :] = source_w1[last_source_rel + 0, :] * 0.28
                        dest_w1[rel_offset + 1, :] = source_w1[last_source_rel + 1, :] * 0.28
                    else:
                        dest_w1[rel_offset + 0, :] = source_w1[last_source_link + 0, :] * 0.20
                        dest_w1[rel_offset + 1, :] = source_w1[last_source_link + 1, :] * 0.20
            cursor = 0
            warm[cursor : cursor + knot_count] = source_knots[:knot_count]
            cursor += knot_count
            warm[cursor : cursor + input_count * hidden] = dest_w1.reshape(-1)
            cursor += input_count * hidden
            warm[cursor : cursor + hidden] = source_b1
            cursor += hidden
            warm[cursor : cursor + hidden * output_count] = source_w2.reshape(-1)
            cursor += hidden * output_count
            warm[cursor : cursor + output_count] = source_b2
            source_chain_warm_start = True
            return warm
        if source.get("algorithm") != "modal-pezzza-style-evolution":
            return None
        if source.get("links") != 1 or not source.get("layers") or not source.get("knots"):
            return None

        warm = torch.zeros(param_count, device=device)
        source_knots = torch.tensor(source["knots"], device=device, dtype=torch.float32)
        knot_values = []
        for index in range(knot_count):
            position = index * max(0, source_knots.numel() - 1) / max(1, knot_count - 1)
            left = int(math.floor(position))
            right = min(left + 1, source_knots.numel() - 1)
            mix = position - left
            knot_values.append(source_knots[left] * (1.0 - mix) + source_knots[right] * mix)
        warm[:knot_count] = torch.stack(knot_values)

        source_w1 = torch.tensor(source["layers"][0]["weights"], device=device, dtype=torch.float32)
        source_b1 = torch.tensor(source["layers"][0]["bias"], device=device, dtype=torch.float32)
        source_w2 = torch.tensor(source["layers"][1]["weights"], device=device, dtype=torch.float32)
        source_b2 = torch.tensor(source["layers"][1]["bias"], device=device, dtype=torch.float32)
        source_force_scale = float(source.get("forceScale", source.get("training", {}).get("actionScale", action_scale)))
        force_rescale = max(0.20, min(5.0, source_force_scale / action_scale))
        policy_clock_seconds = max(dt, float(source.get("policyClockSeconds", source.get("horizonSeconds", source.get("training", {}).get("horizonSeconds", horizon_seconds)))))
        warm[:knot_count] *= force_rescale
        source_w2 = source_w2 * force_rescale
        source_b2 = source_b2 * force_rescale
        source_hidden = min(source_b1.numel(), hidden, source_w2.shape[0])
        dest_w1 = torch.zeros((input_count, hidden), device=device)
        dest_b1 = torch.zeros(hidden, device=device)
        dest_w2 = torch.zeros((hidden, output_count), device=device)
        dest_b2 = torch.zeros(output_count, device=device)

        last_action_index = input_count - 2 if feedback_uses_time else input_count - 1
        direct_pairs = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, last_action_index)]
        if feedback_uses_time and source_w1.shape[0] >= 7:
            direct_pairs.append((6, input_count - 1))
        for source_index, dest_index in direct_pairs:
            dest_w1[dest_index, :source_hidden] = source_w1[source_index, :source_hidden]
        if safe_links > 1:
            second_link_offset = 2 + 3
            dest_w1[second_link_offset + 0, :source_hidden] = source_w1[2, :source_hidden] * 0.35
            dest_w1[second_link_offset + 1, :source_hidden] = source_w1[3, :source_hidden] * 0.35
            dest_w1[second_link_offset + 2, :source_hidden] = source_w1[4, :source_hidden] * 0.35
            relative_offset = 2 + safe_links * 3
            dest_w1[relative_offset + 0, :source_hidden] = source_w1[2, :source_hidden] * 0.20
            dest_w1[relative_offset + 1, :source_hidden] = source_w1[3, :source_hidden] * 0.20

        dest_b1[:source_hidden] = source_b1[:source_hidden]
        dest_w2[:source_hidden, 0] = source_w2[:source_hidden, 0]
        dest_b2[0] = source_b2[0]

        cursor = knot_count
        warm[cursor : cursor + input_count * hidden] = dest_w1.reshape(-1)
        cursor += input_count * hidden
        warm[cursor : cursor + hidden] = dest_b1
        cursor += hidden
        warm[cursor : cursor + hidden * output_count] = dest_w2.reshape(-1)
        cursor += hidden * output_count
        warm[cursor : cursor + output_count] = dest_b2
        return warm

    warm_start = build_warm_start(initial_policy_json)
    if policy_clock_seconds_override > 0.0:
        policy_clock_seconds = max(dt, float(policy_clock_seconds_override))
    mean = warm_start.clone() if warm_start is not None else torch.zeros(param_count, device=device)
    sigma = torch.tensor(0.55 if warm_start is not None else 1.2, device=device)
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

    def angle_delta(a, b):
        return torch.atan2(torch.sin(a - b), torch.cos(a - b))

    def policy(params, x, xdot, theta, omega, last_action, tick, base_top_fade_strength=0.0):
        knots, w1, b1, w2, b2 = unpack(params)
        if torch.is_tensor(tick):
            t_norm = (tick.to(device=device, dtype=torch.float32) * dt / max(policy_clock_seconds, dt)).clamp(0.0, 1.0)
        else:
            t_norm = torch.full_like(x, float(tick) * dt / max(policy_clock_seconds, dt)).clamp(0.0, 1.0)
        knot_pos = t_norm * float(knot_count - 1)
        left = torch.floor(knot_pos).long().clamp(0, knot_count - 1)
        right = (left + 1).clamp(0, knot_count - 1)
        mix = knot_pos - left.float()
        base = knots.gather(1, left.view(-1, 1)).squeeze(1) * (1.0 - mix) + knots.gather(1, right.view(-1, 1)).squeeze(1) * mix
        if base_top_fade_strength > 0.0:
            uprightness = torch.cos(theta[:, :safe_links]).mean(dim=1)
            base_fade = torch.clamp((0.5 - uprightness) / 0.5, 0.0, 1.0)
            base = base * (1.0 - float(base_top_fade_strength) * (1.0 - base_fade))

        features = [x / track_limit, xdot / 6.0]
        for index in range(safe_links):
            features.extend([torch.sin(theta[:, index]), torch.cos(theta[:, index]), omega[:, index] / 10.0])
        for index in range(1, safe_links):
            relative = angle_delta(theta[:, index], theta[:, index - 1])
            features.extend([torch.sin(relative), torch.cos(relative)])
        features.append(last_action / action_scale)
        if feedback_uses_time:
            features.append(t_norm)
        obs = torch.stack(features, dim=1)
        h = torch.tanh(torch.bmm(obs.unsqueeze(1), w1).squeeze(1) + b1)
        feedback = torch.bmm(h.unsqueeze(1), w2).squeeze(1).squeeze(1) + b2.squeeze(1)
        return torch.tanh(base + feedback) * action_scale

    def step_chain(x, xdot, theta, omega, action, active_links, gravity, cart_damping, hinge_damping):
        active = torch.zeros((theta.shape[0], safe_links), device=device)
        active[:, :active_links] = 1.0
        force = action - cart_damping * xdot - cart_center_spring * x
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
            coupling = (angle_delta(prev, theta[:, index]) + angle_delta(nxt, theta[:, index])) * (1.65 + index * 0.25)
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
            max_bend = angle_delta(active_theta[:, 1:], active_theta[:, :-1]).abs().max(dim=1).values
        else:
            max_bend = torch.zeros_like(max_upright)
        max_omega = active_omega.abs().max(dim=1).values
        weights = torch.arange(1, active_links + 1, device=device, dtype=torch.float32).view(1, -1)
        angle_error = (active_theta.abs() * weights).sum(dim=1)
        velocity_error = active_omega.abs().sum(dim=1)
        browser_score = 100.0 - angle_error * 12.0 - max_bend * 30.0 - velocity_error * 2.5 - x.abs() * 8.0
        return (
            (browser_score > 82.0)
            & (max_upright < hold_angle)
            & (max_bend < bend_angle)
            & (max_omega < 4.5)
            & (x.abs() < 1.2)
        )

    replay_bank = None

    def evaluate(params, stage, validation=False):
        batch = params.shape[0]
        active_links = int(stage["links"])
        gravity = stage["gravity"]
        cart_damping = stage["cartDamping"]
        hinge_damping = stage["hingeDamping"]
        pose = stage.get("pose", "down")
        phase = stage.get("phase", "mixed")
        base_top_fade_strength = float(stage.get("baseTopFade", 0.0))
        stage_steps = max(int(1.5 * safe_control_hz), min(steps, int(steps * float(stage.get("horizonScale", 1.0)))))
        policy_tick_offset = int(max(0.0, min(0.95, float(stage.get("timeOffset", 0.0)))) * steps)
        if stage.get("randomHorizon", False) and not validation:
            min_fraction = 0.85 if active_links >= 4 else 0.65
            min_horizon = max(1, int(stage_steps * min_fraction))
            sampled_horizon = torch.randint(min_horizon, stage_steps + 1, (1,), device=device, dtype=torch.long)
            horizon_steps = sampled_horizon.expand(batch)
        else:
            horizon_steps = torch.full((batch,), stage_steps, device=device, dtype=torch.long)

        def initial_state_for_stage():
            x = torch.randn(batch, device=device) * 0.025
            xdot = torch.randn(batch, device=device) * 0.04
            theta = torch.zeros((batch, safe_links), device=device)
            omega = torch.zeros((batch, safe_links), device=device)
            initial_last_action = torch.zeros(batch, device=device)
            initial_tick = torch.zeros(batch, device=device)
            if pose == "exact_down":
                x.zero_()
                xdot.zero_()
                theta[:, :active_links] = math.pi
                omega.zero_()
            elif pose == "trajectory_replay" and replay_bank is not None and replay_bank["x"].numel() > 0:
                bank_indices = torch.arange(replay_bank["x"].shape[0], device=device)
                min_bucket = int(stage.get("replayMinBucket", 0))
                if min_bucket > 0 and "bucket" in replay_bank:
                    bucket_mask = replay_bank["bucket"] >= min_bucket
                    if bool(bucket_mask.any().detach().cpu()):
                        bank_indices = bank_indices[bucket_mask]
                    else:
                        best_bucket = replay_bank["bucket"].max()
                        bank_indices = bank_indices[replay_bank["bucket"] == best_bucket]
                bucket_weights = stage.get("replayBucketWeights")
                if bucket_weights and "bucket" in replay_bank:
                    selected_buckets = replay_bank["bucket"][bank_indices]
                    weights = torch.ones(selected_buckets.shape[0], device=device, dtype=torch.float32)
                    for bucket_value, bucket_weight in bucket_weights.items():
                        weights = torch.where(
                            selected_buckets == int(bucket_value),
                            torch.full_like(weights, float(bucket_weight)),
                            weights,
                        )
                    draw = torch.multinomial(weights.clamp_min(1e-6), batch, replacement=True)
                    indices = bank_indices[draw]
                else:
                    indices = bank_indices[torch.randint(0, bank_indices.numel(), (batch,), device=device)]
                x = replay_bank["x"][indices]
                xdot = replay_bank["xdot"][indices]
                theta = replay_bank["theta"][indices].clone()
                omega = replay_bank["omega"][indices].clone()
                initial_last_action = replay_bank["lastAction"][indices]
                initial_tick = replay_bank["tick"][indices].float()
                if not validation:
                    replay_noise = float(stage.get("replayNoise", 0.015))
                    x = x + torch.randn(batch, device=device) * replay_noise * 0.8
                    xdot = xdot + torch.randn(batch, device=device) * replay_noise * 3.0
                    theta[:, :active_links] = theta[:, :active_links] + torch.randn(batch, active_links, device=device) * replay_noise
                    theta = torch.remainder(theta + math.pi, 2 * math.pi) - math.pi
                    omega[:, :active_links] = omega[:, :active_links] + torch.randn(batch, active_links, device=device) * replay_noise * 8.0
                    tick_jitter = int(stage.get("replayTickJitter", 0))
                    if tick_jitter > 0:
                        initial_tick = (
                            initial_tick
                            + torch.randint(-tick_jitter, tick_jitter + 1, (batch,), device=device, dtype=torch.float32)
                        ).clamp(0, steps - 1)
            elif pose == "hold":
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.08
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.08
            elif pose == "strict_hold_jitter":
                x = torch.randn(batch, device=device) * 0.16
                xdot = torch.randn(batch, device=device) * 0.55
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.10
                if active_links > 1:
                    theta[:, 1:active_links] += torch.randn(batch, active_links - 1, device=device) * 0.055
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 1.10
            elif pose == "strict_hold_tiny_jitter":
                x = torch.randn(batch, device=device) * 0.035
                xdot = torch.randn(batch, device=device) * 0.10
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.025
                if active_links > 1:
                    theta[:, 1:active_links] += torch.randn(batch, active_links - 1, device=device) * 0.012
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.22
            elif pose == "recover":
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.22
                if active_links > 1:
                    theta[:, 1:active_links] += torch.randn(batch, active_links - 1, device=device) * 0.09
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 1.2
            elif pose == "near_top":
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.28
                if active_links > 1:
                    theta[:, 1:active_links] += torch.randn(batch, active_links - 1, device=device) * 0.12
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 2.2
            elif pose == "catch_flash":
                x = torch.randn(batch, device=device) * 0.35
                xdot = torch.randn(batch, device=device) * 1.5
                theta[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.18
                if active_links > 1:
                    theta[:, 1:active_links] += torch.randn(batch, active_links - 1, device=device) * 0.10
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 3.6
            else:
                start_angle_scale = float(stage.get("startAngleScale", 1.0))
                theta[:, :active_links] = math.pi * start_angle_scale + torch.randn(batch, active_links, device=device) * 0.04
                if active_links > 1:
                    theta[:, 1:active_links] -= torch.arange(1, active_links, device=device).view(1, -1) * 0.05
                theta = torch.remainder(theta + math.pi, 2 * math.pi) - math.pi
                omega[:, :active_links] = torch.randn(batch, active_links, device=device) * 0.05
            return x, xdot, theta, omega, initial_last_action, initial_tick

        x, xdot, theta, omega, last_action, start_tick = initial_state_for_stage()
        reward = torch.zeros(batch, device=device)
        hold_run = torch.zeros(batch, device=device)
        max_hold = torch.zeros(batch, device=device)
        whiplash = torch.zeros(batch, device=device)
        center_bonus = torch.zeros(batch, device=device)
        bend_bonus = torch.zeros(batch, device=device)
        last_hold_run = torch.zeros(batch, device=device)
        action_delta_sum = torch.zeros(batch, device=device)
        previous_height = torch.cos(theta[:, :active_links]).mean(dim=1)
        active_lengths = torch.tensor(
            [0.52 + index * 0.05 for index in range(active_links)],
            device=device,
            dtype=torch.float32,
        ).view(1, -1)
        previous_tip_height = (torch.cos(theta[:, :active_links]) * active_lengths).sum(dim=1) / active_lengths.sum()
        max_tip_height = previous_tip_height.clone()
        tip_progress = torch.zeros(batch, device=device)
        top_time = torch.zeros(batch, device=device)
        catch_run = torch.zeros(batch, device=device)
        max_catch = torch.zeros(batch, device=device)
        soft_catch_run = torch.zeros(batch, device=device)
        max_soft_catch = torch.zeros(batch, device=device)
        near_strict_run = torch.zeros(batch, device=device)
        max_near_strict = torch.zeros(batch, device=device)
        stack_bonus = torch.zeros(batch, device=device)
        symmetry_penalty = torch.zeros(batch, device=device)
        disturbance_force_fraction = float(stage.get("disturbanceForceFraction", 0.0))
        disturbance_start = int(stage_steps * float(stage.get("disturbanceStartFraction", 0.50)))
        disturbance_duration = max(1, int(float(stage.get("disturbanceDurationSeconds", 0.10)) / dt))
        disturbance_sign = torch.where(
            torch.arange(batch, device=device) % 2 == 0,
            torch.ones(batch, device=device),
            -torch.ones(batch, device=device),
        )

        for tick in range(steps):
            active_step = (tick < horizon_steps).float()
            action_delta = torch.zeros_like(last_action)
            policy_tick = torch.clamp(start_tick + tick + policy_tick_offset, max=steps - 1)
            action = policy(params, x, xdot, theta, omega, last_action, policy_tick, base_top_fade_strength) * active_step
            if active_links > 1 and tick % 6 == 0:
                mirrored_action = policy(
                    params,
                    -x,
                    -xdot,
                    -theta,
                    -omega,
                    -last_action,
                    policy_tick,
                    base_top_fade_strength,
                ) * active_step
                symmetry_penalty += ((action + mirrored_action) / action_scale).square() * active_step
            action_delta = (action - last_action).abs() / action_scale
            if disturbance_force_fraction != 0.0 and disturbance_start <= tick < disturbance_start + disturbance_duration:
                external_force = disturbance_sign * action_scale * disturbance_force_fraction * active_step
            else:
                external_force = torch.zeros_like(action)
            x, xdot, theta, omega = step_chain(x, xdot, theta, omega, action + external_force, active_links, gravity, cart_damping, hinge_damping)
            active_theta = theta[:, :active_links]
            active_omega = omega[:, :active_links]
            upright_error = active_theta.abs().mean(dim=1)
            max_upright = active_theta.abs().max(dim=1).values
            if active_links > 1:
                bend_delta = angle_delta(active_theta[:, 1:], active_theta[:, :-1])
                bend_error = bend_delta.abs().mean(dim=1)
                max_bend = bend_delta.abs().max(dim=1).values
            else:
                bend_error = torch.zeros_like(upright_error)
                max_bend = torch.zeros_like(upright_error)
            strict = strict_mask(x, theta, omega, active_links)
            height = torch.cos(active_theta).mean(dim=1)
            height_gain = torch.relu(height - previous_height) * active_step
            tip_height = (torch.cos(active_theta) * active_lengths).sum(dim=1) / active_lengths.sum()
            tip_height_gain = torch.relu(tip_height - previous_tip_height) * active_step
            near_top = (max_upright < 0.72) & (max_bend < 0.55)
            omega_max = active_omega.abs().max(dim=1).values
            omega_mean = active_omega.abs().mean(dim=1)
            stack_quality = torch.exp(-max_upright * 2.6 - max_bend * 3.8)
            brake_quality = torch.exp(-omega_mean * 0.16 - xdot.abs() * 0.08)
            bend_quality = torch.exp(-bend_error * 3.0) * near_top.float() * active_step
            stability_error = (
                max_upright.square() * 7.0
                + max_bend.square() * 10.0
                + omega_mean.square() * 0.060
                + xdot.square() * 0.040
                + x.square() * 0.45
            )
            stability_quality = torch.exp(-stability_error)
            soft_catch = (max_upright < 0.58) & (max_bend < 0.42) & (omega_max < 10.5) & (x.abs() < 1.65)
            catch = (max_upright < 0.36) & (max_bend < 0.28) & (omega_max < 6.5) & (x.abs() < 1.45)
            near_strict = (max_upright < 0.26) & (max_bend < 0.20) & (omega_max < 5.5) & (x.abs() < 1.30)
            near_hold = (max_upright < 0.42) & (max_bend < 0.32) & (x.abs() < 1.45)
            hold_ready = (max_hold >= 0.50).float()
            post_catch_ready = ((soft_catch_run >= 0.30) | (near_strict_run >= 0.18) | (max_catch >= 0.35)).float() * active_step
            post_catch_center_quality = torch.exp(-x.abs() * 1.05 - xdot.abs() * 0.20) * stack_quality * brake_quality
            action_saturation = torch.relu(action.abs() / action_scale - 0.82)
            bend_mode = torch.relu(max_bend - 0.18) * torch.relu(1.05 - max_bend)
            bend_collapse = torch.relu(0.18 - max_bend)
            whip_event = near_top.float() * (omega_max > 1.2).float() * (x.abs() < 1.55).float() * active_step
            hold_run = torch.where(strict & active_step.bool(), hold_run + dt, torch.zeros_like(hold_run))
            catch_run = torch.where(catch & active_step.bool(), catch_run + dt, torch.zeros_like(catch_run))
            soft_catch_run = torch.where(soft_catch & active_step.bool(), soft_catch_run + dt, torch.zeros_like(soft_catch_run))
            near_strict_run = torch.where(near_strict & active_step.bool(), near_strict_run + dt, torch.zeros_like(near_strict_run))
            max_hold = torch.maximum(max_hold, hold_run)
            max_catch = torch.maximum(max_catch, catch_run)
            max_soft_catch = torch.maximum(max_soft_catch, soft_catch_run)
            max_near_strict = torch.maximum(max_near_strict, near_strict_run)
            max_tip_height = torch.maximum(max_tip_height, tip_height)
            tip_progress += tip_height_gain
            whiplash += whip_event * dt
            top_time += near_top.float() * dt * active_step
            center_bonus += torch.relu(1.0 - x.abs() / track_limit) * dt * active_step
            bend_bonus += bend_quality * dt
            stack_bonus += stack_quality * brake_quality * torch.relu(1.0 - x.abs() / 1.55) * dt * active_step

            loss_of_balance = ((last_hold_run > 0.08) & (~strict) & (max_upright < 0.5)).float()
            if phase == "pump_energy":
                reward += height_gain * (2.8 + active_links * 0.6)
                reward += tip_height_gain * (3.4 + active_links * 0.9)
                reward += torch.relu(height + 0.2) * torch.relu(omega_mean - 0.45) * 0.028 * active_step
                reward += torch.relu(height + 0.1) * bend_mode * 0.045 * active_step
                reward -= near_top.float() * bend_collapse * 0.090 * active_step
                reward += whip_event * 0.20
            elif phase == "swing_catch_hold":
                center_gate = torch.clamp(1.0 - x.abs() / 1.25, 0.0, 1.0)
                false_top = near_top.float() * (~catch).float()
                reward += height_gain * (2.2 + active_links * 0.5)
                reward += tip_height_gain * (3.0 + active_links * 0.8) * torch.clamp(1.0 - x.abs() / 1.85, 0.0, 1.0)
                reward += torch.relu(height + 0.15) * torch.relu(omega_mean - 0.42) * 0.020 * active_step
                reward += torch.relu(height + 0.05) * bend_mode * 0.026 * active_step
                reward += whip_event * 0.10
                reward += soft_catch.float() * center_gate * (0.22 + soft_catch_run.pow(2.0) * 1.8) * active_step
                reward += catch.float() * center_gate * (0.45 + catch_run.pow(2.0) * 3.6) * active_step
                reward += near_strict.float() * center_gate * (0.95 + near_strict_run.pow(2.0) * 5.5) * active_step
                reward += strict.float() * center_gate * (
                    2.50
                    + hold_run.pow(2.0) * 12.0
                    + (hold_run >= 0.50).float() * 4.0
                    + (hold_run >= 0.75).float() * 8.0
                    + (hold_run >= 1.00).float() * 20.0
                ) * active_step
                reward += near_hold.float() * center_gate * stability_quality * (0.55 + near_strict_run * 2.5 + hold_run * 6.0) * active_step
                reward += stack_quality * brake_quality * center_gate * (0.18 + soft_catch_run * 0.55) * active_step
                reward += post_catch_ready * post_catch_center_quality * (1.20 + soft_catch_run * 2.2 + near_strict_run * 3.2)
                reward -= near_top.float() * (omega_mean * 0.018 + torch.relu(omega_mean - 3.4).square() * 0.020) * active_step
                reward -= near_hold.float() * (xdot.abs() * 0.018 + action_delta * 0.030 + torch.relu(omega_mean - 2.8).square() * 0.035) * active_step
                reward -= strict.float() * (action / action_scale).square() * 0.080 * active_step
                reward -= near_top.float() * bend_collapse * 0.060 * active_step
                reward -= false_top * (omega_mean * 0.026 + max_bend * 0.20 + torch.relu(x.abs() - 1.1) * 0.55) * active_step
                reward -= post_catch_ready * (x.abs() * 0.20 + xdot.abs() * 0.070 + action_delta * 0.090 + action_saturation.square() * 1.10)
            elif phase == "catch_top":
                reward += torch.exp(-upright_error * 2.2 - bend_error * 3.4) * 0.065 * active_step
                reward += tip_height_gain * (1.5 + active_links * 0.45) * active_step
                reward += soft_catch.float() * (0.10 + soft_catch_run.pow(2.0) * 0.9) * active_step
                reward += catch.float() * (0.18 + catch_run.pow(2.0) * 1.5) * active_step
                reward += near_strict.float() * (0.30 + near_strict_run.pow(2.0) * 2.2) * active_step
                reward += whip_event * 0.08
                reward += stack_quality * brake_quality * 0.18 * active_step
                reward -= near_top.float() * omega_mean * 0.022 * active_step
            elif phase == "brake_stack":
                center_gate = torch.clamp(1.0 - x.abs() / 1.25, 0.0, 1.0)
                reward += stack_quality * brake_quality * center_gate * 0.38 * active_step
                reward += soft_catch.float() * center_gate * (0.35 + soft_catch_run.pow(2.0) * 2.2) * active_step
                reward += catch.float() * center_gate * (0.70 + catch_run.pow(2.0) * 4.5) * active_step
                reward += near_strict.float() * center_gate * (1.10 + near_strict_run.pow(2.0) * 6.2) * active_step
                reward += strict.float() * center_gate * (
                    2.80
                    + hold_run.pow(2.0) * 12.0
                    + (hold_run >= 0.50).float() * 4.0
                    + (hold_run >= 0.75).float() * 8.0
                    + (hold_run >= 1.00).float() * 20.0
                ) * active_step
                reward += near_hold.float() * center_gate * stability_quality * (0.75 + near_strict_run * 3.2 + hold_run * 7.5) * active_step
                reward -= omega_mean * 0.026 * active_step
                reward -= near_hold.float() * (xdot.abs() * 0.022 + action_delta * 0.040) * active_step
                reward -= max_bend * 0.030 * active_step
            elif phase == "catch_survival":
                center_gate = torch.clamp(1.0 - x.abs() / 1.15, 0.0, 1.0)
                calm_gate = torch.clamp(1.0 - omega_mean / 5.4, 0.0, 1.0) * torch.clamp(1.0 - xdot.abs() / 4.0, 0.0, 1.0)
                survival_quality = stability_quality * center_gate * calm_gate
                false_top = near_top.float() * (~catch).float()
                lost_after_catch = (
                    ((max_near_strict >= 0.45) | (max_hold >= 0.35))
                    & (~near_strict)
                    & (max_upright < 0.72)
                ).float()
                catch_credit_gate = torch.where(max_hold >= 0.50, torch.ones_like(max_hold), torch.full_like(max_hold, 0.38))
                reward += tip_height_gain * center_gate * (0.75 + active_links * 0.22) * active_step
                reward += soft_catch.float() * survival_quality * catch_credit_gate * (0.55 + soft_catch_run.pow(2.0) * 2.0) * active_step
                reward += catch.float() * survival_quality * catch_credit_gate * (1.00 + catch_run.pow(2.0) * 4.0) * active_step
                reward += near_strict.float() * survival_quality * (1.80 + near_strict_run.pow(2.0) * 8.0 + hold_run * 18.0) * active_step
                reward += strict.float() * center_gate * (
                    8.00
                    + hold_run.pow(2.0) * 54.0
                    + torch.relu(hold_run - 0.50).pow(2.0) * 260.0
                    + (hold_run >= 0.35).float() * 8.0
                    + (hold_run >= 0.50).float() * 42.0
                    + (hold_run >= 0.67).float() * 70.0
                    + (hold_run >= 0.84).float() * 120.0
                    + (hold_run >= 1.00).float() * 240.0
                ) * active_step
                reward += near_hold.float() * survival_quality * (1.10 + near_strict_run * 5.0 + hold_run * 34.0) * active_step
                reward += stack_quality * brake_quality * center_gate * calm_gate * (0.55 + max_near_strict * 2.2) * active_step
                reward += post_catch_ready * post_catch_center_quality * calm_gate * (2.40 + soft_catch_run * 3.5 + near_strict_run * 5.5 + hold_run * 7.0)
                reward -= false_top * (0.50 + omega_mean * 0.055 + max_bend * 0.48 + torch.relu(x.abs() - 0.95) * 1.10) * active_step
                reward -= near_top.float() * (torch.relu(omega_mean - 2.8).square() * 0.055 + torch.relu(omega_max - 6.0).square() * 0.010) * active_step
                reward -= near_hold.float() * (xdot.abs() * 0.050 + action_delta * 0.090 + max_bend * 0.12 + torch.relu(omega_mean - 2.4).square() * 0.080) * active_step
                reward -= strict.float() * (action / action_scale).square() * 0.140 * active_step
                reward -= post_catch_ready * (torch.relu(x.abs() - 0.70) * 1.20 + xdot.abs() * 0.120 + action_delta * 0.180 + action_saturation.square() * 1.80)
                reward += strict.float() * center_gate * torch.exp(-omega_mean * 0.28 - xdot.abs() * 0.16 - x.abs() * 0.34) * (0.80 + hold_run * 3.0) * active_step
                reward -= lost_after_catch * (3.25 + max_hold * 7.0 + omega_mean * 0.16 + max_bend * 1.20 + xdot.abs() * 0.14 + action_delta * 0.55) * active_step
                reward -= torch.relu(max_upright - 0.38) * 0.030 * active_step
            elif phase == "hold_survival":
                center_gate = torch.clamp(1.0 - x.abs() / 1.05, 0.0, 1.0)
                calm_gate = torch.clamp(1.0 - omega_mean / 3.8, 0.0, 1.0) * torch.clamp(1.0 - xdot.abs() / 3.0, 0.0, 1.0)
                survival_quality = stability_quality * center_gate * calm_gate
                lost_after_hold = ((max_hold >= 0.50) & (~strict) & (max_upright < 0.65)).float()
                reward += stack_quality * brake_quality * center_gate * (1.10 + max_near_strict * 5.0) * active_step
                reward += near_hold.float() * survival_quality * (2.60 + near_strict_run * 11.0 + hold_run * 24.0) * active_step
                reward += near_strict.float() * survival_quality * (4.20 + near_strict_run.pow(2.0) * 24.0) * active_step
                reward += strict.float() * center_gate * (
                    9.00
                    + hold_run.pow(2.0) * 45.0
                    + torch.relu(hold_run - 0.42).pow(2.0) * 180.0
                    + (hold_run >= 0.50).float() * 26.0
                    + (hold_run >= 0.67).float() * 46.0
                    + (hold_run >= 0.84).float() * 80.0
                    + (hold_run >= 1.00).float() * 170.0
                    + (hold_run >= 0.55).float() * 80.0
                    + torch.relu(hold_run - 0.55).pow(2.0) * 400.0
                ) * active_step
                reward -= near_hold.float() * (
                    xdot.abs() * 0.070
                    + action_delta * 0.130
                    + max_bend * 0.20
                    + torch.relu(omega_mean - 2.0).square() * 0.120
                    + torch.relu(x.abs() - 0.80) * 1.20
                ) * active_step
                reward -= near_top.float() * (~near_hold).float() * (0.70 + omega_mean * 0.070 + max_bend * 0.70) * active_step
                reward -= (hold_run >= 0.40).float() * (xdot.abs() * 0.16 + action_delta * 0.26 + omega_mean * 0.16) * active_step
                reward -= strict.float() * (action / action_scale).square() * 0.100 * active_step
                reward += post_catch_ready * post_catch_center_quality * calm_gate * (2.00 + hold_run * 8.0)
                reward -= post_catch_ready * (torch.relu(x.abs() - 0.65) * 1.00 + xdot.abs() * 0.100 + action_delta * 0.150 + action_saturation.square() * 1.40)
                hold_loss_scale = torch.clamp(last_hold_run * 24.0, 0.0, 12.0)
                reward -= lost_after_hold * (
                    hold_loss_scale
                    + omega_mean * 0.30
                    + max_bend * 2.0
                    + xdot.abs() * 0.20
                    + action_delta * 0.70
                ) * active_step
            else:
                reward += torch.exp(-upright_error * 1.8 - bend_error * 3.2 - omega_mean * 0.045) * 0.050 * active_step
                reward += strict.float() * (
                    1.40
                    + hold_run.pow(2.0) * 8.0
                    + (hold_run >= 0.50).float() * 3.0
                    + (hold_run >= 1.00).float() * 12.0
                ) * active_step
                reward -= near_top.float() * omega_mean * 0.016 * active_step
            reward += torch.relu(height - 0.25) * torch.relu(omega_mean - 0.6) * 0.010 * active_step
            if phase != "pump_energy":
                reward += bend_quality * 0.18
            reward -= x.abs() * 0.008 * active_step
            reward -= (action / action_scale).square() * 0.0010 * active_step
            reward -= loss_of_balance * 0.80 * active_step
            action_delta_sum += action_delta * action_scale * active_step
            last_action = action
            last_hold_run = hold_run
            previous_height = height
            previous_tip_height = tip_height

        smooth_penalty = action_delta_sum / max(steps, 1) / action_scale
        active_horizon_seconds = (horizon_steps.float() * dt).clamp_min(dt)
        selection = (
            reward
            + max_hold * (780.0 + active_links * 180.0)
            + (max_hold >= 0.25).float() * 900.0
            + (max_hold >= 0.50).float() * 5200.0
            + (max_hold >= 0.67).float() * 6200.0
            + (max_hold >= 0.84).float() * 9000.0
            + (max_hold >= 1.0).float() * (18000.0 + active_links * 1200.0)
            + max_soft_catch * (22.0 + active_links * 8.0) * (0.25 + hold_ready * 0.75)
            + (max_soft_catch >= 0.35).float() * 90.0 * (0.25 + hold_ready * 0.75)
            + max_catch * (34.0 + active_links * 12.0) * (0.30 + hold_ready * 0.70)
            + (max_catch >= 0.50).float() * 160.0 * (0.30 + hold_ready * 0.70)
            + max_near_strict * (90.0 + active_links * 28.0) * (0.45 + hold_ready * 0.55)
            + (max_near_strict >= 0.50).float() * 360.0 * (0.45 + hold_ready * 0.55)
            + (max_near_strict >= 0.75).float() * 700.0 * (0.45 + hold_ready * 0.55)
            + whiplash.clamp(max=1.5) * (14.0 + active_links * 4.0)
            + tip_progress.clamp(max=3.0) * (24.0 + active_links * 10.0)
            + torch.relu(max_tip_height + 0.15) * (18.0 + active_links * 7.0)
            + top_time.clamp(max=1.0) * (0.7 + active_links * 0.15)
            + center_bonus / active_horizon_seconds * 4.0
            + stack_bonus / active_horizon_seconds * (18.0 if active_links > 1 else 5.0)
            + (bend_bonus / active_horizon_seconds * (8.0 if active_links > 1 else 1.0) if phase != "pump_energy" else torch.zeros_like(reward))
            - smooth_penalty * 2.0
            - (symmetry_penalty / max(1, steps // 6)) * float(stage.get("symmetryWeight", 1.0)) * (10.0 if active_links > 1 else 0.0)
        )
        if validation:
            return {
                "selection": selection,
                "maxHoldSeconds": max_hold,
                "solvedOneSecond": (max_hold >= 1.0).float(),
                "whiplashSeconds": whiplash,
                "topSeconds": top_time,
                "maxSoftCatchSeconds": max_soft_catch,
                "maxCatchSeconds": max_catch,
                "maxNearStrictSeconds": max_near_strict,
                "terminalTipProgress": tip_progress,
                "maxTipHeight": max_tip_height,
                "stackRatio": stack_bonus / (horizon_steps.float() * dt),
                "centerRatio": center_bonus / (horizon_steps.float() * dt),
                "bendRatio": bend_bonus / (horizon_steps.float() * dt),
                "smoothPenalty": smooth_penalty,
                "symmetryPenalty": symmetry_penalty / max(1, steps // 6),
                "horizonSeconds": horizon_steps.float().mean() * dt,
            }
        return selection

    def summarize(metrics, active_links):
        max_hold = float(metrics["maxHoldSeconds"].mean().detach().cpu())
        max_hold_p10 = float(torch.quantile(metrics["maxHoldSeconds"], 0.1).detach().cpu())
        solved_rate = float(metrics["solvedOneSecond"].mean().detach().cpu())
        center_ratio = float(metrics["centerRatio"].mean().detach().cpu())
        bend_ratio = float(metrics["bendRatio"].mean().detach().cpu())
        stack_ratio = float(metrics["stackRatio"].mean().detach().cpu())
        smooth_penalty = float(metrics["smoothPenalty"].mean().detach().cpu())
        symmetry_penalty = float(metrics.get("symmetryPenalty", torch.zeros_like(metrics["smoothPenalty"])).mean().detach().cpu())
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
            "topSeconds": float(metrics["topSeconds"].mean().detach().cpu()),
            "maxSoftCatchSeconds": float(metrics["maxSoftCatchSeconds"].mean().detach().cpu()),
            "maxCatchSeconds": float(metrics["maxCatchSeconds"].mean().detach().cpu()),
            "maxNearStrictSeconds": float(metrics["maxNearStrictSeconds"].mean().detach().cpu()),
            "stackRatio": stack_ratio,
            "centerRatio": center_ratio,
            "bendRatio": bend_ratio,
            "smoothPenalty": smooth_penalty,
            "symmetryPenalty": symmetry_penalty,
            "selection": float(metrics["selection"].mean().detach().cpu()),
            "horizonSeconds": float(metrics["horizonSeconds"].detach().cpu()),
        }

    def validation_rank(metrics, active_links):
        selection_weight = 0.15 if active_links >= 4 else 1.0
        return (
            metrics["selection"] * selection_weight
            + metrics["maxHoldSeconds"] * (700.0 + active_links * 220.0)
            + (metrics["maxHoldSeconds"] >= 0.50).float() * (500.0 + active_links * 170.0)
            + (metrics["maxHoldSeconds"] >= 0.75).float() * (800.0 + active_links * 220.0)
            + metrics["solvedOneSecond"] * (1000.0 + active_links * 400.0)
            + metrics["maxSoftCatchSeconds"] * (130.0 + active_links * 45.0)
            + metrics["maxCatchSeconds"] * (130.0 + active_links * 38.0)
            + metrics["maxNearStrictSeconds"] * (340.0 + active_links * 120.0)
            + metrics["stackRatio"] * (40.0 if active_links > 1 else 8.0)
            + metrics["topSeconds"].clamp(max=1.0) * (2.0 + active_links * 0.5)
            + metrics["centerRatio"] * 18.0
            + metrics["bendRatio"] * (28.0 if active_links > 1 else 2.0)
            - metrics["smoothPenalty"] * 8.0
            - metrics.get("symmetryPenalty", torch.zeros_like(metrics["smoothPenalty"])) * (18.0 if active_links > 1 else 0.0)
        )

    def summary_rank(summary, active_links):
        selection_weight = 0.15 if active_links >= 4 else 1.0
        return (
            summary["strictScore"] * 100.0
            + summary["selection"] * selection_weight
            + summary["maxHoldSeconds"] * (700.0 + active_links * 220.0)
            + (500.0 + active_links * 170.0 if summary["maxHoldSeconds"] >= 0.50 else 0.0)
            + (800.0 + active_links * 220.0 if summary["maxHoldSeconds"] >= 0.75 else 0.0)
            + summary["solvedOneSecondRate"] * (1000.0 + active_links * 400.0)
            + summary["maxSoftCatchSeconds"] * (130.0 + active_links * 45.0)
            + summary["maxCatchSeconds"] * (130.0 + active_links * 38.0)
            + summary["maxNearStrictSeconds"] * (340.0 + active_links * 120.0)
            + summary["stackRatio"] * (40.0 if active_links > 1 else 8.0)
            + min(summary["topSeconds"], 1.0) * (2.0 + active_links * 0.5)
            + summary["centerRatio"] * 18.0
            + summary["bendRatio"] * (28.0 if active_links > 1 else 2.0)
            - summary["smoothPenalty"] * 8.0
            - summary.get("symmetryPenalty", 0.0) * (18.0 if active_links > 1 else 0.0)
        )

    def build_trajectory_replay_bank(params, active_links):
        if not source_chain_warm_start or active_links < 2:
            empty_theta = torch.empty((0, safe_links), device=device)
            return {
                "x": torch.empty(0, device=device),
                "xdot": torch.empty(0, device=device),
                "theta": empty_theta,
                "omega": empty_theta.clone(),
                "lastAction": torch.empty(0, device=device),
                "tick": torch.empty(0, device=device),
                "bucket": torch.empty(0, device=device, dtype=torch.long),
            }
        with torch.no_grad():
            p = params.view(1, -1)
            x = torch.zeros(1, device=device)
            xdot = torch.zeros(1, device=device)
            theta = torch.zeros((1, safe_links), device=device)
            omega = torch.zeros((1, safe_links), device=device)
            theta[:, :active_links] = math.pi
            last_action = torch.zeros(1, device=device)
            trajectory = []
            selected_ticks = set()
            hold_run = torch.zeros(1, device=device)
            catch_seen = False
            near_strict_seen = False

            def remember(tick_index, hold_value):
                trajectory.append(
                    {
                        "tick": tick_index,
                        "x": x.detach().clone().squeeze(0),
                        "xdot": xdot.detach().clone().squeeze(0),
                        "theta": theta.detach().clone().squeeze(0),
                        "omega": omega.detach().clone().squeeze(0),
                        "lastAction": last_action.detach().clone().squeeze(0),
                        "holdRun": hold_value.detach().clone().squeeze(0),
                    }
                )

            for tick in range(steps):
                action = policy(p, x, xdot, theta, omega, last_action, tick, 0.0)
                x, xdot, theta, omega = step_chain(x, xdot, theta, omega, action, active_links, 9.81, 0.08, 0.03)
                last_action = action
                active_theta = theta[:, :active_links]
                active_omega = omega[:, :active_links]
                max_upright = active_theta.abs().max(dim=1).values
                max_bend = angle_delta(active_theta[:, 1:], active_theta[:, :-1]).abs().max(dim=1).values if active_links > 1 else torch.zeros_like(max_upright)
                omega_max = active_omega.abs().max(dim=1).values
                strict = strict_mask(x, theta, omega, active_links)
                hold_run = torch.where(strict, hold_run + dt, torch.zeros_like(hold_run))
                remember(tick + 1, hold_run)
                soft_catch = (max_upright < 0.58) & (max_bend < 0.42) & (omega_max < 10.5) & (x.abs() < 1.65)
                catch = (max_upright < 0.36) & (max_bend < 0.28) & (omega_max < 6.5) & (x.abs() < 1.45)
                near_strict = (max_upright < 0.26) & (max_bend < 0.20) & (omega_max < 5.5) & (x.abs() < 1.30)
                catch_now = bool((soft_catch | catch | near_strict | strict | (hold_run > 0.0)).item())
                if catch_now:
                    for offset in (0, 1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 36, 42, 48, 56, 64):
                        selected_ticks.add(max(0, tick - offset))
                    for offset in (1, 2, 3, 4, 5, 6, 8, 10):
                        selected_ticks.add(min(steps - 1, tick + offset))
                if bool(near_strict.item()) or bool(strict.item()):
                    near_strict_seen = True
                    for offset in (0, 1, 2, 3, 4, 5, 8, 12, 18, 24, 32, 40, 52, 64, 78):
                        selected_ticks.add(max(0, tick - offset))
                if catch_seen and not catch_now and max_upright.item() < 0.95:
                    for offset in (1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 28):
                        selected_ticks.add(max(0, tick - offset))
                if near_strict_seen and not bool(near_strict.item()) and max_upright.item() < 0.72:
                    for offset in (1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 28, 36):
                        selected_ticks.add(max(0, tick - offset))
                catch_seen = catch_seen or catch_now

            selected = [trajectory[index] for index in sorted(selected_ticks) if index < len(trajectory)]
            if not selected:
                empty_theta = torch.empty((0, safe_links), device=device)
                return {
                    "x": torch.empty(0, device=device),
                    "xdot": torch.empty(0, device=device),
                    "theta": empty_theta,
                    "omega": empty_theta.clone(),
                    "lastAction": torch.empty(0, device=device),
                    "tick": torch.empty(0, device=device),
                    "bucket": torch.empty(0, device=device, dtype=torch.long),
                }
            selected_x = torch.stack([item["x"] for item in selected]).to(device)
            selected_theta = torch.stack([item["theta"] for item in selected]).to(device)
            selected_omega = torch.stack([item["omega"] for item in selected]).to(device)
            selected_hold_run = torch.stack([item["holdRun"] for item in selected]).to(device)
            selected_active_theta = selected_theta[:, :active_links]
            selected_active_omega = selected_omega[:, :active_links]
            selected_max_upright = selected_active_theta.abs().max(dim=1).values
            selected_max_bend = (
                angle_delta(selected_active_theta[:, 1:], selected_active_theta[:, :-1]).abs().max(dim=1).values
                if active_links > 1
                else torch.zeros_like(selected_max_upright)
            )
            selected_omega_max = selected_active_omega.abs().max(dim=1).values
            bucket = torch.zeros(selected_max_upright.shape[0], device=device, dtype=torch.long)
            soft_mask = (selected_max_upright < 0.58) & (selected_max_bend < 0.42) & (selected_omega_max < 10.5) & (selected_x.abs() < 1.65)
            catch_mask = (selected_max_upright < 0.36) & (selected_max_bend < 0.28) & (selected_omega_max < 6.5) & (selected_x.abs() < 1.45)
            near_strict_mask = (selected_max_upright < 0.26) & (selected_max_bend < 0.20) & (selected_omega_max < 5.5) & (selected_x.abs() < 1.30)
            strict_replay_mask = strict_mask(selected_x, selected_theta, selected_omega, active_links)
            bucket = torch.where(soft_mask, torch.ones_like(bucket), bucket)
            bucket = torch.where(catch_mask, torch.full_like(bucket, 2), bucket)
            bucket = torch.where(near_strict_mask, torch.full_like(bucket, 3), bucket)
            bucket = torch.where(strict_replay_mask, torch.full_like(bucket, 4), bucket)
            bucket = torch.where(selected_hold_run >= 0.35, torch.full_like(bucket, 5), bucket)
            bucket = torch.where(selected_hold_run >= 0.50, torch.full_like(bucket, 6), bucket)
            bucket = torch.where(selected_hold_run >= 0.55, torch.full_like(bucket, 7), bucket)
            bucket = torch.where(selected_hold_run >= 0.65, torch.full_like(bucket, 8), bucket)
            return {
                "x": selected_x,
                "xdot": torch.stack([item["xdot"] for item in selected]).to(device),
                "theta": selected_theta,
                "omega": selected_omega,
                "lastAction": torch.stack([item["lastAction"] for item in selected]).to(device),
                "tick": torch.tensor([item["tick"] for item in selected], device=device, dtype=torch.float32),
                "bucket": bucket,
            }

    stages = [
        {"name": "one-link-schema-pretrain", "links": 1, "pose": "down", "phase": "hold_top", "gravity": 7.2, "cartDamping": 0.14, "hingeDamping": 0.08, "horizonScale": 1.0, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-hold-near-top", "links": safe_links, "pose": "hold", "phase": "hold_top", "gravity": 4.8, "cartDamping": 0.20, "hingeDamping": 0.16, "horizonScale": 0.32, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-recover-noisy-top", "links": safe_links, "pose": "recover", "phase": "catch_top", "gravity": 5.6, "cartDamping": 0.20, "hingeDamping": 0.14, "horizonScale": 0.38, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-hold-normal-gravity", "links": safe_links, "pose": "hold", "phase": "hold_top", "gravity": 9.81, "cartDamping": 0.12, "hingeDamping": 0.06, "horizonScale": 0.60, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-energy-pump-short", "links": safe_links, "pose": "angle", "phase": "pump_energy", "startAngleScale": 0.65, "gravity": 6.5, "cartDamping": 0.18, "hingeDamping": 0.10, "horizonScale": 0.45, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-catch-top", "links": safe_links, "pose": "angle", "phase": "catch_top", "startAngleScale": 0.80, "gravity": 8.0, "cartDamping": 0.14, "hingeDamping": 0.07, "horizonScale": 0.60, "generations": max(4, safe_generations // 4), "randomHorizon": False},
        {"name": "two-link-down-start-first-catch", "links": safe_links, "pose": "down", "phase": "swing_catch_hold", "gravity": 9.81, "cartDamping": 0.08, "hingeDamping": 0.03, "horizonScale": 0.75, "generations": safe_generations, "randomHorizon": True},
        {"name": "two-link-down-start-swing-catch", "links": safe_links, "pose": "down", "phase": "swing_catch_hold", "gravity": 9.81, "cartDamping": 0.08, "hingeDamping": 0.03, "horizonScale": 1.0, "generations": safe_generations, "randomHorizon": True},
    ]
    if source_chain_warm_start and safe_links > 1:
        stages = [
            {
                "name": "chain-exact-down-reduced-gravity",
                "links": safe_links,
                "pose": "exact_down",
                "phase": "swing_catch_hold",
                "gravity": 7.0,
                "cartDamping": 0.10,
                "hingeDamping": 0.040,
                "horizonScale": 0.60,
                "generations": safe_generations,
                "randomHorizon": True,
                "symmetryWeight": 0.0,
                "sigmaStart": 0.45,
            },
            {
                "name": "chain-upright-tiny-hold-stabilizer",
                "links": safe_links,
                "pose": "strict_hold_tiny_jitter",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.12,
                "hingeDamping": 0.050,
                "horizonScale": 0.28,
                "generations": safe_generations,
                "randomHorizon": False,
                "sigmaStart": 0.24,
                "finalDownSelectionWeight": 0.05,
                "stageSelectionWeight": 1.00,
            },
            {
                "name": "chain-upright-noisy-hold-stabilizer",
                "links": safe_links,
                "pose": "strict_hold_jitter",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.12,
                "hingeDamping": 0.050,
                "horizonScale": 0.36,
                "generations": safe_generations,
                "randomHorizon": True,
                "sigmaStart": 0.34,
                "finalDownSelectionWeight": 0.02,
                "stageSelectionWeight": 1.00,
            },
            {
                "name": "chain-frontier-hold-replay",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.10,
                "hingeDamping": 0.040,
                "horizonScale": 0.45,
                "generations": safe_generations,
                "randomHorizon": False,
                "replayNoise": 0.0,
                "replayTickJitter": 0,
                "replayMinBucket": 7,
                "replayBucketWeights": {8: 16.0, 7: 12.0, 6: 5.0},
                "sigmaStart": 0.35,
                "finalDownSelectionWeight": 0.45,
                "stageSelectionWeight": 0.35,
            },
            {
                "name": "chain-frontier-disturbance-recovery",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.11,
                "hingeDamping": 0.045,
                "horizonScale": 0.52,
                "generations": safe_generations,
                "randomHorizon": False,
                "replayNoise": 0.008,
                "replayTickJitter": 2,
                "replayMinBucket": 6,
                "replayBucketWeights": {8: 12.0, 7: 10.0, 6: 6.0},
                "disturbanceForceFraction": 0.18,
                "disturbanceStartFraction": 0.22,
                "disturbanceDurationSeconds": 0.10,
                "sigmaStart": 0.32,
                "finalDownSelectionWeight": 0.35,
                "stageSelectionWeight": 0.65,
            },
            {
                "name": "chain-trajectory-precatch-survival-replay",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "catch_survival",
                "gravity": 9.81,
                "cartDamping": 0.10,
                "hingeDamping": 0.040,
                "horizonScale": 0.42,
                "generations": safe_generations,
                "randomHorizon": False,
                "replayNoise": 0.020,
                "sigmaStart": 0.42,
                "finalDownSelectionWeight": 0.30,
                "stageSelectionWeight": 0.70,
            },
            {
                "name": "chain-reverse-nearstrict-hold-replay",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.11,
                "hingeDamping": 0.045,
                "horizonScale": 0.42,
                "generations": safe_generations,
                "randomHorizon": False,
                "replayNoise": 0.010,
                "replayTickJitter": 2,
                "replayMinBucket": 5,
                "sigmaStart": 0.38,
                "finalDownSelectionWeight": 0.12,
                "stageSelectionWeight": 1.00,
            },
            {
                "name": "chain-reverse-catch-hold-replay",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "hold_survival",
                "gravity": 9.81,
                "cartDamping": 0.10,
                "hingeDamping": 0.040,
                "horizonScale": 0.55,
                "generations": safe_generations,
                "randomHorizon": False,
                "replayNoise": 0.015,
                "replayTickJitter": 3,
                "replayMinBucket": 2,
                "sigmaStart": 0.40,
                "finalDownSelectionWeight": 0.18,
                "stageSelectionWeight": 0.90,
            },
            {
                "name": "chain-trajectory-catch-to-hold-replay",
                "links": safe_links,
                "pose": "trajectory_replay",
                "phase": "swing_catch_hold",
                "gravity": 9.81,
                "cartDamping": 0.08,
                "hingeDamping": 0.030,
                "horizonScale": 0.70,
                "generations": safe_generations,
                "randomHorizon": True,
                "replayNoise": 0.020,
                "replayTickJitter": 4,
                "replayMinBucket": 1,
                "sigmaStart": 0.42,
                "finalDownSelectionWeight": 0.35,
                "stageSelectionWeight": 0.55,
            },
            {
                "name": "chain-exact-down-catch-survival-continuation",
                "links": safe_links,
                "pose": "exact_down",
                "phase": "catch_survival",
                "gravity": 9.81,
                "cartDamping": 0.08,
                "hingeDamping": 0.03,
                "horizonScale": 0.86,
                "generations": safe_generations,
                "randomHorizon": True,
                "symmetryWeight": 0.0,
                "sigmaStart": 0.60,
            },
            {
                "name": "chain-exact-down-gate-continuation",
                "links": safe_links,
                "pose": "exact_down",
                "phase": "swing_catch_hold",
                "gravity": 9.81,
                "cartDamping": 0.08,
                "hingeDamping": 0.03,
                "horizonScale": 1.0,
                "generations": safe_generations,
                "randomHorizon": False,
                "symmetryWeight": 0.0,
                "sigmaStart": 0.60,
            },
        ]
        if not include_disturbance_training:
            stages = [stage for stage in stages if stage["name"] != "chain-frontier-disturbance-recovery"]

    history = []
    experiment_dots = []
    randomized_horizon_ready = False
    final_validation_stage = {"name": "validation-two-link-exact-down", "links": safe_links, "pose": "exact_down", "phase": "swing_catch_hold", "gravity": 9.81, "cartDamping": 0.08, "hingeDamping": 0.03, "horizonScale": 1.0, "generations": 0, "randomHorizon": False}
    final_validation_best_params = best_params.clone()
    final_validation_best_value = -1e9
    final_validation_best_summary = None

    def final_down_rank(summary):
        hold_ticks = int(round(summary["maxHoldSeconds"] * safe_control_hz))
        hold_gate = 1.0 if hold_ticks >= int(round(0.67 * safe_control_hz)) else (0.18 if hold_ticks >= int(round(0.50 * safe_control_hz)) else 0.05)
        near_gate = 1.0 if hold_ticks >= int(round(0.67 * safe_control_hz)) else (0.28 if summary["maxNearStrictSeconds"] >= 0.50 else 0.10)
        catch_hold_gap = max(0.0, summary["maxCatchSeconds"] - summary["maxNearStrictSeconds"] - 0.18)
        twitch_penalty = max(0.0, summary["smoothPenalty"] - 0.34)
        frontier_extension = max(0.0, summary["maxHoldSeconds"] - 0.55)
        return (
            hold_ticks * 10_000_000.0
            + summary["maxHoldSeconds"] * 100_000.0
            + frontier_extension * 40_000_000.0
            + (50_000_000.0 if hold_ticks >= int(round(0.56 * safe_control_hz)) else 0.0)
            + summary["solvedOneSecondRate"] * 1_000_000.0
            + summary["maxNearStrictSeconds"] * 25_000.0 * near_gate
            + summary["maxCatchSeconds"] * 5_000.0 * hold_gate
            + summary["maxSoftCatchSeconds"] * 2_500.0 * hold_gate
            + summary["stackRatio"] * 62.0 * near_gate
            + min(summary["whiplashSeconds"], 0.85) * 8.0
            + min(summary["topSeconds"], 1.0) * 4.0
            + summary["centerRatio"] * 220.0
            + summary["bendRatio"] * 80.0
            - catch_hold_gap * 2_000.0
            - summary["smoothPenalty"] * 260.0
            - twitch_penalty * 18_000.0
            - summary.get("symmetryPenalty", 0.0) * 80.0
        )

    def final_down_rank_metrics(metrics):
        hold_ticks = torch.round(metrics["maxHoldSeconds"] * safe_control_hz)
        hold_gate = torch.where(
            hold_ticks >= round(0.67 * safe_control_hz),
            torch.ones_like(metrics["maxHoldSeconds"]),
            torch.where(
                hold_ticks >= round(0.50 * safe_control_hz),
                torch.full_like(metrics["maxHoldSeconds"], 0.18),
                torch.full_like(metrics["maxHoldSeconds"], 0.05),
            ),
        )
        near_gate = torch.where(
            hold_ticks >= round(0.67 * safe_control_hz),
            torch.ones_like(metrics["maxNearStrictSeconds"]),
            torch.where(
                metrics["maxNearStrictSeconds"] >= 0.50,
                torch.full_like(metrics["maxNearStrictSeconds"], 0.28),
                torch.full_like(metrics["maxNearStrictSeconds"], 0.10),
            ),
        )
        catch_hold_gap = torch.relu(metrics["maxCatchSeconds"] - metrics["maxNearStrictSeconds"] - 0.18)
        twitch_penalty = torch.relu(metrics["smoothPenalty"] - 0.34)
        frontier_extension = torch.relu(metrics["maxHoldSeconds"] - 0.55)
        return (
            hold_ticks * 10_000_000.0
            + metrics["maxHoldSeconds"] * 100_000.0
            + frontier_extension * 40_000_000.0
            + (hold_ticks >= round(0.56 * safe_control_hz)).float() * 50_000_000.0
            + metrics["solvedOneSecond"] * 1_000_000.0
            + metrics["maxNearStrictSeconds"] * 25_000.0 * near_gate
            + metrics["maxCatchSeconds"] * 5_000.0 * hold_gate
            + metrics["maxSoftCatchSeconds"] * 2_500.0 * hold_gate
            + metrics["stackRatio"] * 62.0 * near_gate
            + metrics["whiplashSeconds"].clamp(max=0.85) * 8.0
            + metrics["topSeconds"].clamp(max=1.0) * 4.0
            + metrics["centerRatio"] * 220.0
            + metrics["bendRatio"] * 80.0
            - catch_hold_gap * 2_000.0
            - metrics["smoothPenalty"] * 260.0
            - twitch_penalty * 18_000.0
            - metrics.get("symmetryPenalty", torch.zeros_like(metrics["smoothPenalty"])) * 80.0
        )

    replay_bank = build_trajectory_replay_bank(best_params, safe_links)
    replay_bank_size = int(replay_bank["x"].shape[0])
    initial_eval_params = best_params.view(1, -1).repeat(96 if smoke else 256, 1)
    initial_metrics = evaluate(initial_eval_params, final_validation_stage, validation=True)
    initial_summary = summarize(initial_metrics, safe_links)
    final_validation_best_value = final_down_rank(initial_summary)
    final_validation_best_summary = dict(initial_summary)
    final_validation_best_params = best_params.clone()
    initial_line = {
        "stage": "initial-warmstart-exact-down",
        "links": safe_links,
        "pose": final_validation_stage["pose"],
        "phase": final_validation_stage["phase"],
        "generation": -1,
        "sigma": float(sigma.detach().cpu()),
        "bestSelection": float(best_selection.detach().cpu()),
        "eliteSelection": None,
        "wallclockSeconds": round(time.time() - started, 3),
        "validationBestRank": final_validation_best_value,
        "finalDownValidationBestRank": final_validation_best_value,
        "finalDownCandidate": initial_summary,
        "replayBankSize": replay_bank_size,
        **initial_summary,
    }
    print(json.dumps(initial_line), flush=True)
    history.append(initial_line)

    for stage in stages:
        if source_chain_warm_start and safe_links >= 4:
            sigma = torch.maximum(sigma, torch.tensor(float(stage.get("sigmaStart", 0.42)), device=device))
        stage_best_params = mean.clone()
        stage_best_selection = torch.tensor(-1e9, device=device)
        stage_validation_best_params = mean.clone()
        stage_validation_best_value = -1e9
        for generation in range(stage["generations"]):
            stage_for_eval = {**stage, "randomHorizon": bool(stage.get("randomHorizon", False) and randomized_horizon_ready)}
            params = mean.view(1, -1) + torch.randn(safe_population, param_count, device=device) * sigma
            params[0, :] = mean
            params[1, :] = best_params
            params[2, :] = final_validation_best_params
            selection = evaluate(params, stage_for_eval)
            if safe_links >= 4 and stage_for_eval.get("pose") == "exact_down":
                down_selection_metrics = evaluate(params, final_validation_stage, validation=True)
                selection = final_down_rank_metrics(down_selection_metrics)
            elif safe_links >= 4 and stage_for_eval.get("pose") not in ("down", "exact_down"):
                down_stage_for_eval = {**final_validation_stage, "randomHorizon": False}
                down_selection_metrics = evaluate(params, down_stage_for_eval, validation=True)
                final_down_weight = float(stage_for_eval.get("finalDownSelectionWeight", 1.0))
                stage_selection_weight = float(stage_for_eval.get("stageSelectionWeight", 0.15))
                selection = final_down_rank_metrics(down_selection_metrics) * final_down_weight + selection * stage_selection_weight
            values, indices = torch.topk(selection, elite_count)
            elites = params[indices]
            rank_weights = torch.linspace(1.0, 0.15, elites.shape[0], device=device)
            rank_weights = rank_weights / rank_weights.sum()
            mean = (elites * rank_weights.view(-1, 1)).sum(dim=0)
            sigma = torch.maximum(sigma * 0.98, torch.tensor(0.05, device=device))
            if values[0] > stage_best_selection:
                stage_best_selection = values[0]
                stage_best_params = elites[0].clone()
            if values[0] > best_selection:
                best_selection = values[0]
            if generation % 4 == 0 or generation == stage["generations"] - 1:
                candidate_count = min(32, elites.shape[0])
                candidate_params = torch.cat(
                    [
                        final_validation_best_params.view(1, -1),
                        best_params.view(1, -1),
                        mean.view(1, -1),
                        stage_best_params.view(1, -1),
                        elites[:candidate_count],
                    ],
                    dim=0,
                )
                candidate_metrics = evaluate(candidate_params, stage, validation=True)
                candidate_values = validation_rank(candidate_metrics, int(stage["links"]))
                candidate_index = int(torch.argmax(candidate_values).detach().cpu())
                candidate_best = candidate_params[candidate_index].clone()
                eval_params = candidate_best.view(1, -1).repeat(96 if smoke else 256, 1)
                metrics = evaluate(eval_params, stage, validation=True)
                summary = summarize(metrics, int(stage["links"]))
                ranked_summary = summary_rank(summary, int(stage["links"]))
                if ranked_summary > stage_validation_best_value:
                    stage_validation_best_value = ranked_summary
                    stage_validation_best_params = candidate_best.clone()
                down_candidate_metrics = evaluate(candidate_params, final_validation_stage, validation=True)
                down_candidate_values = final_down_rank_metrics(down_candidate_metrics)
                down_candidate_index = int(torch.argmax(down_candidate_values).detach().cpu())
                down_candidate_best = candidate_params[down_candidate_index].clone()
                down_eval_params = down_candidate_best.view(1, -1).repeat(96 if smoke else 256, 1)
                down_metrics = evaluate(down_eval_params, final_validation_stage, validation=True)
                down_summary = summarize(down_metrics, safe_links)
                down_rank = final_down_rank(down_summary)
                frontier_ticks = int(round(0.55 * safe_control_hz)) if safe_links >= 4 else int(round(0.50 * safe_control_hz))
                down_hold_ticks = int(round(down_summary["maxHoldSeconds"] * safe_control_hz))
                best_hold_ticks = (
                    int(round(final_validation_best_summary["maxHoldSeconds"] * safe_control_hz))
                    if final_validation_best_summary is not None
                    else -1
                )
                same_frontier_tick_smoother = (
                    down_hold_ticks == best_hold_ticks
                    and down_hold_ticks >= frontier_ticks
                    and final_validation_best_summary is not None
                    and down_summary["smoothPenalty"] <= final_validation_best_summary["smoothPenalty"] - 0.04
                )
                improved_final_down = (
                    down_hold_ticks > best_hold_ticks
                    or same_frontier_tick_smoother
                    or (
                        down_hold_ticks == best_hold_ticks
                        and down_hold_ticks < frontier_ticks
                        and down_rank > final_validation_best_value
                    )
                )
                if improved_final_down:
                    final_validation_best_value = down_rank
                    final_validation_best_summary = dict(down_summary)
                    final_validation_best_params = down_candidate_best.clone()
                    best_params = final_validation_best_params.clone()
                    if source_chain_warm_start and safe_links > 1:
                        new_replay_bank = build_trajectory_replay_bank(final_validation_best_params, safe_links)
                        if new_replay_bank["x"].numel() > 0:
                            replay_bank = new_replay_bank
                            replay_bank_size = int(replay_bank["x"].shape[0])
                    mean = mean * 0.70 + down_candidate_best * 0.30
                elif safe_links >= 4:
                    mean = mean * 0.90 + final_validation_best_params * 0.10
                else:
                    mean = mean * 0.75 + down_candidate_best * 0.25
                if int(stage["links"]) == safe_links and down_hold_ticks >= frontier_ticks + 1 and down_summary["solvedOneSecondRate"] < 0.5:
                    randomized_horizon_ready = True
                line = {
                    "stage": stage["name"],
                    "links": int(stage["links"]),
                    "pose": stage["pose"],
                    "phase": stage.get("phase", "mixed"),
                    "startAngleScale": stage.get("startAngleScale", 1.0),
                    "horizonScale": stage.get("horizonScale", 1.0),
                    "gravity": stage["gravity"],
                    "randomizedHorizon": stage_for_eval["randomHorizon"],
                    "generation": generation,
                    "sigma": float(sigma.detach().cpu()),
                    "bestSelection": float(stage_best_selection.detach().cpu()),
                    "eliteSelection": float(values[0].detach().cpu()),
                    "wallclockSeconds": round(time.time() - started, 3),
                    "validationBestRank": stage_validation_best_value,
                    "finalDownValidationBestRank": final_validation_best_value,
                    "finalDownCandidate": down_summary,
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
                        "gpu": device_name,
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
        best_params = final_validation_best_params.clone() if int(stage["links"]) == safe_links else stage_validation_best_params.clone()
        mean = final_validation_best_params * 0.45 + stage_validation_best_params * 0.25 + mean * 0.30
        if source_chain_warm_start and safe_links > 1:
            new_replay_bank = build_trajectory_replay_bank(final_validation_best_params, safe_links)
            if new_replay_bank["x"].numel() > 0:
                replay_bank = new_replay_bank
                replay_bank_size = int(replay_bank["x"].shape[0])

    best_params = final_validation_best_params.clone()
    final_params = best_params.view(1, -1).repeat(256 if smoke else 1024, 1)
    final_metrics = evaluate(final_params, final_validation_stage, validation=True)
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
        "feedbackUsesTime": feedback_uses_time,
        "baseTopFade": 0.0,
        "knotCount": knot_count,
        "hidden": hidden,
        "forceScale": action_scale,
        "cartCenterSpring": cart_center_spring,
        "policyClockSeconds": policy_clock_seconds,
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
            "gpu": device_name,
            "torch": torch.__version__,
            "elapsedSeconds": round(time.time() - started, 3),
            "smoke": smoke,
            "seed": seed,
            "population": safe_population,
            "eliteCount": elite_count,
            "generations": safe_generations,
            "actionScale": action_scale,
            "cartCenterSpring": cart_center_spring,
            "warmStarted": warm_start is not None,
            "includeDisturbanceTraining": bool(include_disturbance_training),
            "policyClockSecondsOverride": float(policy_clock_seconds_override),
            "preserveFeedbackTime": bool(preserve_feedback_time),
            "stages": stages,
            "replayBankSize": replay_bank_size,
            "history": history,
            "experimentDots": experiment_dots,
            "validation": final_summary,
            "score": "strictScore is zero unless mean maxHoldSeconds is at least 1.0; subsecond holds are diagnostic only",
            "nextGate": f"do not promote to {safe_links + 1} links until {safe_links}-link exact-down reaches at least 1.000s with solved rate above 0",
            "postSolveGate": "run render_pezzza_chain_policy.py --robustness-gate only after solvedOneSecondRate > 0",
            "strictCriteria": {
                "scoreGreaterThan": 82.0,
                "maxUprightRadLessThan": hold_angle,
                "maxBendRadLessThan": bend_angle,
                "maxOmegaLessThan": 4.5,
                "maxAbsCartXLessThan": 1.2,
                "minContinuousHoldSeconds": 1.0,
            },
        },
    }
    return json.dumps(output, indent=2)


@app.local_entrypoint()
def main(
    smoke: bool = True,
    seed: int = 426410,
    links: int = 2,
    control_hz: int = 240,
    population: int = 1024,
    generations: int = 24,
    initial_policy: str = "",
    write_result: str = "",
    action_scale: float = 42.0,
    cart_center_spring: float = 0.35,
    include_disturbance_training: bool = False,
    policy_clock_seconds: float = 0.0,
    preserve_feedback_time: bool = False,
):
    initial_policy_json = ""
    if initial_policy:
        initial_policy_json = open(initial_policy).read()
    result = train_policy.remote(
        smoke,
        seed,
        links,
        control_hz,
        population,
        generations,
        initial_policy_json,
        action_scale,
        cart_center_spring,
        include_disturbance_training,
        policy_clock_seconds,
        preserve_feedback_time,
    )
    if write_result:
        with open(write_result, "w") as handle:
            handle.write(result)
    print(result)
    return result
