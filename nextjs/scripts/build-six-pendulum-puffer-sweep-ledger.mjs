import fs from "node:fs";
import path from "node:path";

const defaultInputDir =
  "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints";
const defaultOutputDir =
  "/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps";

const inputDir = process.argv[2] || defaultInputDir;
const outputDir = process.argv[3] || defaultOutputDir;

const pufferArtifacts = [
  "puffer-mjwarp-local-substrate-smoke.json",
  "puffer-mjwarp-local-env-contract.json",
  "puffer-mjwarp-pufferppo-contract.json",
  "puffer-mjwarp-pufferppo-runtime.json",
  "puffer-mjwarp-gpu-score-kernel-smoke.json",
  "puffer-mjwarp-env-driver.json",
  "puffer-mjwarp-device-rollout.json",
  "puffer-mjwarp-device-rollout-buffer.json",
  "puffer-mjwarp-device-rollout-action-buffer.json",
  "puffer-mjwarp-device-rollout-torch-policy.json",
  "puffer-mjwarp-device-rollout-ppo-update.json",
  "puffer-mjwarp-device-rollout-puffer-mingru-policy.json",
  "puffer-mjwarp-device-rollout-down-whip-smoke.json",
  "puffer-mjwarp-device-ppo-train.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-smoke.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-hold-bc-smoke.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-hold-bc-lr5e5.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-lr5e5.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-long-lr3e5.json",
  "puffer-mjwarp-device-ppo-puffer-mingru-down-from-hold-lr3e5.json",
  "puffer-mjwarp-device-ppo-hold-probe.json",
  "puffer-mjwarp-device-ppo-hold-probe-f32.json",
  "puffer-mjwarp-device-ppo-hold-bc-probe.json",
  "puffer-mjwarp-device-ppo-down-swingup-probe.json",
  "puffer-mjwarp-device-ppo-down-swingup-conservative.json",
  "puffer-mjwarp-device-ppo-down-heavy-conservative.json",
  "puffer-mjwarp-device-ppo-link2-down-heavy-diagnostic.json",
  "puffer-mjwarp-device-ppo-link3-down-heavy-diagnostic.json",
  "puffer-mjwarp-device-ppo-link4-down-heavy-diagnostic.json",
  "puffer-mjwarp-device-ppo-link1-gated-20260610.json",
  "puffer-mjwarp-device-ppo-link2-gated-20260610.json",
  "puffer-mjwarp-device-ppo-link3-gated-20260610.json",
  "puffer-mjwarp-device-ppo-link4-gated-20260610.json",
  "puffer-mjwarp-device-ppo-link1-energy-bc-20260610.json",
  "puffer-mjwarp-device-ppo-link1-energy-bc-f160-long-20260610.json",
  "puffer-mjwarp-device-ppo-link1-energy-seqbc-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-energy-dagger-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-energy-dagger-f160-longteacher-20260610.json",
  "puffer-mjwarp-device-ppo-link1-stochastic-candidate-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-stochastic-candidate-resume-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-puredown-resume-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-elite-bc-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-near-elite-bc05-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-down-whip-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-centered-rest-pump-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-catch-gated-recenter-f160-20260611.json",
  "puffer-mjwarp-device-ppo-link1-energy-anchor-recenter-f160-20260611.json",
  "puffer-mjwarp-device-ppo-link1-trajectory-bc-f160-20260611.json",
  "puffer-mjwarp-device-ppo-link1-top-trajectory-bc-f160-20260611.json",
  "puffer-mjwarp-device-ppo-link1-param-dagger-f160-20260611.json",
  "puffer-mjwarp-device-ppo-link1-fallback-elite-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-fallback-elite005-f160-20260610.json",
  "puffer-mjwarp-device-ppo-link1-random-horizon-recenter-f160-20260611.json",
  "puffer-mjwarp-energy-teacher-sweep-smoke-f160-20260611.json",
  "puffer-mjwarp-energy-teacher-sweep-f160-20260611.json",
  "puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.json",
  "puffer-mjwarp-device-rollout-link6.json",
  "puffer-mjwarp-device-rollout-random-horizon.json",
  "puffer-mjwarp-local-ppo-smoke.json",
  "puffer-mjwarp-local-ppo-hold-search.json",
  "puffer-mjwarp-stabilizer-bc.json",
  "puffer-mjwarp-down-warmstart.json",
  "puffer-mjwarp-mixed-warmstart.json",
  "puffer-mjwarp-energy-teacher.json",
  "puffer-mjwarp-energy-teacher-bc.json",
  "puffer-mjwarp-energy-teacher-sequence-bc.json",
  "puffer-mjwarp-energy-teacher-dagger.json",
  "puffer-mjwarp-sequence-bc-down-warmstart.json",
  "puffer-mjwarp-anchored-down-warmstart.json",
];

