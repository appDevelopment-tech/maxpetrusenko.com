"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import trainedPolicy from "./sixPendulumPolicy.json";

type TrainedPolicy = {
  algorithm?: string;
  modelType?: string;
  policyVersion?: number;
  links?: number;
  inputCount?: number;
  forceScale: number;
  controlHz?: number;
  horizonSeconds?: number;
  observation?: string[];
  weights?: number[];
  layers?: { weights: number[][]; bias: number[]; activation?: "linear" | "relu" | "tanh" }[];
  knotCount?: number;
  knots?: number[];
  feedback?: number[];
  steps?: number;
  dt?: number;
  training?: {
    horizonSeconds?: number;
    controlHz?: number;
  };
};

type PendulumState = {
  cartX: number;
  cartV: number;
  theta: number[];
  omega: number[];
  time: number;
  combo: number;
  impulse: number;
  lastAction: number;
};

const linkOptions = [1, 2, 3, 4, 5, 6] as const;
const policy = trainedPolicy as TrainedPolicy;
const selectableLinkLimit =
  policy.algorithm === "modal-pezzza-style-chain-evolution" && policy.modelType === "pezzzaChainKnotMlp"
    ? Math.max(1, Math.min(6, policy.links ?? 1))
    : 1;
const SCORE_MAX_UPRIGHT_ANGLE = 0.16;
const SCORE_MAX_CHAIN_BEND = 0.14;

const policyNotes = [
  "Observation: cart x, cart velocity, previous action, and sin/cos angle features.",
  "Action: model-produced continuous cart force only.",
  "Reward: dense swing-up shaping during training, strict visible score only when every link is upright and straight.",
  "Curriculum: solve one link from the hanging position, then two, then mixed one to six link episodes.",
  "Randomization: mass, force magnitude, initial angle, episode horizon.",
  "Evaluation: one second minimum consecutive strict hold, held out seeds, lower link transfer, failure map.",
] as const;

