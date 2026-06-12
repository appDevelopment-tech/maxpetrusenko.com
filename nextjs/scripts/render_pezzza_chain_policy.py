#!/usr/bin/env python3
import argparse
import json
import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json"
DEFAULT_OUT = ROOT / "tmp/six-pendulum-renders"


def font(size: int, bold: bool = False):
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def angle_delta(a, b):
    return np.arctan2(np.sin(a - b), np.cos(a - b))


def load_policy(path: Path) -> dict:
    policy = json.loads(path.read_text())
    if policy.get("algorithm") != "modal-pezzza-style-chain-evolution":
        raise ValueError(f"Unsupported policy algorithm: {policy.get('algorithm')}")
    return policy


def policy_action(policy: dict, state: dict, tick: int, steps: int) -> float:
    links = int(policy["links"])
    track_limit = 2.4
    force_scale = float(policy["forceScale"])
    dt = float(policy["dt"])
    policy_clock_seconds = float(policy.get("policyClockSeconds", policy.get("horizonSeconds", steps * dt)))
    knots = np.asarray(policy["knots"], dtype=np.float32)
    w1 = np.asarray(policy["layers"][0]["weights"], dtype=np.float32)
    b1 = np.asarray(policy["layers"][0]["bias"], dtype=np.float32)
    w2 = np.asarray(policy["layers"][1]["weights"], dtype=np.float32)
    b2 = np.asarray(policy["layers"][1]["bias"], dtype=np.float32)
    t_norm = max(0.0, min(1.0, tick * dt / max(policy_clock_seconds, dt)))
    knot_pos = t_norm * (len(knots) - 1)
    left = int(math.floor(knot_pos))
    right = min(left + 1, len(knots) - 1)
    mix = knot_pos - left
    base = knots[left] * (1.0 - mix) + knots[right] * mix
    base_top_fade = float(policy.get("baseTopFade", 0.0))
    if base_top_fade > 0.0:
        uprightness = sum(math.cos(value) for value in state["theta"][:links]) / max(1, links)
        fade = max(0.0, min(1.0, (0.5 - uprightness) / 0.5))
        base *= 1.0 - base_top_fade * (1.0 - fade)
    features = [state["x"] / track_limit, state["xdot"] / 6.0]
    for index in range(links):
        features.extend([math.sin(state["theta"][index]), math.cos(state["theta"][index]), state["omega"][index] / 10.0])
    for index in range(1, links):
        relative = angle_delta(state["theta"][index], state["theta"][index - 1])
        features.extend([math.sin(relative), math.cos(relative)])
    features.append(state["last_action"] / force_scale)
    expected_with_time = 4 + links * 3 + max(0, links - 1) * 2
    feedback_uses_time = policy.get("feedbackUsesTime", w1.shape[0] >= expected_with_time)
    if feedback_uses_time:
        features.append(t_norm)
    obs = np.asarray(features, dtype=np.float32)
    hidden = np.tanh(obs @ w1 + b1)
    feedback = float((hidden @ w2 + b2).reshape(-1)[0])
    return float(np.tanh(base + feedback) * force_scale)


def default_steps_for_policy(policy: dict) -> int:
    horizon = float(policy.get("horizonSeconds", 7.0))
    hz = int(policy.get("controlHz", round(1.0 / float(policy["dt"]))))
    return max(1, int(round(horizon * hz)))


