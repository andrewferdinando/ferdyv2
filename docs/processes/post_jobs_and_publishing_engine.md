# post_jobs & Publishing Engine

> **Updated:** 2025-01-XX — Clarified channel normalization, post_jobs.schedule_rule_id always set, draft ↔ post_jobs relationship, UI channel status rendering, and Approve & Publish Now flow.

## TL;DR (for AI tools)

- `post_jobs` is the **per-channel publishing unit**.
- **One draft = one scheduled post time**; a **Draft** can have multiple `post_jobs` (one per channel).
- Channels come from `schedule_rules.channels` (normalized text array).
- `post_jobs.schedule_rule_id` is **always set** (never null) for framework-generated drafts.
- The publishing engine:
  - Selects due `post_jobs` (`status = 'pending'` and `scheduled_at <= now()`).
  - Publishes them via the appropriate social API.
  - Updates `post_jobs.status` and error fields.
  - Rolls the result back up to the parent **Draft** (`status` / `publish_status` / `published_at`).

Two cron systems:

- **Vercel Cron** → nightly automatic draft generation (`/api/drafts/generate-all`).  
- **3rd-party cron (e.g. cron-job.org)** → calls `/api/publishing/run` on Vercel frequently to process `post_jobs`.

---

## 1. `post_jobs` table schema & meaning

**Table:** `post_jobs`

| Column             | Type                    | Default           | Purpose |
|--------------------|-------------------------|-------------------|---------|
| `id`               | uuid                    | `gen_random_uuid()` | Primary key for the job. |
| `brand_id`         | uuid                    |                   | Brand that owns this job. |
| `schedule_rule_id` | uuid                    | `NULL`            | The `schedule_rules.id` that generated this job. **Always set (never null) for framework-generated drafts.** `NULL` for one-off manual posts. |
| `channel`          | text                    |                   | Target channel (normalized), e.g. `instagram_feed`, `instagram_story`, `facebook`, `linkedin_profile`. Channels are normalized: `instagram` → `instagram_feed`, `linkedin` → `linkedin_profile`. |
| `target_month`     | date                    |                   | Month this job belongs to (used for reporting & grouping, usually derived from `scheduled_at`). |
| `scheduled_at`     | timestamptz             |                   | UTC datetime when Ferdy should publish this job. |
| `scheduled_local`  | timestamptz             | `NULL`            | Convenience local datetime (brand / rule timezone) used by the UI. |
| `scheduled_tz`     | text                    | `NULL`            | Timezone identifier used to compute `scheduled_local`. |
| `status`           | text                    | `'pending'`       | Publishing state: typically `pending`, `success`, `failed`, `cancelled` (and sometimes `retrying`). |
| `error`            | text                    | `NULL`            | Last error message from the provider or internal error, if any. |
| `created_at`       | timestamptz             | `now()`           | When the job was created. |
| `draft_id`         | uuid                    | `NULL`            | The Draft this job belongs to. A draft may have multiple jobs (one per channel). |
| `external_post_id` | text                    | `NULL`            | ID of the post returned by the provider (e.g. Meta post ID). |
| `external_url`     | text                    | `NULL`            | Public URL of the published post, if available. |
| `last_attempt_at`  | timestamptz             | `NULL`            | When Ferdy last tried to publish this job. Used for retry logic / diagnostics. |
| `published_at`     | timestamptz             | `NULL`            | When this specific job was successfully published. |

**Conceptual model:**

- Draft = one scheduled post time ("this caption + these assets at this time")
- post_jobs = one record **per channel** for that draft.
- Channels come from `schedule_rules.channels` (normalized text array).
- Each `post_jobs` row has `schedule_rule_id` set (never null for framework-generated drafts).

---

## 2. How `post_jobs` are created

### 2.1 From Draft Generator (`generateDraftsForBrand`)

When the draft generator (`generateDraftsForBrand`) runs (nightly cron or manual trigger):

1. It calls `rpc_framework_targets(p_brand_id)` to get **future posting slots** within a 30-day window for each schedule rule.
2. For each target:
   - Checks if a draft already exists (deduplication).
   - Picks an asset using `rpc_pick_asset_for_rule(schedule_rule_id)` (may be empty if no asset available).
   - Inserts a row into `drafts`:
     - `brand_id`, `subcategory_id`
     - `scheduled_for` (UTC) + `scheduled_for_nzt`
     - `schedule_source = 'framework'`
     - `publish_status = 'draft'` / `status = 'draft'`
     - `approved = false` (user must approve)
     - `asset_ids` pre-populated if an asset is found (may be empty array).
   - Looks up `schedule_rules.channels` to determine which channels to post to.