function makeState(links: number, spread = 0.18): PendulumState {
  const theta = Array.from({ length: links }, (_, index) => {
    return Math.PI - index * 0.08 + (Math.random() - 0.5) * spread;
  });

  return {
    cartX: 0,
    cartV: 0,
    theta,
    omega: Array.from({ length: links }, () => 0),
    time: 0,
    combo: 0,
    impulse: 0,
    lastAction: 0,
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

function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function observe(state: PendulumState): number[] {
  const values = [
    1,
    state.cartX,
    state.cartV,
    Math.sin(state.time * 0.7),
    Math.cos(state.time * 0.7),
    Math.sin(state.time * 1.7),
    Math.cos(state.time * 1.7),
    clamp(state.time / 6, 0, 1),
    clamp(state.time / 6, 0, 1) ** 2,
  ];

  for (let index = 0; index < 6; index += 1) {
    values.push(Math.sin(state.theta[index] ?? 0), Math.cos(state.theta[index] ?? 0), (state.omega[index] ?? 0) / 8);
  }

  return values;
}

function runMlpPolicy(inputs: number[]): number | null {
  if (!Array.isArray(policy.layers)) return null;

  let activations = inputs;
  policy.layers.forEach((layer: { weights: number[][]; bias: number[] }, layerIndex: number) => {
    const next = layer.bias.map((bias, outputIndex) => {
      const sum = activations.reduce((value, activation, inputIndex) => {
        return value + activation * (layer.weights[inputIndex]?.[outputIndex] ?? 0);
      }, bias);
      return layerIndex === (policy.layers?.length ?? 1) - 1 ? Math.tanh(sum) : Math.tanh(sum);
    });
    activations = next;
  });

  return (activations[0] ?? 0) * policy.forceScale;
}

function runPezzzaOneLinkPolicy(state: PendulumState): number | null {
  if (
    policy.algorithm !== "modal-pezzza-style-evolution" ||
    !["pezzzaKnotMlp", "mlpPolicy"].includes(policy.modelType ?? "")
  ) {
    return null;
  }
  if (!Array.isArray(policy.knots) || !Array.isArray(policy.layers) || policy.layers.length < 2) return null;

  const knotCount = policy.knotCount ?? policy.knots.length;
  const horizonSeconds = policy.horizonSeconds ?? policy.training?.horizonSeconds ?? 8;
  const tNorm = clamp(state.time / horizonSeconds, 0, 1);
  const knotPosition = tNorm * Math.max(0, knotCount - 1);
  const left = Math.floor(knotPosition);
  const right = Math.min(left + 1, Math.max(0, knotCount - 1));
  const mix = knotPosition - left;
  const base = (policy.knots[left] ?? 0) * (1 - mix) + (policy.knots[right] ?? policy.knots[left] ?? 0) * mix;
  const inputs = [
    state.cartX / 2.4,
    state.cartV / 6,
    Math.sin(state.theta[0] ?? 0),
    Math.cos(state.theta[0] ?? 0),
    (state.omega[0] ?? 0) / 10,
    state.lastAction / policy.forceScale,
    tNorm,
  ];
  const hiddenLayer = policy.layers[0];
  const outputLayer = policy.layers[1];
  const hidden = hiddenLayer.bias.map((bias, outputIndex) => {
    const sum = inputs.reduce((value, input, inputIndex) => {
      return value + input * (hiddenLayer.weights[inputIndex]?.[outputIndex] ?? 0);
    }, bias);
    return Math.tanh(sum);
  });
  const feedback = outputLayer.bias.reduce((sum, bias, outputIndex) => {
    const weighted = hidden.reduce((value, activation, inputIndex) => {
      return value + activation * (outputLayer.weights[inputIndex]?.[outputIndex] ?? 0);
    }, bias);
    return sum + weighted;
  }, 0);

  return Math.tanh(base + feedback) * policy.forceScale;
}

function runPezzzaChainPolicy(state: PendulumState, links: number): number | null {
  if (policy.algorithm !== "modal-pezzza-style-chain-evolution" || policy.modelType !== "pezzzaChainKnotMlp") {
    return null;
  }
  if (!Array.isArray(policy.knots) || !Array.isArray(policy.layers) || policy.layers.length < 2) return null;

  const activeLinks = Math.max(1, Math.min(links, policy.links ?? links));
  const knotCount = policy.knotCount ?? policy.knots.length;
  const horizonSeconds = policy.horizonSeconds ?? policy.training?.horizonSeconds ?? 7;
  const tNorm = clamp(state.time / horizonSeconds, 0, 1);
  const knotPosition = tNorm * Math.max(0, knotCount - 1);
  const left = Math.floor(knotPosition);
  const right = Math.min(left + 1, Math.max(0, knotCount - 1));
  const mix = knotPosition - left;
  const base = (policy.knots[left] ?? 0) * (1 - mix) + (policy.knots[right] ?? policy.knots[left] ?? 0) * mix;
  const inputs = [state.cartX / 2.4, state.cartV / 6];

  for (let index = 0; index < activeLinks; index += 1) {
    inputs.push(Math.sin(state.theta[index] ?? 0), Math.cos(state.theta[index] ?? 0), (state.omega[index] ?? 0) / 10);
  }
  for (let index = 1; index < activeLinks; index += 1) {
    const relative = angleDelta(state.theta[index] ?? 0, state.theta[index - 1] ?? 0);
    inputs.push(Math.sin(relative), Math.cos(relative));
  }
  inputs.push(state.lastAction / policy.forceScale, tNorm);

  const hiddenLayer = policy.layers[0];
  const outputLayer = policy.layers[1];
  const hidden = hiddenLayer.bias.map((bias, outputIndex) => {
    const sum = inputs.reduce((value, input, inputIndex) => {
      return value + input * (hiddenLayer.weights[inputIndex]?.[outputIndex] ?? 0);
    }, bias);
    return Math.tanh(sum);
  });
  const feedback = outputLayer.bias.reduce((sum, bias, outputIndex) => {
    const weighted = hidden.reduce((value, activation, inputIndex) => {
      return value + activation * (outputLayer.weights[inputIndex]?.[outputIndex] ?? 0);
    }, bias);
    return sum + weighted;
  }, 0);

  return Math.tanh(base + feedback) * policy.forceScale;
}

function runSacPolicy(state: PendulumState): number | null {
  if (policy.modelType !== "sacMlp" || !Array.isArray(policy.layers)) return null;

  const values = [state.cartX, state.cartV / 5, state.lastAction / policy.forceScale];
  for (let index = 0; index < 6; index += 1) {
    const theta = state.theta[index] ?? 0;
    const relative = index === 0 ? theta : theta - (state.theta[index - 1] ?? 0);
    values.push(
      Math.sin(theta),
      Math.cos(theta),
      Math.sin(relative),
      Math.cos(relative),
      (state.omega[index] ?? 0) / 8
    );
  }

  let activations = values.slice(0, policy.inputCount ?? values.length);
  policy.layers.forEach((layer) => {
    const next = layer.bias.map((bias, outputIndex) => {
      const sum = activations.reduce((value, activation, inputIndex) => {
        return value + activation * (layer.weights[inputIndex]?.[outputIndex] ?? 0);
      }, bias);
      if (layer.activation === "relu") return Math.max(0, sum);
      if (layer.activation === "linear") return sum;
      return Math.tanh(sum);
    });
    activations = next;
  });

  return (activations[0] ?? 0) * policy.forceScale;
}

function runTimeKnotFeedbackPolicy(state: PendulumState): number | null {
  if (policy.modelType !== "timeKnotFeedback") return null;

  const knots = policy.knots ?? [];
  const feedback = policy.feedback ?? [];
  const knotCount = policy.knotCount ?? knots.length;
  const policyDuration = (policy.steps ?? 560) * (policy.dt ?? 0.025);
  const position = clamp((state.time / policyDuration) * Math.max(0, knotCount - 1), 0, Math.max(0, knotCount - 1));
  const left = Math.floor(position);
  const right = Math.min(left + 1, Math.max(0, knotCount - 1));
  const mix = position - left;
  const base = (knots[left] ?? 0) * (1 - mix) + (knots[right] ?? knots[left] ?? 0) * mix;
  const features = [state.cartX, state.cartV / 5];

  for (let index = 0; index < 6; index += 1) {
    features.push(Math.sin(state.theta[index] ?? 0), (state.omega[index] ?? 0) / 8);
  }

  const correction = features.reduce((sum, value, index) => sum + value * (feedback[index] ?? 0), 0);
  return Math.tanh(base + correction) * policy.forceScale;
}

function policyForce(state: PendulumState): number {
  const trainedForce =
    runPezzzaChainPolicy(state, state.theta.length) ??
    runPezzzaOneLinkPolicy(state) ??
    runSacPolicy(state) ??
    runTimeKnotFeedbackPolicy(state) ??
    runMlpPolicy(observe(state));
  if (trainedForce !== null) {
    const forceLimit = Math.max(32, policy.forceScale);
    return clamp(trainedForce, -forceLimit, forceLimit);
  }

  const inputs = observe(state);
  let activation = 0;
  for (let index = 0; index < (policy.inputCount ?? inputs.length); index += 1) {
    activation += (policy.weights?.[index] ?? 0) * (inputs[index] ?? 0);
  }

  return clamp(Math.tanh(activation) * policy.forceScale, -32, 32);
}

function stepPezzzaChainState(state: PendulumState, links: number, dt: number): PendulumState {
  const force = policyForce(state);
  const next: PendulumState = {
    cartX: state.cartX,
    cartV: state.cartV,
    theta: [...state.theta],
    omega: [...state.omega],
    time: state.time + dt,
    combo: state.combo,
    impulse: state.impulse * Math.exp(-dt * 2.8),
    lastAction: force,
  };
  const gravity = 9.81;
  const cartDamping = 0.08;
  const hingeDamping = 0.03;
  let cartForce = force - cartDamping * state.cartV - 0.35 * state.cartX;
  for (let index = 0; index < links; index += 1) {
    cartForce -= Math.sin(state.theta[index] ?? 0) * (index + 1) * 0.11;
  }
  const cartAcc = cartForce;
  next.cartV = clamp(state.cartV + cartAcc * dt, -8, 8);
  next.cartX = clamp(state.cartX + next.cartV * dt, -2.88, 2.88);

  for (let index = 0; index < links; index += 1) {
    const theta = state.theta[index] ?? 0;
    const omega = state.omega[index] ?? 0;
    const length = 0.52 + index * 0.05;
    const previousTheta = index > 0 ? state.theta[index - 1] ?? theta : theta;
    const nextTheta = index + 1 < links ? state.theta[index + 1] ?? theta : theta;
    const coupling = (angleDelta(previousTheta, theta) + angleDelta(nextTheta, theta)) * (1.65 + index * 0.25);
    const drive = (-cartAcc * Math.cos(theta) * (0.47 + index * 0.05)) / length;
    const angularAcc = (gravity * Math.sin(theta)) / length + drive + coupling - hingeDamping * omega;
    next.omega[index] = clamp(omega + angularAcc * dt, -24, 24);
    next.theta[index] = wrapAngle(theta + next.omega[index] * dt);
  }

  next.combo = isStrictHoldState(next) ? next.combo + dt : 0;
  return next;
}

function stepPezzzaOneLinkState(state: PendulumState, dt: number): PendulumState {
  const force = policyForce(state);
  const cartMass = 1.0;
  const poleMass = 0.1;
  const length = 0.5;
  const totalMass = cartMass + poleMass;
  const gravity = 9.81;
  const cartDamping = 0.08;
  const hingeDamping = 0.02;
  const theta = state.theta[0] ?? 0;
  const omega = state.omega[0] ?? 0;
  const dampedForce = force - cartDamping * state.cartV - 0.35 * state.cartX;
  const temp = (dampedForce + poleMass * length * omega ** 2 * Math.sin(theta)) / totalMass;
  const thetaAcc =
    (gravity * Math.sin(theta) - Math.cos(theta) * temp) /
      (length * (4 / 3 - (poleMass * Math.cos(theta) ** 2) / totalMass)) -
    hingeDamping * omega;
  const cartAcc = temp - (poleMass * length * thetaAcc * Math.cos(theta)) / totalMass;
  const cartV = clamp(state.cartV + cartAcc * dt, -8, 8);
  const cartX = clamp(state.cartX + cartV * dt, -2.88, 2.88);
  const nextOmega = clamp(omega + thetaAcc * dt, -22, 22);
  const nextTheta = wrapAngle(theta + nextOmega * dt);
  const nextState: PendulumState = {
    cartX,
    cartV,
    theta: [nextTheta],
    omega: [nextOmega],
    time: state.time + dt,
    combo: state.combo,
    impulse: state.impulse * Math.exp(-dt * 2.8),
    lastAction: force,
  };
  nextState.combo = isStrictHoldState(nextState) ? nextState.combo + dt : 0;
  return nextState;
}

function stepState(state: PendulumState, links: number, dt: number): PendulumState {
  if (
    policy.algorithm === "modal-pezzza-style-chain-evolution" &&
    policy.modelType === "pezzzaChainKnotMlp" &&
    links <= (policy.links ?? 0)
  ) {
    return stepPezzzaChainState(state, links, dt);
  }

  if (
    links === 1 &&
    policy.algorithm === "modal-pezzza-style-evolution" &&
    ["pezzzaKnotMlp", "mlpPolicy"].includes(policy.modelType ?? "")
  ) {
    return stepPezzzaOneLinkState(state, dt);
  }

  const next: PendulumState = {
    cartX: state.cartX,
    cartV: state.cartV,
    theta: [...state.theta],
    omega: [...state.omega],
    time: state.time + dt,
    combo: state.combo,
    impulse: state.impulse * Math.exp(-dt * 2.8),
    lastAction: state.lastAction,
  };
  const force = policyForce(state);
  next.lastAction = force;
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
    const gravity = (9.81 * Math.sin(theta)) / length;
    const drive = (-cartAcc * Math.cos(theta) * (0.42 + index * 0.04)) / length;
    const angularAcc = gravity + drive + coupling - damping * omega;

    next.omega[index] = clamp(omega + angularAcc * dt, -18, 18);
    next.theta[index] = wrapAngle(theta + next.omega[index] * dt);
  }

  next.combo = isStrictHoldState(next) ? next.combo + dt : 0;

  return next;
}

function isStrictHoldState(state: PendulumState): boolean {
  return (
    scoreState(state) > 82 &&
    Math.abs(state.cartX) < 1.2 &&
    state.theta.every((theta) => Math.abs(theta) < SCORE_MAX_UPRIGHT_ANGLE) &&
    state.omega.every((omega) => Math.abs(omega) < 4.5)
  );
}

function scoreState(state: PendulumState): number {
  const maxUprightError = state.theta.reduce((max, theta) => Math.max(max, Math.abs(theta)), 0);
  const maxBendError = state.theta.reduce((max, theta, index) => {
    if (index === 0) return max;
    return Math.max(max, Math.abs(angleDelta(theta, state.theta[index - 1] ?? 0)));
  }, 0);

  if (maxUprightError > SCORE_MAX_UPRIGHT_ANGLE || maxBendError > SCORE_MAX_CHAIN_BEND) {
    return 0;
  }

  const angleError = state.theta.reduce((sum, theta, index) => sum + Math.abs(theta) * (index + 1), 0);
  const velocityError = state.omega.reduce((sum, omega) => sum + Math.abs(omega), 0);
  return Math.round(clamp(100 - angleError * 12 - maxBendError * 30 - velocityError * 2.5 - Math.abs(state.cartX) * 8, 0, 100));
}

export function SixPendulumCartpoleLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<PendulumState>(makeState(1));
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [links, setLinks] = useState<(typeof linkOptions)[number]>(1);
  const [running, setRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [heldSeconds, setHeldSeconds] = useState(0);
  const [episode, setEpisode] = useState(1);

  useEffect(() => {
    stateRef.current = makeState(links, 0.18);
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
      gradient.addColorStop(0, "#05080b");
      gradient.addColorStop(0.55, "#0d1820");
      gradient.addColorStop(1, "#1e2f2e");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(247,241,230,0.72)";
      for (let star = 0; star < 28; star += 1) {
        const x = (star * 83 + 41) % width;
        const y = (star * 47 + 29) % Math.max(120, height * 0.6);
        context.beginPath();
        context.arc(x, y, star % 5 === 0 ? 2 : 1.2, 0, Math.PI * 2);
        context.fill();
      }

      context.strokeStyle = "rgba(255,255,255,0.12)";
      context.lineWidth = 1;
      for (let grid = 0; grid < 8; grid += 1) {
        const y = 40 + grid * 42;
        context.beginPath();
        context.moveTo(24, y);
        context.lineTo(width - 24, y);
        context.stroke();
      }

      const trackY = height * 0.5;
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

      context.fillStyle = "#0c1115";
      context.beginPath();
      context.arc(centerX - 27, trackY + 34, 7, 0, Math.PI * 2);
      context.arc(centerX + 27, trackY + 34, 7, 0, Math.PI * 2);
      context.fill();

      let pivotX = centerX;
      let pivotY = trackY;
      const colors = ["#e2342f", "#f0b35f", "#6fd0b2", "#0f7ea9", "#7b5ce1", "#f7f1e6"];

      state.theta.forEach((theta, index) => {
        const length = Math.max(24, height * (0.085 - index * 0.003));
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
      const strictScore = state.combo >= 1 ? scoreState(state) : 0;
      context.fillText(`strict score ${strictScore}`, 24, 30);
      context.fillText("automated model only", 24, 52);
      context.fillText(`score ${strictScore}`, 24, 74);
      context.fillText(`held ${state.combo.toFixed(2)}s / 1.00s min`, 24, 96);

      if (strictScore > 82 && state.combo > 1) {
        context.fillStyle = strictScore > 92 ? "#f5df2e" : "#55d65a";
        context.font = "900 30px DM Sans, sans-serif";
        context.fillText(strictScore > 92 ? "PERFECT!!" : "GREAT!", width - 205, height * 0.5);
        context.font = "800 13px DM Sans, sans-serif";
        context.fillStyle = "#f7f1e6";
        context.fillText(`${state.combo.toFixed(2)}s held`, width - 145, height * 0.5 + 24);
      }
    }

    function animate(time: number) {
      const previous = lastTimeRef.current ?? time;
      const dt = clamp((time - previous) / 1000, 0.001, 0.025);
      lastTimeRef.current = time;

      if (running) {
        const substeps = 3;
        for (let index = 0; index < substeps; index += 1) {
          stateRef.current = stepState(stateRef.current, links, dt / substeps);
        }
        setHeldSeconds(stateRef.current.combo);
        setScore(stateRef.current.combo >= 1 ? scoreState(stateRef.current) : 0);
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
  }, [links, running]);

  function reset() {
    stateRef.current = makeState(links, 0.18);
    setHeldSeconds(0);
    setEpisode((value) => value + 1);
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
              <p className="mt-1 text-sm font-bold text-[#4b535c]">1.00s minimum hold</p>
              <p className="sr-only" data-pendulum-held={heldSeconds.toFixed(3)} data-pendulum-score={score}>
                Held {heldSeconds.toFixed(3)} seconds. Score {score}.
              </p>
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
                      : option > selectableLinkLimit
                        ? "cursor-not-allowed border-[rgba(12,17,21,0.08)] bg-[#ece4d6] text-[#7a7167]"
                      : "border-[rgba(12,17,21,0.14)] bg-white text-[#0c1115]"
                  }`}
                  disabled={option > selectableLinkLimit}
                  key={option}
                  onClick={() => setLinks(option)}
                  title={option <= selectableLinkLimit ? `${option}-link verification` : "Locked until the lower-link gate is solved"}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-3 py-2 text-sm font-black text-[#0c1115]"
              onClick={() => reset()}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} /> Reset from down
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
