import Link from "next/link";
import { WorkspaceSignOutButton } from "./SignOutButton";
import { WorkspaceCrmBootstrap } from "./WorkspaceCrmBootstrap";
import type { WorkspaceDashboardState } from "@/lib/workspace/types";
import {
  WORKSPACE_PEOPLE_TABLE,
  WORKSPACE_TEAMS_TABLE,
} from "@/lib/workspace/schema";

interface WorkspaceDashboardProps {
  state: Extract<WorkspaceDashboardState, { kind: "ready" }>;
}

function formatWhen(value: string | null): string {
  if (!value) return "No timestamp yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export function WorkspaceDashboard({ state }: WorkspaceDashboardProps) {
  const peopleCount = state.people.length;
  const teamsCount = state.teams.length;
  const signalCount = state.signals.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <WorkspaceCrmBootstrap enabled={peopleCount === 0 || signalCount === 0} />
      <section className="overflow-hidden rounded-[32px] border border-[#17324a] bg-[#08111d] text-white shadow-[0_30px_80px_rgba(8,17,29,0.38)]">
        <div className="relative overflow-hidden border-b border-white/8 px-6 py-8 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(72,187,255,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(58,141,255,0.18),transparent_24%),linear-gradient(135deg,#08111d_0%,#0c1a2a_45%,#10263b_100%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#82d6e2]">
                Private workspace
              </p>
              <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-[#f7f1e6]">
                People, teams, and live client signals
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b7c7d9] md:text-base">
                Separate from the concierge UI. Google-auth only. One place to review
                who you are working with, where momentum is building, and which threads
                are surfacing demand.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">
                Signed in
              </p>
              <p className="max-w-[240px] break-all text-sm font-medium text-white">
                {state.userEmail}
              </p>
              <WorkspaceSignOutButton />
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-white/8 px-6 py-6 md:grid-cols-3 md:px-8">
          {[
            { label: "People", value: peopleCount, tone: "from-[#7ce7d4] to-[#3cb2a6]" },
            { label: "Teams", value: teamsCount, tone: "from-[#9dc5ff] to-[#4b82ff]" },
            { label: "Signals", value: signalCount, tone: "from-[#ffe2a3] to-[#e0a74f]" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">
                {metric.label}
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-4xl font-semibold text-white">{metric.value}</p>
                <div
                  className={`h-16 w-24 rounded-2xl bg-gradient-to-br ${metric.tone} opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-8">
          <div className="grid gap-6">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">
                    People
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#f7f1e6]">
                    Active relationships
                  </h2>
                </div>
                <span className="rounded-full border border-[#264968] px-3 py-1 text-xs text-[#9dc5ff]">
                  Supabase
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {state.people.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/14 bg-[#0b1625] p-5 text-sm leading-7 text-[#aebdcb]">
                    No people rows yet. Seed <code>{WORKSPACE_PEOPLE_TABLE}</code> in Supabase and this
                    view fills itself.
                  </div>
                ) : (
                  state.people.map((person) => (
                    <article
                      key={person.id}
                      className="rounded-[22px] border border-white/8 bg-[#0b1625] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                          <p className="mt-1 text-sm text-[#9fb0c2]">
                            {[person.role, person.company].filter(Boolean).join(" · ") ||
                              "Role and company pending"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#7ce7d4]">
                          {person.status ?? "active"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-[#c8d6e2]">
                        <p>{person.email ?? "No email saved"}</p>
                        {person.phone ? <p>{person.phone}</p> : null}
                        <p>Team: {person.teamName ?? "Independent"}</p>
                        <p>Last touch: {formatWhen(person.lastTouchAt)}</p>
                        <p>
                          {[person.source, person.lane, person.intent]
                            .filter(Boolean)
                            .join(" · ") || "Manual contact"}
                        </p>
                        {(person.score !== null || person.owner || person.followUpAt) && (
                          <p>
                            {[
                              person.score !== null ? `Score: ${person.score}` : null,
                              person.owner ? `Owner: ${person.owner}` : null,
                              person.followUpAt
                                ? `Follow up: ${formatWhen(person.followUpAt)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {person.notes ? (
                          <p className="rounded-2xl bg-white/5 px-4 py-3 text-[#d8e4ee]">
                            {person.notes}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">
                    Signal feed
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#f7f1e6]">
                    Recent concierge demand
                  </h2>
                </div>
                <Link
                  href="/inbox"
                  className="text-sm font-medium text-[#9dc5ff] transition hover:text-white"
                >
                  Open inbox
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {state.signals.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/14 bg-[#0b1625] p-5 text-sm leading-7 text-[#aebdcb]">
                    No saved concierge threads yet.
                  </div>
                ) : (
                  state.signals.map((signal) => (
                    <article
                      key={signal.id}
                      className="rounded-[22px] border border-white/8 bg-[#0b1625] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#82d6e2]">
                            {signal.source} · {signal.channel}
                          </p>
                          <h3 className="mt-2 text-base font-semibold text-white">
                            {signal.summary}
                          </h3>
                        </div>
                        <p className="text-xs text-[#8ea6bb]">
                          {formatWhen(signal.touchedAt ?? signal.updatedAt)}
                        </p>
                      </div>
                      {(signal.stage || signal.intent || signal.score !== null) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {signal.stage && (
                            <span className="rounded-full border border-[#264968] px-3 py-1 text-[#82d6e2]">
                              {signal.stage}
                            </span>
                          )}
                          {signal.intent && (
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[#c8d6e2]">
                              {signal.intent}
                            </span>
                          )}
                          {signal.score !== null && (
                            <span className="rounded-full border border-[#66442d] px-3 py-1 text-[#ffe2a3]">
                              score {signal.score}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-3 text-sm text-[#9fb0c2]">
                        {[signal.lane ? `${signal.lane} lane` : null, signal.pathname, signal.title ? signal.title : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(signal.contactName || signal.company || signal.email || signal.phone) && (
                        <p className="mt-2 text-sm text-[#c8d6e2]">
                          {[signal.contactName, signal.company, signal.email, signal.phone]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {signal.contentPreview ? (
                        <p className="mt-2 text-sm text-[#9fb0c2] whitespace-pre-wrap">
                          {signal.contentPreview}
                        </p>
                      ) : null}
                      {(signal.owner || signal.followUpAt) && (
                        <p className="mt-2 text-sm text-[#9fb0c2]">
                          {[signal.owner ? `Owner: ${signal.owner}` : null, signal.followUpAt ? `Follow up: ${formatWhen(signal.followUpAt)}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">Teams</p>
              <h2 className="mt-2 text-xl font-semibold text-[#f7f1e6]">
                Current accounts
              </h2>
              <div className="mt-5 grid gap-3">
                {state.teams.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/14 bg-[#0b1625] p-5 text-sm leading-7 text-[#aebdcb]">
                    No teams rows yet. Seed <code>{WORKSPACE_TEAMS_TABLE}</code> to track client accounts.
                  </div>
                ) : (
                  state.teams.map((team) => (
                    <article
                      key={team.id}
                      className="rounded-[22px] border border-white/8 bg-[#0b1625] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                          <p className="mt-1 text-sm text-[#9fb0c2]">
                            {[team.company, team.focus].filter(Boolean).join(" · ") ||
                              "Company and focus pending"}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#ffe2a3]">
                          {team.status ?? "active"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-[#c8d6e2]">
                        <p>Members: {team.memberCount ?? 0}</p>
                        <p>Last touch: {formatWhen(team.lastTouchAt)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8ea6bb]">
                Setup notes
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#f7f1e6]">
                Auth and data path
              </h2>
              <div className="mt-5 grid gap-3 text-sm leading-7 text-[#c8d6e2]">
                <p>Google sign-in runs through Supabase Auth.</p>
                <p>DB membership is the primary gate for this workspace.</p>
                <p>Data comes from <code>{WORKSPACE_PEOPLE_TABLE}</code> and <code>{WORKSPACE_TEAMS_TABLE}</code>.</p>
                <p>Concierge demand is synced into Supabase CRM records and shown here first.</p>
                <p>Inbox remains the transcript drilldown when you need full conversation detail.</p>
              </div>
              {state.diagnostics.length > 0 ? (
                <div className="mt-5 rounded-[22px] border border-[#66442d] bg-[#261710] p-4 text-sm leading-7 text-[#ffd8bf]">
                  <p className="font-semibold text-[#ffe2c3]">Diagnostics</p>
                  <ul className="mt-2 list-disc pl-5">
                    {state.diagnostics.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
