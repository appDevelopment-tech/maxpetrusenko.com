# Six Pendulum Progress Notes

Date: 2026-06-12

## Gate

Count a link only when the exported learned policy starts from exact down, uses no manual force, and reaches at least 1.000 seconds of continuous strict upright hold in the scalar renderer.

Subsecond flashes do not count. Trainer-only validation does not count if renderer replay disagrees.

## Current Link State

| Links | Best renderer hold | Counted status | Notes |
| --- | ---: | --- | --- |
| 1 | 1.917s | solved nominal | Next task is stabilization after disturbance. |
| 2 | 0.783s | not solved | Trainer reported 1.150s, but renderer gate failed. |
| 3 | 1.067s | solved nominal | Robustness gate failed 0/42 cases. |
| 4 | 0.683s | not solved | Active failure boundary. |
| 5 | 0.467s old / 0.317s new lineage | not solved | Do not promote until 4-link passes. |
| 6 | 0.183s | not solved | Needs nominal solve before robustness. |

## Saved Artifacts

- Lab page: `/ailab/six-pendulum-cartpole`
- Renderer: `scripts/render_pezzza_chain_policy.py`
- Local runner with renderer gate: `scripts/run-local-pezzza-chain.py`
- Trainer: `scripts/modal-train-six-pendulum-pezzza-chain.py`
- Current browser policy: `app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json`
- Four-link progress video: `public/ailab/six-pendulum/four-link-c23-reversehold-force56-center028-progress-0550s-20260612.mp4`
- Four-link contact sheet: `public/ailab/six-pendulum/four-link-c23-reversehold-force56-center028-progress-0550s-20260612-contact-sheet.jpg`

## Verification Commands

```bash
python3 -m py_compile scripts/run-local-pezzza-chain.py scripts/render_pezzza_chain_policy.py
python3 scripts/render_pezzza_chain_policy.py \
  --policy app/ailab/six-pendulum-cartpole/sixPendulumPolicy.json \
  --expected-links 3 \
  --basename three-link-current-browser-policy
```

## Runtime State

- Modal six-pendulum apps checked: stopped, 0 tasks.
- RunPod checked with `runpodctl pod list`: no pods.
- Local process scan found no pendulum, MJWarp, Pezzza, Puffer, Modal, or RunPod training process.
