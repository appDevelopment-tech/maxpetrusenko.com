#!/usr/bin/env python3
import json
import time
from pathlib import Path

import modal


app = modal.App("six-pendulum-puffer-mjwarp-smoke")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "mujoco-warp==3.9.0.1",
    "numpy==2.2.6",
    "pufferlib",
    "torch==2.7.1",
)


@app.function(image=image, gpu="L4", timeout=1800)
def smoke_puffer_mjwarp(mjcf_xml: str, links: int = 1, nworld: int = 1024, steps: int = 256) -> str:
    import mujoco
    import mujoco_warp as mjw
    import pufferlib
    import warp as wp

    started = time.time()
    safe_links = max(1, min(6, int(links)))
    safe_nworld = max(1, int(nworld))
    safe_steps = max(1, int(steps))

    mjm = mujoco.MjModel.from_xml_string(mjcf_xml)
    m = mjw.put_model(mjm)
    d = mjw.make_data(mjm, nworld=safe_nworld)

    wp.synchronize()
    direct_started = time.time()
    for _ in range(min(8, safe_steps)):
        mjw.step(m, d)
    wp.synchronize()
    direct_steps = min(8, safe_steps)
    direct_elapsed = time.time() - direct_started

    graph_steps = max(0, safe_steps - direct_steps)
    graph_elapsed = 0.0
    graph_captured = False
    if graph_steps:
        with wp.ScopedCapture() as capture:
            mjw.step(m, d)
        graph_captured = True
        graph_started = time.time()
        for _ in range(graph_steps):
            wp.capture_launch(capture.graph)
        wp.synchronize()
        graph_elapsed = time.time() - graph_started

    elapsed = time.time() - started
    total_steps = safe_nworld * safe_steps
    sps = total_steps / elapsed if elapsed > 0 else 0.0

    output = {
        "schema": "six-pendulum-puffer-mjwarp-smoke-v1",
        "status": "substrate-smoke-passed",
        "links": safe_links,
        "nworld": safe_nworld,
        "steps": safe_steps,
        "simulatedSteps": total_steps,
        "elapsedSeconds": elapsed,
        "stepsPerSecond": sps,
        "directElapsedSeconds": direct_elapsed,
        "graphElapsedSeconds": graph_elapsed,
        "graphCaptured": graph_captured,
        "versions": {
            "mujoco": getattr(mujoco, "__version__", "unknown"),
            "mujocoWarp": getattr(mjw, "__version__", "unknown"),
            "pufferlib": getattr(pufferlib, "__version__", "unknown"),
            "warp": getattr(wp, "__version__", "unknown"),
        },
        "nextRequiredWork": [
            "Port observations, rewards, resets, and controls into a true batched MJWarp environment.",
            "Attach PufferPPO with a recurrent MinGRU/PufferNet policy.",
            "Run 1-link down-start sweeps first; unlock 2 links only after held-out validation holds for at least 1 second.",
            "Enable randomized episode horizons only after whip behavior appears.",
        ],
        "sourceConstraints": [
            "Yacine thread: PufferPPO/PufferLib, puffer MinGRU, about 1m parameter policy.",
            "Yacine thread: MuJoCo Warp plus CUDA graph capture for wallclock speed.",
            "Yacine thread: gravity 9.8, no hinge friction, cart tracks 0.",
            "Yacine thread: about 3.6k experiments; report wallclock versus strict score.",
        ],
    }
    return json.dumps(output, indent=2)


@app.local_entrypoint()
def main(links: int = 1, nworld: int = 1024, steps: int = 256):
    path = Path(f"app/ailab/six-pendulum-cartpole/mjcf/cartpole_{links}_link.xml")
    if not path.exists():
        raise FileNotFoundError(f"Missing MJCF file: {path}")
    return smoke_puffer_mjwarp.remote(path.read_text(), links, nworld, steps)
