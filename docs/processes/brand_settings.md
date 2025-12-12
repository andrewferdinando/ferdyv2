# Brand Settings & AI Analysis

## TL;DR (for AI tools)

Brand-level settings live in **two tables**:

- `brands` — core identity and global defaults (timezone, name, website, default post time, AI brand summaries).
- `brand_post_information` — AI-derived posting info (examples, tone, average length) and **Engine Room overrides** for copy length & post time.

These settings are used to:

- Control default **timezone & post time** when creating schedule rules and drafts.
- Provide **brand examples and tone** to the copy generation pipeline.
- Set default **copy length** for new Categories (subcategories).

---

## 1. Tables & fields

### 1.1 `brands` (core brand record)

**Table:** `brands`

| Column                        | Type                    | Default                     | Purpose |
|-------------------------------|-------------------------|-----------------------------|---------|
| `id`                          | uuid                    | `gen_random_uuid()`         | Primary key. |
| `name`                        | text                    |                             | Brand name (used in UI). |
| `timezone`                    | text                    | `'Pacific/Auckland'`        | Brand's canonical timezone. Used when computing local schedule times, framework targets, etc. **⚠️ IMMUTABLE after creation** - cannot be changed via UI to prevent scheduling conflicts. |
| `country_code`                | text                    | `NULL`                      | Optional country (e.g. `NZ`). Can guide localisation and scheduling in future. |
| `website_url`                 | text                    | `NULL`                      | Main website URL. Used by copy generation and other AI features. |
| `default_post_time`           | time without time zone  | `NULL`                      | Legacy/global default post time. Current Engine Room UI may prefer `brand_post_information.default_post_time` instead (see below). |
| `ai_summary`                  | text                    | `NULL`                      | Free-text AI-generated summary of the brand. |
| `ai_summary_last_generated_at`| timestamptz             | `NULL`                      | When `ai_summary` was last updated. |
| `brand_summary`               | jsonb                   | `NULL`                      | Structured AI summary (tone, value props, etc.). |
| `brand_summary_status`        | text                    | `'idle'`                    | Status of brand summary generation pipeline (`idle`, `running`, `done`, `failed`). |
| `brand_summary_updated_at`    | timestamptz             | `NULL`                      | Last time `brand_summary` was updated. |
| `created_at`                  | timestamptz             | `now()`                     | When the brand record was created. |

**Conceptual use:**

- `timezone` is the **core authority** for all time calculations.
- `website_url` and `brand_summary` feed into AI prompts (and future features).
- `default_post_time` is a basic global “preferred posting time” but is effectively superseded by more specific Engine Room settings in `brand_post_information`.

---

### 1.2 `brand_post_information` (AI + Engine Room posting defaults)

**Table:** `brand_post_information`

| Column               | Type                    | Default                | Purpose |
|----------------------|-------------------------|------------------------|---------|
| `id`                 | uuid                    | `gen_random_uuid()`    | Primary key. |
| `brand_id`           | uuid                    |                        | FK to `brands.id`. One row per brand. |
| `created_at`         | timestamptz             | `now()`                | When this record was created. |
| `updated_at`         | timestamptz             | `now()`                | When this record was last updated. |
| `analysed_at`        | timestamptz             | `now()`                | When the last social-post analysis ran. |
| `avg_char_length`    | numeric                 | `NULL`                 | Average character length of analysed posts (used to infer natural post length). |
| `avg_word_count`     | numeric                 | `NULL`                 | Average word count of analysed posts. |
| `fb_post_examples`   | text[]                  | `'{}'::text[]`         | Sample Facebook post texts used as brand examples. |
| `ig_post_examples`   | text[]                  | `'{}'::text[]`         | Sample Instagram post texts used as brand examples. |
| `post_tone`          | text                    | `NULL`                 | High-level description of tone (e.g. “friendly, energetic, emoji-heavy”). |
| `default_copy_length`| text                    | `NULL`                 | Preferred copy length for this brand (`short` / `medium` / `long`). This is set via Engine Room and used as the default for new Categories. |
| `default_post_time`  | time without time zone  | `NULL`                 | Preferred daily posting time for this brand. This is the main Engine Room setting used as a default when creating schedule rules. |

**Conceptual use:**

- This table is the **bridge** between:
  - AI analysis of historic posts, and
  - human-configured defaults in the Engine Room UI.
- It feeds both **copy generation** and **Category/Schedule defaults**.

---

## 2. Engine Room: Brand-level settings

In the Ferdy UI, there is an **Engine Room** section where the user configures brand-level behaviour:

1. **Default Post Time card**
   - Lets the user set “What time of day should Ferdy normally post?”
   - Writes to `brand_post_information.default_post_time`.
   - This value is used to:

     - Pre-fill the time field in the Category wizard (Step 3: Schedule) for new categories.
     - Serve as fallback when schedule rules are generated (time-of-day inferred if absent).

2. **Default Copy Length card**
   - Lets the user set “How long should Ferdy write posts by default?”
   - Writes to `brand_post_information.default_copy_length`.
   - This value is used when:

     - Creating new Categories: `subcategories.default_copy_length` is initialised from this brand default.
     - Building `DraftCopyInput` for copy generation: if no explicit length override is passed, the pipeline falls back to the subcategory’s `default_copy_length`, which ultimately derives from this setting.

**Precedence (conceptual):**

