---
read_when:
  - Working on the six pendulum cartpole AI Lab route
  - Changing six pendulum training scripts
  - Running Modal GPU training for cartpole policies
---

# Six Pendulum Curriculum Plan

## Current Status

Live route: https://www.maxpetrusenko.com/ailab/six-pendulum-cartpole

Learned three-link down-start is now solved from exact down at `1.100s` using the Modal-trained chain policy. Learned four-link reached `0.550s` under the browser-aligned strict score and does not count. Five and six links remain unsolved. Strict score is zero until the active chain is near upright, nearly straight, and held for at least one consecutive second.

Separate model-based progress: `m1el/inverted-pendulum` now gives this project a locally verified six-link control solve. It is not the browser neural checkpoint. It is seed-free controllability-aware direct collocation plus full-state TVLQR on verified N-link dynamics. Local repro generated controls, passed nominal verification, and passed the perturbed-start challenge.

Latest four-link RL finding: c24-c27 did not beat c23. DeepSeek, Gemini Oracle, and three subagents converged on a hold-collapse/frontier-replay diagnosis. The trainer now has stricter frontier ranking, hold-run replay buckets, a tiny hold-start stabilizer, weighted replay sampling, and an opt-in `baseTopFade` policy field with renderer/browser parity. c24c and c26 preserved the `0.550s` exact-down frontier but did not extend it; c25 proved hard knot-fade is a bad default because it regressed the warm start to `0.533s`; c27 high-force `actionScale=120` destroyed the warm start and was aborted. The current public proof remains c23 at `0.550s`, below the required `1.000s`.

Previous four-link RL finding: c17 replaced the time-conditioned feedback actor with state-only feedback, kept time only in the open-loop knot base, and aligned trainer strictness with the browser score. This exposed that c15/c16's `0.567s` trainer hold was optimistic; the corrected c15 render is `0.367s`. Two full Modal c17 bursts improved the corrected four-link exact-down gate to `0.450s`, still below the required `1.000s`. A c18 gravity-bridge smoke regressed to `0.383s`, so it was stopped before a full paid burst.

Current c15 patch:

- exact-down vector rank is now used in non-down CEM top-k selection for four-plus links.
- candidate pools are separately ranked by exact-down validation, then blended back into the CEM mean immediately.
- elites use rank-weighted averaging instead of a flat mean.
- replay angle noise is wrapped back into `[-pi, pi]`.
- replay banks refresh after stages from the current exact-down best.
- warm-start curriculum is trimmed to exact-down reduced gravity, limited trajectory replay, down-start catch/swing, and final exact-down gate.
- symmetry penalty is disabled for exact-down stages.

c15 result:

- Command lane: Modal L4, four-link, full `14s` horizon, `population=768`, `generations=8`, warm-started from c14.
- Checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-liveexact-c15-modal-p768-g8-hz60-20260612.json`
- Progress video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-liveexact-c15-progress-0567s-20260612.mp4`
- Result: exact-down max hold improved from `0.550s` to `0.567s`; strict score remains `0` because the one-second gate was not reached.
- Interpretation: live exact-down ranking finally moved the final gate, but the improvement is small. Replay stages still improve local catch metrics more than full down-start. Next bursts should either continue exact-down-ranked seeds from c15 or remove/ablate the MLP time feature as Gemini suggested.

c17 result:

- Research inputs: Harvey web/paper pass, Anscombe code-path review, DeepSeek API, and Gemini Oracle all converged on removing feedback `t_norm`, making exact-down selection effectively lexicographic, avoiding stale replay dominance, and aligning render/trainer gates.
- Code changes: chain policy `inputCount` dropped from `22` to `21` for four links; `feedbackUsesTime=false`; browser/renderer/eval helpers infer old vs new input shape; trainer `strict_mask` now uses the browser weighted score threshold.
- Smoke checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-notime-c17-smoke-modal-p256-g4-hz60-20260612.json`
- Full checkpoints:
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-notime-c17a-modal-p768-g8-hz60-20260612.json`
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-notime-c17b-modal-p768-g8-hz60-20260612.json`
- Best progress video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-notime-c17a-progress-0450s-20260612.mp4`
- Result: c17a reached `0.450s`; c17b reached `0.433s`; solved rate stayed `0.0`.
- Interpretation: the useful stages are exact-down reduced gravity and trajectory replay with exact-down lexicographic ranking. The down-start continuation stage did not improve the exact-down candidate and should be removed or replaced with exact-down-only/gamma-gravity transfer in c18.

c18 pause result:

- Gravity-bridge smoke checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c18-gravitybridge-smoke-modal-p256-g4-hz60-20260612.json`
- Modal app: `https://modal.com/apps/max-petrusenko/main/ap-JPjjddrfwDlV9LbbH5tlU8`
- Result: exact-down max hold `0.383s`, solved rate `0.0`, best near-strict `0.650s`, best catch `0.767s`.
- Interpretation: the bridge centered better but shortened the strict hold. Do not spend full Modal credits on this variant.
- Research pause artifacts:
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/gemini-c18-pause-oracle.md`
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/deepseek-c18-pause.md`
- c19 trainer patch removes the failed bridge stages, adds exact-down catch-survival continuation, makes randomized horizons generation-coherent instead of candidate-specific, and bumps CEM sigma at four-link stage boundaries.

c19 smoke result:

- Checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c19-coherenthorizon-smoke-modal-p256-g4-hz60-20260612.json`
- Modal app: `https://modal.com/apps/max-petrusenko/main/ap-VcYhzKgP3rmGhMdk5Z57AE`
- Result: exact-down max hold `0.350s`, solved rate `0.0`, best near-strict `0.583s`, best catch `0.633s`, best soft catch `0.750s`.
- Interpretation: coherent horizons plus sigma bumps are valid hygiene, but this branch still underperforms c17a's corrected `0.450s` and should not get a full Modal burst. The next evidence-backed branch is a force/centering sweep or replay-bank rewrite, not longer c19.

c21/c22/c23 catch-to-hold result:

- Research inputs: DeepSeek API, Gemini Oracle, web-search subagent, and code-review subagent all identified the same failure boundary: the policy can reach catch windows, then loses the chain before one strict second because replay and reward over-credit catch flashes relative to braking/hold.
- Checkpoints: c21 `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c21-replaydense-force56-center028-smoke-modal-p256-g4-hz60-20260612.json`; c22 `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c22-replaydense-clockfix-force56-center028-modal-p768-g8-hz60-20260612.json`; c23 `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c23-reversehold-smoke-force56-center028-modal-p384-g5-hz60-20260612.json`
- Modal apps: c21 `https://modal.com/apps/max-petrusenko/main/ap-rqeHo8ufzGutm6wclxiwPx`; c22 `https://modal.com/apps/max-petrusenko/main/ap-3vt6sOdvzSH1ZgDdH4tOpF`; c23 `https://modal.com/apps/max-petrusenko/main/ap-sLnka5zcPp3lhQQHUnmd8d`
- Progress video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-c23-reversehold-force56-center028-progress-0550s-20260612.mp4`
- Contact sheet: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-c23-reversehold-force56-center028-progress-0550s-20260612-contact-sheet.jpg`
- Result: c21 exact-down max hold `0.533s`; c22 full burst exact-down max hold `0.550s`, solved rate `0.0`, soft catch `1.017s`, catch `0.833s`, near-strict `0.733s`. c23 reverse-hold smoke kept strict hold at `0.550s`, solved rate `0.0`, but improved soft catch to `1.067s`, catch to `0.900s`, and near-strict to `0.783s`.
- Control branch: `force=42`, `cartCenterSpring=0.28` finished at `0.383s`, so do not full-burst that branch.
- Interpretation: c21/c22/c23 is a real 4-link boundary move but not a solve. Reverse-hold replay improves catch quality but still over-selects twitchy catch states that do not extend strict hold. Next patch should make final ranking more lexicographic on strict hold duration and down-rank high smooth-penalty candidates even when catch and near-strict windows improve.

c24/c25/c26/c27 frontier-hold result:

- Research inputs: DeepSeek API, Gemini Oracle, web-search subagents, and code-review subagent all agreed that the current failure is no longer first catch; it is strict-hold collapse at the `0.55s` frontier.
- Additional source finding: `jgerstmayr/EXUDYN` `openAIgymNLinkAdvanced.py` is the most useful public multi-link RL reference. It reports working four/five-link SAC setups, higher force for four-plus links, small train/eval random initialization, top-link angular-velocity penalty, and disturbance after several seconds to avoid forgetting. Treat it as environment/reward reference, not proof of this learned browser policy.
- c24c checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c24c-frontierhold-smoke-modal-p256-g4-hz60-20260612.json`
- c25 checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c25-frontier-tail-smoke-modal-p256-g4-hz60-20260612.json`
- c26 checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-c26-frontier-replay-nofade-smoke-modal-p256-g4-hz60-20260612.json`
- Modal apps: c24c `https://modal.com/apps/max-petrusenko/main/ap-ynk6pHu468fOUfq45AqByF`; c25 `https://modal.com/apps/max-petrusenko/main/ap-Gu5DL1SVaj8rt8zRqi1kog`; c26 `https://modal.com/apps/max-petrusenko/main/ap-mr5L7bWMk5zB05QiSZxglh`; c27 aborted early at `https://modal.com/apps/max-petrusenko/main/ap-MTe5pmuN56aori6gPit1nK`.
- c24c result: exact-down max hold `0.550s`, solved rate `0.0`, soft catch `1.067s`, catch `0.900s`, near-strict `0.783s`, smooth penalty `0.603`, symmetry penalty `1.993`.
- c25 result: exact-down max hold `0.533s`, solved rate `0.0`, soft catch `1.033s`, catch `0.850s`, near-strict `0.733s`, smooth penalty `0.263`, symmetry penalty `1.185`. Interpretation: hard open-loop knot fade makes the candidate smoother but loses the c23 frontier, so do not deploy or full-burst this variant.
- c26 result: exact-down max hold `0.550s`, solved rate `0.0`, soft catch `1.067s`, catch `0.900s`, near-strict `0.783s`, smooth penalty `0.603`, symmetry penalty `1.993`. Interpretation: no-fade frontier replay preserves best but does not improve it.
- c27 high-force result: `actionScale=120`, `cartCenterSpring=0.22` immediately degraded initial warm-start exact-down hold to `0.0s`; after the first reduced-gravity generation it only recovered to `0.033s`. The app was aborted and no checkpoint was written.
- Code changes retained: final exact-down ranking is stricter about hold ticks; replay buckets now distinguish `holdRun>=0.55` and `>=0.65`; replay sampling can weight frontier buckets; same-frontier replacements require smoother behavior; `baseTopFade` is opt-in and encoded for trainer, renderer, and browser parity.
- Interpretation: more CEM around the same browser-physics policy is likely at diminishing returns. The next useful work is either a true PufferPPO/MinGRU/MuJoCo-Warp sweep, or an environment/reward refactor using Exudyn's four/five-link SAC reference: higher force without breaking warm-start dynamics, top-link angular-velocity penalty, small disturbance after successful hold, and a cleaner reverse curriculum that starts from actual frontier states rather than generic noisy upright states.

Research artifacts:

- `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/deepseek-pendulum-c14-transfer.md`
- `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/gemini-pendulum-c14-transfer.md`
- c14 progress video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-trajectoryreplay-c14-progress-0550s-20260612.mp4`

## Source Evidence

- X thread: https://x.com/yacineMTB/status/2064148140899348779
- Raw Bird thread read saved to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/yacine-thread-bird-2064148140899348779.txt`.
- Current raw Bird JSON saved to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/assets/x-yacine/2064148140899348779.thread.json`.
- Bird thread read confirmed the core claims: PufferPPO, Puffer MinGRU, MuJoCo Warp, APIC/CUDA graph capture, 18M SPS on some configs, 3.6k experiments, GP-picked top hyperparameters, and randomized episode length after whipping appeared.
- Bird also confirmed gravity `9.8`, no hinge friction, velocity reduction to keep the chain straight, and the cart attempting to track `0`.
- Hero solve video downloaded to `outputs/yacine-thread-media/2064145781477580800-*.mp4`.
- Hyperparameter scatter video downloaded from `2064150381408485769`.
- Reward/policy video downloaded from `2064152523095560528`.
- Phase-space / simulator-speed video downloaded from `2064155513244246028`.
- Current downloaded media and sampled frames are under `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/assets/x-yacine/`.
- Main clues: PufferPPO, Puffer MinGRU, MuJoCo Warp, APIC/CUDA graph capture, 3.6k experiments, top hyperparameters selected from high-compute runs, randomized episode length after whip behavior appeared.
- Pezzza video downloaded with `yt-dlp` to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/youtube/pezzza-double-pendulum.mp4`.
- Pezzza transcript downloaded to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/youtube/pezzza-double-pendulum.en.vtt`; frames sampled under `outputs/youtube/frames/`.
- XPBD paper downloaded to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/papers/XPBD.pdf`.
- `johnBuffer/Pendulum-NEAT` cloned under `/Users/maxpetrusenko/Desktop/Projects/oss/Pendulum-NEAT`.
- `m1el/inverted-pendulum` cloned under `/Users/maxpetrusenko/Desktop/Projects/oss/inverted-pendulum`. This is the strongest public N=6 source found: verified dynamics, seed-free controllability-aware trajectory optimization, TVLQR, official verifier, and media.
- `jgerstmayr/EXUDYN` `openAIgymNLinkAdvanced.py` is the strongest public N=5 RL source found. It documents SAC for multi-link inverted pendulums, says four and five links work, uses smaller random initialization/disturbance for `>=5`, and includes N=6 actuation/threshold parameters but no public N=6 checkpoint.
- Deep-search artifacts are saved under `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/`. Perplexity API returned `401 insufficient_quota`; Gemini CLI hit capacity/503 retries; DeepSeek completed but was treated as advisory because it hallucinated some commands.

### Canonical Yacine Requirements From Bird Read

Treat these as hard constraints for the RL reproduction:

1. Method is RL, not model-based control: train an environment with `pufferPPO`.
2. Infrastructure matters: PufferLib wallclock speed, MuJoCo Warp, APIC/CUDA graph capture callable from C.
3. Scale is many experiments: Yacine reported `3.6k` experiments, with wallclock on x-axis and score on y-axis.
4. Policy is small recurrent: puffer MinGRU, about `1m` parameters.
5. Hyperparameters come from broad sweeps: use GP-picked/top-scoring higher-compute runs, then tweak the task.
6. Reward shaping is active: help the policy find whipping behavior, then stabilize.
7. Randomized episode length is a late-stage trick: add it after the model learns whipping but gets lazy around fixed episode timing.
8. Physics constraints: gravity `9.8`, no hinge friction.
9. Task constraint: cart is trying to track `0`.
10. No subsecond score: public score still requires at least one continuous upright hold second.

Implication for current code:

The m1el route proves a six-link control trajectory and gives the bend-order lesson. The Yacine route requires a separate high-throughput RL path, likely PufferPPO/MuJoCo Warp/MinGRU, not more small local CEM.

## Verified Model-Based N=6 Reproduction

Source:
`/Users/maxpetrusenko/Desktop/Projects/oss/inverted-pendulum`

