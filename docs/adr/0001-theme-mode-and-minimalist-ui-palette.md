# 1. Dark and Light Theme Support with Minimalist UI Palette

Date: 2026-07-24

## Status

Accepted

## Context

The RAG PDF Chatbot application required dark and light mode toggle capability with an editorial, minimalist UI aesthetic across all pages (Login, Dashboard, Chat, Settings, and Document Management).

## Decision

We adopt `next-themes` for zero-FOUC theme state management (supporting Light, Dark, and System preference) combined with a Warm Monochrome color palette enforced via CSS custom properties and semantic utility classes (`minimal-card`, `minimal-input`, etc.).

## Consequences

- Components use semantic CSS variables (`var(--bg-canvas)`, `var(--surface-card)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--text-muted)`) rather than hardcoded dark/light hex colors.
- FOUC is prevented via `next-themes` HTML class strategy (`class="dark"` / `class="light"`).
- UI adheres strictly to `/minimalist-ui` guidelines: crisp 1px borders, subtle micro-animations, and muted pastel status badges.