def step_chain(policy: dict, state: dict, action: float, external_force: float = 0.0) -> dict:
    links = int(policy["links"])
    dt = float(policy["dt"])
    gravity = 9.81
    cart_damping = 0.08
    hinge_damping = 0.03
    cart_center_spring = float(policy.get("cartCenterSpring", 0.35))
    force = action + external_force - cart_damping * state["xdot"] - cart_center_spring * state["x"]
    for index in range(links):
        force -= math.sin(state["theta"][index]) * (index + 1) * 0.11
    cart_acc = force
    xdot = float(np.clip(state["xdot"] + cart_acc * dt, -8.0, 8.0))
    x = float(np.clip(state["x"] + xdot * dt, -2.4 * 1.2, 2.4 * 1.2))
    theta = state["theta"].copy()
    omega = state["omega"].copy()
    next_theta = theta.copy()
    next_omega = omega.copy()
    for index in range(links):
        length = 0.52 + index * 0.05
        prev = theta[index - 1] if index > 0 else theta[index]
        nxt = theta[index + 1] if index + 1 < links else theta[index]
        coupling = (angle_delta(prev, theta[index]) + angle_delta(nxt, theta[index])) * (1.65 + index * 0.25)
        drive = (-cart_acc * math.cos(theta[index]) * (0.47 + index * 0.05)) / length
        angular_acc = gravity * math.sin(theta[index]) / length + drive + coupling - hinge_damping * omega[index]
        next_omega[index] = float(np.clip(omega[index] + angular_acc * dt, -24.0, 24.0))
        next_theta[index] = float((theta[index] + next_omega[index] * dt + math.pi) % (2 * math.pi) - math.pi)
    return {"x": x, "xdot": xdot, "theta": next_theta, "omega": next_omega, "last_action": action}


def strict(policy: dict, state: dict) -> tuple[bool, float, float]:
    theta = np.asarray(state["theta"], dtype=np.float32)
    omega = np.asarray(state["omega"], dtype=np.float32)
    max_upright = float(np.max(np.abs(theta)))
    if len(theta) > 1:
        max_bend = float(np.max(np.abs(angle_delta(theta[1:], theta[:-1]))))
    else:
        max_bend = 0.0
    max_omega = float(np.max(np.abs(omega)))
    angle_error = float(np.sum(np.abs(theta) * np.arange(1, len(theta) + 1, dtype=np.float32)))
    velocity_error = float(np.sum(np.abs(omega)))
    score = 100.0 - angle_error * 12.0 - max_bend * 30.0 - velocity_error * 2.5 - abs(state["x"]) * 8.0
    ok = score > 82.0 and max_upright < 0.16 and max_bend < 0.14 and max_omega < 4.5 and abs(state["x"]) < 1.2
    return ok, max(0.0, score), max_bend


def simulate(
    policy: dict,
    steps: int,
    disturbance_after_hold: float = 0.0,
    disturbance_force: float = 0.0,
    disturbance_duration: float = 0.0,
    disturbance_impulse: float = 0.0,
) -> dict:
    links = int(policy["links"])
    state = {
        "x": 0.0,
        "xdot": 0.0,
        "theta": np.full(links, math.pi, dtype=np.float32),
        "omega": np.zeros(links, dtype=np.float32),
        "last_action": 0.0,
    }
    history = []
    hold = 0.0
    max_hold = 0.0
    max_score = 0.0
    dt = float(policy["dt"])
    disturbance_started_at = None
    disturbance_until_tick = None
    recovered_after_disturbance = False
    max_hold_after_disturbance = 0.0
    for tick in range(steps):
        if (
            disturbance_after_hold > 0.0
            and disturbance_force != 0.0
            and disturbance_started_at is None
            and hold >= disturbance_after_hold
        ):
            disturbance_started_at = tick
            disturbance_until_tick = tick + max(1, int(round(disturbance_duration / dt)))
            if disturbance_impulse != 0.0:
                state["xdot"] = float(np.clip(state["xdot"] + disturbance_impulse, -8.0, 8.0))
        external_force = 0.0
        if disturbance_started_at is not None and disturbance_until_tick is not None and tick < disturbance_until_tick:
            external_force = disturbance_force
        action = policy_action(policy, state, tick, steps)
        state = step_chain(policy, state, action, external_force)
        ok, score, bend = strict(policy, state)
        hold = hold + dt if ok else 0.0
        max_hold = max(max_hold, hold)
        if disturbance_started_at is not None and tick >= disturbance_started_at:
            max_hold_after_disturbance = max(max_hold_after_disturbance, hold)
            recovered_after_disturbance = recovered_after_disturbance or hold >= 1.0
        max_score = max(max_score, score)
        history.append(
            {
                **state,
                "action": action,
                "externalForce": external_force,
                "hold": hold,
                "maxHold": max_hold,
                "score": score,
                "bend": bend,
            }
        )
    return {
        "history": history,
        "maxHoldSeconds": max_hold,
        "maxStrictScore": max_score,
        "disturbance": {
            "enabled": bool(disturbance_started_at is not None),
            "startedAtSeconds": None if disturbance_started_at is None else disturbance_started_at * dt,
            "force": disturbance_force,
            "durationSeconds": disturbance_duration,
            "impulse": disturbance_impulse,
            "maxHoldAfterDisturbanceSeconds": max_hold_after_disturbance,
            "recoveredOneSecondAfterDisturbance": recovered_after_disturbance,
        },
    }


