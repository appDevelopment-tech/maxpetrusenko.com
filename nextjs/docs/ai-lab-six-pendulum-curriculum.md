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

## Next Run

Run a link-2-focused lower-link curriculum before spending on all six:

```bash
doppler run --project api_keys --config dev -- modal run --write-result /Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints/curriculum-link2-search.json scripts/modal-train-six-pendulum-curriculum.py --smoke --max-stage-links 2 --generation-scale 8
```

After link 2 strict held time improves materially, run the full curriculum:

```bash
npm run train:six-pendulum:curriculum
```