The decisive source insight is bend order. A six-link chain that goes near-straight mid-swing is near-uncontrollable from one pivot. The working trajectory keeps a coordinated bend shimmy and adds a one-sided soft floor on bend-mode excitation instead of globally fighting the swing.

Commands:

```bash
uv run python tests/test_dynamics.py
uv run python repro/generate_n6.py
uv run python repro/simulate_n6.py /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/m1el-n6-seedfree-proof.mp4 repro/n6_controls.npz
uv run python repro/perturbed_n6.py repro/n6_controls.npz --render /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/m1el-n6-seedfree-perturbed-proof.mp4
```

Results:

- Dynamics tests passed.
- Seed-free generator selected `soft_w100_fl0.8`.
- Generator metrics: final `0.0184deg`, maxK `68110`, accel max `7.3`, saved `repro/n6_controls.npz`.
- Nominal verifier: final angle error `0.364deg` over all six links, `VERIFICATION: PASS`.
- Perturbed challenge: `16/16 succeed`, `CHALLENGE: PASS`, robust to `>= +/-0.80 rad` initial angle error.
- Hosted proof videos copied to:
  - `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs/public/ailab/six-pendulum/m1el-n6-seedfree-proof.mp4`
  - `/Users/maxpetrusenko/Desktop/Projects/maxpetrusenko.com/nextjs/public/ailab/six-pendulum/m1el-n6-seedfree-perturbed-proof.mp4`

Trainer implications:

1. Do not reward straightness during pump.
2. Add bend-excitation/controllability shaping that penalizes bend collapse only below a threshold.
3. Keep phases explicit: energy pump, catch, hold.
4. Keep strict score separate: no score for subsecond holds.
5. Use Exudyn's N=5 SAC setup as a reward/curriculum reference only. The Yacine reproduction lane is PufferPPO or close recurrent PPO on MuJoCo Warp, not more browser CEM or plain SAC.

## Multi-Agent Review

Agents were split by approach:

- Aristotle: Pendulum-NEAT, Pezzza transcript, XPBD source table.
- Ampere: CEM/evolution recommendation and policy shape.
- Pascal: PPO/SAC/TD3 baseline comparison.
- Goodall: XPBD/MuJoCo physics recommendation.
- Pauli: PufferPPO/PufferLib wallclock-first sweep model.
- Hegel: Puffer MinGRU policy ablation.
- Boole: MuJoCo Warp, MJX, APIC/CUDA graph speed path.
- Tesla: reward shaping, randomized horizon trigger, GP/hyperparameter sweep schema.

Consensus:

1. Do not count holds shorter than one second.
2. Keep strict validation separate from shaped reward.
3. Use CEM/evolution for fast one-link discovery.
4. Use many experiments and wallclock-vs-score reporting before trying to scale.
5. Treat MinGRU/PufferPPO as the next controlled RL ablation.
6. Keep MuJoCo/MJX/MJWarp for later physics-speed work; XPBD is useful for browser visual fidelity, not the current training bottleneck.

## Plan

1. Train lower link counts first: 1 link, then 2, then 3, then 4, then 5, then 6.
2. Use the same policy shape across stages so later stages inherit useful timing and feedback from earlier stages.
3. Keep dense reward shaping for learning, but keep public score strict.
4. Track two different milestones:
   - Whip: the policy learns to swing the chain toward upright.
   - Hold: the policy keeps the active chain upright and straight under strict score.
5. Add randomized episode lengths only after early whip/hold appears, matching Yacine's thread.
6. Save every run as JSON with stage validation, score, held fraction, whip fraction, seed, GPU, and elapsed time.
7. Move from the browser physics approximation to MuJoCo Playground or MJWarp once the curriculum path is proven.

## Yacine RL Reproduction Workstream

This is now the target lane. The existing Pezzza/CEM and Python MuJoCo PPO scripts are useful lower-link research, but they are not the reproduced solve because they do not use PufferPPO, Puffer MinGRU, MuJoCo Warp batching, or CUDA graph capture.

Phase 0, proof substrate:

```bash
npm run six-pendulum:mjcf
npm run train:six-pendulum:puffer-mjwarp:local-smoke
npm run train:six-pendulum:puffer-mjwarp:smoke
```

The local smoke writes `outputs/training-checkpoints/puffer-mjwarp-local-substrate-smoke.json`. The Modal smoke writes `outputs/training-checkpoints/puffer-mjwarp-substrate-smoke.json`. These are not solve metrics. They prove the substrate before spending on PPO: PufferLib and MuJoCo Warp import, the same MJCF loads, `nworld` batched worlds step, and Warp graph capture/replay is attempted.

Local substrate result:

- Command: `npm run train:six-pendulum:puffer-mjwarp:local-smoke`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-local-substrate-smoke.json`
- Result: `substrate-smoke-passed`, `nworld=4`, `steps=16`, `64` simulated world-steps.
- Device: local Mac Warp CPU only, so throughput is not meaningful for the final target.
- Model invariants: `nq=2`, `nv=2`, `nu=1`, timestep `0.0025`, gravity `[0, 0, -9.8]`, DOF damping `0`, DOF frictionloss `0`.
- MJCF fix: visual geoms are now contact-disabled with `contype=0` and `conaffinity=0`; the six-pendulum task has no contacts, and this avoids MJWarp friction/contact warnings from decorative rail/cart/link geoms.

Local environment-contract result:

- Command: `npm run train:six-pendulum:puffer-mjwarp:local-env`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-local-env-contract.json`
- Result: `env-contract-smoke-passed`, `links=1`, `nworld=4`, `steps=64`.
- Reset contract now covers down-start and near-upright hold-start batches.
- Observation contract is `[nworld, 33]`: cart position, cart velocity, previous action, and padded six-link sin/cos/velocity features.
- Reward/score contract now separates shaped reward from strict score.
- Down-start strict score stayed `0`; hold-start reached max strict score `99.73`, but the one-second gate still stayed false because the smoke ran only `0.16s`. This proves subsecond upright flashes are not counted as solved.

PufferEnv driver result:

- Command: `npm run train:six-pendulum:puffer-mjwarp:env-driver`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-env-driver.json`
- Script: `scripts/six_pendulum_mjwarp_env.py`
- Result: `puffer-env-driver-smoke-passed`, `links=1`, `nworld=4`, `steps=128`.
- Adapter: `SixPendulumMJWarpPufferEnv` exposes Puffer-compatible `single_observation_space` and `single_action_space`, internal reset, `step(actions)`, reward, terminals, truncations, and per-agent info.
- Action contract: normalized action `[-1, 1]` maps to cart force `[-32, 32]`.
- Down-start baseline still scored `0`, which is expected. This artifact proves the trainer-facing environment loop, not learning.

Local recurrent training smoke:

- Command: `npm run train:six-pendulum:puffer-mjwarp:local-ppo`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-local-ppo-smoke.json`
- Script: `scripts/train_six_pendulum_mjwarp_local_ppo.py`
- Result: `training-smoke-passed`, `links=1`, `nworld=4`, `rolloutSteps=96`, `evalSteps=480`, `updates=3`.
- Policy: tiny GRU policy-gradient smoke, `27,267` parameters. This is a local CPU wiring test, not the final Puffer MinGRU scale.
- Hold-start eval: max strict score `99.73`, max held `0.46s` over a `1.2s` validation horizon, one-second gate false.
- Down-start eval: max strict score `0`, max held `0s`, promotion false.
- Interpretation: recurrent training now runs through MJWarp and backpropagates, but it does not solve one-link down-start. Next useful work is GPU scale plus proper PPO minibatches, then Puffer MinGRU/PufferNet.

Stronger local hold-search:

- Command: `npm run train:six-pendulum:puffer-mjwarp:hold-search`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-local-ppo-hold-search.json`
- Result: `links=1`, `nworld=8`, `rolloutSteps=160`, `evalSteps=640`, `updates=16`.
- Hold-start eval improved to max held `0.5875s` over a `1.6s` validation horizon, still below the one-second gate.
- Down-start eval remained strict score `0`, max held `0s`, so no link-two promotion.
- Interpretation: more local CPU updates improve near-upright stabilization but plateau below the strict hold gate. The next change should improve the PPO update or use GPU scale, not unlock more links.

Learned hold-start stabilizer:

- Command: `npm run train:six-pendulum:puffer-mjwarp:stabilizer-bc`
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-stabilizer-bc.json`
- Result: `behavior-clone-smoke-passed`, `links=1`, `nworld=8`, `rolloutSteps=480`, `evalSteps=640`, `epochs=600`.
- Expert target: near-upright stabilizer `force = -(kx*x + kv*v + kt*theta + kw*omega)` with gains `kx=8`, `kv=4`, `kt=-60`, `kw=-16`. This expert held `1.2s` in MJWarp.
- Learned model: same tiny GRU policy, `27,267` parameters, trained by behavior cloning from the stabilizer target.
- Learned hold-start eval: max strict score `99.89`, max held `1.285s`, one-second gate passed.
- Learned down-start eval: strict score `0`, max held `0s`, so there is still no link-two promotion.
- Interpretation: one-link near-upright catch/hold is now learned in the MJWarp lane. This is curriculum pretraining, not the final down-start swing-up solve.

Checkpoint warmstart and mixed curriculum:

- Commands:
  - `npm run train:six-pendulum:puffer-mjwarp:down-warmstart`
  - `npm run train:six-pendulum:puffer-mjwarp:mixed-warmstart`
- Artifacts:
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-down-warmstart.json`
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-mixed-warmstart.json`
- Code changes: the MJWarp env now uses seeded random perturbations instead of deterministic linspace resets, adds energy/potential/catch-basin shaping for down-start, and supports a `mixed` reverse-curriculum reset.
- Horizon fix: warmstart training now uses `480` rollout steps (`1.2s`) and `800` eval steps (`2.0s`), so subsecond flashes are not counted as training progress.
- Down warmstart result: randomized hold eval stayed solved at `1.2325s`; pure down-start eval stayed `0s`.
- Mixed warmstart result: mixed training produced one-second-plus catch/hold inside rollouts on `6/8` updates, best `1.2s`; held-out pure down-start eval stayed `0s`.
- Interpretation: the learned catch policy is real, and the reverse curriculum can exercise one-second holds. The missing skill is still swing-up from pure down-start. Do not unlock link two.

Energy teacher scaffold for PufferPPO:

- Commands:
  - `npm run train:six-pendulum:puffer-mjwarp:energy-teacher`
  - `npm run train:six-pendulum:puffer-mjwarp:energy-teacher-bc`
