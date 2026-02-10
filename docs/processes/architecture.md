```mermaid
flowchart LR
    U[User] --> UI[Next.js App UI\n(Engine Room, Schedule, Drafts)]

    subgraph Frontend (Vercel)
        UI --> APIRoutes[/Next.js API routes\n/api/.../]
    end

    subgraph Backend Services
        APIRoutes --> SUPA[(Supabase\nPostgres + Auth + Storage)]
        APIRoutes --> OPENAI[[OpenAI\nLLM]]
        APIRoutes --> META[[Meta Graph API\nFB/IG]]
        APIRoutes --> LINKEDIN[[LinkedIn API]]
    end

    subgraph Supabase
        SUPA --> BRANDS[(brands,\nbrand_post_information)]
        SUPA --> SUBC[(subcategories)]
        SUPA --> SR[(schedule_rules)]
        SUPA --> DRAFTS[(drafts)]
        SUPA --> PJ[(post_jobs)]
        SUPA --> RUNS[(runs)]
        SUPA --> ASSETS[(assets,\nasset_tags,\ntags)]
        SUPA --> FUNCS[[SQL Functions\nrpc_framework_targets,\nrpc_pick_asset_for_rule]]
        SUPA --> GEN[[Draft Generator\n(generateDraftsForBrand)]]
    end

    CRON --> FUNCS
    FUNCS --> DRAFTS
    FUNCS --> PJ

    subgraph External Cron
        EXTCRON[3rd-party cron\n(e.g. cron-job.org)]
    end
    EXTCRON --> APIPUB[/api/publishing/run/]
    APIPUB --> PJ
    APIPUB --> DRAFTS

    APIRoutes --> COPYGEN[[processBatchCopyGeneration\n(generateCopyBatch.ts)]]
    COPYGEN --> OPENAI
    COPYGEN --> DRAFTS

    subgraph Draft Generation
        CRON[Vercel Cron\n/api/drafts/generate-all] --> GEN
        API[/api/drafts/generate\n(single brand)] --> GEN
    end

```

## Key notes
- Draft generation is centralized in `src/lib/server/draftGeneration.ts` and is triggered nightly by Vercel Cron (`/api/drafts/generate-all`) or manually for testing (`/api/drafts/generate`), both cron-secret protected. Outputs: drafts on a rolling 30-day window with `approved = false` and `publish_status = 'draft'`; copy is automatic, placeholder copy allowed, images optional; no monthly push or regenerate flows.
- Scheduling flows through `schedule_rules` → `rpc_framework_targets` (prefers `times_of_day`, falls back to `time_of_day`) → draft generator. For `frequency = 'specific'`, the `schedule_rules_specific_chk` constraint enforces valid combinations (start_date + time or offsets via days_before/days_during).
- Wizard (`FrameworkItemWizard.tsx`) upserts one active `schedule_rules` row per subcategory (`schedule_rules_brand_subcategory_unique`), supports days_before and days_during for date ranges, and shows the "Days During" input only when `end_date != start_date`.
- **Lazy asset URL loading:** `useAssets` returns asset metadata instantly (no signed URLs). Consumers call `useAssetUrls(visibleAssets)` to resolve signed URLs only for the 12-30 assets currently on screen. URLs are resolved via parallel `getSignedUrl` calls with a shared 9-minute cache. See `image_processing.md` for details.
