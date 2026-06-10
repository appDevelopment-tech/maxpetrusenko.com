---
read_when:
  - Working on the six pendulum cartpole AI Lab route
  - Changing six pendulum training scripts
  - Running Modal GPU training for cartpole policies
---

# Six Pendulum Curriculum Plan

## Current Status

Live route: https://www.maxpetrusenko.com/ailab/six-pendulum-cartpole

The deployed browser policy is a progress checkpoint, not a solve. Strict score is now zero unless all active links are near upright and the active chain is nearly straight.

## Source Evidence

- X thread: https://x.com/yacineMTB/status/2064148140899348779
- Hero solve video downloaded to `outputs/yacine-thread-media/2064145781477580800-*.mp4`.
- Hyperparameter scatter video downloaded from `2064150381408485769`.
- Reward/policy video downloaded from `2064152523095560528`.
- Phase-space / simulator-speed video downloaded from `2064155513244246028`.
- Main clues: PufferPPO, Puffer MinGRU, MuJoCo Warp, APIC/CUDA graph capture, 3.6k experiments, top hyperparameters selected from high-compute runs, randomized episode length after whip behavior appeared.

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

Move the lower-link curriculum to recurrent PPO before spending on all six:

```bash
npm run six-pendulum:mjcf
```

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
