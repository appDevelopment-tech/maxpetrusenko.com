import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateTechArticleSchema, generateBreadcrumbSchema, generateScheduleActionSchema } from "@/lib/seo/structured-data";
import { RelatedReading } from "@/components/articles/RelatedReading";

export const metadata = generateMetadata({
  title: "Claude Code Setup Guide for Development Teams",
  description: "Complete guide to configuring Claude Code with custom sub-agents, skills, and workflows for development teams. Learn how to set up multi-agent systems, create custom skills, and train your team for maximum productivity.",
  ogType: "article",
  canonical: absoluteUrl("/tech/articles/claude-code-setup"),
  ogImage: "/images/article-covers/tech-claude-code-setup.svg",
  keywords: ["Claude Code", "Anthropic", "AI development", "sub-agents", "custom skills", "multi-agent systems"],
});

export default function ClaudeCodeSetupArticle() {
  return (
    <>
      <JsonLd
        type="TechArticle"
        data={generateTechArticleSchema({
          headline: "Claude Code Setup Guide for Development Teams",
          description: "Complete guide to configuring Claude Code with custom sub-agents, skills, and workflows for development teams.",
          image: "/images/article-covers/tech-claude-code-setup.svg",
          url: "/tech/articles/claude-code-setup",
          datePublished: "2026-01-24",
          author: "Max Petrusenko",
          keywords: ["Claude Code", "Anthropic", "AI development", "sub-agents", "custom skills", "multi-agent systems"],
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
          { name: "Claude Code Setup Guide", url: "/tech/articles/claude-code-setup" },
        ])}
      />
      <JsonLd type="ScheduleAction" data={generateScheduleActionSchema("tech")} />

      <div className="container">
        <article className="article">
          <nav className="article-nav" style={{ marginBottom: 24 }}>
            <Link href="/tech">← Back to Tech</Link>
          </nav>

          <header className="article-header">
            <div className="eyebrow">
              <span className="dot"></span> AI Development
            </div>
            <h1>Claude Code Setup Guide for Development Teams</h1>
            <p className="article-subtitle">
              Complete guide to configuring Claude Code with custom sub-agents,
              skills, and workflows. Transform your development workflow with
              Anthropic's most powerful AI coding tool.
            </p>
            <div className="article-meta">
              <time>January 24, 2026</time>
              <span>•</span>
              <span>10 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/tech-claude-code-setup.svg"
              alt="Prompt-based cover for Claude Code setup article"
              width={1344}
              height={768}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              Claude Code is Anthropic's CLI-based AI development assistant that
              goes far beyond inline code suggestions. Unlike GitHub Copilot or
              Cursor, Claude Code can read your entire codebase, execute commands,
              run tests, and make architectural decisions autonomously. This guide
              shows you how to configure it for maximum team productivity.
            </p>

            <h2>What is Claude Code?</h2>
            <p>
              Claude Code is a command-line interface tool that interacts with
              Anthropic's Claude AI models. It's not just an autocomplete tool —
              it's a full-fledged AI agent that can:
            </p>
            <ul>
              <li><strong>Read entire codebases</strong> — understand context across files</li>
              <li><strong>Execute commands</strong> — run tests, builds, and scripts</li>
              <li><strong>Make edits</strong> — modify multiple files simultaneously</li>
              <li><strong>Use sub-agents</strong> — delegate specialized tasks</li>
              <li><strong>Run custom skills</strong> — automate repetitive workflows</li>
            </ul>

            <h3>Claude Code vs. GitHub Copilot</h3>
            <p>
              GitHub Copilot excels at inline suggestions — it predicts what you
              might type next. Claude Code operates at a higher level: you describe
              a feature or bug fix, and it figures out which files to change, what
              tests to write, and how to verify the changes work.
            </p>
            <p>
              Copilot is a copilot — you're still flying the plane. Claude Code
              is more like an autopilot that can handle entire missions while you
              supervise.
            </p>

            <h3>Claude Code vs. Cursor</h3>
            <p>
              Cursor is a full IDE with AI baked in. Claude Code is a CLI tool that
              works with your existing editor (VS Code, Neovim, IntelliJ). Cursor
              gives you AI inline; Claude Code gives you AI at the terminal level,
              where you can pipe inputs, chain commands, and script workflows.
            </p>

            <h2>Sub-Agent Configuration</h2>
            <p>
              Sub-agents are specialized AI assistants within Claude Code that
              handle specific types of tasks. Instead of one monolithic AI doing
              everything, you create agents with distinct expertise and instructions.
            </p>

            <h3>Defining Sub-Agents</h3>
            <p>
              Create sub-agents in your Claude Code configuration file. Each agent
              has a name, role description, and specific instructions for how to
              approach tasks.
            </p>
            <p>
              Example sub-agents for a typical web development team:
            </p>
            <ul>
              <li><strong>Frontend Agent</strong> — specializes in React, TypeScript, CSS, accessibility</li>
              <li><strong>Backend Agent</strong> — handles API design, databases, authentication</li>
              <li><strong>DevOps Agent</strong> — manages CI/CD, Docker, infrastructure config</li>
              <li><strong>Testing Agent</strong> — writes unit tests, integration tests, E2E tests</li>
              <li><strong>Security Agent</strong> — audits for vulnerabilities, sanitizes inputs</li>
            </ul>

            <h3>When to Use Sub-Agents</h3>
            <p>
              Sub-agents shine when:
            </p>
            <ul>
              <li>You have a large codebase with distinct domains (frontend vs backend)</li>
              <li>Team members have different specializations</li>
              <li>You want consistent patterns for specific types of changes</li>
              <li>You're working on a task that spans multiple technical areas</li>
            </ul>

            <h3>Best Practices</h3>
            <ul>
              <li>Give each agent a clear, narrow scope</li>
              <li>Include examples in the agent instructions</li>
              <li>Test agents on real tasks before rolling them out to your team</li>
              <li>Version control your agent configurations</li>
            </ul>

            <h2>Custom Skills Development</h2>
            <p>
              Skills are reusable workflows that Claude Code can execute on command.
              Think of them as functions that package up complex multi-step
              operations into a single invocation.
            </p>

            <h3>Creating Your First Skill</h3>
            <p>
              A skill defines:
            </p>
            <ul>
              <li><strong>Name</strong> — how you invoke it</li>
              <li><strong>Description</strong> — what it does</li>
              <li><strong>Parameters</strong> — what information it needs</li>
              <li><strong>Steps</strong> — the sequence of actions to execute</li>
            </ul>

            <h3>Practical Skill Examples</h3>

            <h4>Feature Branch Workflow</h4>
            <p>
              A skill that creates a feature branch, makes changes, writes tests,
              runs linting, and creates a PR:
            </p>
            <ul>
              <li>Create branch from main with naming convention</li>
              <li>Implement the feature based on ticket description</li>
              <li>Generate unit tests for changed code</li>
              <li>Run type checking and linting</li>
              <li>Run all tests to verify nothing broke</li>
              <li>Commit changes with conventional commit message</li>
              <li>Create draft PR with description</li>
            </ul>

            <h4>Debug Investigation Skill</h4>
            <p>
              When a bug is reported, this skill:
            </p>
            <ul>
              <li>Parses the error message or stack trace</li>
              <li>Locates the relevant code in the codebase</li>
              <li>Checks recent changes that might have caused it</li>
              <li>Searches for similar issues in the repo</li>
              <li>Proposes potential fixes with rationale</li>
              <li>Writes a test case to prevent regression</li>
            </ul>

            <h4>Documentation Update Skill</h4>
            <p>
              After code changes, this skill:
            </p>
            <ul>
              <li>Identifies which docs need updating</li>
              <li>Updates API documentation</li>
              <li>Adds examples for new features</li>
              <li>Checks for broken internal links</li>
              <li>Updates changelog</li>
            </ul>

            <h2>Multi-Agent Systems</h2>
            <p>
              The real power of Claude Code emerges when you chain multiple agents
              together for complex workflows. This is where AI moves from assistant
              to orchestrator.
            </p>

            <h3>Sequential Agent Workflows</h3>
            <p>
              In sequential workflows, each agent hands off to the next:
            </p>
            <ul>
              <li><strong>Planning Agent</strong> breaks down the task</li>
              <li><strong>Implementation Agent</strong> writes the code</li>
              <li><strong>Review Agent</strong> critiques the implementation</li>
              <li><strong>Testing Agent</strong> writes and runs tests</li>
              <li><strong>Documentation Agent</strong> updates docs</li>
            </ul>

            <h3>Parallel Agent Execution</h3>
            <p>
              Some tasks benefit from parallel exploration:
            </p>
            <ul>
              <li>Multiple agents proposing different solutions to a problem</li>
              <li>Separate agents auditing different aspects (security, performance, accessibility)</li>
              <li>Agents working on independent modules simultaneously</li>
            </ul>

            <h3>Advanced Pattern: Agent Review Loop</h3>
            <p>
              For critical changes, use a review loop where agents critique each
              other's work:
            </p>
            <ul>
              <li>Agent A proposes implementation</li>
              <li>Agent B reviews for security issues</li>
              <li>Agent C reviews for performance</li>
              <li>Agent A addresses feedback</li>
              <li>Final sign-off from all agents</li>
            </ul>

            <h2>Team Training & Adoption</h2>
            <p>
              Rolling out Claude Code to a team requires more than installation —
              you need training, guidelines, and a gradual adoption curve.
            </p>

            <h3>Onboarding Strategy</h3>
            <p>
              Start with a pilot group:
            </p>
            <ol>
              <li><strong>Week 1</strong> — Install and basic commands with 2-3 senior devs</li>
              <li><strong>Week 2</strong> — Create initial sub-agents and skills for your stack</li>
              <li><strong>Week 3</strong> — Expand to 5-10 developers, gather feedback</li>
              <li><strong>Week 4</strong> — Team-wide training session with documented workflows</li>
            </ol>

            <h3>Training Materials</h3>
            <p>
              Create internal documentation covering:
            </p>
            <ul>
              <li>How to invoke Claude Code from your terminal</li>
              <li>Which agents to use for which tasks</li>
              <li>Available skills and how to use them</li>
              <li>Common patterns and examples</li>
              <li>When not to use AI (security, compliance, sensitive data)</li>
            </ul>

            <h3>Team Guidelines</h3>
            <ul>
              <li>Always review AI-generated code before committing</li>
              <li>Use agents consistently — don't reinvent workflows</li>
              <li>Document new skills for the team</li>
              <li>Report edge cases to improve agent prompts</li>
              <li>Never feed secrets, passwords, or sensitive user data</li>
            </ul>

            <h2>Common Pitfalls</h2>
            <p>
              Avoid these mistakes when setting up Claude Code for your team:
            </p>

            <h3>Over-Engineering Agents</h3>
            <p>
              Don't create too many agents with overlapping responsibilities. Start
              with 3-5 well-defined agents. You can always specialize further as
              needs emerge.
            </p>

            <h3>Vague Agent Instructions</h3>
            <p>
              Agents need clear, specific guidance. "Help with frontend" is too
              broad. "Help with React components, TypeScript types, and Tailwind
              CSS while following our design system" is actionable.
            </p>

            <h3>Skipping Human Review</h3>
            <p>
              Claude Code is powerful but not infallible. Always review generated
              code, especially for security-critical paths, API integrations, and
              data handling.
            </p>

            <h3>Ignoring Context Limits</h3>
            <p>
              Even with large context windows, performance degrades with too much
              irrelevant information. Guide Claude Code to focus on specific files
              or directories when working on large codebases.
            </p>

            <h3>Not Versioning Configurations</h3>
            <p>
              Your agent definitions and skills are part of your codebase. Commit
              them to git, review changes in PRs, and maintain them like any other
              shared tooling.
            </p>

            <div className="article-cta">
              <h3>Need Help Setting Up Claude Code?</h3>
              <p>
                I configure Claude Code for development teams: sub-agent setup,
                custom skills, workflow automation, and team training. Available
                remotely worldwide.
              </p>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20Claude%20Code%20setup%20for%20my%20team.%20We%20use%20____.%20Team%20size%3A%20____."
                target="_blank"
                rel="noopener"
              >
                WhatsApp to Discuss
              </a>
              <Link className="btn secondary" href="/tech">
                View All Tech Services
              </Link>
            </div>

            <hr className="article-divider" />

            <h2>Frequently Asked Questions</h2>

            <details className="faq-item">
              <summary>Is Claude Code better than GitHub Copilot?</summary>
              <p>
                They serve different purposes. Copilot provides inline suggestions
                as you type. Claude Code can execute multi-step tasks, run commands,
                and make architectural decisions across files. Many teams use both:
                Copilot for day-to-day coding, Claude Code for feature work and
                refactoring.
              </p>
            </details>

            <details className="faq-item">
              <summary>Can Claude Code work with my existing codebase?</summary>
              <p>
                Yes. Claude Code works with any codebase in any language. It's
                particularly effective with TypeScript, Python, JavaScript, Go, and
                Rust, but can handle any programming language with enough examples
                in its training data.
              </p>
            </details>

            <details className="faq-item">
              <summary>How do I prevent Claude Code from accessing sensitive data?</summary>
              <p>
                Configure ignore patterns for directories containing secrets,
                credentials, or sensitive user data. You can also use environment
                variables to mark certain files as off-limits. Always review what
                Claude Code sends in its requests.
              </p>
            </details>

            <details className="faq-item">
              <summary>Can multiple developers share Claude Code configurations?</summary>
              <p>
                Absolutely. Commit your agent configurations and skills to version
                control. This ensures everyone on the team uses the same definitions
                and benefits from improvements to the shared setup.
              </p>
            </details>

            <details className="faq-item">
              <summary>What's the learning curve for Claude Code?</summary>
              <p>
                Basic usage can be learned in an hour. Advanced features like
                custom agents and skills take a few days of regular use. Team-wide
                adoption typically takes 2-4 weeks with proper training and
                documentation.
              </p>
            </details>

          </div>

          <footer className="article-footer">
            <div className="article-tags">
              <strong>Tags:</strong>
              <span>Claude Code</span>
              <span>Anthropic</span>
              <span>AI development</span>
              <span>sub-agents</span>
              <span>custom skills</span>
              <span>multi-agent systems</span>
            </div>
            <p className="article-location">
              <strong>Availability:</strong> Remote worldwide · Private in Miami FL, by request
            </p>
          </footer>
          <RelatedReading currentLink="/tech/articles/claude-code-setup" />
</article>
      </div>
    </>
  );
}