const dynamicArtifacts = fs.existsSync(inputDir)
  ? fs
      .readdirSync(inputDir)
      .filter((file) => /^puffer-mjwarp-device-ppo-link1-blast-.*\.json$/.test(file))
      .sort()
  : [];
const allArtifacts = [...pufferArtifacts, ...dynamicArtifacts.filter((file) => !pufferArtifacts.includes(file))];

function asNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readJson(file) {
  const fullPath = path.join(inputDir, file);
  if (!fs.existsSync(fullPath)) return null;
  return {
    file,
    fullPath,
    root: JSON.parse(fs.readFileSync(fullPath, "utf8")),
  };
}

function strictScoreFromMetric(metric) {
  const maxHeldSeconds = asNumber(metric?.maxHeldSeconds, asNumber(metric?.maxHoldSeconds));
  if (maxHeldSeconds < 1) return 0;
  return asNumber(metric?.maxStrictScore, asNumber(metric?.strictScore));
}

function downMetric(root) {
  if (root?.training?.validationByPose?.down) return root.training.validationByPose.down;
  if (root?.validationByPose?.down) return root.validationByPose.down;
  if (root?.bestDownEvaluation) return root.bestDownEvaluation;
  if (root?.evaluation?.down) return root.evaluation.down;
  return root || {};
}

function holdMetric(root) {
  if (root?.training?.validationByPose?.hold) return root.training.validationByPose.hold;
  if (root?.validationByPose?.hold) return root.validationByPose.hold;
  if (root?.bestHoldEvaluation) return root.bestHoldEvaluation;
  if (Array.isArray(root?.history) && root.history.length > 0) {
    return root.history[root.history.length - 1]?.evaluation?.hold || {};
  }
  return root?.evaluation?.hold || {};
}