- Artifacts:
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher.json`
  - `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-energy-teacher-bc.json`
- MJCF motor range is now `[-240, 240]`; existing envs still default to normalized force scale `32`, while the one-link teacher lane uses force scale `240`.
- Teacher: Astrom/Furuta-style energy pumping with symmetry-breaking kick plus stabilizer catch. Tuned local gains: `kE=12`, `kv=0.6`, `kx=0.05`, `aMax=30`, `forcePerAcceleration=6.75`, catch angle `0.36`, catch rate `3.0`.
- Teacher result: pure one-link down-start in MJWarp reached max strict score `99.04` and max held `1.3875s` over `10s`, so the swing-up/catch signal exists in the MJWarp environment.
- Learned tiny-GRU BC result: teacher rollout loss fell to `0.00028`, but closed-loop held-out down-start stayed `0s`; no link-two promotion.
- Sequence BC result: GRU sequence training reached held-out down-start max strict score `77.13`, but max held stayed `0s`.
- Sequence-BC warmstart RL result: in-training max held improved to `0.2275s`; held-out down-start stayed `0s`.
- DAgger result: online learner-state labeling produced learner rollouts with catch/near-top events, but held-out down-start stayed `0s`.
- Anchored warmstart result: teacher-anchor PPO improved in-training max held to `0.37s`; held-out down-start stayed `0s`.
- Interpretation: this is useful reward/curriculum scaffolding for the Yacine-style PufferPPO sweep, not a final learned policy. The next real reproduction step is many PufferPPO/MJWarp experiments with MinGRU-sized policies and wallclock-vs-score logging.

Phase 1, one-link PufferPPO:

- Environment: same MJCF constraints, gravity `9.8`, hinge friction `0`, cart track centered at `0`.
- Observation: cart position, cart velocity, link absolute/relative angle encodings, angular velocities, previous action. Do not leak score-only terms into observation.
- Reward: dense height/energy/whip shaping plus strict hold bonus. Strict score remains zero until at least one continuous upright second.
- Policy: start small recurrent, then grow toward puffer MinGRU/PufferNet and the reported `~1m` parameter policy.
- Sweep: run many PufferPPO/MJWarp experiments, report wallclock on x-axis and strict score on y-axis, and promote only held-out down-start checkpoints.
- PufferPPO contract command: `npm run train:six-pendulum:puffer-mjwarp:pufferppo-contract`
- PufferPPO contract artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-pufferppo-contract.json`
- Runtime inspect command: `npm run train:six-pendulum:puffer-mjwarp:pufferppo-runtime`
- Runtime inspect result on 2026-06-10: `App creation failed: workspace billing cycle spend limit reached`.
- Contract result: first sweep rows are one-link only, `nworld={4096,8192}`, `rollout={256,512}`, `forceScale={120,240}`, fixed horizon first, and randomized episode length locked until learned whip behavior appears.
- GPU score-kernel smoke command: `npm run train:six-pendulum:puffer-mjwarp:gpu-score-smoke`
- GPU score-kernel smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-gpu-score-kernel-smoke.json`
- GPU score-kernel smoke result on 2026-06-10: passed on local Warp CPU for `512` worlds at each link count `1..6`. Max parity error vs the existing NumPy scorer was `7.62939453125e-06` across observation, reward, potential, strict score, multi-link cumsum, bend penalties, catch basin, near-top-fast, whip, and cart-terminal terms.
- Env-driver integration result on 2026-06-10: `npm run train:six-pendulum:puffer-mjwarp:env-driver` now reports `resetBackend: warp-reset-kernel`, `scoreBackend: warp-score-kernel`, and `rolloutBackend: warp-post-step-kernel`; a separate six-link driver artifact also passed at `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-env-driver-link6-kernel.json`.
- Device-rollout smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout`
- Device-rollout smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout.json`
- Six-link device-rollout smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-link6.json`
- Device-rollout result on 2026-06-10: one-link ran `128` worlds for `256` steps and six-link ran `16` worlds for `32` steps with `cpuMetricReadsPerStep=0` and `cpuStateWritesPerStep=0`; summary arrays are copied only after final synchronize. Both use local Mac Warp CPU, so SPS is not the final GPU number.
- Rollout-buffer device smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:buffer`
- Rollout-buffer device smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-buffer.json`
- Rollout-buffer result on 2026-06-10: one-link wrote fixed-shape device buffers for observations `[32, 8, 33]`, rewards `[32, 8]`, terminals `[32, 8]`, truncations `[32, 8]`, and actions `[32, 8]`; all checked finite after one final read.
- Action-buffer device smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:action-buffer`
- Action-buffer device smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-action-buffer.json`
- Action-buffer result on 2026-06-10: one-link copied a fixed time-major `[32, 8]` normalized action tensor before rollout, consumed it through `warp-action-buffer-kernel`, wrote ctrl/last-action on device, and kept `actionPlanCpuWritesPerStep=0`. The driver now rejects wrong-shaped or non-finite action plans. The recorded rollout action buffer is scaled cart force; PPO/logprob plumbing still needs the normalized sampled action too. This is precomputed deterministic policy-interface plumbing only, not a learned policy.
- Torch-policy bridge smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:torch-policy`
- Torch-policy bridge artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-torch-policy.json`
- Torch-policy bridge result on 2026-06-10: the rollout converts current Warp observations with `wp.to_torch(runner.obs_wp)`, runs a tiny recurrent Torch actor-critic, converts normalized actions/logprobs/values back with `wp.from_torch`, records fixed PPO-style buffers, and writes ctrl through `warp-policy-action-vector-kernel` with `torchPolicyCpuActionWritesPerStep=0`. The policy has `27267` parameters, hidden state shape `[8, 64]`, and is untrained, so it proves recurrent rollout plumbing only and does not count toward solve.
- PPO-update smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:ppo-update`
- PPO-update smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-ppo-update.json`
- PPO-update result on 2026-06-10: three local CPU PPO epochs consumed the fixed recurrent buffers, recomputed logprobs/values over the stored sequence, backpropagated, and changed parameters (`parameterDeltaL2=0.11130`, final `gradNorm=0.01641`). This proves fixed-batch buffer-to-update plumbing only; it is not a PufferPPO sweep and not a learned solve.
- PPO-buffer timing fix on 2026-06-10: the rollout buffer now stores the pre-action observation with the action/logprob/value sampled from it. Before this fix, PPO was reconstructing logprobs against post-step observations. The rerun `device-rollout:ppo-update` smoke now has first-epoch `ratioMean=1.0` and `ratioMax=1.0`, so the PPO tuples are coherent.
- Puffer MinGRU policy smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:puffer-mingru-policy`
- Puffer MinGRU policy smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-puffer-mingru-policy.json`
- Puffer MinGRU policy smoke result on 2026-06-11: the device rollout ran a MinGRU-style recurrent actor-critic with `1,071,107` Torch parameters, hidden size `512`, Puffer-style `encode_observations`, `decode_actions`, and `forward_eval` hooks, fixed finite PPO buffers, first-epoch `ratioMean=1.0`, and a successful optimizer update (`parameterDeltaL2=0.29764`). This now matches the source-thread policy scale mechanically, but it is still a one-batch local CPU smoke, not a trained PufferPPO/MJWarp GPU solve.
- Puffer MinGRU PPO train smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-puffer-mingru-smoke`
- Puffer MinGRU PPO train smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-puffer-mingru-smoke.json`
- Puffer MinGRU PPO train smoke result on 2026-06-11: the repeated trainer collected a stochastic down-start rollout, ran one PPO update, and evaluated deterministic down/hold starts with the same `1,071,107` parameter policy. PPO changed parameters (`parameterDeltaL2=0.10177`) with first-epoch `ratioMean=1.0`; held-out down-start stayed `0.0s`; short hold-start eval reached `0.16s` over a `0.16s` horizon and therefore still does not count. This proves training ownership of the source-thread policy scale, not learning success.
- Puffer MinGRU hold-start BC diagnostics on 2026-06-11:
  - `puffer-mjwarp-device-ppo-puffer-mingru-hold-bc-smoke.json`: default stabilizer BC learning rate `1e-3` diverged for the `1,071,107` parameter MinGRU. Teacher hold solved `1.28s`, but learned policy saturated actions (`normalizedActionAbsMean=0.993` on hold eval), hit cart terminals, and held only `0.18s`.
  - `puffer-mjwarp-device-ppo-puffer-mingru-hold-bc-lr5e5.json`: lower stabilizer BC learning rate `5e-5` kept loss low and avoided saturation. Held-out hold improved to `0.3475s`, rollout hold to `0.4125s`, and down-start stayed `0.0s`.
  - `puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-lr5e5.json`: sequence BC with length `160` improved rollout hold to `0.64s` and deterministic hold to `0.5025s`, still below the one-second gate. This says MinGRU needs sequence BC and likely longer GPU-scale updates before down-start work.
  - `puffer-mjwarp-device-ppo-puffer-mingru-hold-seqbc-long-lr3e5.json`: stronger sequence BC (`nworld=8`, sequence length `256`, `220` BC epochs, LR `3e-5`) produced the first counted MinGRU lower-link hold-start success: deterministic hold `1.5075s` after update 1 and best hold `1.5075s`, with stochastic rollout near the gate at `0.9575s`. Down-start stayed `0.0s`, so this unlocks the down-start transfer probe but not link two.
  - `puffer-mjwarp-device-ppo-puffer-mingru-down-from-hold-lr3e5.json`: warmstarted from the solved hold checkpoint and explicitly allowed force-scale transfer from `32` to `120`. It preserved hold-start (`2.56s` deterministic at update 1, `1.12s` after update 2; stochastic hold solved `1/2` passes), but pure down-start remained `0.0s` deterministic and stochastic. Down-heavy training rollouts reached only `0.4325s` then `0.3475s`, with cart rail terminals dominating. The next missing behavior is whip-to-center, not top stabilization.
- Repeated device-buffer PPO command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-train`
- Repeated device-buffer PPO artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-train.json`
- Repeated device-buffer PPO status: this is the first local path that repeatedly collects stochastic recurrent policy rollouts, updates the same policy with a persistent PPO optimizer, and runs deterministic held-out down-start/hold-start evaluation after every update. It still runs on local Mac Warp/MJWarp CPU, not Modal GPU/PufferPPO/MinGRU scale.
- Reflection checkpoint on 2026-06-10: Hermes, Gemini, and Oracle independently flagged the same policy failure. The `96` step rollout is only `0.24s`, `nworld=8` is too small for PPO, down-start reward is effectively flat, and hold-start has not passed one second. Next proof should be a one-link hold-start long-horizon run plus action-scale reachability check before more down-start or GPU work.
- Action-scale diagnostic command: `npm run train:six-pendulum:puffer-mjwarp:action-scale-diagnostic`
- Action-scale diagnostic artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-action-scale-diagnostic.json`
- Action-scale diagnostic result on 2026-06-10: one-link open-loop probes from down-start show `forceScale=32` and `64` do not reach near-vertical in `1.0s`; `120` reaches near-vertical in about `0.60s`; `240` reaches it in about `0.335s` but usually with cart-terminal risk. This is not a policy and does not count.
- Long-horizon hold-start probe command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-probe`
- Hold-start probe artifacts:
  - Preferred `forceScale=32`: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-probe-f32.json`
  - Comparison `forceScale=64`: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-probe.json`
- Hold-start probe result on 2026-06-10: `forceScale=32` is safer for hold-start, reaching held-out hold `0.435s` over `2.56s` eval with zero terminal worlds; stochastic rollouts reached up to `0.6825s`. `forceScale=64` reached only `0.3175s` and all hold eval worlds hit cart terminal. Neither passes the one-second gate.
- Device hold-start BC warmup command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-bc-probe`
- Device hold-start BC warmup artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-hold-bc-probe.json`
- Device hold-start BC warmup result on 2026-06-10: after the buffer-timing fix and stronger swing-up reward, `300` BC epochs on stabilizer rollouts warmed the same recurrent device-buffer policy, then one PPO update reached held-out hold-start `1.4425s` over `2.56s`. Held-out down-start stayed `0.0s`, so this is a learned top-stabilizer checkpoint, not a down-start solve and not a link-two unlock.
- One-link mixed swing-up command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-swingup-probe`
- One-link conservative mixed swing-up command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-swingup-conservative`
- One-link mixed swing-up result on 2026-06-10: both forceScale `120` probes use stronger potential/catch reward and coherent PPO buffers. Regular PPO still held pure down-start `0.0s`; conservative PPO also held pure down-start `0.0s`. The conservative run did produce a mixed-rollout near-catch flash of `0.8825s`, but held-out pure down-start remains unsolved and link two stays locked.
- Down-heavy one-link command: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-down-heavy-conservative`
- Down-heavy one-link result on 2026-06-10: added mostly-down reset sampling, low-height pump reward, cart-boundary penalty, terminal penalty, sustained-hold shaping, action/std diagnostics, and cart drift metrics. Held-out pure down-start still held `0.0s`, so it does not count. Best stochastic down-heavy rollout reached `0.73s`; this is still subsecond. The new `cartAbsMax ~= 2.35` metric proves the learned policy is driving into the rail before a valid catch.
- Lower-force energy-teacher device result on 2026-06-10: at `forceScale=160`, the classical one-link teacher reached `1.0475s` from pure down-start, proving the MJWarp task is controllable at lower force than the earlier `240` lane. Flat BC and sequence BC still failed deterministic held-out down-start: both learned-policy rows stayed `0.0s`. Sequence BC did improve the stochastic learner rollout to `0.2925s` and lowered action saturation, so the next learner change is DAgger from learner-visited states, not link promotion.
- Device energy-teacher DAgger update: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--bc-energy-teacher-dagger-iterations`, which labels states visited by the current learner with the energy teacher before PPO. This follows the same boundary as before: the teacher can scaffold swing-up/catch, but only held-out learned down-start one-second hold counts.
- Device energy-teacher DAgger smoke result on 2026-06-10: `puffer-mjwarp-device-ppo-link1-energy-dagger-f160-20260610.json` ran `2` DAgger iterations, `180` BC epochs, and two PPO updates. Held-out down-start reached near-top strict score around `79`, but max held stayed `0.0s`; stochastic rollout held only `0.14s`. The short `1600`-step teacher trajectory held only `0.4275s`, so the next DAgger run should use the earlier proven `4000`-step teacher horizon before judging the approach.
- Longer-teacher DAgger smoke result on 2026-06-10: `puffer-mjwarp-device-ppo-link1-energy-dagger-f160-longteacher-20260610.json` used a `4000`-step teacher horizon and one learner-state DAgger iteration. Stochastic rollout improved to `0.5425s`, but deterministic held-out pure down-start stayed `0.0s`. This still does not count. The main lesson is that learner-state labeling can create whip/catch flashes but the current local recurrent PPO update does not stabilize the catch.
- Stochastic candidate eval update on 2026-06-10: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--eval-stochastic-passes` and `--write-checkpoint`. Artifact `puffer-mjwarp-device-ppo-link1-stochastic-candidate-f160-20260610.json` plus checkpoint `.pt` preserve the best local candidate so far. Deterministic hold-start solved at `1.75s`; stochastic hold-start solved `2/3` passes; stochastic held-out down-start reached `0.72s` with strict score `94.04`, but `0/3` down-start passes reached one second. This is the clearest catch/hold candidate yet and still not a counted down-start solve.
- Warmstart continuation update on 2026-06-10: the same trainer now supports `--warmstart-checkpoint`. Artifact `puffer-mjwarp-device-ppo-link1-stochastic-candidate-resume-f160-20260610.json` resumed the saved candidate for three more PPO updates. Down-heavy training rollouts solved one-second holds twice (`1.355s`, then `1.1775s`), but held-out pure down-start still failed and stochastic pure-down regressed to `0.485s`. This proves the model can solve within the curriculum distribution but not yet from strict pure down; the earlier `0.72s` checkpoint remains the better held-out down candidate.
- Pure-down continuation update on 2026-06-10: `puffer-mjwarp-device-ppo-link1-puredown-resume-f160-20260610.json` resumed the same best candidate but trained only on strict `down` resets instead of `down-heavy`. It still did not solve: deterministic pure down stayed `0.0s`, stochastic pure down reached only `0.585s`, and the training rollout itself never reached a strict score. Hold-start stayed solved. This says the local PPO continuation is not extracting the final swing-up from pure down; the best saved held-out down candidate remains the previous `0.72s` checkpoint.
- Elite rollout BC update on 2026-06-10: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now exposes per-world rollout hold/score metrics and supports `--elite-rollout-bc-*`. Artifact `puffer-mjwarp-device-ppo-link1-elite-bc-f160-20260610.json` cloned two curriculum rollout worlds that truly crossed the one-second gate (`1.205s`) after PPO, but held-out pure down still stayed `0.0s` and stochastic pure-down collapsed to `0.0s`. This rules out naive cloning of successful down-heavy curriculum trajectories as the missing transfer step.
- Near-elite rollout BC diagnostic on 2026-06-10: `puffer-mjwarp-device-ppo-link1-near-elite-bc05-f160-20260610.json` cloned a `0.6125s` curriculum near-miss from the prior best checkpoint. Held-out pure down still stayed `0.0s`, stochastic pure-down stayed `0.0s`, and deterministic hold weakened to `0.6s`. This confirms that curriculum-start imitation is overfitting the reset distribution rather than teaching robust down-start swing-up.
- Down-whip reset diagnostic on 2026-06-10: the Warp reset kernel now supports training pose `down-whip`, which keeps the chain hanging down but randomizes angular velocity. Smoke artifact `puffer-mjwarp-device-rollout-down-whip-smoke.json` passed. Warmstarted run `puffer-mjwarp-device-ppo-link1-down-whip-f160-20260610.json` improved hold-start robustness (`2.2875s` deterministic hold; stochastic hold solved `3/4` passes), but held-out deterministic pure down stayed `0.0s` and stochastic pure down reached only `0.5825s`, below the prior `0.72s` candidate. This says velocity-start training helps catch/hold but still does not solve the exact rest-state saddle.
- Centered rest-pump reward diagnostic on 2026-06-10: the shaped reward now adds a center-gated low-height speed/energy-lift bonus, a stronger rail penalty after `65%` of track width, and a stronger terminal penalty (`-5` instead of `-3`) while leaving strict score unchanged. Warmstarted run `puffer-mjwarp-device-ppo-link1-centered-rest-pump-f160-20260610.json` trained from exact `down` resets. It improved hold-start robustness (`2.385s` deterministic hold; stochastic hold solved `4/4` after the first update), but deterministic pure down stayed `0.0s` and stochastic pure down peaked at `0.5825s`, then regressed to `0.325s`. The prior `0.72s` candidate remains best.
- Recenter-snap reward diagnostic on 2026-06-10: open-loop action-scale refresh showed max-force patterns can reach near vertical quickly, but all successful reach patterns rail out and hold `0.0s`. The shaped reward now adds recenter-after-snap reward, center-gates catch reward, and penalizes fast near-top rail approaches while leaving strict score unchanged. Warmstarted exact-down run `puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.json` improved stochastic pure-down to `0.8025s` with strict score `97.32`, but deterministic pure down stayed `0.0s`, solved pass rate stayed `0/4`, and cart terminals remained high. This is the best held-out stochastic pure-down learned candidate so far, but it is still subsecond and does not count.
- Elite rollout BC fallback update on 2026-06-10: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--elite-rollout-bc-fallback-min-held-seconds` and `--elite-rollout-bc-top-k`. If no rollout world reaches the full elite threshold, it can clone top subsecond worlds above the fallback threshold instead of no-oping. The counted gate remains held-out deterministic pure down-start `>=1.0s`; fallback BC is only a learner update tool.
- Subsecond elite fallback diagnostics on 2026-06-11:
  - `puffer-mjwarp-device-ppo-link1-fallback-elite-f160-20260610.json` warmstarted from the `0.8025s` recenter-snap checkpoint with fallback threshold `0.25s`. No rollout world qualified (`bestHeldSeconds=0.185s` then `0.0525s`), so fallback BC selected `0` worlds. Deterministic pure down stayed `0.0s`; stochastic pure down regressed to `0.3775s`.
  - `puffer-mjwarp-device-ppo-link1-fallback-elite005-f160-20260610.json` lowered fallback threshold to `0.05s`. Fallback BC selected two near-catch worlds (`0.185s` best, strict score `94.16`) and changed the policy (`parameterDeltaL2=0.1754`), but deterministic pure down stayed `0.0s`; stochastic pure down reached only `0.5475s`. This proves subsecond near-catch cloning works mechanically but does not solve the pure-down transfer problem.
