import Link from "next/link";
import Image from "next/image";
import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateTechArticleSchema, generateBreadcrumbSchema, generateScheduleActionSchema } from "@/lib/seo/structured-data";

export const metadata = generateMetadata({
  title: "n8n Workflow Automation: From Zero to Production",
  description: "Complete guide to building production-grade automations with n8n. Learn API integration patterns, error handling, retry logic, custom nodes, and monitoring for reliable business workflows.",
  ogType: "article",
  canonical: absoluteUrl("/tech/articles/n8n-workflow-automation"),
  ogImage: "/images/article-covers/tech-n8n-workflow.svg",
  keywords: ["n8n", "workflow automation", "API integration", "no-code", "business automation", "webhooks"],
});

export default function N8nWorkflowArticle() {
  return (
    <>
      <JsonLd
        type="TechArticle"
        data={generateTechArticleSchema({
          headline: "n8n Workflow Automation: From Zero to Production",
          description: "Complete guide to building production-grade automations with n8n. API integration patterns, error handling, retry logic, custom nodes.",
          image: "/images/article-covers/tech-n8n-workflow.svg",
          url: "/tech/articles/n8n-workflow-automation",
          datePublished: "2026-01-24",
          author: "Max Petrusenko",
          keywords: ["n8n", "workflow automation", "API integration", "no-code", "business automation", "webhooks"],
        })}
      />
      <JsonLd
        type="BreadcrumbList"
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Tech", url: "/tech" },
          { name: "Articles", url: "/tech/articles" },
          { name: "n8n Workflow Automation", url: "/tech/articles/n8n-workflow-automation" },
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
              <span className="dot"></span> Automation
            </div>
            <h1>n8n Workflow Automation: From Zero to Production</h1>
            <p className="article-subtitle">
              Build reliable, production-grade automations with n8n. From simple
              integrations to complex multi-step workflows with proper error handling,
              retry logic, and monitoring.
            </p>
            <div className="article-meta">
              <time>January 24, 2026</time>
              <span>•</span>
              <span>12 min read</span>
              <span>•</span>
              <span>By Max Petrusenko</span>
            </div>
          </header>

          <div style={{ maxWidth: 900, margin: "26px auto 32px" }}>
            <Image
              src="/images/article-covers/tech-n8n-workflow.svg"
              alt="Prompt-based cover for n8n workflow automation article"
              width={1344}
              height={768}
              style={{ borderRadius: "var(--radius)" }}
              priority
            />
          </div>

          <div className="article-content">
            <p className="lead">
              n8n is a workflow automation platform that connects your tools and
              APIs without writing code. Unlike Zapier or Make, n8n is
              self-hostable, extensible, and gives you full control over your data.
              This guide covers building production-ready automations that can
              handle real business workloads.
            </p>

            <h2>Why n8n?</h2>
            <p>
              n8n occupies a sweet spot between no-code tools and custom software:
            </p>

            <h3>n8n vs. Zapier</h3>
            <p>
              Zapier excels at simple integrations with its massive app ecosystem.
              n8n goes deeper with complex logic, branching, data transformation,
              and custom code when needed. Zapier charges per task; n8n is free
              when self-hosted. Choose Zapier for quick 1:1 connections; choose n8n
              for multi-step workflows with business logic.
            </p>

            <h3>n8n vs. Make (formerly Integrator)</h3>
            <p>
              Make offers powerful visual building and extensive integrations.
              n8n's advantage is code-first extensibility — write custom nodes in
              TypeScript/JavaScript when you need functionality that doesn't exist.
              n8n also has no vendor lock-in: export your workflow as JSON and run
              it anywhere.
            </p>

            <h3>n8n vs. Custom Code</h3>
            <p>
              Writing custom scripts gives you unlimited flexibility but also
              unlimited responsibility: error handling, retries, monitoring,
              logging, scaling. n8n handles the infrastructure so you focus on the
              business logic. When you hit n8n's limits, extend it with code rather
              than rebuilding from scratch.
            </p>

            <h2>Getting Started</h2>
            <p>
              n8n can be run locally, Dockerized, or cloud-hosted. For production,
              Docker or the official cloud is recommended.
            </p>

            <h3>Installation Options</h3>
            <ul>
              <li><strong>npm</strong> — Quick start for local development</li>
              <li><strong>Docker</strong> — Recommended for production, easy deployment</li>
              <li><strong>n8n Cloud</strong> — Managed hosting, starts at $20/month</li>
              <li><strong>Kubernetes</strong> — For enterprise-scale deployments</li>
            </ul>

            <h3>Your First Workflow</h3>
            <p>
              Start with something simple but useful:
            </p>
            <ol>
              <li>Create a webhook trigger to receive data</li>
              <li>Add a node to process or transform the data</li>
              <li>Connect to an external service (API, database, email)</li>
              <li>Test manually, then enable production mode</li>
            </ol>

            <p>
              Example: A workflow that receives form submissions via webhook,
              validates the data, adds a row to Google Sheets, and sends a Slack
              notification. This simple pattern extends to countless use cases.
            </p>

            <h2>API Integration Patterns</h2>
            <p>
              Most n8n workflows involve API integrations. Understanding the patterns
              makes building reliable workflows easier.
            </p>

            <h3>REST API Calls</h3>
            <p>
              The HTTP Request node is your Swiss Army knife for REST APIs:
            </p>
            <ul>
              <li><strong>GET</strong> — Fetch data from an API endpoint</li>
              <li><strong>POST</strong> — Create new resources</li>
              <li><strong>PUT/PATCH</strong> — Update existing resources</li>
              <li><strong>DELETE</strong> — Remove resources</li>
            </ul>

            <p>
              Always set proper headers (Content-Type, Authorization) and handle
              the response structure. Most APIs return JSON, but some return XML
              or plain text.
            </p>

            <h3>Webhooks</h3>
            <p>
              Webhooks let external systems push data to your n8n workflows in
              real-time:
            </p>
            <ul>
              <li>Create a Webhook node (POST or GET)</li>
              <li>Copy the webhook URL to your clipboard</li>
              <li>Configure the external service to send to that URL</li>
              <li>Test by triggering a real event</li>
              <li>Use the webhook data in subsequent nodes</li>
            </ul>

            <h3>Authentication Methods</h3>
            <p>
              Different APIs require different authentication strategies:
            </p>
            <ul>
              <li><strong>API Key</strong> — Simple header or query parameter</li>
              <li><strong>Bearer Token</strong> — OAuth2 access token in Authorization header</li>
              <li><strong>OAuth2</strong> — Full OAuth flow with refresh tokens</li>
              <li><strong>Basic Auth</strong> — Username/password encoded in header</li>
              <li><strong>Custom</strong> — Signature-based, JWT, or proprietary</li>
            </ul>

            <h3>Rate Limiting</h3>
            <p>
              Respect API rate limits to avoid being blocked:
            </p>
            <ul>
              <li>Use the Wait node between batches of requests</li>
              <li>Implement exponential backoff for retries</li>
              <li>Queue requests when approaching limits</li>
              <li>Monitor rate limit headers in API responses</li>
            </ul>

            <h2>Error Handling & Retry Logic</h2>
            <p>
              Production workflows need to handle failure gracefully. A failed
              API call shouldn't break your entire automation.
            </p>

            <h3>Try-Catch Patterns</h3>
            <p>
              n8n provides error handling through:
            </p>
            <ul>
              <li><strong>Continue On Fail</strong> — Node setting that prevents workflow stop</li>
              <li><strong>Error Trigger</strong> — Catches errors from any node</li>
              <li><strong>Split Out</strong> — Routes data based on success/failure</li>
              <li><strong>Switch</strong> — Branch logic based on conditions</li>
            </ul>

            <h3>Retry Strategies</h3>
            <p>
              Not all failures are permanent. Implement smart retries:
            </p>
            <ul>
              <li><strong>Immediate retry</strong> — For transient network errors</li>
              <li><strong>Fixed delay</strong> — Wait 1-5 seconds before retry</li>
              <li><strong>Exponential backoff</strong> — Double delay after each failure</li>
              <li><strong>Circuit breaker</strong> — Stop retrying after N consecutive failures</li>
            </ul>

            <h3>Dead Letter Queues</h3>
            <p>
              When retries are exhausted, route failed items to a dead letter queue
              for manual inspection:
            </p>
            <ul>
              <li>Log the error with full context</li>
              <li>Store failed data in a database or Google Sheet</li>
              <li>Send alert notification to monitoring channel</li>
              <li>Build a recovery workflow for reprocessing</li>
            </ul>

            <h2>Custom Node Development</h2>
            <p>
              When existing nodes don't meet your needs, build your own. n8n
              custom nodes are written in TypeScript/JavaScript.
            </p>

            <h3>When to Build Custom Nodes</h3>
            <ul>
              <li>You need to integrate with an API that doesn't have a built-in node</li>
              <li>You need specialized data transformation logic</li>
              <li>You want to encapsulate complex workflows into reusable components</li>
              <li>You need to interact with on-premise systems</li>
            </ul>

            <h3>Node Structure</h3>
            <p>
              A custom node defines:
            </p>
            <ul>
              <li><strong>Properties</strong> — Input fields for configuration</li>
              <li><strong>Actions</strong> — What the node can do</li>
              <li><strong>Authentication</strong> — How it authenticates with the service</li>
              <li><strong>Output</strong> — Data structure it returns</li>
            </ul>

            <h3>Development Workflow</h3>
            <ol>
              <li>Create a new node project using n8n's CLI</li>
              <li>Define the node's properties and actions</li>
              <li>Implement the core logic in TypeScript</li>
              <li>Build and bundle the node</li>
              <li>Install in your n8n instance</li>
              <li>Test with real workflows</li>
            </ol>

            <h2>Monitoring & Debugging</h2>
            <p>
              Production automations need visibility. You can't fix what you can't
              see.
            </p>

            <h3>Workflow Execution Logs</h3>
            <p>
              n8n logs every workflow execution:
            </p>
            <ul>
              <li>View execution history from the workflow editor</li>
              <li>Inspect input/output data for each node</li>
              <li>Filter by status (success, error, waiting)</li>
              <li>Download execution logs for analysis</li>
            </ul>

            <h3>External Monitoring</h3>
            <p>
              For production monitoring, integrate with external tools:
            </p>
            <ul>
              <li><strong>Sentry</strong> — Error tracking and alerting</li>
              <li><strong>DataDog</strong> — Metrics and log aggregation</li>
              <li><strong>Grafana</strong> — Custom dashboards</li>
              <li><strong>Slack/Discord</strong> — Real-time notifications</li>
            </ul>

            <h3>Health Check Endpoints</h3>
            <p>
              Expose health check endpoints for your n8n instance:
            </p>
            <ul>
              <li><code>/healthz</code> — Basic liveness check</li>
              <li><code>/ready</code> — Readiness check (dependencies up)</li>
              <li>Response includes: version, active workflows, queue depth</li>
            </ul>

            <h3>Alerting Strategy</h3>
            <p>
              Set up alerts for critical conditions:
            </p>
            <ul>
              <li>Workflow failure rate above threshold</li>
              <li>Execution time exceeds SLA</li>
              <li>API rate limits being hit</li>
              <li>Queue depth growing (backlog forming)</li>
            </ul>

            <h2>Real-World Examples</h2>

            <h3>Content Automation Pipeline</h3>
            <p>
              Automatically publish content across multiple platforms:
            </p>
            <ol>
              <li>Webhook receives new content from CMS</li>
              <li>Transform content for each platform's format</li>
              <li>Post to social media APIs (Twitter, LinkedIn)</li>
              <li>Send newsletter via email API</li>
              <li>Log publication status to database</li>
              <li>Notify team on Slack of completion</li>
            </ol>

            <h3>Customer Data Sync</h3>
            <p>
              Keep customer data in sync across systems:
            </p>
            <ol>
              <li>Schedule triggers every 5 minutes</li>
              <li>Fetch new/updated records from CRM</li>
              <li>Check if exists in destination system</li>
              <li>Update existing or create new records</li>
              <li>Handle conflicts with last-write-wins logic</li>
              <li>Log sync statistics for monitoring</li>
            </ol>

            <h3>Order Processing Workflow</h3>
            <p>
              E-commerce order automation:
            </p>
            <ol>
              <li>Webhook receives new order event</li>
              <li>Validate order data and check for fraud</li>
              <li>Create order record in database</li>
              <li>Send confirmation email to customer</li>
              <li>Notify fulfillment team</li>
              <li>Update inventory levels</li>
              <li>Create shipping label via API</li>
              <li>Track shipment status updates</li>
            </ol>

            <div className="article-cta">
              <h3>Need Help with n8n Automation?</h3>
              <p>
                I build production-grade n8n workflows: API integrations, custom
                nodes, error handling, and monitoring. Available remotely worldwide.
              </p>
              <a
                className="btn primary"
                href="https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20n8n%20automation.%20I%20want%20to%20automate%20____.%20Current%20stack%3A%20____."
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
              <summary>Is n8n free to use?</summary>
              <p>
                n8n is free when self-hosted — you only pay for your server costs.
                The cloud version starts at $20/month. Paid plans add features like
                advanced security, priority support, and enterprise compliance.
              </p>
            </details>

            <details className="faq-item">
              <summary>Can n8n handle large-scale production workloads?</summary>
              <p>
                Yes. n8n can scale horizontally by running multiple instances behind
                a load balancer. For high-volume workflows, use queue mode with
                Redis/RabbitMQ. Properly configured, n8n handles thousands of
                executions per hour.
              </p>
            </details>

            <details className="faq-item">
              <summary>What's the difference between n8n nodes and workflows?</summary>
              <p>
                Nodes are individual building blocks that perform specific actions
                (API calls, data transformation, logic). Workflows connect nodes
                together to automate multi-step processes. Think of nodes as
                functions and workflows as programs.
              </p>
            </details>

            <details className="faq-item">
              <summary>How do I handle API authentication in n8n?</summary>
                <p>
                  n8n supports credentials storage for authentication. Create a
                  credential for the API (API key, OAuth2, etc.) and reference it
                  in your nodes. Credentials are encrypted at rest and never exposed
                  in workflow exports.
                </p>
            </details>

            <details className="faq-item">
              <summary>Can I use custom code in n8n workflows?</summary>
              <p>
                Absolutely. The Code node lets you write JavaScript/TypeScript
                directly in your workflow. You can also build custom nodes for
                reusable functionality. This gives you the power of code with the
                convenience of visual workflow building.
              </p>
            </details>

          </div>

          <footer className="article-footer">
            <div className="article-tags">
              <strong>Tags:</strong>
              <span>n8n</span>
              <span>workflow automation</span>
              <span>API integration</span>
              <span>no-code</span>
              <span>business automation</span>
              <span>webhooks</span>
            </div>
            <p className="article-location">
              <strong>Availability:</strong> Remote worldwide · In-person in Miami FL, Ubud Bali
            </p>
          </footer>
        </article>

        {/* Related articles section */}
        <section className="section">
          <div className="section-head">
            <h2>Related Articles</h2>
          </div>
          <div className="cards-3 grid">
            <Link className="card" href="/tech/articles/claude-code-setup">
              <h3>Claude Code Setup Guide</h3>
              <p>Configure Claude Code with sub-agents, custom skills, and multi-agent systems for teams.</p>
            </Link>
            <Link className="card" href="/tech/articles/chatgpt-api-integration">
              <h3>ChatGPT API Integration</h3>
              <p>Best practices for integrating OpenAI's API. Prompt engineering, RAG, and function calling.</p>
            </Link>
            <Link className="card" href="/tech">
              <h3>Tech Services</h3>
              <p>AI automation consulting, n8n workflows, and API integration services.</p>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