function sourceRow(entry, index) {
  const { file, fullPath, root } = entry;
  const down = downMetric(root);
  const hold = holdMetric(root);
  const downHeld = asNumber(down.maxHeldSeconds, asNumber(down.maxHoldSeconds));
  const holdHeld = asNumber(hold.maxHeldSeconds, asNumber(hold.maxHoldSeconds));
  const strictScore = strictScoreFromMetric(down);
  const algorithm = String(root.algorithm || "");
  const plumbingArtifact =
    file.includes("substrate") ||
    file.includes("contract") ||
    file.includes("env-driver") ||
    file.includes("device-rollout") ||
    file.includes("gpu-score-kernel");
  const learned =
    algorithm.includes("behavior-clone") ||
    algorithm.includes("dagger") ||
    (!algorithm.includes("teacher") && !plumbingArtifact);
  const teacher =
    root.algorithm === "energy-pump-plus-stabilizer-teacher" ||
    algorithm.includes("teacher-sweep") ||
    algorithm.includes("energy-whip-catch-teacher");
  const teacherWarmup = root.bcEnergyTeacherWarmup?.teacher;
  const stochasticDown = root.bestStochasticDownEvaluation;
  const pufferMinGruSmoke = file.includes("puffer-mingru-policy");
  const pufferMinGruTrainSmoke = root.policyKind === "puffer-mingru";

  return {
    experimentId: `current-${String(index + 1).padStart(2, "0")}-${file.replace(/\.json$/, "")}`,
    status: teacher ? "scaffold" : learned ? "completed" : "plumbing",
    algorithm: root.algorithm || root.schema || "unknown",
    stack: "MJWarp adapter, local Mac execution",
    linkCount: asNumber(root.links, 1),
    policyFamily: pufferMinGruSmoke || pufferMinGruTrainSmoke
      ? "Puffer-compatible MinGRU-style smoke"
      : teacher
      ? file.includes("teacher-sweep") || file.includes("top-trajectories")
        ? "parameterized energy/whip/catch teacher sweep"
        : "classical energy teacher"
        : learned
          ? "tiny GRU / local policy-gradient or BC"
          : "environment contract",
    policyParams: pufferMinGruSmoke
      ? asNumber(root.torchPolicyParameters)
      : asNumber(root.policyParameters, learned ? 27267 : 0),
    forceScale: asNumber(root.forceScale, null),
    nworld: asNumber(root.nworld),
    rolloutSteps: asNumber(root.training?.rolloutSteps, asNumber(root.rolloutSteps, asNumber(root.steps))),
    wallclockSeconds: asNumber(root.training?.elapsedSeconds, asNumber(root.elapsedSeconds)),
    score: strictScore,
    maxHeldSeconds: downHeld,
    solvedOneSecond: downHeld >= 1,
    holdStartMaxHeldSeconds: holdHeld,
    holdStartSolvedOneSecond: holdHeld >= 1,
    teacherWarmupMaxHeldSeconds: asNumber(teacherWarmup?.maxHeldSeconds),
    teacherWarmupSolvedOneSecond: Boolean(teacherWarmup?.solvedOneSecond),
    stochasticDownMaxHeldSeconds: asNumber(stochasticDown?.maxHeldSeconds),
    stochasticDownSolvedOneSecond: Boolean(stochasticDown?.solvedOneSecond),
    stochasticDownSolvedPassRate: asNumber(stochasticDown?.solvedPassRate),
    countsTowardSolve: !teacher && downHeld >= 1,
    sourceArtifact: fullPath,
    note: file.includes("device-ppo-down-heavy-conservative")
      ? "Down-heavy one-link swing-up/catch PPO probe at force 120: mostly pure hanging starts, some pump/catch starts, conservative PPO, and stabilizer BC initialization. Counts only if held-out pure down-start holds for at least one second."
      : file.includes("energy-seqbc-f160")
      ? "One-link device-buffer PPO with lower-force sequence energy-teacher BC. The teacher solves down-start, and stochastic learner rollouts improve, but deterministic held-out down-start remains zero; teacher warmup does not count."
      : file.includes("energy-dagger-f160-longteacher")
      ? "One-link device-buffer PPO with lower-force learner-state DAgger labels and longer teacher horizon. Stochastic rollout improves above half a second, but deterministic held-out down-start remains zero."
      : file.includes("energy-dagger-f160")
      ? "One-link device-buffer PPO with lower-force learner-state DAgger labels. It reaches held-out near-top strict score but still never holds down-start for one second."
      : file.includes("stochastic-candidate-f160")
      ? "One-link device-buffer PPO candidate with repeated stochastic held-out eval and saved checkpoint. Hold-start solves, stochastic down-start reaches 0.72s, but down-start remains subsecond and does not count."
      : file.includes("stochastic-candidate-resume-f160")
      ? "Warmstarted continuation from the saved stochastic candidate. Curriculum rollouts solve over one second, but held-out pure down-start degrades below the prior candidate and still does not count."
      : file.includes("puredown-resume-f160")
      ? "Warmstarted continuation from the saved stochastic candidate using pure-down training resets. It stays subsecond from held-out pure down and does not improve over the prior candidate."
      : file.includes("near-elite-bc05-f160")
      ? "Warmstarted diagnostic that behavior-clones near-elite curriculum rollout worlds above 0.5s. It weakens held-out hold and pure-down stays zero; near-elite curriculum cloning is not a counted solve."
      : file.includes("elite-bc-f160")
      ? "Warmstarted diagnostic that behavior-clones curriculum rollout worlds above the one-second gate after PPO. It selected real 1.205s curriculum worlds, but held-out pure down still stayed zero."
      : file.includes("down-whip-f160")
      ? "Warmstarted diagnostic trained on hanging down resets with randomized angular velocity. It strengthens hold-start, but strict pure-down stays zero and stochastic pure-down remains below the prior 0.72s candidate."
      : file.includes("centered-rest-pump-f160")
      ? "Warmstarted diagnostic with center-gated energy-pump reward and stronger rail penalty from exact down resets. It strengthens hold-start, but strict pure-down stays zero and stochastic pure-down remains below the prior 0.72s candidate."
      : file.includes("energy-anchor-recenter-f160")
      ? "Warmstarted exact-down PPO continuation from the 0.8025s recenter-snap checkpoint with a small energy-teacher anchor loss during PPO updates. Hold-start remains solved, but exact down-start regresses to near-zero; simple teacher anchoring is too blunt for the whip/catch transfer."
      : file.includes("link1-blast")
      ? "Local CPU blast-sweep dot. It is selected by wallclock-vs-score ranking and starts from one of the prior best learned checkpoints; it counts only if held-out pure down-start reaches one second."
      : file.includes("top-trajectory-bc-f160")
      ? "One-link learned-policy diagnostic that sequence-clones a multi-trajectory export from the top parameterized MJWarp exact-down teachers, then runs a held-out learned down-start gate."
      : file.includes("trajectory-bc-f160")
      ? "One-link learned-policy diagnostic that sequence-clones the successful parameterized MJWarp exact-down teacher trajectory, then runs a held-out learned down-start gate. Counts only if the learned policy itself holds exact down-start for one second."
      : file.includes("recenter-snap-f160")
      ? "Warmstarted diagnostic with recenter-after-snap shaping and center-gated catch reward from exact down resets. Deterministic pure-down stays zero, but stochastic pure-down improves to 0.8025s; still subsecond and not counted."
      : file.includes("catch-gated-recenter-f160")
      ? "Warmstarted catch-gated reward diagnostic from the 0.8025s recenter-snap checkpoint. The reward removes near-top-fast bonus and pays centered/slow catch instead; counts only if held-out pure down reaches one second."
      : file.includes("fallback-elite005-f160")
      ? "Warmstarted subsecond elite fallback diagnostic from the recenter-snap checkpoint. Fallback BC selected two 0.185s near-catch worlds and changed the policy, but deterministic pure-down stayed zero and stochastic pure-down regressed to 0.5475s."
      : file.includes("fallback-elite-f160")
      ? "Warmstarted subsecond elite fallback diagnostic from the recenter-snap checkpoint. With fallback threshold 0.25s, no rollout world qualified, deterministic pure-down stayed zero, and stochastic pure-down regressed to 0.3775s."
      : file.includes("random-horizon-recenter-f160")
      ? "Warmstarted random-horizon continuation from the 0.8025s recenter-snap checkpoint. Random horizons were active only during training, fixed held-out eval stayed clean, and stochastic pure-down regressed to 0.0125s; the Yacine random-horizon trick is too early for this local candidate."
      : file.includes("energy-bc-f160")
      ? "One-link device-buffer PPO with lower-force energy-teacher BC. The teacher itself passes the one-second gate, but the learned policy does not; teacher warmup is scaffold only."
      : file.includes("energy-bc-20260610")
      ? "One-link device-buffer PPO with high-force energy-teacher BC. It saturates/rails and the learned policy does not solve down-start."
      : file.includes("link1-gated-20260610")
      ? "Parallel lower-link gated one-link PPO run. Stochastic rollout reaches a subsecond catch/hold, but deterministic held-out down-start remains zero."
      : file.includes("device-ppo-link")
      ? "Parallel lower-link diagnostic down-heavy PPO run. It is exploratory only: higher links are not promoted until every lower link passes held-out pure down-start for at least one second."
      : file.includes("device-ppo-down-swingup-conservative")
      ? "Conservative one-link mixed-start swing-up/catch PPO probe at force 120 with lower LR, tighter clip, and stabilizer BC initialization. Counts only if held-out pure down-start holds for at least one second."
      : file.includes("device-ppo-down-swingup-probe")
      ? "One-link mixed-start swing-up/catch PPO probe at force 120 with stronger potential/catch reward and stabilizer BC initialization. Counts only if held-out pure down-start holds for at least one second."
      : file.includes("device-ppo-hold-bc-probe")
      ? "Device-buffer recurrent policy learned one-link hold-start with stabilizer BC warmup and passed held-out hold-start over one second. Down-start remains zero, so this is curriculum progress only."
      : file.includes("device-ppo-hold-probe")
      ? "Long-horizon one-link hold-start PPO probe. Force 32 avoids cart terminal but remains subsecond; force 64 is terminal-prone. Counts only if held-out down-start holds for at least one second."
      : file.includes("device-ppo-train")
      ? "Repeated MJWarp rollout-buffer PPO training: stochastic collect, persistent optimizer updates, deterministic down-start eval after each update. Counts only if held-out down-start holds for at least one second."
      : file.includes("device-ppo-puffer-mingru-smoke")
      ? "Bounded one-update MJWarp PPO smoke using the Puffer-compatible MinGRU-style policy at ~1M params. It proves collect/update/eval with the source-thread policy scale; it is not enough training to solve."
      : file.includes("device-ppo-puffer-mingru-hold-bc-smoke")
      ? "One-link hold-start MinGRU stabilizer BC diagnostic. Default BC learning rate saturates actions and fails the one-second hold gate."
      : file.includes("device-ppo-puffer-mingru-hold-bc-lr5e5")
      ? "One-link hold-start MinGRU stabilizer BC diagnostic with lower BC learning rate. It avoids action saturation but remains below the one-second hold gate."
      : file.includes("device-ppo-puffer-mingru-hold-seqbc-lr5e5")
      ? "One-link hold-start MinGRU sequence-BC diagnostic with lower BC learning rate. Sequence BC improves hold but remains below the one-second gate."
      : file.includes("device-ppo-puffer-mingru-hold-seqbc-long-lr3e5")
      ? "One-link hold-start MinGRU sequence-BC diagnostic with longer sequence/context. It passes held-out hold-start above one second but does not solve down-start."
      : file.includes("device-ppo-puffer-mingru-down-from-hold-lr3e5")
      ? "One-link down-heavy MinGRU transfer from the solved hold-start checkpoint. It preserves hold-start but pure down-start remains zero and rail terminals dominate."
      : teacher
      ? file.includes("top-trajectories")
        ? "Exported multi-trajectory dataset from top parameterized MJWarp exact-down teachers. Scaffold only: useful for distillation, but not a learned policy and never promotes links."
        : file.includes("teacher-sweep")
        ? "Parameterized exact-down energy/whip/catch controller sweep inside MJWarp. Scaffold only: it can provide trajectory evidence for distillation, but it is not a learned policy and never promotes links."
        : "Teacher proves swing-up/catch signal in MJWarp, but it is not a learned policy."
      : learned && downHeld < 1
        ? "Learned/plumbing row does not solve down-start; score forced to 0 because hold is under 1s."
        : file.includes("gpu-score-kernel")
          ? "Links 1..6 score/observation/terminal Warp kernel matches NumPy scorer and is wired into the env scorer."
          : file.includes("device-rollout")
            ? pufferMinGruSmoke
              ? "Device-side MJWarp rollout smoke: Puffer-compatible MinGRU-style recurrent actor-critic at ~1M params runs through fixed PPO buffers and one optimizer update; untrained smoke only."
              : file.includes("action-buffer")
              ? "Device-side MJWarp rollout smoke: external fixed-shape action tensor is consumed by a Warp ctrl kernel; precomputed buffer only, not learned."
              : file.includes("torch-policy")
                ? "Device-side MJWarp rollout smoke: recurrent Torch actor-critic actions/logprobs/values are bridged through wp.to_torch/wp.from_torch into fixed PPO buffers and Warp ctrl; untrained policy only."
                : file.includes("ppo-update")
                  ? "Device-side MJWarp rollout smoke: three PPO epochs consume fixed recurrent buffers and change parameters; smoke only, not learned."
              : "Device-side MJWarp rollout smoke: scripted action kernel only, no per-step CPU metric reads, not a learned policy."
          : "Current MJWarp/Puffer substrate evidence.",
  };
}