- Random-horizon continuation diagnostic on 2026-06-11: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--random-horizon`, `--min-horizon`, and `--max-horizon` for PPO training rollouts while leaving held-out eval fixed. `puffer-mjwarp-device-ppo-link1-random-horizon-recenter-f160-20260611.json` warmstarted from the best `0.8025s` recenter-snap checkpoint and trained exact down-start with random horizons `128..768`. It did not solve: deterministic pure down stayed `0.0s`, stochastic pure down regressed to `0.0125s`, and hold-start stayed solved at `2.015s`. This matches the source-thread constraint: randomized episode length should wait until whip/catch is reliable, not merely subsecond.
- Catch-gated reward diagnostic on 2026-06-11: the MJWarp reward removed the positive `nearTopFast` bonus and now pays catch only when the policy is slow/centered enough to enter the catch basin; NumPy/Warp parity passed for links `1..6`. `puffer-mjwarp-device-ppo-link1-catch-gated-recenter-f160-20260611.json` warmstarted from the same `0.8025s` checkpoint and trained exact down-start with fixed horizons. It did not solve: deterministic pure down stayed `0.0s`, stochastic pure down reached only `0.02s`, and hold-start stayed solved at `1.8725s` deterministic / `2.56s` stochastic. The local PPO continuation is washing out rare exact-down catch behavior.
- Energy-teacher anchor diagnostic on 2026-06-11: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--energy-teacher-anchor-weight`, which adds an observation-derived energy-teacher action MSE term during PPO updates without using teacher actions during held-out eval. `puffer-mjwarp-device-ppo-link1-energy-anchor-recenter-f160-20260611.json` warmstarted from the `0.8025s` recenter-snap checkpoint with anchor weight `0.02`. It did not solve and regressed exact-down behavior: deterministic pure down stayed `0.0s`, stochastic pure down reached only `0.01s`, while hold-start stayed solved (`1.8775s` deterministic, `2.45s` best stochastic). Simple teacher anchoring is too blunt for preserving whip/catch.
- Exact-down ES/CEM teacher lane on 2026-06-11: `scripts/train_six_pendulum_mjwarp_es_teacher.py` now searches a time-knot-plus-feedback controller inside the same MJWarp exact down-start environment and exports an `.npz` trajectory for future sequence distillation. Smoke command `npm run train:six-pendulum:puffer-mjwarp:es-teacher-1link-smoke` found near-top/catch behavior but no one-second hold (`bestWorldHoldSeconds=0.1875`, `bestWorldStrictScore=94.83`). Stronger command `npm run train:six-pendulum:puffer-mjwarp:es-teacher-1link-long` also failed (`bestWorldHoldSeconds=0.1275`, `bestWorldStrictScore=92.48`). These teacher rows do not count as learned policy solves and are not promotion evidence.
- Pezzza-to-MJWarp bridge diagnostic on 2026-06-11: `scripts/evaluate_six_pendulum_mjwarp_pezzza_bridge.py` evaluates the learned Pezzza one-link browser policy inside the MJWarp exact down-start task. The source policy remains a valid learned Pezzza solve (`5.715s` validation hold, solved rate `1.0` in its own vectorized simulator), but it does not transfer to MJWarp: baseline bridge `puffer-mjwarp-pezzza-bridge-1link.json` held `0.0s`, with no whip/catch events and all `32` worlds terminal. Force multipliers `2x` and `4x` also held `0.0s` with no catch events. This rules out simple force-gain mismatch and makes Pezzza unsuitable as a direct MJWarp teacher without domain adaptation.
- Parameterized energy/whip/catch teacher sweep on 2026-06-11 added `scripts/sweep_six_pendulum_mjwarp_energy_teacher.py`. This finally found exact-down one-link MJWarp whip/catch trajectories above the strict one-second hold gate. Smoke command `npm run train:six-pendulum:puffer-mjwarp:energy-teacher-sweep-smoke` validated a best world at `1.04s`. Bounded command `npm run train:six-pendulum:puffer-mjwarp:energy-teacher-sweep-f160` ran `96` configs for `4` rounds, `921,600` simulated steps, and wrote `puffer-mjwarp-energy-teacher-sweep-f160-20260611.json` plus `.npz`; validation best world held `2.94s`, strict score `99.59`, solved-one-second rate `0.25`. This is the first robust target-simulator exact-down trajectory source, but it remains scaffold only: it is not a learned policy solve and does not unlock link two.
- Trajectory-BC diagnostic on 2026-06-11 added `--bc-trajectory-file` to `scripts/train_six_pendulum_mjwarp_device_ppo.py`, then distilled `puffer-mjwarp-energy-teacher-sweep-f160-20260611.npz` into a learned recurrent policy. Artifact `puffer-mjwarp-device-ppo-link1-trajectory-bc-f160-20260611.json` did not solve learned exact down-start: deterministic down held `0.0s`, stochastic down held `0.0s`, deterministic hold held `0.5825s`, stochastic hold best was `1.205s` with `2/4` solved passes. This proves naive single-trajectory sequence BC is not enough; next distillation needs multiple successful and near-failure trajectories plus learner-state DAgger.
- Multi-trajectory export and BC diagnostic on 2026-06-11 added `scripts/export_six_pendulum_mjwarp_teacher_trajectories.py` and extended trajectory BC to load a multi-world `.npz` or a directory of `.npz` files. Export command `npm run train:six-pendulum:puffer-mjwarp:energy-teacher-export-top` wrote `puffer-mjwarp-energy-teacher-top-trajectories-f160-20260611.npz` with observation shape `[2400, 8, 33]` and action shape `[2400, 8]`; two of eight teacher configs revalidated over one second (`2.94s`, `1.1375s`) and the remaining six are near-catch failures between `0.5775s` and `0.89s`. Learned command `npm run train:six-pendulum:puffer-mjwarp:device-ppo-link1-top-trajectory-bc-f160` still did not solve exact down-start (`0.0s` deterministic and stochastic), but did produce a learned hold-start solve (`1.4275s` deterministic). This confirms diverse demo BC improves top stabilization but still does not transfer the exact-rest pump/catch sequence.
- Next plan artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/six-pendulum-next-plan-2026-06-11.md`
- Parallel lower-link diagnostics:
  - `npm run train:six-pendulum:puffer-mjwarp:device-ppo-link2-diagnostic`
  - `npm run train:six-pendulum:puffer-mjwarp:device-ppo-link3-diagnostic`
  - `npm run train:six-pendulum:puffer-mjwarp:device-ppo-link4-diagnostic`
- Parallel lower-link diagnostic result on 2026-06-10: links `1`, `2`, `3`, and `4` were run as separate local PPO dots. Deterministic held-out pure down-start stayed `0.0s` for all four rows. Link 1 had a stochastic rollout flash at `0.575s`; link 2 reached hold-start `0.58s`; link 3 reached `0.1175s`; link 4 reached `0.11s`. Down-start action usage saturated upward with link count: link 2 mean force about `101/120`, link 3 about `112/120`, link 4 about `110/120`. These runs are diagnostic dots only, not promotion.
- Long-horizon hold-start full command queued after probe: `npm run train:six-pendulum:puffer-mjwarp:device-ppo-hold-long` (`forceScale=32`, `nworld=128`, `rolloutSteps=1024`, `updates=50`, `evalInterval=5`)
- Random-horizon device smoke command: `npm run train:six-pendulum:puffer-mjwarp:device-rollout:random-horizon`
- Random-horizon device smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-rollout-random-horizon.json`
- Random-horizon result on 2026-06-10: one-link ran `32` worlds for `96` steps with per-world horizons sampled on-device between `16` and `32` steps; reset counts averaged above `4`, proving truncation/resets occurred without per-step CPU metric reads.
- Parameterized-teacher DAgger result on 2026-06-11: `scripts/train_six_pendulum_mjwarp_device_ppo.py` now supports `--bc-parameterized-teacher-source` and stateful parameterized-teacher learner-state labels. The first run exposed and fixed a teacher-clone bug: action smoothing must carry previous action state, matching `scripts/sweep_six_pendulum_mjwarp_energy_teacher.py`. After the fix, the teacher clone solved its own exact-down rollout at `1.2425s`, proving the labels can recreate a valid swing/catch/hold scaffold. The learned policy still did not solve exact down-start: deterministic down held `0.0s`, stochastic down solved `0/4` passes, deterministic hold held only `0.675s`, and stochastic hold best reached `1.03s`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-param-dagger-f160-20260611.json`.
- Parameterized-teacher DAgger phase diagnostic on 2026-06-11 added `phaseDiagnostics` to teacher and learner rollouts and fixed DAgger sequencing so each iteration trains before the next learner-state collection. Diagnostic command: `npm run train:six-pendulum:puffer-mjwarp:param-dagger-phase-diagnostic`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-param-dagger-phase-diagnostic-20260611.json`. Iteration 1 teacher-visited labels were `57.0%` bottom, `43.0%` pump, `0%` catch; iteration 2 learner-visited labels collapsed to `100%` bottom with `89.3%` saturated actions and `0` catch events. This identifies the failure mode: current learner-state DAgger turns into max-force rescue labels at the exact-down saddle instead of balanced pump/catch/hold sequence learning.
- True-sequenced parameterized-teacher DAgger run on 2026-06-11 used the fixed per-iteration train-then-collect loop with the top teacher trajectories. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-param-dagger-true-f160-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-param-dagger-true-f160-20260611.pt`. It did not solve. Iteration 1 teacher labels included real catch data (`54.5%` catch, first catch at `0.7575s`, teacher max held `1.2425s`), but iteration 2 policy-visited labels again collapsed to `100%` bottom and `96.1%` saturated actions. Held-out deterministic exact down stayed `0.0s`; stochastic exact down stayed `0.0s`; deterministic hold was `0.38s`; stochastic hold was `0.6s`. No link-two promotion and no brain milestone update.
- Phase-balanced DAgger/BC lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_phase_balanced_bc.py` forces fixed sample quotas across bottom, pump, approach, near-top-fast, catch, and centered-catch buckets before weighted BC with a hold-anchor. Command: `npm run train:six-pendulum:puffer-mjwarp:phase-balanced-bc-link1`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-phase-balanced-bc-f160-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-phase-balanced-bc-f160-20260611.pt`. It did not solve. The sampler selected `4,608` samples with explicit quotas: bottom `1,024`, pump `1,024`, approach `1,024`, near-top-fast `512`, catch `512`, centered-catch `512`. Before BC, held-out deterministic exact down was `0.0s`, stochastic exact down was `0.86s`, and hold-start was `1.655s`. After BC, deterministic exact down stayed `0.0s`, stochastic exact down regressed to `0.0625s`, and hold-start improved to `3.585s`. This proves phase balance fixes the data composition but flat per-state BC still damages the swing-up/catch timing; the next upgrade should train contiguous sequences with advantage/value weights or move to AWAC/IQL/TQC-style critic replay.
- Phase-balanced sequence BC lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_phase_sequence_bc.py` keeps the same phase quotas but trains contiguous recurrent windows around each selected phase, so catch windows include the pump-to-catch lead-in. Command: `npm run train:six-pendulum:puffer-mjwarp:phase-sequence-bc-link1`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-phase-sequence-bc-f160-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-phase-sequence-bc-f160-20260611.pt`. It did not solve. The selector wrote `576` windows: bottom `128`, pump `128`, approach `128`, near-top-fast `64`, catch `64`, centered-catch `64`. Before BC, held-out deterministic exact down was `0.0s`, stochastic exact down was `0.86s`, and hold-start was `1.655s`. After sequence BC, deterministic exact down stayed `0.0s`, stochastic exact down regressed to `0.0s`, and hold-start stayed solved at `1.535s`. This rules out both flat phase-balanced BC and naive phase-balanced sequence BC as the missing learner update. The next implementation should stop cloning teacher actions directly and add a value/advantage model or critic-guided replay.
- AWR sequence replay lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_awr_sequence.py` keeps the same phase-balanced recurrent windows but replaces deterministic action MSE with advantage-weighted action log-likelihood plus value regression on normalized future hold-quality returns. Command: `npm run train:six-pendulum:puffer-mjwarp:awr-sequence-link1`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-awr-sequence-f160-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-awr-sequence-f160-20260611.pt`. It did not solve. The selector wrote the same `576` windows, and return weighting correctly ranked catch/centered-catch windows highest (`returnMean` about `1.39`) while bottom/pump windows were negative. Before AWR, held-out deterministic exact down was `0.0s`, stochastic exact down was `0.86s`, and hold-start was `1.655s`. After AWR, deterministic exact down stayed `0.0s`, stochastic exact down regressed to `0.0s` held despite one stochastic catch flash (`catchWorldRate=0.125`, first catch `2.1325s`), and hold-start improved to `2.4975s`. This rules out shallow AWR-shaped supervised replay over teacher windows as sufficient; the next branch needs an online critic/off-policy replay learner or real PufferPPO/MinGRU GPU sweeps that preserve rare catch transitions through interaction.
- AWAC twin-critic replay lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_awac_replay.py` trains twin critics over phase-balanced teacher/learner transitions, then applies AWAC-style advantage-weighted actor updates. Command: `npm run train:six-pendulum:puffer-mjwarp:awac-replay-link1`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-awac-replay-f160-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-awac-replay-f160-20260611.pt`. It did not solve. Before AWAC, deterministic exact down was `0.0s`, stochastic exact down was `0.86s`, and hold-start was `1.655s`. After AWAC, deterministic exact down stayed `0.0s`, stochastic exact down reached `0.7475s` with `0/4` solved passes, and hold-start improved to `1.9525s`. This confirms critic replay is the right class of update but the local small-scale run still loses the rare exact-rest catch path. No link-two promotion.
- IQL in-sample critic replay lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_iql_replay.py` avoids AWAC's unsupported-action Q baseline by fitting in-dataset Q/V targets, then extracts the actor with advantage-weighted log-prob updates plus a hold anchor. Command: `npm run train:six-pendulum:puffer-mjwarp:iql-replay-link1`. Smoke artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-iql-replay-smoke-20260611.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-iql-replay-smoke-20260611.pt`. Smoke passed plumbing only; it did not solve.
- IQL local parallel burst on 2026-06-11 ran four slight hyperparameter variants from the `0.8025s` recenter-snap checkpoint: `puffer-mjwarp-iql-burst-a-e075-b10-20260611.json`, `puffer-mjwarp-iql-burst-b-e085-b07-20260611.json`, `puffer-mjwarp-iql-burst-c-e065-b14-20260611.json`, and `puffer-mjwarp-iql-burst-d-e080-b05-20260611.json`. All four failed the strict gate. Deterministic exact down stayed `0.0s`; stochastic exact down held `0.0s` with `0/4` solved passes; near-top strict score reached only about `80.74..80.78`; hold-start remained solved at `1.11..1.1525s`. This is a strong stop signal for same-family local IQL nudges: they preserve upright hold but do not convert exact-rest approach into continuous catch/hold.
- TQC/virtual experience replay lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_tqc_ver_replay.py` trains truncated-quantile critics on learned-policy exact-down rollouts, mirrors observations/actions as virtual replay, then applies a critic-guided actor update with a hold anchor. Command: `npm run train:six-pendulum:puffer-mjwarp:tqc-ver-replay-link1`. Smoke artifacts: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-tqc-ver-replay-smoke-20260611.json` and `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-tqc-ver-replay-smoke2-20260611.json`. The smoke passed after replacing the intentional quantile broadcast with explicit Huber math; it did not solve, as expected for 64-step plumbing. This is the next source-backed learner class after PPO, BC, AWR, AWAC, and IQL failed the strict one-link gate.
- TQC/VER full local result on 2026-06-11: broad actor extraction artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-tqc-ver-replay-f160-20260611.json` collected useful replay, including a `0.8375s` strict stochastic near-catch and strict score `97.82`, but the post-update held-out policy regressed to deterministic exact down `0.0s`, stochastic exact down `0.2725s`, `0/4` solved passes, and hold-start `1.9775s`. Positive-actor extraction was added with `--actor-min-reward 0.0` to avoid broad actor washout. Artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-tqc-ver-positive-actor-f160-20260611.json` used `3,296` positive actor transitions and did not solve: deterministic exact down `0.0s`, stochastic exact down `0.25s`, `0/4` solved passes, hold-start `2.2075s`. This rules out shallow TQC actor extraction on the current replay dataset; it improves/preserves hold but still loses the exact-rest whip/catch sequence.
- Blast-sweep runner added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_blast_sweep.py` runs multiple local MJWarp PPO dots, writes per-dot JSON/checkpoints, writes a ranked summary, and writes an SVG wallclock-vs-score scatter. Command: `npm run train:six-pendulum:puffer-mjwarp:blast-sweep`.
- Blast sweep `20260611-blast-a` ran five learned local CPU dots from the two best prior checkpoints (`0.8025s` recenter-snap and `0.72s` stochastic-candidate). Summary: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-blast-sweep-20260611-blast-a.json`; graph: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-blast-sweep-20260611-blast-a.svg`.
- Blast result: no new counted solve and no new best. Best new dot was `stochastic-candidate-low-lr`, with deterministic exact down `0.0s`, stochastic exact down `0.6575s`, and hold-start `2.4825s`. The old recenter-snap checkpoint remains the best learned stochastic exact-down candidate at `0.8025s`. Elite fallback from the recenter checkpoint found no rollout world above even `0.02s`; elite fallback from the stochastic checkpoint cloned `0.125s` near-catch worlds but degraded hold and down-start. This says local PPO continuations are washing out rare whip/catch behavior faster than they improve it.
- Near-top-priority elite BC patch on 2026-06-12 added `--elite-rollout-bc-window-mode {full,catch,near-top}` to `scripts/train_six_pendulum_mjwarp_device_ppo.py`, plus Modal source mounts and a `pufferlib`-free Modal image for the MJWarp/Torch device-PPO dot. This changes elite BC from cloning whole selected worlds to carrying recurrent hidden state through the full rollout while applying imitation loss only around catch/near-top windows. Local correctness artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-neartop-window-n32-20260612.json` selected `889` near-top loss steps across `4` worlds and reached stochastic exact-down `0.5325s`; deterministic exact-down stayed `0.0s`, so it did not count. Modal L4 burst artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-neartop-window-burst-20260612.json` ran `2` updates, `256` worlds, randomized train horizons `160..768`, and `4` stochastic eval passes. It crossed the one-second stochastic gate with best stochastic exact-down `1.195s` after update 1 and `1.130s` after update 2 (`1/4` solved stochastic passes), while deterministic exact-down remained `0.0s`; hold-start improved to `2.5725s`. This is a real learned-policy progress checkpoint and proves the rare-window selector can preserve a one-second stochastic catch, but it is not a counted promotion because the strict gate requires held-out deterministic exact-down solve unless Max explicitly accepts stochastic solved-pass proof.
- Stochastic-success BC diagnostic on 2026-06-12 added `--stochastic-success-bc-*` flags to `scripts/train_six_pendulum_mjwarp_device_ppo.py`. The new path runs fresh stochastic exact-down probes, picks the best pass, burns recurrent hidden state through the full sequence, and applies deterministic-action imitation only on selected catch/near-top windows. Modal L4 artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-success-bc-distill-20260612.json` saw a `1.1775s` stochastic success inside the success-BC probe and selected `735` loss steps, but deterministic exact-down stayed `0.0s`; the best post-update stochastic eval was `1.09s` (`2/4` solved passes), and the second update regressed stochastic eval to `0.74s`. A lighter distill-only run `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-success-bc-light-distill-20260612.json` saw a `1.0475s` stochastic success and selected `588` loss steps with a tiny parameter delta (`0.00186`), but deterministic exact-down still stayed `0.0s` and stochastic eval fell to `0.8175s`. Chart: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/link1-mjwarp-deterministic-vs-stochastic-20260612.png`. Interpretation: simple MSE-to-sampled-action is not sufficient, even when it sees a solved stochastic pass. The next evidence-backed learner should use a return/advantage-weighted SIL/AWR-style sequence objective or a reverse start-state curriculum from actual successful catch states, not more plain BC.
- NLL success-prefix distillation on 2026-06-12 added `success-prefix` and `precatch-catch` window modes plus a `stochasticSolvedButDeterministicFailed` gate flag. External consults and subagents agreed the current failure is policy-mean collapse: sampled action tails find the whip, but deterministic `dist.mean` stays on the losing branch. Modal L4 artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-success-prefix-distill-20260612.json` selected `857` prefix loss steps from a solved stochastic pass (`1.0775s` in the probe) and post-update stochastic exact-down again reached `1.1275s` (`1/4` solved passes), but deterministic exact-down remained `0.0s`. Modal app `https://modal.com/apps/max-petrusenko/main/ap-HIX9MJvLE31D0Si4ZcnEnW` stopped cleanly. Conclusion: one-shot MSE/NLL imitation, even across the pump-to-catch prefix, is exhausted. Next branch should implement true reverse reset-state curriculum from actual stochastic catch/pre-catch states and/or return-weighted SIL/AWR replay over many near-success worlds. Randomized horizons should be gated behind repeated stochastic whip success, not used as an early rescue.
- Reverse snapshot-curriculum diagnostic on 2026-06-12 added qpos/qvel/last-action rollout recording, MJWarp reset-from-snapshot kernels, `--stochastic-success-snapshot-ppo-*` flags, and Modal pass-through config. The first Modal L4 artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-snapshot-curriculum-20260612.json` selected real states from a solved stochastic source pass: best source held `1.295s`, selected `10` snapshots from worlds `45` and `237`, offsets `0,80,160,320,480`. The reset-state rollout only held `0.1075s`, deterministic exact-down stayed `0.0s`, post-update stochastic exact-down fell to `0.89s` (`0/4` solved passes), and hold-start remained solved at `2.9575s`; Modal app `https://modal.com/apps/max-petrusenko/main/ap-AH81zwlIj0bhHe2nduoXuq` stopped cleanly. Static review then found two correctness bugs, so treat that Modal row as pre-fix evidence only: the reset kernel could mix qpos/qvel features from different snapshots, and state buffers used `1 + MAX_LINKS` even when the MJCF has fewer qpos/qvel slots. Both are now fixed: reset copies all qpos/qvel features from one source snapshot per world, and rollout state width uses `mjm.nq/mjm.nv`. Hidden-state restore is also implemented: selected snapshots now carry the recurrent hidden vector, snapshot resets cycle worlds deterministically across those sources, and PPO starts/resets from the matching hidden state instead of zero.
- Corrected hidden-restore Modal proof dot on 2026-06-12: config `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-snapshot-hidden-logged-smoke-20260612.json`; artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-snapshot-hidden-logged-smoke-20260612.json`; checkpoint `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-snapshot-hidden-logged-smoke-20260612.pt`; Modal app `https://modal.com/apps/max-petrusenko/main/ap-7ikVb5ADRFhqlge6RhRnZM` stopped cleanly. Result: deterministic exact-down still held `0.0s`, best stochastic exact-down held `0.175s` (`0/2` solved passes), deterministic hold-start remained solved at `1.6s`, and stochastic hold-start solved `2/2` passes. The snapshot probe itself recorded hidden states, selected `16` snapshots from worlds `15,41,28,57`, restored hidden state in the snapshot rollout, updated parameters (`deltaL2=0.00943`), but snapshot rollout only held `0.045s`. This does not count and does not promote link two. Conclusion: snapshot jumping from near-catch states is not enough even with hidden restore; the next evidence-backed branch is full down-start sequence replay/SIL/AWR over the whole side-load/reverse/whip/catch trajectory, or a true PufferPPO/MinGRU sweep that keeps those rare sequences through interaction.
- Exact-down gate correction on 2026-06-12: `pose=exact-down` now resets cart position, cart velocity, link angles, and link velocities to the literal rest-down state. Held-out deterministic/stochastic down eval and stochastic success probes now use `exact-down`; noisy `down` remains a training distribution only. This closes a reviewer-found gap where earlier `down` metrics were actually noisy down-start distribution metrics, not one canonical exact down state.
- Full-sequence SIL smoke on 2026-06-12: added `--stochastic-success-sequence-sil-*` for full exact-down stochastic episode replay with recurrent burn-in and positive-return weighted sampled-action NLL. Local CPU smoke artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-sequence-sil-smoke-20260612.json` passed plumbing against literal `exact-down`. Modal L4 proof dot config `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-sequence-sil-exactdown-smoke-20260612.json`; artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-sequence-sil-exactdown-smoke-20260612.json`; checkpoint `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-sequence-sil-exactdown-smoke-20260612.pt`; Modal app `https://modal.com/apps/max-petrusenko/main/ap-jVluKKB6TLYPlQHnfIwUOC` stopped cleanly. Result: the pre-update sequence probe found one exact-down stochastic near-catch world at `0.1775s` and strict score `88.53`, sequence-SIL updated parameters (`deltaL2=0.00944`), but post-update deterministic exact-down held `0.0s` and post-update stochastic exact-down held `0.0s` (`0/2` solved passes). Hold-start remained solved at `1.6s`. This does not count. Next sequence-SIL run should require stronger source episodes before updating, persist selected replay sequences, and reduce the value loss scale because this smoke's value loss dominated the actor loss.
- Sequence-SIL correction on 2026-06-12: PPO and sequence-SIL now bootstrap open rollout tails from the last value prediction instead of forcing tail value to zero, and sequence-SIL writes a compact replay NPZ for selected worlds. Local replay smoke artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-sequence-sil-replay-smoke-20260612.json`; replay file `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-sequence-sil-replay-smoke-20260612.sequence-replay-update-1.npz`. The replay file contains `obs`, `actions`, `rewards`, `values`, `terminals`, `truncations`, `qpos`, `qvel`, `stateLastActions`, and selected-world metrics. Modal payload handling can now return the replay NPZ beside the result JSON, and the local result JSON records the local checkpoint path before writing. This is plumbing only: exact-down held `0.0s` in the smoke, so it still does not count.
- Replay/VER BC lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_replay_ver_bc.py` loads a learned checkpoint, collects stochastic exact-down rollouts, selects reset-clean near-top/catch segments, mirrors observations/actions as virtual experience replay, and distills them with sequence BC. Command: `npm run train:six-pendulum:puffer-mjwarp:replay-ver-bc-link1`.
- Replay/VER BC result: artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-replay-ver-bc-f160-20260611.json` wrote `88` replay trajectories and `30,592` mirrored samples. It did not solve. Before BC, held-out deterministic exact down was `0.0s`, stochastic exact down reached `0.86s`, and hold-start was solved at `1.655s`. After BC, deterministic exact down stayed `0.0s`, stochastic exact down regressed to `0.435s`, and hold-start dropped below the gate at `0.9575s`. The replay selector did capture real catch/near-top worlds, but naive BC still diluted rare useful behavior with suboptimal swing-up/rail behavior.
- Replay/VER fix after the failed run: the selector now refuses plain `top-k-held` fallback by default. It clones only worlds that hit a held-time threshold, near-top, or catch basin; `--allow-plain-top-k` must be passed to include least-bad worlds with no near-success evidence. This keeps future replay BC from training on pure failure chunks. The next evidence-backed move is not more plain BC; it is value/advantage-filtered replay or an off-policy critic-guided update.
- Catch-filtered replay BC lane added on 2026-06-11: `scripts/run_six_pendulum_mjwarp_filtered_bc.py` collects stochastic exact-down rollouts from the best learned checkpoint, keeps only catch-band samples whose one-second future hold quality improves, mirrors them, and trains a low-LR one-step BC update with a hold-basin anchor to the old policy. Command: `npm run train:six-pendulum:puffer-mjwarp:catch-filtered-bc-link1`.
- Catch-filtered replay BC result: artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-catch-filtered-bc-f160-20260611.json` wrote `896` filtered/mirrored samples. It did not solve. Before BC, deterministic exact down was `0.0s`, stochastic exact down was `0.86s`, and hold-start was `1.655s`. After BC, deterministic exact down stayed `0.0s`, stochastic exact down regressed to `0.4525s`, and hold-start improved to `2.485s`. This confirms the hold anchor works, but the current filtered BC still does not teach the exact-rest pump/catch distribution.
- Kache media re-read on 2026-06-11 saved raw Bird JSON, videos, frames, and contact sheets under `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/x-kache-media/`. The solve video now has a full frame dump: `solve-frames-full/frame_00001.jpg` through `frame_03983.jpg`, plus `solve-frames-full/index.csv`, `solve-contact-sheet-1fps.jpg`, `solve-contact-sheet-2fps.jpg`, and `solve-contact-sheet-2fps-annotated.jpg`. The motion read matches Max's note: the cart first side-loads slowly to straighten/load the chain, reverses to swing the links up, catches from the first real approach, then uses extra side-to-side whip corrections around center. The cart does not simply slam to a rail. The scatter video confirms many experiment dots and top outliers by wallclock/score. The reward video reinforces that reward is the training signal, while the public score still requires a strict continuous hold. Implementation implication: preserve early side-load/reverse timing as a recurrent sequence, penalize rail-out during catch, preserve pump impulse early, and stop counting near-top/subsecond flashes.
- Seven-pendulum public X review on 2026-06-11: Bird and downloaded media were checked for SquaredCubeRBX, sigbrutal, and winterresearch3. Artifacts live under `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/x-seven-pendulum/`. SquaredCubeRBX describes a seven-pendulum dead-hang solve with IPOPT full collocation, TVLQR tracking, and constant LQR hold; sigbrutal's 17.7s N=7 video shows similar full-state feedback behavior; winterresearch3 claims an eight-pendulum no-RL solve. These are useful motion/control priors, but they are not learned-policy RL solves and they do not unlock our link count gate. They strengthen the case for side-load/reverse/catch motion shaping and for using model-based trajectories only as scaffold data, not proof.
- Failure-focused source refresh on 2026-06-11: PufferLib docs explicitly describe prioritized replay over high-absolute-advantage trajectory segments and sweeps as the compute unit; MJWarp docs confirm the target is large batched throughput with CUDA graph capture and fixed-shape device work; behavioral-cloning literature supports filtering positive/useful examples but our run shows filtering without a critic still degrades exact-down catch duration. A separate source pass found AWR/AWAC/IQL as the right supervised-from-replay family, SAC/TQC as the strongest off-policy continuous-control baseline, and the quadruple inverted pendulum TQC/virtual-experience-replay paper as the closest public source-backed multi-link result. Next evidence-backed branch is phase-balanced DAgger with balanced exact-down/pump/pre-catch/catch/hold segments or off-policy replay/TQC/SAC-style critic updates, not more one-off local PPO/BC nudges.
- Interpretation: reset sampling/writes, horizon sampling, train-only random horizons, down-whip velocity curriculum, action scaling, action-tensor ctrl writes, Torch/Warp recurrent actor-critic interop, reward, catch-gated reward shaping, observation-derived energy-teacher PPO anchor loss, Pezzza learned-policy bridge evaluation, strict score, cart terminal, truncation, held/max-held accumulation, per-world elite trajectory selection with subsecond fallback, potential-delta reward, centered rest-pump shaping, recenter-snap shaping, fixed-shape PPO rollout-buffer writes, coherent pre-action PPO observations, fixed-buffer PPO epochs, Puffer-scale MinGRU-style policy smoke, Puffer-scale MinGRU PPO collect/update/eval smoke, stabilizer BC learning-rate control, stabilizer sequence BC, explicit warmstart force-scale mismatch handling, exact-down ES/CEM teacher trajectory export, parameterized exact-down teacher sweep/export, multi-trajectory BC, stateful parameterized-teacher DAgger, blast-sweep ranking, and repeated collect-update-eval training are now reusable. A standalone MJWarp rollout can keep metrics device-side per step, and a recurrent Torch policy can consume current Warp observations without NumPy action writes. A remaining local blocker is the exact pure-down saddle and MJWarp-specific dynamics: neither down-heavy, pure-down continuation, elite cloning, velocity-start down-whip training, centered rest-pump shaping, recenter-snap shaping, subsecond elite fallback, random-horizon continuation, catch-gated PPO continuation, energy-teacher anchor loss, shallow ES/CEM teacher search, direct Pezzza policy transfer, static teacher trajectory BC, multi-trajectory BC, parameterized-teacher DAgger, nor the first blast sweep produces a one-second learned MJWarp rest-state solve. The MinGRU lane now solves one-link hold-start (`1.5075s`) but does not learn whip from rest. The next practical move is true PufferPPO/MinGRU GPU sweeps or an off-policy/replay learner that preserves rare catch transitions, not more single-checkpoint local PPO continuations.
- Proof boundary: the device-rollout action source is a deterministic Warp scripted-action kernel for plumbing only. It is not a learned policy, not a score row, and not a solve.
- Exact-down whip diagnostic on 2026-06-12: DeepSeek, Gemini/Oracle, and two subagents converged on the same blocker: the env can physically side-load/reverse/catch, but the learned policy is not extracting a stable deterministic catch from exact rest. `scripts/six_pendulum_mjwarp_env.py` and `scripts/six_pendulum_mjwarp_device_rollout.py` now expose `pose=exact-down` in their CLIs, and `scripts/six_pendulum_mjwarp_gpu_kernels.py` guards the soft-rail denominator when `terminalBoundary` equals the soft rail. New diagnostic script `scripts/sweep_six_pendulum_mjwarp_whip_plan.py` sweeps open-loop side-load/reverse/brake plans from literal exact down. First artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-whip-plan-sweep-link1-20260612.json` found a best plan reaching `maxMeanTipHeight=1.0`, `maxStrictScore=75.32`, `43` near-top steps, and `64` catch-basin steps without terminal, but `maxHeldSeconds=0.0`; video `/ailab/six-pendulum/whip-plan-link1-exactdown-diagnostic-20260612.mp4` is diagnostic only and does not count. The dense-swingup reward also removed the one-way rightward symmetry break and now rewards state-based reverse-whip kinematics near horizontal while keeping strict score unchanged.
- Catch-correction tube diagnostic on 2026-06-12 added `scripts/run_six_pendulum_mjwarp_catch_correction_bc.py` after DeepSeek, Gemini/Oracle, and two subagents converged on the same recommendation: query labels only around near-top/catch/post-catch states, use teacher/LQR-style labels as imitation data only, and preserve the learned pump/approach action outside the tube. Three local CPU smokes did not solve: heavy stabilizer correction from the direct-NPZ AWR checkpoint reduced deterministic saturation (`0.4875 -> 0.39`) but erased timing (`0.17s -> 0.0s`); light trajectory-label correction from the same checkpoint regressed deterministic exact-down (`0.17s -> 0.0975s`); light trajectory-label correction from the Modal stochastic checkpoint preserved low saturation and hold-start but kept deterministic exact-down at `0.0s` and reduced stochastic exact-down (`0.37s -> 0.335s`). Artifacts: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-exactdown-catch-correction-smoke-20260612.json`, `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-exactdown-catch-correction-lighttraj-20260612.json`, and `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-neartop-window-catch-correction-lighttraj-20260612.json`. Conclusion: the blocker is no longer just saturated catch force. The Modal checkpoint already has low catch saturation and a stochastic one-second branch; deterministic mean still misses the timing. Next branch should train the deterministic mean on selected full solved stochastic sequences with return-weighted NLL/AWR and preserved recurrent hidden state, or run a real PufferPPO/MinGRU sweep from the stochastic checkpoint. Do not spend Modal on more one-step catch BC.
- DeepSeek/Gemini/subagent pause on 2026-06-12 refreshed the exact-down diagnosis. Research artifacts: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/deepseek-exactdown-collector-20260612.md` and `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/gemini-exactdown-collector-20260612.md`. Dalton's web pass pointed to DM Control swing-up reset/reward, reverse curriculum, randomized horizons only after whip exists, RNN state hygiene, and Kache-style sweep dots. Hubble's code pass independently recommended a collector-only high-nworld exact-down source run, recording recurrent hidden state, then actor-only sequence replay only if a source world crosses `1.0s`. Implementation changes retained: `scripts/run_six_pendulum_mjwarp_success_buffer_collect.py` collects exact-down stochastic learned-policy source sequences, records full recurrent buffers and hidden states, intentionally avoids mirroring to prevent first-kick symmetry cancellation, and writes replay NPZ only for worlds at or above the requested held-time threshold; `scripts/modal-train-six-pendulum-pufferppo-mjwarp.py` now exposes `--modal-success-buffer-collect`; `scripts/run_six_pendulum_mjwarp_sequence_replay_distill.py` now refuses to update by default unless replay metadata includes a source world held for at least `1.0s`.
- Strong exact-down success-buffer run on 2026-06-12 used Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-saXblaHlOkl2eQumLmB5am`, stopped cleanly. Command class: collector-only, no PPO update, warmstarted from `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-neartop-window-burst-20260612.pt`, `nworld=1024`, `passes=6`, `evalSteps=1600`, `pose=exact-down`, `minHeldSeconds=1.0`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-exactdown-success-buffer-n1024-p6-20260612.json`; replay: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-exactdown-success-buffer-n1024-p6-20260612.npz`. Result: `5` selected exact-down stochastic learned-policy worlds over the one-second source threshold, best held `1.3775s`, best strict score `99.83`. Selected worlds held `1.3525s`, `1.0075s`, `1.3775s`, `1.1950s`, and `1.0400s`. Deterministic first-action diagnostic was not zero (`absMean=0.2019`), so exact-down failure is not a totally inert first action; it is still the deterministic catch/mean branch.
- Strong-buffer actor-only distill on 2026-06-12 consumed that solved exact-down source buffer with no mirroring and `minSourceHeldSeconds=1.0`. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-exactdown-success-buffer-distill-20260612.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-exactdown-success-buffer-distill-20260612.pt`. Result: no counted solve. Before distill, deterministic exact-down held `0.0s`, stochastic exact-down held `0.4925s`, and hold-start held `1.2075s`. After distill, deterministic exact-down stayed `0.0s`, stochastic exact-down held `0.4000s`, and hold-start improved to `1.565s`; `promoteToNextLink=false`. The parameter delta was tiny (`0.00186`) and the loss stayed stable, so the remaining blocker is not lack of source data anymore. It is extracting deterministic mean behavior from stochastic solved branches. Next practical branch: use the success buffer as an online success replay/SIL/AWR auxiliary inside PPO over many updates, or run a true sweep from the stochastic checkpoint with success-buffer replay mixed into each update; do not expect one-shot actor distill to solve.
- Success-buffer online replay aux on 2026-06-12 consumed the same solved exact-down source buffer inside Modal device PPO for three bounded updates. Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-PUZNtxFwmtBbWhJPxOalqX` stopped cleanly. Config: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-success-replay-aux-20260612.json`; artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-success-replay-aux-20260612.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-success-replay-aux-20260612.pt`. Result: no counted solve and no link-two promotion. Deterministic exact-down stayed `0.0s` across all three updates even though hold-start stayed solved (`2.825s` best) and stochastic exact-down retained one-second sampled branches (`1.1625s`, `1.1825s`, `1.0425s`; best pass rate `2/4`). The final gate flags `stochasticSolvedButDeterministicFailed=true` and `promoteToNextLink=false`. Interpretation: online replay is preserving the learned stochastic whip/catch trajectory, but the deterministic mean still rides the rail and never enters the catch basin. Next branch should explicitly optimize/evaluate deterministic action extraction: lower or anneal `log_std`, increase smoothed-action MSE relative to sampled-action NLL, add mean-action rollout loss or deterministic DAgger from the selected solved sequences, and keep Modal bursts short until deterministic exact-down moves above `0.0s`.
- Deterministic mean-extraction replay on 2026-06-12 followed Kuhn's web research and Leibniz's code review: PPO drift disabled, replay MSE raised to `32.0`, sampled-action NLL reduced to `0.05`, replay entropy made negative to penalize entropy, and burn-in removed. Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-KZKagtSyYiPhthBDoPp9p6` stopped cleanly. Config: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-success-replay-meanextract-20260612.json`; artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-deterministic-extract-mse32-20260612.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-deterministic-extract-mse32-20260612.pt`. Result: no counted solve and no promotion. Deterministic exact-down stayed `0.0s`; deterministic strict score improved only slightly from `67.03` to `68.50`; stochastic exact-down peaked at `1.4375s` with `3/4` solved passes after update 1, then regressed to `0.785s` and `0/4` by update 3. Hold-start stayed solved and improved to `3.5575s`. The replay loss moved parameters more (`deltaL2 ~= 0.00757` per update), but `logStd` barely changed (`-0.49994` to `-0.49999`), confirming that coefficient-only replay is not enough. Code now exposes `--policy-log-std-target` / `--freeze-policy-log-std` and Modal config keys `policyLogStdTarget` / `freezePolicyLogStd`; helper smoke verified `log_std -0.5 -> -1.5` and freeze. Next prepared config: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-success-replay-logstd-freeze-20260612.json`. Run it only as a short bounded dot; if deterministic exact-down remains `0.0s`, implement deterministic DAgger from mean-policy rail states instead of more replay coefficient sweeps.
- Log-std freeze replay on 2026-06-12 ran the prepared short dot from the mean-extraction checkpoint with `policyLogStdTarget=-1.5` and `freezePolicyLogStd=true`. Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-EQ8OUxosS4SHfhVtBRCqqv` stopped cleanly. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-logstd-freeze-20260612.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-logstd-freeze-20260612.pt`. Result: no counted solve and no promotion. The log-std hook worked (`before=-0.499987`, `after=-1.5`, `requiresGrad=false`). Deterministic exact-down still held `0.0s`, but strict score rose to `70.43`; deterministic held-out never entered catch (`catchWorldRate=0.0`). Stochastic exact-down still produced solved branches: best `1.5725s`, `2/4` passes after update 1 and `1.16s`, `2/4` after update 2. Training rollout catch quality improved from prior replay runs: `catchWorldRate` rose to `0.242..0.262`, rollout strict stayed near `82`, and rollout held `0.010..0.0225s`, still far below the one-second gate. Interpretation: std collapse reduces action noise/saturation and improves sampled catch reliability, but it still does not teach the deterministic mean to brake/catch. Stop replay coefficient sweeps. Next branch should implement deterministic DAgger: roll out the deterministic mean from exact down until rail/near-top failure states, label those visited states by multi-sample stochastic teacher continuations from the solved buffer/checkpoint, and train the mean on the selected first actions.
- Deterministic failure-state DAgger on 2026-06-12 followed the refreshed DeepSeek/Gemini/subagent diagnosis that stochastic PPO can hide a multimodal/hidden-state catch policy while deterministic mean follows a different failure trajectory. Research artifacts: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/deepseek-deterministic-mean-failure-20260612.md` and `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/gemini-deterministic-mean-failure-20260612.md`. Code now adds `deterministic_failure_dagger_update()` to `scripts/train_six_pendulum_mjwarp_device_ppo.py`, exposes `deterministicDagger*` Modal config keys, records `railWorldRate`, `firstRailSeconds`, `nearTopBeforeRailWorldRate`, and `catchBeforeRailWorldRate`, and selects centered/pre-rail approach snapshots instead of late rail apex snapshots. Local smoke proved the hook selects centered approach states (`cartAbs=0.85`, `thetaAbs=1.64`, `omegaAbs=5.43`) and updates parameters. Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-xu7oMgr40Q22fGLx2bhh5C` stopped cleanly. Config: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-deterministic-dagger-20260612.json`; artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-deterministic-dagger-20260612.json`; checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-deterministic-dagger-20260612.pt`. Result: no counted solve and no promotion. Update 1 labeled `16` deterministic failure snapshots and moved parameters (`deltaL2=0.07297`), but teacher continuations only reached strict `76.73`, `maxHeldSeconds=0.0`, and tiny catch rate (`0.0039`). The branch moved deterministic behavior from late rail-only near-top to `nearTopBeforeRailWorldRate=1.0`, but exact-down deterministic still held `0.0s` with no catch; stochastic exact-down peaked at `0.99s` (`0/4` solved passes), below the gate. Next branch should change the teacher/label source, not repeat this exact DAgger: either label deterministic states from the solved success buffer/nearest-neighbor suffix or run a short-horizon CEM/MPC teacher with explicit center/rail cost and catch reward, then use DAgger labels only when the teacher continuation produces catch/hold evidence.
- Deterministic replay-DAgger diagnostics on 2026-06-12 labeled exact-down deterministic failure states from the solved success buffer instead of fresh stochastic continuations. The first Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-J1yTWGLMyZNKCNflYRCUPA` stopped cleanly but did not promote: deterministic exact-down stayed `0.0s`, stochastic exact-down only reached `0.2825s`, and the artifact showed a correctness issue: all selected snapshots/labels collapsed onto the same replay world/step. Follow-up code now dedupes selected deterministic snapshots by state features, enforces minimum step separation, limits per-world picks, and filters replay labels away from rail-edge cart positions. Local smoke `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-deterministic-replay-dagger-diverse-smoke-20260612.json` verified selection diversity: steps `133,149,165,187,203` and replay labels `157,172,188,202,214` instead of cloned same-step labels. Modal L4 app `https://modal.com/apps/max-petrusenko/main/ap-4ZAxJJ22T5mhHNannbva1k` then ran config `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/modal-link1-diverse-replay-dagger-20260612.json`; artifact `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-diverse-replay-dagger-20260612.json`; checkpoint `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-diverse-replay-dagger-20260612.pt`; app stopped cleanly. Result: still no counted solve and no link-two promotion. Best deterministic exact-down stayed `0.0s` with `railWorldRate=1.0` and no catch; best stochastic exact-down recovered a learned branch at `1.1675s` with `3/4` solved stochastic passes after update 1, then regressed to `0.775s` after update 2. This confirms the current one-step nearest-neighbor replay-DAgger is useful for preserving stochastic whip/catch evidence, but not enough to transfer that behavior into deterministic mean. Next branch should implement exact successful stochastic trajectory imitation with recurrent hidden state and late logstd/entropy anneal, or suffix-sequence DAgger from deterministic failure states; stop spending Modal on one-step NN replay labels.

