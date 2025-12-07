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
        SUPA --> FUNCS[[SQL Functions\nrpc_framework_targets,\nrpc_push_to_drafts_now,\nrpc_pick_asset_for_rule]]
        SUPA --> CRON[[pg_cron\nrun_framework_push_monthly]]
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
