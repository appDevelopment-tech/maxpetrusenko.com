"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const frames = [
  {
    title: "Parse",
    caption: "80 articles become signal instead of a pile.",
    count: "01 / 04",
    persona:
      "Fragments are still separating into usable signal. The identity is forming.",
    cluster: [
      [12, 17],
      [35, 29],
      [62, 21],
      [83, 43],
      [22, 71],
      [57, 73],
      [74, 62],
    ],
  },
  {
    title: "Segment",
    caption: "Voices pull into semantic constellations.",
    count: "02 / 04",
    persona:
      "AI systems, engineering, books, wellness, and culture separate into usable lanes.",
    cluster: [
      [20, 24],
      [28, 32],
      [36, 22],
      [70, 24],
      [78, 34],
      [30, 70],
      [68, 72],
    ],
  },
  {
    title: "Synthesize",
    caption: "Clusters compress into three ways Max thinks.",
    count: "03 / 04",
    persona:
      "Hidden state is the recurring object: agents, systems, attention, nervous systems.",
    cluster: [
      [28, 34],
      [36, 39],
      [44, 32],
      [63, 38],
      [69, 46],
      [48, 62],
      [55, 58],
    ],
  },
  {
    title: "Reveal",
    caption: "The site names the operating system, not just the services.",
    count: "04 / 04",
    persona:
      "Meta-technologist: builder, interpreter, and operator for autonomous systems.",
    cluster: [
      [50, 36],
      [50, 36],
      [50, 36],
      [50, 36],
      [50, 36],
      [50, 36],
      [50, 36],
    ],
  },
] as const;

const chapters = [
  {
    id: "meta-parse",
    kicker: "01 · Parse",
    title: "Start with the mess.",
    body:
      "Articles, repos, notes, follow graphs, product ideas, somatic practice, AI architecture. The first act is not branding. It is instrumentation.",
    tags: ["80 articles", "7 voices", "raw fragments"],
  },
  {
    id: "meta-segment",
    kicker: "02 · Segment",
    title: "The fragments find gravity.",
    body:
      "AI systems architecture clusters with engineering and books. Culture and wellness form a nervous-system lane. Science stays as the cosmology undertone.",
    tags: ["max-ai", "max-engineering", "max-books", "max-wellness"],
  },
  {
    id: "meta-synthesize",
    kicker: "03 · Synthesize",
    title: "The pattern is hidden state.",
    body:
      "The through-line is not tech plus spirituality. It is the study of invisible systems: execution state in agents, nervous-system state in people, epistemic state in culture.",
    tags: ["systems", "agents", "attention", "state"],
  },
  {
    id: "meta-reveal",
    kicker: "04 · Reveal",
    title: "Max the Meta-Technologist.",
    body:
      "A builder and interpreter for the age of autonomous systems: explaining what is breaking, designing what can scale, and making complexity human enough to act on.",
    tags: ["AI workflow automation", "Claude Code / n8n", "agent personas", "Mindfold"],
  },
] as const;

