"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Shuffle, Zap } from "lucide-react";

type LabMode = "policy" | "whip" | "manual";

type PendulumState = {
  cartX: number;
  cartV: number;
  theta: number[];
  omega: number[];
};

const linkOptions = [1, 2, 3, 4, 5, 6] as const;

const policyNotes = [
  "Observation: cart x, cart velocity, six link angles, six angular velocities.",
  "Action: start with a small force set, then test continuous cart force.",
  "Reward: upright chain, centered cart, low angular velocity, survival time.",
  "Curriculum: solve one link, then two, then mixed one to six link episodes.",
  "Randomization: mass, force magnitude, initial angle, episode horizon.",
  "Evaluation: held out seeds, impulse recovery, lower link transfer, failure map.",
] as const;

function makeState(links: number, spread = 0.55): PendulumState {
  const theta = Array.from({ length: links }, (_, index) => {
    const sign = index % 2 === 0 ? 1 : -1;
    return sign * (0.16 + index * 0.045) + (Math.random() - 0.5) * spread;
  });

  return {
    cartX: 0,
    cartV: 0,
    theta,
    omega: Array.from({ length: links }, () => (Math.random() - 0.5) * 0.8),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function policyForce(state: PendulumState, mode: LabMode, manualForce: number): number {
  if (mode === "manual") return manualForce;

  const maxAbs = Math.max(...state.theta.map((theta) => Math.abs(theta)));
  const weightedAngle = state.theta.reduce((sum, theta, index) => sum + theta * (index + 1) ** 1.35, 0);
  const weightedOmega = state.omega.reduce((sum, omega, index) => sum + omega * (index + 1) ** 1.15, 0);
  const balance = weightedAngle * 14 + weightedOmega * 3.1 + state.cartX * 3.4 + state.cartV * 2.2;

  if (mode === "policy" && maxAbs < 0.82) {
    return clamp(balance, -24, 24);
  }

  const leading = state.theta[state.theta.length - 1] ?? 0;
  const leadingVelocity = state.omega[state.omega.length - 1] ?? 0;
  const whip = Math.sign(leadingVelocity * Math.cos(leading) + 0.16 * Math.sin(leading) || 1) * 18;
  return clamp(whip + balance * 0.22, -28, 28);
}

function stepState(state: PendulumState, mode: LabMode, links: number, manualForce: number, dt: number): PendulumState {
  const next: PendulumState = {
    cartX: state.cartX,
    cartV: state.cartV,
    theta: [...state.theta],
    omega: [...state.omega],
  };
  const force = policyForce(state, mode, manualForce);
  const cartAcc = force - 0.62 * state.cartV - 1.2 * state.cartX - state.theta.reduce((sum, theta, index) => {
    return sum + Math.sin(theta) * (index + 1) * 0.08;
  }, 0);

  next.cartV = clamp(next.cartV + cartAcc * dt, -5.5, 5.5);
  next.cartX = clamp(next.cartX + next.cartV * dt, -2.4, 2.4);

  for (let index = 0; index < links; index += 1) {
    const length = 0.62 + index * 0.035;
    const theta = next.theta[index] ?? 0;
    const omega = next.omega[index] ?? 0;
    const prev = next.theta[index - 1] ?? next.theta[index] ?? 0;
    const nextLink = next.theta[index + 1] ?? next.theta[index] ?? 0;
    const coupling = (prev + nextLink - theta * 2) * (1.5 + index * 0.2);
    const damping = 0.045 + index * 0.008;
    const gravity = 9.81 * Math.sin(theta) / length;
    const drive = (-cartAcc * Math.cos(theta) * (0.42 + index * 0.04)) / length;
    const angularAcc = gravity + drive + coupling - damping * omega;

    next.omega[index] = clamp(omega + angularAcc * dt, -18, 18);
    next.theta[index] = wrapAngle(theta + next.omega[index] * dt);
  }

  return next;
}

function scoreState(state: PendulumState): number {
  const angleError = state.theta.reduce((sum, theta, index) => sum + Math.abs(theta) * (index + 1), 0);
  const velocityError = state.omega.reduce((sum, omega) => sum + Math.abs(omega), 0);
  return Math.round(clamp(100 - angleError * 8 - velocityError * 1.4 - Math.abs(state.cartX) * 8, 0, 100));
}

export function SixPendulumCartpoleLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<PendulumState>(makeState(6));
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [links, setLinks] = useState<(typeof linkOptions)[number]>(6);
  const [mode, setMode] = useState<LabMode>("policy");
  const [manualForce, setManualForce] = useState(0);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [episode, setEpisode] = useState(1);

  const modeCopy = useMemo(
    () => ({
      policy: "Policy sketch",
      whip: "Whip search",
      manual: "Manual force",
    }),
    []
  );

  useEffect(() => {
    stateRef.current = makeState(links);
    setEpisode((value) => value + 1);
  }, [links]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    function draw(state: PendulumState) {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(340, Math.floor(rect.height));

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#101820");
      gradient.addColorStop(0.55, "#182f35");
      gradient.addColorStop(1, "#f0b35f");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(255,255,255,0.12)";
      context.lineWidth = 1;
      for (let grid = 0; grid < 8; grid += 1) {
        const y = 40 + grid * 42;
        context.beginPath();
        context.moveTo(24, y);
        context.lineTo(width - 24, y);
        context.stroke();
      }

      const trackY = height * 0.68;
      const centerX = width / 2 + state.cartX * width * 0.16;
      context.strokeStyle = "rgba(247,241,230,0.82)";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(34, trackY + 28);
      context.lineTo(width - 34, trackY + 28);
      context.stroke();

      context.fillStyle = "#f7f1e6";
      context.strokeStyle = "#0c1115";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(centerX - 42, trackY, 84, 34, 8);
      context.fill();
      context.stroke();

      let pivotX = centerX;
      let pivotY = trackY;
      const colors = ["#f7f1e6", "#6fd0b2", "#f0b35f", "#8cc7e8", "#e36f5c", "#ffffff"];

      state.theta.forEach((theta, index) => {
        const length = Math.max(32, height * (0.15 - index * 0.008));
        const nextX = pivotX + Math.sin(theta) * length;
        const nextY = pivotY - Math.cos(theta) * length;

        context.strokeStyle = colors[index % colors.length];
        context.lineWidth = Math.max(3, 7 - index * 0.55);
        context.beginPath();
        context.moveTo(pivotX, pivotY);
        context.lineTo(nextX, nextY);
        context.stroke();

        context.fillStyle = colors[index % colors.length];
        context.beginPath();
        context.arc(nextX, nextY, Math.max(4, 8 - index * 0.5), 0, Math.PI * 2);
        context.fill();

        pivotX = nextX;
        pivotY = nextY;
      });

      context.fillStyle = "rgba(247,241,230,0.92)";
      context.font = "700 13px DM Sans, sans-serif";
      context.fillText(`${links} links`, 24, 30);
      context.fillText(`${modeCopy[mode]}`, 24, 52);
      context.fillText(`score ${scoreState(state)}`, 24, 74);
    }

    function animate(time: number) {
      const previous = lastTimeRef.current ?? time;
      const dt = clamp((time - previous) / 1000, 0.001, 0.025);
      lastTimeRef.current = time;

      if (running) {
        const substeps = 3;
        for (let index = 0; index < substeps; index += 1) {
          stateRef.current = stepState(stateRef.current, mode, links, manualForce, dt / substeps);
        }
        setScore(scoreState(stateRef.current));
      }

      draw(stateRef.current);
      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, [links, manualForce, mode, modeCopy, running]);

  function reset(spread = 0.55) {
    stateRef.current = makeState(links, spread);
    setEpisode((value) => value + 1);
  }

  function kick() {
    stateRef.current.cartV += (Math.random() > 0.5 ? 1 : -1) * 2.6;
    stateRef.current.omega = stateRef.current.omega.map((omega, index) => omega + (index + 1) * 0.18);
  }

  return (
    <section className="mt-10 overflow-hidden rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-[#101820] shadow-[0_24px_70px_rgba(12,17,21,0.16)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="min-h-[380px] bg-[#101820]">
          <canvas
            ref={canvasRef}
            aria-label="Interactive six link cartpole simulator"
            className="block h-[380px] w-full md:h-[520px]"
          />
        </div>
        <div className="border-t border-white/10 bg-[#f7f1e6] p-5 lg:border-l lg:border-t-0 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4b535c]">Episode {episode}</p>
              <p className="mt-1 text-3xl font-black text-[#0c1115]">{score}</p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white text-[#0c1115]"
              onClick={() => setRunning((value) => !value)}
              title={running ? "Pause" : "Play"}
              type="button"
            >
              {running ? <Pause aria-hidden="true" size={20} /> : <Play aria-hidden="true" size={20} />}
            </button>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#4b535c]">Links</p>
            <div className="grid grid-cols-6 gap-1.5">
              {linkOptions.map((option) => (
                <button
                  className={`h-10 rounded-[8px] border text-sm font-black ${
                    option === links
                      ? "border-[#0c1115] bg-[#0c1115] text-[#f7f1e6]"
                      : "border-[rgba(12,17,21,0.14)] bg-white text-[#0c1115]"
                  }`}
                  key={option}
                  onClick={() => setLinks(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#4b535c]">Mode</p>
            <div className="grid gap-2">
              {(Object.keys(modeCopy) as LabMode[]).map((option) => (
                <button
                  className={`rounded-[8px] border px-3 py-2 text-left text-sm font-black ${
                    option === mode
                      ? "border-[#0f7ea9] bg-[#0f7ea9] text-white"
                      : "border-[rgba(12,17,21,0.14)] bg-white text-[#0c1115]"
                  }`}
                  key={option}
                  onClick={() => setMode(option)}
                  type="button"
                >
                  {modeCopy[option]}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-6 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#4b535c]">Manual force</span>
            <input
              className="mt-3 w-full accent-[#0f7ea9]"
              max={28}
              min={-28}
              onChange={(event) => setManualForce(Number(event.target.value))}
              step={1}
              type="range"
              value={manualForce}
            />
          </label>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-3 py-2 text-sm font-black text-[#0c1115]"
              onClick={() => reset(0.22)}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} /> Reset
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-3 py-2 text-sm font-black text-[#0c1115]"
              onClick={() => reset(1.1)}
              type="button"
            >
              <Shuffle aria-hidden="true" size={16} /> Seed
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-3 py-2 text-sm font-black text-[#0c1115]"
              onClick={kick}
              type="button"
            >
              <Zap aria-hidden="true" size={16} /> Kick
            </button>
          </div>

          <div className="mt-6 rounded-[8px] border border-[rgba(12,17,21,0.10)] bg-white p-4">
            <p className="text-sm font-black text-[#0c1115]">Rebuild target</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#1c242c]">
              {policyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