- For **post time**:
  1. Category-specific schedule rule time (`schedule_rules.time_of_day` / `times_of_day`)
  2. Brand Engine Room default: `brand_post_information.default_post_time`
  3. Brand legacy default: `brands.default_post_time` (if still used anywhere)
  4. Hard-coded fallback (e.g. 10:00 AM)

- For **copy length**:
  1. Explicit length option in the copy payload (if ever added).
  2. Category setting: `subcategories.default_copy_length`
  3. Brand Engine Room default: `brand_post_information.default_copy_length`
  4. Hard-coded fallback: `"medium"`

---

## 3. AI brand analysis flow

The `brand_post_information` record is also where AI analysis results are stored.

High-level flow:

1. **Fetch examples**
   - For a brand with connected FB/IG accounts:
     - Fetch ~10 recent posts per channel via APIs.
   - Store raw texts in:
     - `fb_post_examples`
     - `ig_post_examples`

2. **Analyse style**
   - A separate job or endpoint analyses these examples:
     - Calculates `avg_char_length` and `avg_word_count`.
     - Infers tone: emojis, formality, typical structure.
     - Generates `post_tone` (human-readable description).
     - Optionally writes into `brands.brand_summary` and `brands.ai_summary`.

3. **Store results**
   - Persist into `brand_post_information` and `brands`.
   - Update `analysed_at` and `updated_at`.

4. **Use in copy generation**
   - `processBatchCopyGeneration()` and its prompt builder:
     - Include `fb_post_examples` & `ig_post_examples` as reference snippets.
     - Refer to `post_tone` / `brand_summary` in the system prompt.
     - Use `avg_char_length` / `avg_word_count` to support the chosen `default_copy_length`.

This makes copy feel **on-brand** even when it’s fully AI generated.

---

## 4. Where brand settings are used in other processes

### 4.1 Category Creation (`category_creation_flow.md`)

- Step 2 (Details):
  - Copy length radio buttons default to `brand_post_information.default_copy_length` when a new category is created.
- Step 3 (Schedule):
  - Time picker defaults to `brand_post_information.default_post_time`.
  - Timezone picker defaults to `brands.timezone`.

### 4.2 Schedule Rules (`schedule_rules.md`)

- When `schedule_rules` are created from the wizard:
  - `time_of_day` / `times_of_day` default to `brand_post_information.default_post_time` if user has not changed it.
  - `timezone` defaults to `brands.timezone`.

### 4.3 Framework Targets (`rpc_framework_targets.md`)

- Uses `brands.timezone` as the **effective timezone fallback** when computing scheduled times and converting them to UTC.

### 4.4 Push to Drafts (`push_to_drafts.md`)

- When `rpc_push_to_drafts_now` runs:
  - It uses `brands.timezone` and schedule rule times to set `drafts.scheduled_for` and `scheduled_for_nzt` (or equivalent local time).
  - The **presence** of `default_post_time` on brand/brand_post_information influences how schedule rules are populated, and therefore which timestamps `rpc_framework_targets` generates.

### 4.5 Copy Generation (`copy_generation.md`)

- Uses:

  - `brand_post_information.fb_post_examples`
  - `brand_post_information.ig_post_examples`
  - `brand_post_information.post_tone`
  - `brand_post_information.default_copy_length` (via subcategories)

  plus:

  - `brands.website_url`
  - `brands.brand_summary` / `brands.ai_summary` (if present)

to generate prompts for OpenAI.

---

## 5. Notes & future extensions

### Timezone Immutability

**Important:** The `timezone` field is **immutable after brand creation**. This is enforced in the UI:

- **Brand Settings page** (`/brands/[brandId]/account/brand`): Timezone field is read-only and disabled with a warning message.
- **Add Brand onboarding** (`/account/add-brand`): Shows a warning that timezone cannot be changed after creation.

**Rationale:** Changing timezone after brand creation would cause scheduling conflicts:
- Existing scheduled posts would be at the wrong time (e.g., a post scheduled for 2pm NZT would become 2pm UTC if timezone changed).
- Historical data would be confusing (posts published at "wrong" times).
- Matches behavior of other platforms (e.g., Meta doesn't allow timezone changes).

If a brand genuinely needs to change timezone (e.g., relocation), it must be done manually by support with proper migration of all scheduled posts.

### Possible Future Settings

Possible future settings that should live here:

- Per-brand emoji preferences (`emoji: "heavy" | "light" | "none"`).
- CTA preferences (e.g. “book now”, “learn more”, “visit our website”).
- Default channels per brand (used to preselect checkboxes in category wizard).
- Language / locale override (if different from country/code).

When you add fields to `brands` or `brand_post_information`, update this doc and any process docs that depend on them:

- `category_creation_flow.md`
- `schedule_rules.md`
- `push_to_drafts.md`
- `copy_generation.md`

Mermaid:
flowchart TD
    B[(brands)] --> ENGINEUI[Engine Room UI]
    BPI[(brand_post_information)] --> ENGINEUI

    ENGINEUI -->|set default time| BPI
    ENGINEUI -->|set default copy length| BPI

    BPI --> CATWIZ[Category Wizard]
    B --> CATWIZ

    CATWIZ --> SUBC[(subcategories\n.default_copy_length,\n.schedule defaults)]
    BPI --> COPY[Copy Generation]
    B --> COPY

    COPY --> DRAFTS[(drafts)]