Source-backed reproduction plan refresh on 2026-06-11:

1. Keep the local trainer as a correctness scaffold only. PufferLib docs advertise PuffeRL/PufferPPO throughput in the multi-million SPS range, while this local Mac reports CPU Warp only; local conclusions should be limited to reward/curriculum mechanics.
2. Build the real PufferPPO/MinGRU lane next: target `~1m` recurrent policy params, thousands of sweep dots, wallclock-vs-score ledger, and strict held-out pure-down scoring.
3. Move the rollout hot loop to NVIDIA MJWarp/GPU with fixed shapes before scaling. MJWarp docs frame it as a high-throughput batched simulator and explicitly warn CPU/GPU transfer can bottleneck RL.
4. Add CUDA graph/APIC-style capture only after fixed `nworld`, horizon, obs/action buffers, and policy inference are stable. NVIDIA/Warp guidance for graph capture requires same-stream, fixed-shape replay discipline.
5. Keep randomized horizons disabled until learned whip/catch behavior is already present, matching Yacine's note that the random episode-length trick helped after the model learned whipping but got lazy on fixed endings.

Lower-link execution plan from current evidence:

1. Treat three-link exact-down learned policy as solved at `1.100s`.
2. Keep four links as the active failure boundary: best learned exact-down hold is `0.550s`, solved rate `0.0`, so it does not count.
3. Do not unlock five or six from subsecond flashes, teacher scaffolds, scripted rollouts, mixed-start wins, or model-based controls.
4. Train by sweeps, not single hand-tuning: many four-link PufferPPO/PufferNet-MinGRU or replay/off-policy runs, wallclock-vs-score dots, strict promotion gate.
5. Keep observations policy-usable only: cart state, previous action, relative/absolute angle encodings, velocities. Do not leak score-only terms.
6. Port the device rollout into the trainer path before GPU spend: the Puffer-facing step still returns NumPy arrays, while the device smoke proves the no-per-step-host-read path.
7. On GPU, capture only fixed-topology work. CPU Python and synchronization do not belong inside `wp.ScopedCapture`; graph capture comes after fixed-shape rollout and policy plumbing.