def parse_float_csv(value: str) -> list[float]:
    return [float(part.strip()) for part in value.split(",") if part.strip()]


def parse_int_csv(value: str) -> list[int]:
    return [int(part.strip()) for part in value.split(",") if part.strip()]


def build_robustness_cases(policy: dict, seeds: list[int], offsets: list[float]) -> list[dict]:
    force_scale = float(policy["forceScale"])
    templates = []
    for magnitude in (-0.45, 0.45, -0.75, 0.75):
        templates.append({"type": "cart_velocity_kick", "magnitude": magnitude, "tier": "mild" if abs(magnitude) <= 0.45 else "medium"})
    for magnitude in (-0.10, 0.10, -0.18, 0.18):
        templates.append({"type": "cart_position_shift", "magnitude": magnitude, "tier": "mild" if abs(magnitude) <= 0.10 else "medium"})
    for magnitude in (0.025, 0.045):
        templates.append({"type": "link_angle_nudge", "magnitude": magnitude, "tier": "mild" if magnitude <= 0.025 else "medium"})
    for magnitude in (0.35, 0.70):
        templates.append({"type": "link_velocity_nudge", "magnitude": magnitude, "tier": "mild" if magnitude <= 0.35 else "medium"})
    for fraction in (-0.25, 0.25):
        templates.append({"type": "force_pulse", "magnitude": fraction * force_scale, "tier": "mild", "durationSeconds": 0.10})

    cases = []
    for seed in seeds:
        for offset in offsets:
            for template in templates:
                sign = "neg" if template["magnitude"] < 0 else "pos"
                magnitude_label = str(abs(template["magnitude"])).replace(".", "p")
                offset_label = str(offset).replace(".", "p")
                cases.append(
                    {
                        **template,
                        "seed": seed,
                        "applyAfterStrictEntrySeconds": offset,
                        "id": f"{template['type']}_{sign}_{magnitude_label}_t{offset_label}_seed{seed}",
                    }
                )
    return cases


def apply_perturbation(policy: dict, state: dict, case: dict, rng: np.random.Generator) -> None:
    links = int(policy["links"])
    if case["type"] == "cart_velocity_kick":
        state["xdot"] = float(np.clip(state["xdot"] + float(case["magnitude"]), -8.0, 8.0))
    elif case["type"] == "cart_position_shift":
        state["x"] = float(np.clip(state["x"] + float(case["magnitude"]), -2.4 * 1.2, 2.4 * 1.2))
    elif case["type"] == "link_angle_nudge":
        noise = rng.normal(0.0, float(case["magnitude"]), size=links)
        state["theta"][:links] = (state["theta"][:links] + noise + math.pi) % (2 * math.pi) - math.pi
    elif case["type"] == "link_velocity_nudge":
        noise = rng.normal(0.0, float(case["magnitude"]), size=links)
        state["omega"][:links] = np.clip(state["omega"][:links] + noise, -24.0, 24.0)