3. For each channel in `schedule_rules.channels` (normalized):
   - Inserts a `post_jobs` row with:
     - `brand_id`
     - `schedule_rule_id` (always set, never null)
     - `draft_id` (just created)
     - `channel` (normalized: `instagram` → `instagram_feed`, `linkedin` → `linkedin_profile`, etc.)
     - `target_month` (month of `scheduled_at`)
     - `scheduled_at` (UTC)
     - `scheduled_local` + `scheduled_tz` (for brand/rule timezone)
     - `status = 'pending'`.

4. For the first job created:
   - The draft is updated with `post_job_id = <first job id>` for quick linking.

5. Copy generation is automatically triggered for all drafts needing copy (new and existing with placeholder).

Result:  
For each planned post time (`scheduled_at`), you get:

- **1 Draft**
- **N post_jobs** (one per channel)

### 2.2 From New Post (manual schedule)

When a user creates a **New Post** manually on the Schedule page:

- UI collects:
  - Channels
  - Scheduled time
  - Copy, assets, hashtags
- Backend:
  - Creates a `drafts` row with `schedule_source = 'manual'`.
  - Creates `post_jobs` rows in the same way as above (one per channel).
  - Links them via `draft_id` and `post_job_id`.

---

## 3. Publishing Engine overview

Publishing is not driven directly by `drafts` — it's driven by `post_jobs`.

### 3.1 Trigger: 3rd-party cron

Because Vercel can't run native background jobs, Ferdy uses a 3rd-party cron (e.g. **cron-job.org**) to call a publishing route, typically:

```text
GET/POST https://<ferdy-app-domain>/api/publishing/run
Runs every minute or every few minutes.

This route calls a server-side function (e.g. publishDueDrafts.ts) which does the real work.

3.2 Selecting jobs to publish
Inside the publishing engine:

Select all post_jobs that are due:

status = 'pending'

scheduled_at <= now() (or within a small window)

Optionally filtered by brand/limits to avoid huge batches.

Group them by draft_id, so the system can treat each draft across its channels coherently.

3.3 Per-job publishing flow
For each post_jobs row:

**1. Load required data:**

- The parent draft
- The brand's social auth credentials for the specified channel

**2. Automatic Token Refresh (NEW - Dec 2024):**

Before publishing, the system checks if social platform tokens need refreshing:

- If token expires within 7 days, automatically refresh it
- For Meta (Facebook/Instagram): Exchange long-lived token for fresh one
- For LinkedIn: Use refresh_token to get new access token
- Update `social_accounts` table with new token and expiry
- See `social_api_connections.md` for full token refresh details

**3. Build provider-specific payload:**

Copy text (from draft.copy, formatted per channel rules).

Assets (draft.asset_ids, possibly filtered per channel).

Hashtags (merged from draft/category/brand).

Call the channel publisher:

publishToInstagramFeed(...)

publishToInstagramStory(...)

publishToFacebookPage(...)

publishToLinkedInProfile(...)

**4. Handle publishing result:**

**On success:**
- `post_jobs.status = 'success'`
- `post_jobs.external_post_id` set to provider's ID
- `post_jobs.external_url` set to post URL (if available)
- `post_jobs.published_at = now()`
- **Email notification sent** to all brand admins and editors (see `email-notifications.md`)

**On failure:**
- `post_jobs.status = 'failed'`
- `post_jobs.error` set to error message
- **Auth Error Detection (NEW - Dec 2024):**
  - If error indicates authentication failure (invalid_token, expired_token, error codes 190/102/463, etc.)
  - Mark `social_accounts.status = 'disconnected'`
  - **Send disconnection email** to all brand admins and editors
  - Email includes reconnect link and reassuring message
  - See `email-notifications.md` and `social_api_connections.md` for details

**In all cases:**
- `post_jobs.last_attempt_at = now()`

Repeat for all jobs in the batch.

4. Updating Drafts based on post_jobs
After processing jobs for a draft, the engine updates the parent drafts row.

For each draft_id:

Fetch all post_jobs for that draft.

Derive aggregate status:

If all jobs have status = 'success':

drafts.publish_status = 'published'

drafts.status = 'published'

drafts.published_at = MIN(post_jobs.published_at) (or now()).

If at least one success, but at least one failure:

drafts.publish_status = 'partially_published'

drafts.status may remain scheduled or be set to partially_published.

If all jobs failed:

drafts.publish_status = 'failed'

drafts.status may remain scheduled to allow manual retry.

The draft remains fully visible in the UI with the final state and any errors.

5. Publish Now flow

**5.1 Standard Publish Now**

When a user clicks **Publish Now** on a draft:

- The UI sends a request (e.g. POST /api/publishing/publish-now) with the `draft_id`.
- Backend:
  - Finds or creates `post_jobs` for that draft's channels if needed.
  - Overrides any future `scheduled_at` with `now()` for the selected jobs.
  - Immediately calls the same publishing logic used by `/api/publishing/run` for those jobs only (no need to wait for cron).
- The draft's `publish_status`, `status`, and `published_at` are updated exactly as in the scheduled flow.

**5.2 Approve & Publish Now (Edit Post page)**

When a user clicks **Approve & Publish Now** on the Edit Post page:

- **Critical constraint:** This flow **NEVER inserts a new draft**. It only updates the existing draft.
- **Safety assertion:** The code includes a runtime check that throws an error if any `supabase.from('drafts').insert()` call is attempted during this flow.
- **Flow:**
  1. Updates the existing draft row by `draftId`:
     - Sets `approved = true`
     - Updates publish fields as needed
     - Does NOT create a duplicate draft
  2. Ensures `post_jobs` exist for selected channels:
     - Checks for existing `post_jobs` linked to the same `draftId`
     - For missing channels, inserts new `post_jobs` rows (one per channel)
     - Links new jobs to the existing `draftId` (does NOT create new drafts)
  3. Triggers publishing by operating on `post_jobs` for that same `draftId`
  4. Does NOT:
     - Call draft generation
     - Duplicate the draft
     - Insert into `drafts` table
     - Call any RPC/function that inserts drafts
- **Result:** The existing draft is approved and published immediately, with all selected channels processed via their respective `post_jobs`.

6. Error handling & retries
Failures are stored in:

post_jobs.status = 'failed'

post_jobs.error with message.

post_jobs.last_attempt_at for debugging.

Retrying can be implemented in either of two ways:

Manually:

UI exposes a "Retry" button that:

Sets post_jobs.status back to pending

Clears error

Lets the next cron run re-attempt publishing.

Automatically:

Publishing engine selects failed jobs where last_attempt_at is sufficiently old and retries them.

(Exact retry strategy can be adjusted without changing the schema.)

7. Interaction with other processes
Draft Lifecycle:
Drafts drive job creation and are updated by job outcomes. See draft_lifecycle.md for full details.

Schedule Rules & Framework:
schedule_rule_id connects jobs back to the schedule rule that created them. The full timestamp is derived from rpc_framework_targets(p_brand_id).

Draft Generation:
All framework-based post_jobs are created by the draft generator (`generateDraftsForBrand`), which is called by:

Nightly Vercel Cron job (`/api/drafts/generate-all`) for all active brands.

Manual API call (`/api/drafts/generate`) for a specific brand.

Draft Generation vs Publishing Cron:

Draft Generation: Vercel Cron runs `/api/drafts/generate-all` nightly (Pacific/Auckland time) to keep the next 30 days of drafts generated.

Publishing: 3rd-party cron calls `/api/publishing/run` to process post_jobs.

8. History / notes
post_jobs replaced older "single-channel on draft" logic and allows multi-channel publishing from one draft.

Channel names are normalized (e.g. `instagram` → `instagram_feed`, `linkedin` → `linkedin_profile`) to ensure consistency. Normalization happens at save time (UI) and during draft generation. `schedule_rules.channels` stores normalized values, which are used as the single source of truth for creating `post_jobs`.

**Important: Ambiguous Relationship Fix (Dec 2024)**

The `post_jobs` and `drafts` tables have TWO foreign key relationships:
1. `drafts.post_job_id` → `post_jobs.id` (one-to-many)
2. `post_jobs.draft_id` → `drafts.id` (many-to-one)

When querying `post_jobs` with an inner join to `drafts`, you MUST explicitly specify which relationship to use:
```typescript
// ❌ WRONG - causes PGRST201 error
drafts!inner(id, status)