Source anchors:

- Yacine/kache thread: PufferPPO, Puffer MinGRU, MuJoCo Warp, random horizon only after whip, `3.6k` experiments, wallclock-vs-score.
- PufferLib docs: PuffeRL/PufferNet/Protein are the native path for fast training and sweeps.
- MuJoCo Warp docs: MJWarp is throughput-first for large parallel RL batches, not single-env latency.
- Warp APIC issue and CUDA graph docs: capture/replay requires device-side fixed work and no synchronization/query inside capture.
- Warp Torch interop: use `wp.to_torch`, `wp.from_torch`, or DLPack-style interop for policy tensors; do not route CUDA policy actions through NumPy.

Puffer-style sweep ledger:

- Command: `npm run six-pendulum:puffer-ledger`
- Markdown: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-one-link-sweep-ledger.md`
- JSONL dots: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/puffer-mjwarp-one-link-sweep-ledger.jsonl`
- Result: learned policy rows now include a counted three-link exact-down solve at `1.100s`. Four-link exact-down reached `0.550s` with solved rate `0.0`, so it remains a progress checkpoint only.
- Four-link catch-survival c13 on 2026-06-12 preserved the best warm-start before mutation, widened validation candidates, added a dedicated `catch_survival` phase, and enabled randomized horizons after catch behavior appeared. Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-4link-catchsurvival-c13-modal-warmpreserve-p768-g8-hz60-20260612.json`; video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/four-link-catchsurvival-c13-progress-0550s-20260612.mp4`. It matched the old best at `0.550s`, did not solve, and showed the next missing piece: replay actual pre-catch/down trajectory states instead of random near-top/catch-flash states.
- Ledger now includes the June 10 gated lower-link rows and the lower-force energy-teacher BC/sequence-BC rows. Teacher warmup can show `solvedOneSecond=true`, but the row still scores zero unless the learned held-out policy solves pure down-start.
- Queued rows now match the Yacine experiment shape: PufferPPO, Puffer MinGRU/PufferNet, about `1m` params, MJWarp GPU batching, fixed horizon first, randomized episode length only after whip behavior appears, and five-link promotion only after held-out four-link down-start passes the one-second gate.
- Current blockers and provider path: Modal GPU execution is available again and the 2026-06-12 L4 run proved the MJWarp/Torch device-PPO path can execute there after removing the stale `pufferlib` image pin and mounting the local trainer modules. RunPod auth/credits/SSH now work for `max.petrusenko@gmail.com`, `RUNPOD_API_KEY` is stored in Doppler `api_keys/dev`, `/Users/maxpetrusenko/.ssh/id_ed25519.pub` is registered with RunPod, and the official PyTorch 2.8 template is confirmed as `runpod-torch-v280` / `runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404`. RunPod L4 burst on 2026-06-11 used pod `mqw4ayjawqdtr5` at `$0.39/hr`, then stopped it after artifact sync (`desiredStatus=EXITED`). The runner needed one real GPU fix: move the Torch recurrent policy and PPO/BC tensors onto the MJWarp rollout device. Speed smoke artifact `puffer-mjwarp-runpod-link1-speed-smoke.json` reached `136k-145k` eval SPS. Bounded burst artifact `puffer-mjwarp-runpod-link1-burst-a.json` ran `12` updates, `2048` worlds, `512` rollout steps, `800` eval steps, and `3` stochastic eval passes in `371s`; rollout/eval settled around `260k-287k` SPS. It did not solve: deterministic pure down stayed `0.0s`, best stochastic pure down was `0.6675s` with strict score `99.37`, and `promoteToNextLink=false`. Follow-up parallel hyperparam bursts on 2026-06-11 also did not solve: L4 pod `8pgqr9lfm6vfk4` ran `puffer-mjwarp-runpod-link1-burst-b-lr8e6-ent05.json` for `12` updates in `659s` and reached stochastic pure down `0.6875s`; RTX 3070 pod `apa932h9g11s7p` ran `puffer-mjwarp-runpod-link1-burst-c-lr12e6-ent035.json` for `14` updates in `734s` and reached `0.67s`. Both kept hold-start solved, both had deterministic pure down `0.0s`, both had `promoteToNextLink=false`, and all RunPod pods were deleted afterward (`runpodctl pod list` returned `[]`). This proves paid GPU materially speeds throughput, but tiny same-PPO hyperparam nudges do not beat the existing `0.8025s` local recenter-snap checkpoint and do not justify more spend. For the next paid run, build a pre-cached image and run a replay/off-policy/high-advantage segment lane that preserves rare catch transitions instead of washing them out. For a new RunPod pod, create with `npm run runpod:six-pendulum:create-pod`, then train from pod id with `npm run train:six-pendulum:puffer-mjwarp:runpod-pod -- --pod-id <pod-id> --warmstart-checkpoint /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt`. For Lightning/Vast/other SSH hosts, use `npm run train:six-pendulum:puffer-mjwarp:remote-gpu -- --host user@host --ssh-port <port> --warmstart-checkpoint /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-device-ppo-link1-recenter-snap-f160-20260610.pt`.