def run_robustness_case(policy: dict, steps: int, case: dict) -> dict:
    links = int(policy["links"])
    dt = float(policy["dt"])
    state = {
        "x": 0.0,
        "xdot": 0.0,
        "theta": np.full(links, math.pi, dtype=np.float32),
        "omega": np.zeros(links, dtype=np.float32),
        "last_action": 0.0,
    }
    rng = np.random.default_rng(int(case["seed"]))
    hold = 0.0
    strict_entry_tick = None
    perturb_tick = None
    force_pulse_until = None
    recovered = False
    recovery_seconds = None
    post_hold = 0.0
    post_max_hold = 0.0
    pre_perturb_hold = 0.0
    max_abs_x = 0.0
    max_abs_theta = 0.0
    max_abs_omega = 0.0
    max_bend = 0.0
    fail_reason = None

    for tick in range(steps):
        if strict_entry_tick is not None and perturb_tick is None:
            if hold >= float(case["applyAfterStrictEntrySeconds"]):
                perturb_tick = tick
                pre_perturb_hold = hold
                apply_perturbation(policy, state, case, rng)
                if case["type"] == "force_pulse":
                    force_pulse_until = tick + max(1, int(round(float(case.get("durationSeconds", 0.10)) / dt)))

        external_force = 0.0
        if force_pulse_until is not None and tick < force_pulse_until:
            external_force = float(case["magnitude"])
        action = policy_action(policy, state, tick, steps)
        state = step_chain(policy, state, action, external_force)
        ok, _, bend = strict(policy, state)

        if not np.isfinite(state["x"]) or not np.isfinite(state["xdot"]) or not np.all(np.isfinite(state["theta"])) or not np.all(np.isfinite(state["omega"])):
            fail_reason = "non_finite_state"
            break
        max_abs_x = max(max_abs_x, abs(float(state["x"])))
        max_abs_theta = max(max_abs_theta, float(np.max(np.abs(state["theta"]))))
        max_abs_omega = max(max_abs_omega, float(np.max(np.abs(state["omega"]))))
        max_bend = max(max_bend, float(bend))
        if max_abs_x > 2.4:
            fail_reason = fail_reason or "cart_rail_clip"
        if max_abs_theta > math.pi + 1e-6 or max_abs_omega > 24.0 + 1e-6:
            fail_reason = fail_reason or "explosive_state"

        hold = hold + dt if ok else 0.0
        if ok and strict_entry_tick is None:
            strict_entry_tick = tick
        if perturb_tick is not None:
            post_hold = post_hold + dt if ok else 0.0
            post_max_hold = max(post_max_hold, post_hold)
            if ok and not recovered:
                recovered = True
                recovery_seconds = max(0.0, (tick - perturb_tick) * dt)

    if strict_entry_tick is None:
        fail_reason = fail_reason or "never_entered_strict"
    if perturb_tick is None:
        fail_reason = fail_reason or "never_reached_perturb_time"
    if recovered and recovery_seconds is not None and recovery_seconds > 0.75:
        fail_reason = fail_reason or "slow_recovery"
    if post_max_hold < 1.0:
        fail_reason = fail_reason or "post_perturb_hold_below_one_second"
    passed = fail_reason is None and recovered and (recovery_seconds is not None and recovery_seconds <= 0.75) and post_max_hold >= 1.0
    return {
        "id": case["id"],
        "type": case["type"],
        "tier": case["tier"],
        "magnitude": float(case["magnitude"]),
        "seed": int(case["seed"]),
        "strictEntrySeconds": None if strict_entry_tick is None else strict_entry_tick * dt,
        "perturbAtSeconds": None if perturb_tick is None else perturb_tick * dt,
        "requestedPrePerturbHoldSeconds": float(case["applyAfterStrictEntrySeconds"]),
        "prePerturbContinuousHoldSeconds": pre_perturb_hold,
        "recovered": bool(recovered),
        "recoverySeconds": recovery_seconds,
        "postPerturbMaxHoldSeconds": post_max_hold,
        "passed": bool(passed),
        "failReason": fail_reason,
        "maxAbsCartX": max_abs_x,
        "maxAbsTheta": max_abs_theta,
        "maxAbsOmega": max_abs_omega,
        "maxBend": max_bend,
    }