// ✅ CORRECT - specifies the foreign key
drafts!post_jobs_draft_id_fkey!inner(id, status)
```

Without specifying the foreign key, Supabase returns error PGRST201 and the query fails silently, returning 0 results.

**Important: post_jobs Status Constraints**

The `post_jobs` table has a check constraint that only allows these status values:
- `pending` - Initial state for new jobs
- `ready` - Job is ready to be published immediately
- `generated` - Job has been generated and is waiting
- `publishing` - Job is currently being published
- `success` - Job was published successfully
- `failed` - Job failed to publish
- `canceled` - Job was cancelled

**NOT** `scheduled` - that is a draft status, not a post_job status. Attempting to set `post_jobs.status = 'scheduled'` will violate the check constraint and fail.

**Important: UI Channel Status Rendering (Jan 2025)**

The UI displays channel status pills (e.g., "Published", "Pending", "Failed") based on `post_jobs` data:

- **Source of truth:** Channel status pills are rendered **exclusively from `post_jobs`**, never from legacy fields like `drafts.channel` or `drafts.publish_status`.
- **Grouping:** `post_jobs` are grouped by channel (normalized), ensuring only one pill per channel is displayed.
- **Best status wins:** When multiple `post_jobs` exist for the same channel (shouldn't happen, but handled defensively), the UI applies a priority rule:
  - `success`/`published` (highest priority) → Shows "Published"
  - `pending`/`ready`/`generated`/`publishing` → Shows "Pending" or "Scheduled"
  - `failed` → Shows "Failed"
  - `queued`/`running` (lowest priority)
- **Preference:** If multiple jobs have the same priority, the one with `external_url` (provider_post_url) is preferred for the "View post" link.
- **Safeguard:** The UI logs a warning if both `post_jobs` and legacy `draft.channel` are present, confirming it uses `post_jobs` only.
- **Implementation:** `src/components/schedule/DraftCard.tsx` - `normalizedJobs` useMemo groups and selects the best job per channel.

This ensures users see accurate, per-channel status information that reflects the actual publishing state of each channel.

**Important: Token Refresh & Email Notifications (Dec 2024)**

The publishing engine now includes:

1. **Automatic Token Refresh:**
   - Before publishing, checks if social platform tokens expire within 7 days
   - Automatically refreshes Meta (Facebook/Instagram) and LinkedIn tokens
   - Updates `social_accounts` table with fresh tokens
   - Prevents most disconnections - users rarely need to reconnect
   - Implementation: `/src/server/social/tokenRefresh.ts`

2. **Email Notifications:**
   - **Post Published:** Sent to all brand admins/editors after successful publishing
   - **Social Connection Disconnected:** Sent when auth errors are detected
   - Auth error detection uses pattern matching (invalid_token, error codes, etc.)
   - Disconnection email includes reconnect link and reassuring message
   - Implementation: `/src/lib/emails/send.ts` and `/emails/` templates

3. **Disconnection Detection:**
   - Auth failures automatically mark `social_accounts.status = 'disconnected'`
   - Stores error details for debugging
   - Triggers email notification to brand team

See `email-notifications.md` and `social_api_connections.md` for complete details.

**Important: Approve & Publish Now Flow (Jan 2025)**

The "Approve & Publish Now" button on the Edit Post page has specific constraints:

- **Never inserts new drafts:** The flow only updates the existing draft, never creates a duplicate.
- **Safety assertion:** Runtime check prevents any `supabase.from('drafts').insert()` calls during this flow.
- **Post jobs handling:** Creates/updates `post_jobs` for selected channels, linking them to the existing `draftId`.
- **No draft generation:** Does not trigger draft generation or call any RPC/function that inserts drafts.
- **Implementation:** `src/app/(dashboard)/brands/[brandId]/edit-post/[draftId]/page.tsx` - `approveAndPublishNow` function.

This ensures the flow never creates duplicate drafts and always operates on the existing draft.

Any change to:

provider APIs

retry behaviour

supported channels

token refresh logic

email notifications

UI channel status rendering

Approve & Publish Now flow

should be reflected in this file and in related docs:

draft_lifecycle.md

schedule_rules.md

rpc_framework_targets.md

rpc_framework_targets.md

Mermaid:
flowchart TD
    DRAFT[(drafts)] --> PJCREATE[Create post_jobs\n(one per channel)]
    PJCREATE --> PJ[(post_jobs\nstatus='pending')]

    subgraph Cron
        EXTCRON[3rd-party cron\n(e.g. cron-job.org)] --> RUN[/api/publishing/run/]
    end

    RUN --> ENGINE[publishDueDrafts.ts\nPublishing Engine]

    ENGINE -->|selects due| PJ
    PJ --> ENGINE

    ENGINE -->|per job\ncall provider APIs| META[Meta / IG / FB API]
    ENGINE --> LINKEDIN[LinkedIn API]
    ENGINE --> OTHER[Other channels (future)]

    META --> ENGINE
    LINKEDIN --> ENGINE
    OTHER --> ENGINE

    ENGINE -->|update status,\nexternal_post_id/url| PJ
    ENGINE -->|derive aggregate status| DRAFT
