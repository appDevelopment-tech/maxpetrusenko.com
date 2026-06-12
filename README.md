# Six Pendulum Cartpole Progress

This branch saves the June 12 six-pendulum reconstruction work.

Counted gate: exact down-start learned policy, no manual force, at least 1.000 seconds of continuous strict upright hold in renderer replay. Trainer-only numbers do not count when renderer replay disagrees.

## Current Status

| Links | Renderer hold | Status | Image |
| --- | ---: | --- | --- |
| 1 | 1.917s | solved nominal | ![Link 1](nextjs/public/ailab/six-pendulum/link-status/link-1-solved-nominal-20260612.jpg) |
| 2 | 0.783s | not solved | ![Link 2](nextjs/public/ailab/six-pendulum/link-status/link-2-renderer-fail-20260612.jpg) |
| 3 | 1.067s | solved nominal | ![Link 3](nextjs/public/ailab/six-pendulum/link-status/link-3-solved-nominal-20260612.jpg) |
| 4 | 0.683s | not solved | ![Link 4](nextjs/public/ailab/six-pendulum/link-status/link-4-active-boundary-20260612.jpg) |
| 5 | 0.467s old / 0.317s new lineage | not solved | ![Link 5](nextjs/public/ailab/six-pendulum/link-status/link-5-not-solved-20260612.jpg) |
| 6 | 0.183s | not solved | ![Link 6](nextjs/public/ailab/six-pendulum/link-status/link-6-not-solved-20260612.jpg) |

## Notes

- [Progress notes](nextjs/notes/six-pendulum-2026-06-12.md)
- [Per-link image ledger](nextjs/notes/six-pendulum-link-status-2026-06-12.md)
- [Notes index](nextjs/notes/README.md)

## Repro Files

- Renderer gate: `nextjs/scripts/render_pezzza_chain_policy.py`
- Local runner: `nextjs/scripts/run-local-pezzza-chain.py`
- Pezzza trainer: `nextjs/scripts/modal-train-six-pendulum-pezzza-chain.py`
- Browser policy: `nextjs/app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json`
- Lab route: `nextjs/app/ailab/six-pendulum-cartpole/`