def run_robustness_gate(policy: dict, steps: int, seeds: list[int], offsets: list[float], nominal: dict) -> dict:
    eligible = nominal["maxHoldSeconds"] >= 1.0
    result = {
        "schema": "pezzza-chain-disturbance-robustness-v1",
        "eligible": bool(eligible),
        "passed": False,
        "nominalMaxHoldSeconds": float(nominal["maxHoldSeconds"]),
        "strictCriteria": {
            "scoreGreaterThan": 82,
            "maxUprightRadLessThan": 0.16,
            "maxBendRadLessThan": 0.14,
            "maxOmegaLessThan": 4.5,
            "maxAbsCartXLessThan": 1.2,
            "minContinuousHoldSeconds": 1.0,
        },
        "timing": {
            "applyAfterStrictEntrySeconds": offsets,
            "maxRecoverySeconds": 0.75,
            "requiredPostPerturbHoldSeconds": 1.0,
        },
        "aggregate": {
            "caseCount": 0,
            "passedCount": 0,
            "mediumPassRate": 0.0,
            "medianRecoverySeconds": None,
            "worstPostPerturbHoldSeconds": 0.0,
        },
        "cases": [],
    }
    if not eligible:
        return result

    cases = [run_robustness_case(policy, steps, case) for case in build_robustness_cases(policy, seeds, offsets)]
    passed_cases = [case for case in cases if case["passed"]]
    medium_cases = [case for case in cases if case["tier"] == "medium"]
    medium_passed = [case for case in medium_cases if case["passed"]]
    recovery_times = [case["recoverySeconds"] for case in passed_cases if case["recoverySeconds"] is not None]
    mild_passed = all(case["passed"] for case in cases if case["tier"] == "mild")
    medium_pass_rate = len(medium_passed) / max(1, len(medium_cases))
    median_recovery = None if not recovery_times else float(np.median(np.asarray(recovery_times, dtype=np.float32)))
    worst_hold = 0.0 if not passed_cases else min(case["postPerturbMaxHoldSeconds"] for case in passed_cases)
    result["aggregate"] = {
        "caseCount": len(cases),
        "passedCount": len(passed_cases),
        "mediumPassRate": medium_pass_rate,
        "medianRecoverySeconds": median_recovery,
        "worstPostPerturbHoldSeconds": worst_hold,
    }
    result["cases"] = cases
    result["passed"] = bool(
        len(passed_cases) == len(cases)
        and mild_passed
        and medium_pass_rate == 1.0
        and median_recovery is not None
        and median_recovery <= 0.45
        and worst_hold >= 1.0
    )
    return result


def draw_frame(policy: dict, item: dict, tick: int, steps: int, max_hold: float) -> Image.Image:
    width, height = 960, 540
    image = Image.new("RGB", (width, height), "#f8f5ef")
    draw = ImageDraw.Draw(image)
    rail_y = 355
    rail_left, rail_right = 90, 870
    scale = (rail_right - rail_left) / (2.4 * 2.4)
    cart_x = rail_left + (item["x"] + 2.4 * 1.2) * scale
    draw.line((rail_left, rail_y, rail_right, rail_y), fill="#6b6257", width=3)
    draw.rounded_rectangle((cart_x - 44, rail_y - 42, cart_x + 44, rail_y + 12), radius=8, fill="#1f2933")
    base = np.asarray([cart_x, rail_y - 38], dtype=np.float32)
    point = base.copy()
    colors = ["#0f766e", "#14b8a6", "#2563eb", "#7c3aed", "#db2777", "#b45309"]
    for index, theta in enumerate(item["theta"]):
        length_px = 120 + index * 4
        tip = point + np.asarray([math.sin(float(theta)) * length_px, -math.cos(float(theta)) * length_px])
        draw.line((point[0], point[1], tip[0], tip[1]), fill=colors[index % len(colors)], width=9)
        draw.ellipse((tip[0] - 11, tip[1] - 11, tip[0] + 11, tip[1] + 11), fill=colors[index % len(colors)])
        point = tip
    draw.ellipse((base[0] - 10, base[1] - 10, base[0] + 10, base[1] + 10), fill="#f59e0b")
    draw.text((40, 34), f"{policy['links']}-link Pezzza-chain exact-down replay", fill="#1f2933", font=font(31, True))
    draw.text((44, 82), "learned knot-MLP policy in chain simulator; strict gate visual", fill="#57534e", font=font(20))
    disturbance = float(item.get("externalForce", 0.0))
    draw.text((44, 438), f"t={tick * policy['dt']:5.2f}s   hold={item['hold']:4.2f}s   maxHold={max_hold:4.2f}s   score={item['score']:5.1f}   action={item['action']:5.1f}N   push={disturbance:4.1f}N", fill="#1f2933", font=font(23))
    return image


