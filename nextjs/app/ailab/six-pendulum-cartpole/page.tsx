import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/seo/structured-data";
import { SixPendulumCartpoleLab } from "./SixPendulumCartpoleLab";

export const runtime = "edge";

const PAGE_TITLE = "Six Link Cartpole AI Lab";
const PAGE_DESCRIPTION =
  "Interactive six link cartpole lab with a Modal-trained browser policy checkpoint, Yacine timeline notes, control research, and a reconstruction plan.";
const PAGE_URL = "/ailab/six-pendulum-cartpole";
const DATE_PUBLISHED = "2026-06-09T00:00:00.000Z";
const DATE_MODIFIED = "2026-06-10T00:00:00.000Z";

const xFacts = [
  "Yacine posted the six pendulum cartpole solve at 00:50 UTC on June 9, 2026.",
  "He said the run used PufferPPO, MuJoCo Warp, several RTX 4090s, and a Puffer minGRU policy near one million parameters.",
  "The working trick was not just model size. It was environment speed, reward shaping, thousands of hyperparameter experiments, and randomized episode length.",
  "Later that day he posted a MuJoCo Playground reproduction at 120k steps per second, 200 million steps, and 27.8 minutes of training.",
  "A scan of the public yacineMTB GitHub repositories did not find a released six-pendulum source repo, so this page treats the thread as the source of truth.",
] as const;

const timeline = [
  {
    date: "June 3",
    title: "Fast baseline",
    body: "Cartpole in MuJoCo Warp hit 18 million steps per second on some configs, using PufferLib and a large rollout policy batch.",
    href: "https://x.com/yacineMTB/status/2061979676944335227",
  },
  {
    date: "June 4",
    title: "Action and reward pressure",
    body: "The model was still using five discrete cart forces. He planned to switch action shape, then added stronger upright reward and moved toward curriculum learning.",
    href: "https://x.com/yacineMTB/status/2062354632794337303",
  },
  {
    date: "June 7",
    title: "Scaling pain",
    body: "He called each extra pendulum super exponential in time to solve, which matches the control literature view of multi link chains as chaotic benchmark systems.",
    href: "https://x.com/yacineMTB/status/2063427811684098107",
  },
  {
    date: "June 9",
    title: "Solve and ablation clue",
    body: "The final recipe used top scoring hyperparameters from higher compute runs, then randomized episode length once the policy learned the whipping behavior but could not hold it.",
    href: "https://x.com/yacineMTB/status/2064153047647846694",
  },
] as const;

const outsideQuestions = [
  "Generalization: commenters asked whether the same policy can handle one through six links and whether the method points toward rope balancing.",
  "Physics realism: one reply challenged gravity and bar lengths. Yacine answered that gravity was 9.8 and hinge friction was zero.",
  "Sim to real: replies immediately raised hardware transfer. That should stay a separate gate, not implied by a browser or MuJoCo solve.",
  "Benchmark comparison: another reply noted that 90k steps per second on a 22 DoF humanoid with domain randomization is not comparable to a no contact cartpole task.",
] as const;

const researchNotes = [
  {
    title: "Multi link pendulums are real benchmarks",
    body: "Kaheman, Fasel, Bramburger, Strom, Kutz, and Brunton frame the multi arm pendulum on a cart as a benchmark for chaos, system identification, learning, and control.",
    href: "https://arxiv.org/abs/2205.06231",
  },
  {
    title: "Hardware repo for the benchmark",
    body: "The Dynamics Lab multi-arm pendulum repository publishes CAD, manuals, and collected data for the multi-arm pendulum on a cart paper.",
    href: "https://github.com/dynamicslab/MultiArm-Pendulum",
  },
  {
    title: "Chain pendulum dynamics are hard",
    body: "Lee, Leok, and McClamroch derive equations and control structure for a chain pendulum on a cart, which is the mechanical version behind the six link challenge.",
    href: "https://arxiv.org/abs/1211.4604",
  },
  {
    title: "Energy swing up is the control prior",
    body: "Astrom and Furuta's energy-control swing-up paper is the useful classical prior: first pump energy into the chain, then switch to stabilization near upright.",
    href: "https://web.ece.ucsb.edu/~hespanha/ece229/references/AstromFurutaAUTOM00.pdf",
  },
  {
    title: "PPO is the algorithm baseline",
    body: "Schulman, Wolski, Dhariwal, Radford, and Klimov introduced PPO as a practical policy-gradient method for simulated control and robotics-style tasks.",
    href: "https://arxiv.org/abs/1707.06347",
  },
  {
    title: "PufferLib is the stack clue",
    body: "The PufferLib paper and docs explain the fast vectorized RL path that matches the thread's PufferPPO and MinGRU clues.",
    href: "https://arxiv.org/html/2406.12905v1",
  },
  {
    title: "MJWarp is the speed lever",
    body: "MuJoCo Warp is optimized for NVIDIA hardware and large batches of simulation steps, which matches Yacine's claim that environment speed was the unlock.",
    href: "https://mujoco.readthedocs.io/en/stable/mjwarp/index.html",
  },
  {
    title: "MuJoCo Playground is the clean base",
    body: "MuJoCo Playground ships GPU accelerated robot learning environments and has CartpoleBalance examples with PPO and a Warp implementation path.",
    href: "https://github.com/google-deepmind/mujoco_playground",
  },
  {
    title: "PufferLib matches the policy clue",
    body: "PufferLib documents a PPO variant and PufferNet using MinGRU, matching the timeline notes about pufferPPO and a small recurrent policy.",
    href: "https://puffer.ai/docs.html",
  },
  {
    title: "Mechanize angle",
    body: "Mechanize describes environments and graders as the signal for reinforcement learning and evaluations. The cartpole challenge is the robotics shaped version of that pattern.",
    href: "https://www.mechanize.work/",
  },
] as const;

