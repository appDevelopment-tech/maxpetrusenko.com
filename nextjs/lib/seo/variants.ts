import type { ReactNode } from "react";

/**
 * Copy for the seo-p1-2026-11 page-scope variants. A path absent from this map is
 * control for every page flag. `title` is the core title; the root layout template
 * appends " | Max Petrusenko", so keep it <= 43 chars to land at <= 60 overall.
 */
export interface SeoPageVariant {
  title: string;
  h1: string;
  /** Sentence placed in front of the existing lead so the keyword opens the page. */
  leadPrefix: string;
  /** 40-60 words, answer first. */
  tldr: string;
  related: Array<{ href: string; anchor: string }>;
  /** True when the page has an FAQ accordion that H015 can open. */
  hasFaq?: boolean;
}

export type { ReactNode };

const ART = "/tech/articles";

export const seoPageVariants: Record<string, SeoPageVariant> = {
  [`${ART}/answer-engine-optimization-aeo`]: {
    title: "AEO Guide: Get Cited by ChatGPT, Claude",
    h1: "Answer Engine Optimization (AEO): Get Cited in AI Answers",
    leadPrefix:
      "Answer engine optimization (AEO) is the work of making a page easy for ChatGPT, Claude, and Perplexity to quote.",
    tldr: "Answer engine optimization (AEO) means structuring pages so ChatGPT, Claude, Perplexity, and Google AI Overviews can quote them accurately. This guide covers how answer engines pick sources, the structure and trust signals that help, how to measure citations, common mistakes, and a checklist you can run against your own site.",
    related: [
      { href: `${ART}/generative-engine-optimization-geo`, anchor: "GEO framework and weekly roadmap" },
      { href: `${ART}/generative-ai-score-websites`, anchor: "How AI engines score a website" },
      { href: `${ART}/seo-is-dead`, anchor: "Is SEO dead? Search and answers compared" },
      { href: "/max-petrusenko-aeo-geo", anchor: "AEO and GEO work by Max Petrusenko" },
    ],
    hasFaq: true,
  },
  [`${ART}/bitcoin-as-strong-money`]: {
    title: "Bitcoin as Strong Money: Scarcity, Custody",
    h1: "Bitcoin as Strong Money: Scarcity, Custody, Tradeoffs",
    leadPrefix:
      "Bitcoin as strong money is a claim about durability, portability, and scarcity rather than price.",
    tldr: "Strong money holds value over time, moves easily, and has a supply nobody can inflate at will. This article argues Bitcoin is judged on those traits instead of on price, then walks through scarcity, self-custody, settlement, and the tradeoffs that a fair case for Bitcoin should state out loud.",
    related: [
      { href: "/tech/articles", anchor: "All tech articles" },
      { href: "/blog", anchor: "Blog archive" },
      { href: "/about", anchor: "About Max Petrusenko" },
    ],
  },
  [`${ART}/chatgpt-api-integration`]: {
    title: "ChatGPT API Integration for Production",
    h1: "ChatGPT API Integration: Patterns for Production",
    leadPrefix:
      "ChatGPT API integration comes down to a few decisions: auth, prompts, function calling, retrieval, and error handling.",
    tldr: "Integrating the ChatGPT API well means getting authentication, prompt structure, function calling, retrieval (RAG), and error handling right before you scale. This guide covers each in order, including when fine-tuning is worth it, how to keep API costs down, and what to check before a feature goes to production.",
    related: [
      { href: `${ART}/n8n-workflow-automation`, anchor: "n8n workflow automation from zero to production" },
      { href: `${ART}/claude-code-setup`, anchor: "Claude Code setup for development teams" },
      { href: "/tech/ai-automation", anchor: "AI automation services" },
      { href: "/tech/case-studies", anchor: "Automation case studies" },
    ],
    hasFaq: true,
  },
  [`${ART}/claude-code-setup`]: {
    title: "Claude Code Setup: Sub-Agents and Skills",
    h1: "Claude Code Setup: Sub-Agents, Skills, and Team Rollout",
    leadPrefix:
      "Claude Code setup for a team starts with sub-agents, custom skills, and one shared workflow.",
    tldr: "A solid Claude Code setup for a development team has three parts: sub-agents with narrow jobs, custom skills that encode your repeat tasks, and a shared workflow the whole team follows. This guide shows how to configure each, how multi-agent systems fit together, and which pitfalls slow adoption.",
    related: [
      { href: "/claude-code-consultant", anchor: "Claude Code consultant" },
      { href: "/tech/case-studies/claude-code-automation", anchor: "Claude Code automation case study" },
      { href: `${ART}/openclaw-installation-playbook`, anchor: "OpenClaw installation playbook for teams" },
      { href: "/tech/ai-automation", anchor: "AI automation services" },
    ],
    hasFaq: true,
  },
  [`${ART}/generative-ai-score-websites`]: {
    title: "Generative AI Score: What AI Engines Rate",
    h1: "Generative AI Score for Websites: What AI Engines Rate",
    leadPrefix:
      "A generative AI score describes how likely AI answer engines are to cite, recommend, or trust your site.",
    tldr: "A generative AI score is a way to describe how likely ChatGPT, Claude, Perplexity, and similar engines are to cite or recommend your site. This article breaks scoring into four pillars, gives a self-assessment checklist you can run in an afternoon, and lists the changes that move a site up.",
    related: [
      { href: `${ART}/answer-engine-optimization-aeo`, anchor: "Answer engine optimization (AEO) guide" },
      { href: `${ART}/generative-engine-optimization-geo`, anchor: "GEO framework and roadmap" },
      { href: `${ART}/seo-is-dead`, anchor: "Is SEO dead in 2026?" },
      { href: "/max-petrusenko-aeo-geo", anchor: "AEO and GEO work by Max Petrusenko" },
    ],
    hasFaq: true,
  },
  [`${ART}/generative-engine-optimization-geo`]: {
    title: "Generative Engine Optimization (GEO) Plan",
    h1: "Generative Engine Optimization (GEO): The 5-Layer Roadmap",
    leadPrefix:
      "Generative engine optimization (GEO) is weekly work: getting your pages found and cited in ChatGPT, Claude, Perplexity, and AI search.",
    tldr: "Generative engine optimization (GEO) is the operating work of getting pages found and cited by ChatGPT, Claude, Perplexity, and AI-enhanced search. This guide lays out a five-layer stack, a weekly routine, a quality checklist to pass before requesting indexing, and the mistakes that slow indexing down.",
    related: [
      { href: `${ART}/answer-engine-optimization-aeo`, anchor: "Answer engine optimization (AEO) guide" },
      { href: `${ART}/generative-ai-score-websites`, anchor: "How AI engines score a website" },
      { href: `${ART}/seo-is-dead`, anchor: "Is SEO dead in 2026?" },
      { href: "/max-petrusenko-aeo-geo", anchor: "AEO and GEO work by Max Petrusenko" },
    ],
  },
  [`${ART}/n8n-workflow-automation`]: {
    title: "n8n Workflow Automation: Zero to Production",
    h1: "n8n Workflow Automation: Error Handling, Retries, Monitoring",
    leadPrefix:
      "n8n workflow automation holds up in production when you design for failure: retries, error branches, and monitoring.",
    tldr: "n8n workflows survive production when they are built for failure from the start. This guide covers getting started, API integration patterns, error handling and retry logic, custom node development, monitoring and debugging, and real-world examples, so a workflow that works once keeps working on day ninety.",
    related: [
      { href: "/n8n-automation", anchor: "n8n automation consulting" },
      { href: "/ai-workflow-automation", anchor: "AI workflow automation" },
      { href: `${ART}/chatgpt-api-integration`, anchor: "ChatGPT API integration best practices" },
      { href: "/tech/ai-automation", anchor: "AI automation services" },
    ],
    hasFaq: true,
  },
  [`${ART}/openclaw-installation-playbook`]: {
    title: "OpenClaw Install Guide for Teams (2026)",
    h1: "OpenClaw Installation Guide: Teams, Helm, Railway, Dokploy",
    leadPrefix:
      "OpenClaw installation goes wrong when permissions, environments, and cutover order are left to guesswork.",
    tldr: "Installing OpenClaw for a team goes smoothly when you settle the environment, permissions, and cutover order first. This playbook lists what to check before installing, the supported deployment targets (Helm, Railway, Dokploy), Microsoft Teams integration notes, the install sequence I use, common mistakes, and post-install validation.",
    related: [
      { href: `${ART}/claude-code-setup`, anchor: "Claude Code setup for development teams" },
      { href: "/claude-code-consultant", anchor: "Claude Code consultant" },
      { href: "/tech/ai-automation", anchor: "AI automation services" },
      { href: "/tech/case-studies", anchor: "Automation case studies" },
    ],
  },
  [`${ART}/seo-is-dead`]: {
    title: "Is SEO Dead in 2026? Search Plus Answers",
    h1: "Is SEO Dead in 2026? Search and Answers Now Run Together",
    leadPrefix:
      "Is SEO dead? No, but ranking alone no longer covers how people find answers.",
    tldr: "SEO is not dead in 2026, but ranking alone is no longer enough. Visibility now comes from classic search plus citations in AI answers. This article explains what still works, what changed, a dual-engine model for building for both, and a short self-audit you can apply to your own site.",
    related: [
      { href: `${ART}/answer-engine-optimization-aeo`, anchor: "Answer engine optimization (AEO) guide" },
      { href: `${ART}/generative-engine-optimization-geo`, anchor: "GEO framework and roadmap" },
      { href: `${ART}/generative-ai-score-websites`, anchor: "How AI engines score a website" },
      { href: "/max-petrusenko-aeo-geo", anchor: "AEO and GEO work by Max Petrusenko" },
    ],
  },
  "/tech/ai-automation": {
    title: "AI Automation Services: Claude Code, n8n",
    h1: "Production-Grade AI Automation Services",
    leadPrefix: "AI automation services, built and shipped by one engineer.",
    tldr: "I build AI automation for content workflows, API integrations, and business processes using Claude Code, n8n, and ChatGPT integrations. Work is remote-first. Simple setups take one to two weeks and custom systems three to six, with the timeline agreed during discovery before any build starts.",
    related: [
      { href: "/tech/case-studies", anchor: "Automation case studies" },
      { href: "/n8n-automation", anchor: "n8n automation consulting" },
      { href: "/claude-code-consultant", anchor: "Claude Code consultant" },
      { href: "/tech/articles/n8n-workflow-automation", anchor: "n8n workflow automation guide" },
    ],
  },
};