def render(policy: dict, sim: dict, output_dir: Path, basename: str, stride: int) -> tuple[Path, Path]:
    frames_dir = output_dir / f"{basename}-frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True, exist_ok=True)
    contact_frames = []
    for frame_index, tick in enumerate(range(0, len(sim["history"]), stride)):
        image = draw_frame(policy, sim["history"][tick], tick, len(sim["history"]), sim["maxHoldSeconds"])
        image.save(frames_dir / f"frame_{frame_index:04d}.png")
        if frame_index % 12 == 0 and len(contact_frames) < 12:
            contact_frames.append(image.resize((320, 180)))
    contact = Image.new("RGB", (960, 720), "#f8f5ef")
    for index, frame in enumerate(contact_frames):
        contact.paste(frame, ((index % 3) * 320, (index // 3) * 180))
    contact_path = output_dir / f"{basename}-contact-sheet.jpg"
    contact.save(contact_path, quality=90)
    video_path = output_dir / f"{basename}.mp4"
    fps = max(1, int(round(float(policy.get("controlHz", 1.0 / float(policy["dt"]))) / max(1, stride))))
    subprocess.run(
        ["ffmpeg", "-y", "-framerate", str(fps), "-i", str(frames_dir / "frame_%04d.png"), "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video_path)],
        check=True,
    )
    return video_path, contact_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--steps", type=int, default=None)
    parser.add_argument("--stride", type=int, default=2)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--basename", default="two-link-pezzza-chain-exactdown-20260611")
    parser.add_argument("--disturbance-after-hold", type=float, default=0.0)
    parser.add_argument("--disturbance-force", type=float, default=0.0)
    parser.add_argument("--disturbance-duration", type=float, default=0.12)
    parser.add_argument("--disturbance-impulse", type=float, default=0.0)
    parser.add_argument("--robustness-gate", action="store_true")
    parser.add_argument("--robustness-seeds", default="426410")
    parser.add_argument("--robustness-after-strict-entry", default="0.20,0.50,0.85")
    parser.add_argument("--expected-links", type=int, default=None)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    policy = load_policy(args.policy)
    if args.expected_links is not None and int(policy["links"]) != args.expected_links:
        raise ValueError(f"Policy link count {policy['links']} does not match --expected-links {args.expected_links}")
    steps = args.steps if args.steps is not None else default_steps_for_policy(policy)
    sim = simulate(
        policy,
        steps,
        disturbance_after_hold=args.disturbance_after_hold,
        disturbance_force=args.disturbance_force,
        disturbance_duration=args.disturbance_duration,
        disturbance_impulse=args.disturbance_impulse,
    )
    video, contact = render(policy, sim, args.output_dir, args.basename, args.stride)
    result = {
        "schema": "pezzza-chain-policy-render-v1",
        "policy": str(args.policy),
        "links": int(policy["links"]),
        "steps": int(steps),
        "seconds": float(steps * policy["dt"]),
        "maxHoldSeconds": float(sim["maxHoldSeconds"]),
        "maxStrictScore": float(sim["maxStrictScore"]),
        "solvedOneSecond": bool(sim["maxHoldSeconds"] >= 1.0),
        "certifiedSolved": bool(sim["maxHoldSeconds"] >= 1.0),
        "strictCriteria": {
            "scoreGreaterThan": 82,
            "maxUprightRadLessThan": 0.16,
            "maxBendRadLessThan": 0.14,
            "maxOmegaLessThan": 4.5,
            "maxAbsCartXLessThan": 1.2,
            "minContinuousHoldSeconds": 1.0,
            "exactDownStart": True,
        },
        "disturbance": sim["disturbance"],
        "video": str(video),
        "contactSheet": str(contact),
    }
    if args.robustness_gate:
        result["robustness"] = run_robustness_gate(
            policy,
            steps,
            parse_int_csv(args.robustness_seeds),
            parse_float_csv(args.robustness_after_strict_entry),
            sim,
        )
    result_path = args.output_dir / f"{args.basename}.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
