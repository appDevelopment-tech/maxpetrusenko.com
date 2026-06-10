---
read_when:
  - Working on the six pendulum cartpole AI Lab route
  - Changing six pendulum training scripts
  - Running Modal GPU training for cartpole policies
---

# Six Pendulum Curriculum Plan

## Current Status

Live route: https://www.maxpetrusenko.com/ailab/six-pendulum-cartpole

One-link down-start is now solved in the local browser runtime using the Modal-trained Pezzza-style policy. Six links are not solved. Strict score is zero until the active chain is near upright, nearly straight, and held for at least one consecutive second.

## Source Evidence

- X thread: https://x.com/yacineMTB/status/2064148140899348779
- Bird thread read confirmed the core claims: PufferPPO, Puffer MinGRU, MuJoCo Warp, APIC/CUDA graph capture, 18M SPS on some configs, 3.6k experiments, GP-picked top hyperparameters, and randomized episode length after whipping appeared.
- Hero solve video downloaded to `outputs/yacine-thread-media/2064145781477580800-*.mp4`.
- Hyperparameter scatter video downloaded from `2064150381408485769`.
- Reward/policy video downloaded from `2064152523095560528`.
- Phase-space / simulator-speed video downloaded from `2064155513244246028`.
- Main clues: PufferPPO, Puffer MinGRU, MuJoCo Warp, APIC/CUDA graph capture, 3.6k experiments, top hyperparameters selected from high-compute runs, randomized episode length after whip behavior appeared.
- Pezzza video downloaded with `yt-dlp` to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/youtube/pezzza-double-pendulum.mp4`.
- Pezzza transcript downloaded to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/youtube/pezzza-double-pendulum.en.vtt`; frames sampled under `outputs/youtube/frames/`.
- XPBD paper downloaded to `/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/papers/XPBD.pdf`.
- `johnBuffer/Pendulum-NEAT` cloned under `/Users/maxpetrusenko/Desktop/Projects/oss/Pendulum-NEAT`.

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

Hold-first training is the right direction for one link: it materially improves strict one-link hold and swing validation. The same time-knot feedback policy still does not carry to link 2. Do not deploy this as the public policy checkpoint. Next work should either make elite selection validation-aware, preserve distribution mean instead of only the best elite, or move the lower-link curriculum into PPO/recurrent policy training.

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

Next target is two links, not six. Run order:

1. Extend the Pezzza vectorized trainer from one link to two links, keeping the same strict one-second gate.
2. Keep curriculum stages and whiplash/recovery terms; add randomized horizon only after two-link whip appears.
3. Add a recurrent Puffer-style PPO/MinGRU run only after the two-link environment and strict validator are fast enough to sweep.
4. Unlock link three only after two-link browser or MuJoCo validation holds for at least one second on held-out seeds.

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
- Comparison report now separates final down-start hold from best intermediate stage hold so subsecond stage progress cannot be mistaken for a solved run.
- Browser runtime now has a matching `pezzzaChainKnotMlp` path for future chain checkpoints: exact trainer feature order, wrapped relative angles, and chain physics matching the trainer. The public policy remains the solved one-link checkpoint until two-link passes strict down-start validation.
- Interpretation: local smoke proves the new two-link trainer runs without Modal. The one-link warm start plus wrapped-angle math improves actual down-start transfer from tiny flashes to measurable whiplash and `0.0768s` holds, but it still does not solve two-link down-start.

Planned implementation:

1. Generate a one-through-six-link MJCF chain with gravity 9.8 and zero hinge friction.
2. Start with one and two links only.
3. Train PPO with a small recurrent policy so the controller has memory for whip timing.
4. Add randomized episode length only after link-two whip appears.
5. Require strict held-time validation before unlocking link 3.
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
- Links two through six are locked until one-link down-start validation passes.
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

The one-link task is still not solved. Plain down-start SAC learns some energy/height signal, but not the stabilizer. Stabilizer pretraining helps reach the same best transient much faster, but it still does not transfer into a one-second down-start hold. The next training change should use a real recurrent/off-policy sequence policy or explicit phase-conditioned curriculum while keeping the down-start one-second validation gate unchanged.