const buildPlan = [
  {
    phase: "1. Environment",
    body: "Start from MuJoCo Playground cartpole, extend the MJCF to one through six serial hinged links, set gravity to 9.8, keep hinge friction at zero for the first reproduction, and save every seed.",
  },
  {
    phase: "2. Reward",
    body: "Use dense alignment and swing-up shaping during training, but visible score is zero unless every link is near upright and the serial chain is nearly straight.",
  },
  {
    phase: "3. Search",
    body: "Run PufferPPO with a small MinGRU policy, sweep reward weights, action force set or continuous force, horizon, entropy, curriculum mix, mass, and force magnitude.",
  },
  {
    phase: "4. Gate",
    body: "Require held out seeds, randomized episode lengths, lower link transfer, impulse recovery, and a visible failure map before calling the reproduction solved.",
  },
] as const;

export const metadata = generateMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: absoluteUrl(PAGE_URL),
  keywords: [
    "six pendulum cartpole",
    "cartpole reinforcement learning",
    "MuJoCo Warp",
    "PufferPPO",
    "AI Lab",
    "robotics simulation",
  ],
  dateModified: DATE_MODIFIED,
});

export default function SixPendulumCartpolePage() {
  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          datePublished: DATE_PUBLISHED,
          dateModified: DATE_MODIFIED,
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "AI Lab", url: "/ailab" },
          { name: "Six Link Cartpole", url: PAGE_URL },
        ])}
      />

      <article className="container py-12 md:py-16">
        <div className="inline-flex rounded-[8px] border border-[rgba(15,126,169,0.18)] bg-white/55 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-tech)]">
          AI Lab | cartpole control
        </div>

        <header className="mt-6 max-w-[980px]">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            X thread response | June 9, 2026
          </p>
          <h1 className="max-w-[12ch] font-serif text-[clamp(2.7rem,7vw,5.7rem)] font-bold leading-[0.96] text-[var(--ink)]">
            Six link cartpole lab.
          </h1>
          <p className="mt-6 max-w-[820px] text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            A live browser sketch of the six link cartpole problem, plus a Modal GPU policy checkpoint and the training notes needed for the full reinforcement learning reproduction.
          </p>
        </header>

        <SixPendulumCartpoleLab />

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">What the X thread says</p>
            <ul className="mt-5 space-y-3 text-base leading-relaxed text-[var(--ink-soft)]">
              {xFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <Link
              className="mt-6 inline-flex rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink)]"
              href="https://x.com/yacineMTB/status/2064148140899348779"
            >
              Open source thread
            </Link>
          </div>

          <div className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-[#101820] p-6 text-[#f7f1e6]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8cc7e8]">Implementation status</p>
            <h2 className="mt-4 font-serif text-3xl font-bold text-[#f7f1e6]">Modal-trained CEM checkpoint deployed.</h2>
            <p className="mt-4 text-base leading-relaxed text-[#dce6e9]">
              The canvas runs a lightweight coupled physics approximation and a checked-in policy trained on Modal L4 with cross-entropy search over a time-basis plus feedback model. This is progress, not the final Yacine-level MuJoCo/PufferPPO solve. Score is now strict: fallen, bent, or mostly-upright-but-not-straight chains get zero. The next checkpoint should move the environment to MJWarp or MJX with PPO and recorded eval videos.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Yacine timeline</p>
          <div className="grid gap-4 md:grid-cols-4">
            {timeline.map((item) => (
              <a
                className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(12,17,21,0.10)]"
                href={item.href}
                key={item.href}
              >
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{item.date}</span>
                <h2 className="mt-3 font-serif text-2xl font-bold text-[var(--ink)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Outside checks</p>
            <ul className="mt-5 space-y-3 text-base leading-relaxed text-[var(--ink-soft)]">
              {outsideQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-[#f7f1e6] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Reconstruction target</p>
            <h2 className="mt-4 font-serif text-3xl font-bold text-[var(--ink)]">Recreate the training flow, not just the clip.</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
              The artifact to build next is a reproducible repository path: MJCF generator, rollout trainer, sweep config, checkpoint recorder, eval renderer, and a public run ledger. The browser canvas is the readable front door for that work.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Training plan</p>
          <div className="grid gap-4 md:grid-cols-4">
            {buildPlan.map((item) => (
              <div className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-5" key={item.phase}>
                <h2 className="font-serif text-2xl font-bold text-[var(--ink)]">{item.phase}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Research ledger</p>
          <div className="grid gap-4 md:grid-cols-2">
            {researchNotes.map((note) => (
              <a
                className="rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(12,17,21,0.10)]"
                href={note.href}
                key={note.href}
              >
                <h2 className="font-serif text-2xl font-bold text-[var(--ink)]">{note.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{note.body}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[8px] border border-[rgba(12,17,21,0.08)] bg-white/70 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Next real training run</p>
          <h2 className="mt-4 max-w-[18ch] font-serif text-3xl font-bold leading-tight text-[var(--ink)] md:text-4xl">
            Ship the benchmark before chasing the hero video.
          </h2>
          <p className="mt-4 max-w-[860px] text-base leading-relaxed text-[var(--ink-soft)]">
            The useful artifact is not just a clip. It is a reproducible environment, saved seeds, reward curves, policy checkpoints, and failure cases. That makes the solve inspectable and gives future agents something to improve.
          </p>
        </section>
      </article>
    </>
  );
}