function queuedRows() {
  return [
    {
      experimentId: "queued-pufferppo-mingru-1link-sweep-a",
      status: "blocked-modal-spend-limit",
      algorithm: "PufferPPO",
      stack: "PufferLib + MJWarp on GPU",
      linkCount: 1,
      policyFamily: "Puffer MinGRU / PufferNet",
      policyParams: 1000000,
      forceScale: 240,
      nworld: 4096,
      rolloutSteps: 256,
      bpttHorizon: 128,
      rewardProfile: "energy + whip + catch basin + strict one-second gate",
      randomizedEpisodeLength: false,
      wallclockSeconds: 0,
      score: 0,
      maxHeldSeconds: 0,
      solvedOneSecond: false,
      countsTowardSolve: false,
      note: "First real Yacine-aligned run. Fixed horizon until whipping behavior appears.",
    },
    {
      experimentId: "queued-pufferppo-mingru-1link-random-horizon",
      status: "blocked-modal-spend-limit",
      algorithm: "PufferPPO",
      stack: "PufferLib + MJWarp on GPU",
      linkCount: 1,
      policyFamily: "Puffer MinGRU / PufferNet",
      policyParams: 1000000,
      forceScale: 240,
      nworld: 4096,
      rolloutSteps: 512,
      bpttHorizon: 256,
      rewardProfile: "same as sweep-a, randomized episode length after whip plateau",
      randomizedEpisodeLength: true,
      wallclockSeconds: 0,
      score: 0,
      maxHeldSeconds: 0,
      solvedOneSecond: false,
      countsTowardSolve: false,
      note: "Matches Yacine's trick only after policy learns whip but gets lazy on fixed endings.",
    },
    {
      experimentId: "queued-pufferppo-mingru-2link-promotion",
      status: "gated-by-1link",
      algorithm: "PufferPPO",
      stack: "PufferLib + MJWarp on GPU",
      linkCount: 2,
      policyFamily: "Puffer MinGRU / PufferNet",
      policyParams: 1000000,
      forceScale: 240,
      nworld: 4096,
      rolloutSteps: 512,
      bpttHorizon: 256,
      rewardProfile: "bend-order-preserving whip, no early straightness reward",
      randomizedEpisodeLength: false,
      wallclockSeconds: 0,
      score: 0,
      maxHeldSeconds: 0,
      solvedOneSecond: false,
      countsTowardSolve: false,
      note: "Do not run until held-out one-link down-start holds for at least 1s.",
    },
  ];
}

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined) return "";
  if (!Number.isFinite(Number(value))) return String(value);
  if (digits === 0) return Number(value).toFixed(0);
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