export function MaxMetaTechnologistScrolly() {
  const rootRef = useRef<HTMLElement | null>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const frame = frames[active];
  const nodePositions = useMemo(() => frame.cluster, [frame]);

  useEffect(() => {
    const update = () => {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const localProgress = Math.min(1, Math.max(0, -rect.top / scrollable));
      setProgress(localProgress);
      root.style.setProperty("--mp-progress", localProgress.toFixed(4));

      let nextActive = 0;
      let nearest = Number.POSITIVE_INFINITY;
      chapterRefs.current.forEach((chapter, index) => {
        if (!chapter) return;
        const box = chapter.getBoundingClientRect();
        const distance = Math.abs(box.top - window.innerHeight * 0.33);
        if (distance < nearest) {
          nearest = distance;
          nextActive = index;
        }
      });
      setActive(nextActive);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section ref={rootRef} className="mp-scrolly" aria-labelledby="meta-tech-title">
      <div className="mp-scrolly__noise" aria-hidden="true" />

      <section className="mp-scrolly__hero" id="meta-top">
        <div className="mp-scrolly__heroGrid">
          <div>
            <div className="mp-scrolly__eyebrow">Option 1 · Max the Meta-Technologist</div>
            <h1 id="meta-tech-title">Systems reveal the person.</h1>
            <p>
              I decode how intelligence breaks, scales, and reassembles, then build tools and spaces that make hidden state visible.
            </p>
            <div className="mp-scrolly__ctaRow">
              <a className="mp-scrolly__button mp-scrolly__buttonPrimary" href="#meta-parse">
                Watch the identity form
              </a>
              <a className="mp-scrolly__button" href="#meta-connect">
                Bring me your stack
              </a>
            </div>
          </div>

          <aside className="mp-scrolly__heroCard" aria-label="Identity synthesis card">
            <div className="mp-scrolly__statline">
              <div className="mp-scrolly__stat"><strong>80</strong><span>articles parsed</span></div>
              <div className="mp-scrolly__stat"><strong>7</strong><span>content voices</span></div>
              <div className="mp-scrolly__stat"><strong>3</strong><span>persona clusters</span></div>
            </div>
            <div className="mp-scrolly__portraitOrbit" aria-hidden="true">
              <i className="mp-scrolly__orbitalLine" />
              <i className="mp-scrolly__orbitalLine" />
              <i className="mp-scrolly__orbitalLine" />
              <div className="mp-scrolly__portrait" />
            </div>
            <div className="mp-scrolly__ticker" aria-hidden="true">
              <span>
                fractal primitives · execution state · AI autonomy · zero-click · tribal knowledge · answer engine optimization · somatics as state architecture · fractal primitives · execution state · AI autonomy · zero-click · tribal knowledge · answer engine optimization ·
              </span>
            </div>
          </aside>
        </div>
      </section>

      <section className="mp-scrolly__story" aria-label="Scroll driven identity story">
        <div className="mp-scrolly__chapters">
          {chapters.map((chapter, index) => (
            <article
              className="mp-scrolly__chapter"
              id={chapter.id}
              key={chapter.id}
              ref={(element) => {
                chapterRefs.current[index] = element;
              }}
            >
              <div className="mp-scrolly__kicker">{chapter.kicker}</div>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
              <ul>
                {chapter.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <aside className="mp-scrolly__stageWrap" aria-label="Scroll-scrubbed film stage">
          <div className="mp-scrolly__stage" data-video-ready="true">
            <div className="mp-scrolly__frameLabel">
              <span>{frame.title}</span>
              <span className="mp-scrolly__scrubber" aria-hidden="true">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            </div>
            <div className="mp-scrolly__film" data-video-slot="future-google-flow-clips">
              <div className="mp-scrolly__graph" aria-hidden="true">
                <svg viewBox="0 0 600 700" preserveAspectRatio="none">
                  <path className="mp-scrolly__edge" d="M60 110 C180 40 220 230 350 180 S520 170 540 70" />
                  <path className="mp-scrolly__edge" d="M90 520 C170 420 290 650 410 520 S500 330 530 410" />
                  <path className="mp-scrolly__edge" d="M120 230 C240 260 260 390 380 340 S490 250 540 300" />
                  <path className="mp-scrolly__edge" d="M70 360 C220 320 290 80 450 130" />
                </svg>
                {nodePositions.map(([x, y], index) => (
                  <i
                    className="mp-scrolly__node"
                    key={`${active}-${index}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  />
                ))}
              </div>
              <div className="mp-scrolly__fragment mp-scrolly__fragment1">AI & Systems Architecture · 48 records</div>
              <div className="mp-scrolly__fragment mp-scrolly__fragment2">Software Engineering Deep Dives · 7 records</div>
              <div className="mp-scrolly__fragment mp-scrolly__fragment3">Culture, wellness, nervous-system modulation</div>
              <div className="mp-scrolly__fragment mp-scrolly__fragment4">How execution state became the bottleneck</div>
            </div>
            <div className="mp-scrolly__personaCard">
              <h3>Max the Meta-Technologist</h3>
              <p>{frame.persona}</p>
            </div>
            <div className="mp-scrolly__caption">
              <span>{frame.caption}</span>
              <span>{frame.count}</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="mp-scrolly__proof" id="meta-proof">
        <div className="mp-scrolly__eyebrow">Proof hooks from the current site</div>
        <h2>Not a manifesto without delivery.</h2>
        <div className="mp-scrolly__proofGrid">
          <div className="mp-scrolly__proofCard">
            <b>AI automation</b>
            <span>Send the stack, expose bottlenecks, build pipelines that save real hours.</span>
          </div>
          <div className="mp-scrolly__proofCard">
            <b>Agent systems</b>
            <span>Claude Code, n8n, Make, agent personas, SMM agents, and workflow architecture as artifacts.</span>
          </div>
          <div className="mp-scrolly__proofCard">
            <b>Embodied depth</b>
            <span>Somatics becomes state literacy, not a second unrelated business card.</span>
          </div>
        </div>
      </section>

      <section className="mp-scrolly__connect" id="meta-connect">
        <div>
          <div className="mp-scrolly__eyebrow">Final CTA</div>
          <h2>Bring the stack. Find the hidden state.</h2>
          <p>
            For founders, builders, and high-context operators who need the system to show where it is actually stuck.
          </p>
          <div className="mp-scrolly__ctaRow mp-scrolly__ctaCenter">
            <a className="mp-scrolly__button mp-scrolly__buttonPrimary" href="mailto:max.petrusenko@gmail.com">
              Email Max
            </a>
            <Link className="mp-scrolly__button" href="/tech">
              Explore tech work
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
