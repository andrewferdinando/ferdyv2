# Cron Job Scaling — Draft Generation

> **Created:** 2026-03-05

## Current Architecture

- **Trigger:** cron-job.org hits `/api/drafts/generate-all` daily at 1am NZT
- **Processing:** Sequential — one brand at a time in a `for` loop
- **Timeout:** cron-job.org has a fixed 30s HTTP response timeout (cosmetic — Vercel keeps running)
- **Vercel function timeout:** `maxDuration = 300` (5 minutes)

## Steady-State Performance

In normal daily operation (not catch-up):
- Brands with no new drafts (all skipped): ~3s per brand
- Brands with 1-2 new drafts + copy generation: ~5s per brand
- **Conservative estimate: ~5 seconds per brand per day**

## Scaling Limits

| Brands | Est. Duration | Status |
|--------|--------------|--------|
| 10     | ~50s         | Safe   |
| 30     | ~2.5 min     | Safe   |
| 50     | ~4 min       | Near limit |
| 60+    | ~5 min+      | Needs fan-out |

## How to Monitor

The `cron_logs` table tracks every execution with `started_at` and `completed_at`. Run this query periodically to check execution times:

```sql
SELECT
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) AS duration_seconds,
  summary->>'brandsProcessed' AS brands,
  summary->>'draftsCreated' AS drafts_created,
  status
FROM cron_logs
WHERE cron_path = '/api/drafts/generate-all'
ORDER BY started_at DESC
LIMIT 10;
```

**Action trigger:** When average duration consistently exceeds **200 seconds** (~50 brands), begin implementing the fan-out pattern.

## Future: Fan-Out Pattern

When the sequential approach hits its limit, refactor to:

1. `/api/drafts/generate-all` becomes a **dispatcher** — returns 200 immediately
2. Dispatcher fetches all active brand IDs
3. For each brand, fires an async request to `/api/drafts/generate?brandId=X` (existing endpoint)
4. Each brand runs as its own serverless function invocation (~5-30s each, in parallel)
5. Logging/summary moves to `cron_logs` per-brand or via a completion callback

**Benefits:**
- Each brand processed independently — one failure doesn't block others
- Parallel execution — 100 brands completes in ~30s instead of ~8 min
- No `maxDuration` concern — each function only handles one brand

**Files to modify:**
- `src/app/api/drafts/generate-all/route.ts` — becomes dispatcher
- `src/app/api/drafts/generate/route.ts` — already exists for single-brand generation
- `cron_logs` — may need per-brand log rows with a shared `batch_id`