Phase 2, link scaling:

- Unlock link 5 only after 4-link held-out down-start holds for at least one second; link 6 stays locked until link 5 passes the same gate.
- Use the m1el lesson during pump: preserve bend order and penalize bend collapse only below a floor; do not reward straightness too early.
- Unlock higher link counts only after the previous count passes the same held-out one-second gate.
- Add randomized episode length only after whip behavior exists and the policy is plateauing on short/fixed holds.
- Treat the eventual target as a sweep problem, not one long run: Yacine reported `3.6k` experiments and GP-selected high-compute hyperparameters.

Phase 3, acceptance:

- Public score counts only continuous strict hold time over one second.
- Final proof must include checkpoint JSON, training scatter/ledger, held-out validation replay, and hosted video.
- A model-based TVLQR trajectory can stay as external proof, but it cannot close the RL reproduction.

## Pezzza-Style One-Link Evolution Result

New trainer:

```bash
npm run train:six-pendulum:pezzza:smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-Atp5F3zbazixndWxBHdeQp

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-evolution-1link-smoke.json`

Result:

- Algorithm: `modal-pezzza-style-evolution`.
- Policy: 24 open-loop force knots plus tiny MLP feedback.
- Inputs: cart position, cart velocity, sin/cos angle, angular velocity, previous action, normalized time.
- Movement terms: compensation, loss-of-balance penalty, gravity swing-up, whiplash, center staying.
- Curriculum: low gravity/high friction, medium gravity, near-normal, normal gravity.
- Final comparison score: strict score 187.95, mean hold 6.899 seconds, solved-one-second rate 1.0, about 721k simulated steps per second.

Interpretation:

This was the first one-link down-start solve in the vectorized analytic trainer. The checkpoint is now exported into the browser runtime and verified locally, so the current one-link gate passes. It proves the source direction: curriculum plus whiplash/recovery shaping solves the discovery problem that PPO/SAC/TD3 did not.

### Browser Runtime Proof

The browser policy was replaced with the Pezzza one-link checkpoint and the runtime now supports that checkpoint schema directly as `pezzzaKnotMlp`: time knots plus MLP feedback with inputs `cart x`, `cart velocity`, `sin(theta)`, `cos(theta)`, `angular velocity`, `previous action`, and normalized time.

Verification:

- Local deterministic replay over 16 down-start seeds: mean strict hold `5.681s`, every seed over `5.5s`.
- Playwright page proof on `http://localhost:3016/ailab/six-pendulum-cartpole`: held `8.043s`, score `95`.
- Screenshot: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/verification/pezzza-one-link-browser-schema-v1-clean/one-link-down-start-proof.png`
- Video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/verification/pezzza-one-link-browser-schema-v1-clean/8197ecb6de75b2ce231a2bb617c2d6c6.webm`

The browser score stays zero until the one-second gate is crossed. Subsecond upright moments do not count.

### Ablations

Full-gravity, no curriculum:

```bash
npm run train:six-pendulum:pezzza:full-gravity-smoke
```

- Modal run: https://modal.com/apps/max-petrusenko/main/ap-2tRCgyI6nU9xcxAIMHIXyE
- Result: strict score 0.0, mean hold 0.0 seconds.
- Interpretation: full difficulty from step zero does not find the behavior.

480 Hz curriculum:

```bash
npm run train:six-pendulum:pezzza:480hz-smoke
```

- Modal run: https://modal.com/apps/max-petrusenko/main/ap-h3iaYTUzuCymR0hUnE6FOX
- Result: strict score 164.60, mean hold 5.373 seconds, solved-one-second rate 0.949, about 784k simulated steps per second.
- Interpretation: 480 Hz works and is strong, but not clearly better enough to replace 240 Hz for smoke work.

Comparison report:

```bash
npm run six-pendulum:compare
```

- Markdown: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/latest-six-pendulum-comparison.md`
- JSONL dots: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/sweeps/latest-six-pendulum-comparison.jsonl`

The report uses strict validation score for the Y axis. Subsecond holds remain diagnostics and do not count.

## Smoke Result

Command:

```bash
npm run train:six-pendulum:curriculum:smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-82zcbZfAju6y2a9ZmgARNK

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-smoke-lower-links.json`

Result:

- Link 1 validation: score 9.07, held 0.0533, whip 0.2369.
- Link 2 validation: score 0.0, held 0.00547, whip 0.2048.
- Final lower-link smoke validation: link 2, score 0.11, held 0.00530, whip 0.2054.

Interpretation:

The curriculum path is wired and produces real lower-link learning signal. It does not yet solve link 2 or six links. Next run should increase link 1 and link 2 generations before advancing.

## Hold-First Lower-Link Result

Command:

```bash
npm run train:six-pendulum:curriculum:lower
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-wgrfVPQt8Rfff15I2kecjc

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-lower-links-v2.json`

Result:

- Link 1 hold validation: score 9.57, held 0.0909, whip 0.2961.
- Link 1 swing validation: score 72.73, held 0.1143, whip 0.3000.
- Link 2 hold validation: score 0.50, held 0.0106, whip 0.2155.
- Link 2 swing validation: score 0.17, held 0.00392, whip 0.2011.
- Final lower-link validation: link 2, score 0.14, held 0.00438, whip 0.2040.

Interpretation:

Hold-first training is the right direction for one link: it materially improves strict one-link hold and swing validation. The same time-knot feedback policy still does not carry to link 2. Do not deploy this as the public policy checkpoint. Validation-aware elite selection and distribution-mean handoff were implemented later, but link 2 still does not pass the strict down-start gate. The target lane is now recurrent PPO/Puffer-style training on MuJoCo/MJWarp.

Follow-up implementation:

- The trainer now re-scores top elites with strict validation before choosing the checkpoint to carry into the next stage.
- Stage handoff blends the validation checkpoint with the elite distribution mean instead of collapsing entirely to one best sampled policy.

Validation-aware smoke check:

