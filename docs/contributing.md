Contributing to Ferdy

Welcome!
This document outlines how to work safely and consistently inside the Ferdy codebase.

It is written for:

Humans

AI agents (Cursor / ChatGPT)

Future team members

Follow these rules to keep the system stable and documentation accurate.

📁 Project Overview

Ferdy is an automated social-media publishing system built on:

Next.js (App Router) — UI + API routes

Supabase — Postgres, RLS, storage, auth, pg_cron, SQL functions

OpenAI — copy generation

Social APIs — Meta (FB/IG), LinkedIn

3rd-party Cron — triggers publishing engine

Core automation system flows:

Category Creation

Schedule Rules

Framework Targets

Push to Drafts

Draft Lifecycle

Post Jobs & Publishing Engine

Copy Generation

Asset Selection

Brand Settings

All processes are documented in:

docs/processes/

🌱 Branching Model
Main rules

main → production

dev → safe working branch

feature/<name> → all new work

Workflow

Create a branch:
git checkout -b feature/<short-name>

Make changes

Update docs (see below)

Merge into dev

Deploy preview

Merge into main only when approved

This ensures production never breaks.

📄 Documentation Rules (VERY IMPORTANT)

Ferdy has a strict documentation system because the app is highly automated.

Whenever you:

✔ Add a new process

You must:

Create:
docs/processes/<process_name>.md

Add:

TL;DR

Purpose

Data flow

Tables/functions touched

Mermaid diagram

Add the process to the index:
docs/processes/README.md

✔ Modify an existing process

If you change anything in code that affects behaviour:

Update the relevant markdown file

Update the Mermaid diagram (if flow changed)

Add a “Change Log” entry at the bottom:

## Change Log
- 2025-12-06: Updated schedule_rules to support multi-times-of-day.

✔ AI tools (Cursor, ChatGPT) MUST:

Read the relevant process document before changing anything

Not modify a process without updating the doc

Reference doc paths in PRs

🧪 Local Development
Install dependencies
npm install

Environment variables

Copy .env.example into .env.local and fill:

Supabase URL + anon key

Supabase service key (server-side only)

OpenAI API key

Meta / LinkedIn API keys

Dev server
npm run dev

🗄️ Supabase Rules
If you modify SQL (tables, views, functions):

You must:

Save a migration (supabase/migrations/<timestamp>_<name>.sql)

Update the relevant process doc

Verify:

RLS policies still allow required access

Queries in Next.js still match the schema

Run migrations locally before pushing

Never manually change production SQL from the Supabase dashboard without creating a migration file.

🤖 AI Contribution Guidelines (Cursor / ChatGPT)

AI tools should follow these rules:

MUST:

Read the relevant process docs before editing

Respect file structure (no nested docs folders)

Keep code + docs consistent

Ask for missing context rather than guessing

Prefer minimal changes over rewrites

MUST NOT:

Modify SQL functions without updating their documentation

Create new folders randomly

Delete Mermaid diagrams

Change behaviour unless explicitly asked

📦 Adding New Features

Before creating a new feature:

Check whether it affects:

Category creation

Scheduling

Framework target logic

Push to drafts

Draft lifecycle

Publishing engine

Copy generation

Assets

Brand settings

If yes → update docs before writing code

If no → still add a new process doc if the feature is self-contained

Add tests (manual or automated) for the flow

🔍 Code Style Guidelines
General

Use TypeScript everywhere

Keep components small and focused

Never hardcode brand IDs

Continue following Ferdy’s established folder architecture

API routes

Validate ALL input with zod

Return structured errors

Add logging (Console.info / .error) in critical flows

SQL

Prefer SQL functions (rpc_…) for reusable logic

Add comments to SQL functions

Always consider timezone impact (AT TIME ZONE)

🐞 Debugging / Troubleshooting
Push to Drafts

Check Vercel logs for /api/drafts/push

Check Supabase logs for rpc_push_to_drafts_now

Verify framework targets via rpc_framework_targets

Publishing

Check cron-job.org logs

Check Vercel logs for /api/publishing/run

Inspect failed post_jobs

Copy Generation

Check drafts.copy_status

Inspect OpenAI error logs

Check brand examples in brand_post_information

🎉 Final Notes

Keep PRs small

Always keep process docs fresh

Treat process docs as the source of truth

When in doubt: update the docs first, code second

Ferdy’s power comes from its automation system —
these docs ensure nothing breaks as the system evolves.