const currentRows = allArtifacts
  .map(readJson)
  .filter(Boolean)
  .map(sourceRow);

const rows = [...currentRows, ...queuedRows()];
fs.mkdirSync(outputDir, { recursive: true });

const jsonlPath = path.join(outputDir, "puffer-mjwarp-one-link-sweep-ledger.jsonl");
fs.writeFileSync(jsonlPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");

const completedLearnedRows = rows.filter((row) => row.status === "completed");
const solvedLearnedRows = completedLearnedRows.filter((row) => row.countsTowardSolve);
const teacherRows = rows.filter((row) => row.status === "scaffold");
const bestLearned = completedLearnedRows
  .sort(
    (a, b) =>
      b.score - a.score ||
      b.maxHeldSeconds - a.maxHeldSeconds ||
      b.stochasticDownMaxHeldSeconds - a.stochasticDownMaxHeldSeconds ||
      b.holdStartMaxHeldSeconds - a.holdStartMaxHeldSeconds,
  )[0];
const bestStochasticLearned = completedLearnedRows
  .filter((row) => row.stochasticDownMaxHeldSeconds > 0)
  .sort((a, b) => b.stochasticDownMaxHeldSeconds - a.stochasticDownMaxHeldSeconds)[0];
const bestScaffold = teacherRows
  .sort((a, b) => b.score - a.score || b.maxHeldSeconds - a.maxHeldSeconds)[0];

const tableRows = rows.map((row) =>
  [
    row.experimentId,
    row.status,
    row.algorithm,
    row.linkCount,
    row.policyFamily,
    formatNumber(row.policyParams, 0),
    formatNumber(row.wallclockSeconds, 1),
    formatNumber(row.score, 2),
    formatNumber(row.maxHeldSeconds, 3),
    row.solvedOneSecond ? "yes" : "no",
    row.countsTowardSolve ? "yes" : "no",
    row.note,
  ].join(" | "),
);

const markdown = [
  "# Puffer MJWarp One-Link Sweep Ledger",
  "",
  "This is the Yacine-shaped ledger: each row is a dot candidate with wallclock on x and strict score on y.",
  "Rows only count toward solve when a learned policy holds held-out down-start upright for at least one continuous second. Subsecond holds score 0.",
  "",
  "Current honest state:",
  "",
  `- Learned policy rows solved held-out down-start: ${solvedLearnedRows.length}/${completedLearnedRows.length}.`,
  `- Teacher scaffold rows with swing-up/catch signal: ${teacherRows.length}.`,
  `- Best learned row: ${bestLearned?.experimentId || "none"} with counting score ${formatNumber(bestLearned?.score || 0, 2)} and down-start hold ${formatNumber(bestLearned?.maxHeldSeconds || 0, 3)}s.`,
  `- Best stochastic learned down-start candidate: ${bestStochasticLearned?.experimentId || "none"} with stochastic down-start hold ${formatNumber(bestStochasticLearned?.stochasticDownMaxHeldSeconds || 0, 3)}s; this still scores 0 below one second.`,
  `- Best non-counting scaffold row: ${bestScaffold?.experimentId || "none"} with score ${formatNumber(bestScaffold?.score || 0, 2)} and down-start hold ${formatNumber(bestScaffold?.maxHeldSeconds || 0, 3)}s.`,
  "- Some learned rows include teacher warmup that solves one-link. Those rows still count as unsolved unless the learned held-out policy solves pure down-start.",
  "- True PufferPPO/MinGRU sweep rows are queued, not run, because Modal GPU execution is blocked by the workspace spend limit.",
  "",
  "experiment | status | algorithm | links | policy | params | wallclock_s | score | down_hold_s | solved_1s | counts | note",
  "--- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | ---",
  ...tableRows,
  "",
  `JSONL: ${jsonlPath}`,
  "",
].join("\n");

const markdownPath = path.join(outputDir, "puffer-mjwarp-one-link-sweep-ledger.md");
fs.writeFileSync(markdownPath, markdown);

console.log(markdownPath);
console.log(jsonlPath);