- Modal run: https://modal.com/apps/max-petrusenko/main/ap-4T5pnsmvppr1xo51G9rdsM
- Artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-validation-aware-check.json`
- Link 1 swing validation: score 38.98, held 0.0759, whip 0.2740.
- Link 2 hold validation: score 0.0, held 0.0181, whip 0.2454.
- Link 2 swing validation: score 0.60, held 0.00812, whip 0.2165.
- Final lower-link validation: link 2, score 0.22, held 0.00716, whip 0.2177.

## Validation-Aware Link-2 Search

Command:

```bash
doppler run --project api_keys --config dev -- modal run --write-result /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-link2-search.json scripts/modal-train-six-pendulum-curriculum.py --smoke --max-stage-links 2 --generation-scale 8
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-hE1pTu9hRqgQ305ISctIhM

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-link2-search.json`

Result:

- Elapsed: 453.119 seconds.
- Link 1 hold validation: score 34.14, held 0.1156, whip 0.3194.
- Link 1 swing validation: score 39.84, held 0.1162, whip 0.3067.
- Link 2 hold validation: score 0.13, held 0.0168, whip 0.2265.
- Link 2 swing validation: score 0.24, held 0.00424, whip 0.1819.
- Final lower-link validation: link 2, score 0.82, held 0.00476, whip 0.1840.
- Best transient link-2 hold checkpoint: generation 8, strict score 67.32, held 0.0192.
- Best transient link-2 swing checkpoint by held fraction: generation 56, held 0.0577, strict score 0.0.

Interpretation:

Validation-aware CEM can find brief two-link upright moments, but it still cannot make a stable two-link controller. More spend on the current time-knot feedback policy is likely a poor use of Modal credits unless the policy class changes.

## Next Run

Next target is four links, not six. Run order:

1. Start from the solved three-link chain policy and push four-link exact-down hold from `0.550s` past `1.000s`.
2. Keep curriculum stages and whiplash/recovery terms; do not count subsecond upright flashes.
3. Replace random near-top/catch-flash resets with replay from actual best-policy trajectories: pre-catch windows, first strict-entry windows, and post-catch fall windows.
4. Unlock five links only after four-link down-start validation holds for at least one second on held-out seeds.

MuJoCo path remains ready for the recurrent PPO branch:

```bash
npm run six-pendulum:mjcf
```

### Two-Link Trainer Scaffold

New vectorized chain trainer:

```bash
npm run train:six-pendulum:pezzza:chain2-smoke
```

Implementation:

- Script: `scripts/modal-train-six-pendulum-pezzza-chain.py`
- Policy: `pezzzaChainKnotMlp`, 32 time knots plus MLP feedback.
- Curriculum: one-link schema pretrain, two-link hold, two-link low gravity, two-link normal gravity.
- Gate: strict score stays zero unless mean max hold is at least one second.
- Promotion rule: do not unlock link three until two-link down-start validation has nonzero strict score, solved rate, and P10 hold.

First Modal attempt:

- Run: https://modal.com/apps/max-petrusenko/main/ap-SEf7QFGky6p9E2hSzPjZJB
- Result: blocked before function execution with `ResourceExhaustedError: Function call failed: workspace billing cycle spend limit reached`.
- Modal billing report command works: `modal billing report --for "this month" --json`.

Local MPS mini-run:

```bash
npm run train:six-pendulum:pezzza:chain2-local-mini
```

- Cold artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-2link-local-mini.json`
- Warm-start artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-2link-local-warm-mini.json`
- Branch-cut fix artifact: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-2link-local-angle-mini.json`
- Device: Apple MPS through local Torch.
- Cold elapsed: `83.892s`.
- Warm-start elapsed: `82.444s`.
- Branch-cut fix elapsed: `172.697s`.
- Warm start maps the proven one-link checkpoint into the two-link policy: interpolated time knots, first-link observation weights, softened second-link and relative-angle weights, and lower initial sigma.
- Stage selection is local to each curriculum stage so a high one-link pretrain score cannot block the two-link checkpoint from being carried forward.
- Two-link relative angles are now wrapped with `atan2(sin(delta), cos(delta))` for policy features, coupling, bend reward, and strict bend checks. Before this fix, a tiny bend near the `pi` branch cut could look like a false `~6.2 rad` bend.
- The trainer now re-validates elite candidates and carries the validation-best checkpoint between stages instead of raw shaped-selection best.
- Cold intermediate two-link hold signal: `0.512s` mean max hold, `0.135` solved-one-second rate from near-upright.
- Warm intermediate two-link hold signal after stage-local selection: `0.555s` mean max hold, `0.156` solved-one-second rate from near-upright.
- Warm best normal-gravity down-start flash: `0.0104s`.
- Warm final two-link down-start validation: strict score `0`, mean max hold `0.00241s`, solved-one-second rate `0`.
- Branch-cut fix final two-link down-start validation: strict score `0`, mean max hold `0.0768s`, solved-one-second rate `0`, whiplash `0.547s`.
- Branch-cut fix diagnostics: best two-link hold-start `0.643s`, best angle-curriculum hold `0.129s`.
- Bridge/catch reward local result on 2026-06-10: `pezzza-chain-2link-local-bridge-g8.json` raised final two-link down-start hold from the phase mini `0.0126s` to `0.0366s`, catch from `0.0602s` to `0.1345s`, and top-time from `0.3566s` to `0.7839s`. The best down-start candidate reached `0.0708s` hold and `0.209s` catch, still strict score `0`. This is useful direction on whiplash/catch shaping, but still not a solved two-link policy.
- Modal run status for the bigger bridge run: blocked by `App creation failed: workspace billing cycle spend limit reached`.
- Comparison report now separates final down-start hold from best intermediate stage hold so subsecond stage progress cannot be mistaken for a solved run.
- Browser runtime now has a matching `pezzzaChainKnotMlp` path and loads the solved three-link checkpoint. Four-link remains a progress checkpoint at `0.550s` from exact down and is not counted.
- Interpretation: chain training has crossed the three-link down-start gate. The current boundary is four-link catch-to-hold survival, then five and six only after the previous link count passes the one-second learned-policy gate.

Planned implementation:

1. Generate a one-through-six-link MJCF chain with gravity 9.8 and zero hinge friction.
2. Continue from the solved three-link checkpoint into four links.
3. Train a policy with enough memory for whip timing and catch survival.
4. Add randomized episode length only after four-link whip appears.
5. Require strict held-time validation before unlocking link 5.
6. Keep the browser page as public proof and run ledger, not the source simulator.

MJCF scaffold:

- Command: `npm run six-pendulum:mjcf`
- Generated files: `app/ailab/six-pendulum-cartpole/mjcf/cartpole_1_link.xml` through `cartpole_6_link.xml`.
- Verified: each file parses as XML, has gravity `0 0 -9.8`, one cart motor, and the expected number of hinge joints.

## MuJoCo Recurrent PPO Smoke

Command:

```bash
npm run train:six-pendulum:mujoco-ppo:smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-jquk3AxQFGVyT8ko7vw3cl

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/mujoco-ppo-1link-smoke.json`

Result:

- Algorithm: `modal-mujoco-recurrent-ppo`.
- Simulator: MuJoCo 3.3.7.
- GPU: NVIDIA L4.
- Elapsed: 14.487 seconds after image build.
- One-link hold validation: score 0.0, held 0.0979, held P10 0.0604, return 108.20.
- One-link mixed validation: score 0.0, held 0.0646, held P10 0.0, return 71.79.

Interpretation:

The MuJoCo/PPO path is now wired and produces measurable hold signal, but the first recurrent PPO smoke does not keep the one-link pendulum upright through the final strict score gate. The next run should overfit one-link hold before enabling mixed starts or link two.

## One-Link Down-Start Gate

The acceptance rule changed after reviewing the failure mode: less than one consecutive second does not count, and no run starting near the top counts as solved. Validation must start from the hanging position and use only model-produced cart force.

UI changes:

- Default active count is one pendulum.
- Links four through six are locked until the previous learned exact-down gate passes.
- Manual force, seed, kick, and top-start controls were removed.
- Canvas hold time resets to zero whenever strict score drops below 82.

### PPO Down-Start Smoke

Command:

```bash
npm run train:six-pendulum:mujoco-ppo:down-smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-LdwqF2yPAWGy2SYZhg6IkV

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/mujoco-ppo-1link-down-smoke.json`

Result:

- Down-start final validation: score 0.0, held 0.00208, max held 0.0125 seconds, solved-one-second rate 0.0.
- Hold-start validation briefly reached max held 0.4766 seconds, but top-start does not count.

### SAC Down-Start Smoke

Command:

```bash
npm run train:six-pendulum:mujoco-sac:down-smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-jxIbOLSuJCDeMi0ppiX3ZA

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/mujoco-sac-1link-down-smoke.json`

Result:

- Final validation: score 0.0, held 0.000521, max held 0.00469 seconds, solved-one-second rate 0.0.
- Best transient checkpoint: 30k steps, max held 0.0125 seconds, solved-one-second rate 0.0.

### SAC Down-Start Full Run

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-ranbDs7A1VQGWFETRRyMJq

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/mujoco-sac-1link-down-full.json`

Result:

- Final validation: score 0.0, held 0.00100, max held 0.0141 seconds, solved-one-second rate 0.0.
- Best transient checkpoint: 245k steps, max held 0.0229 seconds, solved-one-second rate 0.0.

### SAC Stabilize-Then-Down Smoke

Command:

```bash
npm run train:six-pendulum:mujoco-sac:stabilize-smoke
```

Modal run:
https://modal.com/apps/max-petrusenko/main/ap-7mrtxn3pqLxwGfqNOzbP1X

Artifact:
`/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/mujoco-sac-1link-stabilize-smoke.json`

Result:

- Final validation: score 0.0, held 0.00122, max held 0.0109 seconds, solved-one-second rate 0.0.
- Best transient checkpoint: hold phase at 30k steps, max held 0.0229 seconds, solved-one-second rate 0.0.

Interpretation:

The one-link Pezzza/browser policy is solved, but this MuJoCo SAC/TD3 lane did not solve one-link down-start. Plain down-start SAC learns some energy/height signal, but not the stabilizer. Stabilizer pretraining helps reach the same best transient much faster, but it still does not transfer into a one-second down-start hold. The next training change should use a real recurrent/off-policy sequence policy or explicit phase-conditioned curriculum while keeping the down-start one-second validation gate unchanged.

### External Research Checkpoint: Exact-Down Failure

Date: 2026-06-12.

Sources used:

- DeepSeek API diagnosis.
- Gemini/Oracle diagnosis saved at `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/research/gemini-six-pendulum-env-diagnosis-20260612.md`.
- Web subagent findings: Kache/Yacine thread, DeepMind `dm_control` cartpole swing-up reward, Genesis/RSL-RL cartpole swing-up, TQC/virtual experience replay for multi-link inverted pendulum, MIT Underactuated/direct collocation.

Consensus:

- Hold-start working means the stabilizer is not the main blocker.
- Exact-down is a symmetry and credit-assignment trap: stochastic exploration can push left or right, but deterministic mean actions collapse unless the reward/curriculum gives a coherent swing direction.
- Force alone is not enough. The policy needs a two-phase whip: move one side slowly to load energy, then reverse and catch.
- Sequence SIL/snapshot replay over rare near-catches is downstream of the real issue. It can overfit fragments if the source policy does not reliably generate the swing-up phase.

Code changes from this checkpoint:

- Added `rewardMode: "dense-swingup"` to the MJWarp reward kernel. It is opt-in and does not change strict scoring.
- Dense mode adds height/energy/speed shaping, a small directional symmetry-break term, and softer rail penalty during whip.
- Modal and local trainer now pass/report `rewardMode`.
- Source-episode collector now defaults force scale from checkpoint metadata unless overridden.
- Future all-zero stochastic evals retain pass diagnostics instead of hiding behind the empty default best record.

Modal probe:

```bash
doppler run --project api_keys --config dev -- uv run --python 3.11 --with modal --with numpy==2.2.6 python scripts/modal-train-six-pendulum-pufferppo-mjwarp.py --modal-device-ppo-dot --dot-config /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/configs/modal-link1-denseswing-force300-probe-20260612.json --write-result /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-denseswing-force300-probe-20260612.json --write-checkpoint /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/puffer-mjwarp-modal-link1-denseswing-force300-probe-20260612.pt
```

Modal app:

`https://modal.com/apps/max-petrusenko/main/ap-iRHOvlvsEC2h8EYSJ9BEmC`

Result:

- App stopped with 0 running tasks after completion.
- Exact-down deterministic after update 2: maxHeldSeconds 0.0, nearTopWorldRate 0.0.
- Exact-down stochastic after update 2: maxHeldSeconds 0.0, nearTopWorldRate 0.0, pump fraction 0.0876, rail fraction 0.0506.
- Hold-start stochastic after update 2: maxHeldSeconds 1.3475, solvedPassRate 1.0.
- Throughput on this Modal L4 lane was about 20k to 23k SPS for eval/rollout, far below Kache's reported 18M SPS.

Interpretation:

The dense reward and force 300 changed the behavior from inert to pumping, but exact-down still stays in the bottom basin and drives into rail/terminal states before the link reaches above-horizontal. The next useful experiment should not be a larger blind PPO run. It should add an explicit coherent whip curriculum/reward: first reward controlled cart displacement/velocity to one side while low, then reward reversal/tip angular velocity and catch. Keep final eval exact-down learned policy only.

## June 12 Renderer-Gated Pezzza Chain Update

This update closes a false-positive path in the Pezzza-style chain trainer.

New source-of-truth rule:

- Trainer validation remains useful for search ranking.
- Renderer proof from `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/render_pezzza_chain_policy.py` is the promotion gate.
- A link is not solved unless the exported policy renders exact down-start with strict continuous hold `>=1.0s`.

Runner change:

- `scripts/run-local-pezzza-chain.py` now supports opt-in `--renderer-gate`.
- After the checkpoint is written, the gate runs the scalar renderer against that artifact.
- If renderer hold is below `--renderer-min-hold-seconds` (default `1.0`), the runner exits with `renderer_gate_failed` and prints the renderer JSON/video paths.

Validation:

```bash
python3 -m py_compile scripts/run-local-pezzza-chain.py
```

Known pass fixture:

- Checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-1link-p05-stabilize-disturbance-p256-g6-hz60-20260612.json`
- Trainer hold: `1.916665554s`
- Renderer hold: `1.916666667s`
- Result video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/runner-gate-test-1link-p05-pass.mp4`

Known fail fixture:

- Checkpoint: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/pezzza-chain-2link-p03-validator-p128-g3-hz60-20260612.json`
- Trainer hold: `1.149999619s`
- Renderer hold: `0.783333333s`
- Gate output: `renderer_gate_failed`
- Result video: `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/progress/runner-gate-test-2link-p03-fail.mp4`

Current Pezzza-chain ladder after renderer gate:

- Link 1: solved nominal. Best renderer proof is p05 at `1.916s`; next work is staged stabilization, not promotion evidence.
- Link 2: not solved. p03 trainer metadata crossed one second, but renderer did not.
- Link 3: solved nominal from c09, about `1.067s` to `1.100s`; preserve legacy time-row feedback before any robustness fine-tune.
- Link 4: not solved; best renderer frontier remains `0.683s`.
- Link 5: not solved; old `0.467s` frontier remains better than the direct 3-link transfer tests.
- Link 6: not solved; c10/c12 have catch/near-strict signal but only `0.183s` strict hold.

Operational note:

- Do not use trainer-only metrics to tag `@yacineMTB`, update the public route as solved, or promote to the next link.
- Do not spend Modal credits on direct 3-link to 5-link transfer until 4-link beats the c29 `0.683s` renderer frontier.
- Randomized horizons stay gated until the run already shows reliable whip/catch behavior, matching Kache's note that randomized episode length helped after whipping was learned.
