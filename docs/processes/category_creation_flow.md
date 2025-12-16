# Category / Subcategory Creation Flow — Ferdy

## TL;DR (for AI tools)

“Categories” in the UI are stored as **`subcategories`** in the database.  
The **Create Category** wizard (4 steps: Type → Details → Schedule → Images) does the following:

- Creates/updates a row in `subcategories` for the category itself.
- Creates one or more `schedule_rules` rows (and `event_occurrences` for events).
- Links selected assets to the category via `tags` and `asset_tags`.
- Optionally refreshes the URL summary for the category URL.
- After images are linked, it triggers `/api/drafts/generate` to generate drafts for the brand.

Saving happens **when moving from Step 3 → Step 4** (subcategory + schedule), and assets are linked + drafts pushed on **Finish**.

---

## 1. What this process does (business-level)

In Ferdy, a **Category** is a repeatable type of post (Testimonials, Events, Promos, etc.).  
It stores all the information Ferdy needs to automatically generate ongoing social posts:

- **What it is** — name, description, type.
- **Where it points** — URL to pull extra context and send traffic.
- **How it looks** — the images/videos to choose from.
- **How it sounds** — default hashtags and copy length.
- **When it runs** — weekly or monthly schedule, time, timezone.

In the database, Categories are stored in the **`subcategories`** table.

Once a Category is set up:

- It becomes part of the brand's **framework**.
- The draft generator uses these settings (via `schedule_rules` and `rpc_framework_targets`) to generate scheduled drafts on a rolling 30-day window.
- Assets chosen in Step 4 become the **asset pool** for that Category.
- The ongoing automation loop is:
  1. User sets up Categories.
  2. Ferdy automatically generates drafts (nightly generator).
  3. User approves drafts.
  4. Ferdy publishes them at the right time.

---

## 2. Where users create a Category in the UI

- Location: **Engine Room → Categories**  
  URL pattern:  
  `https://www.ferdy.io/brands/{brand_id}/engine-room/categories`

- Button: **“Add Category”**

This launches the **Create Category** wizard: a 4-step flow.

---

## 3. Data model — `subcategories` (UI: Categories)

In code and DB, Categories live in the `subcategories` table.

**Table: `subcategories`**

| Column                | Type                         | Null? | Default             | Purpose |
|-----------------------|------------------------------|-------|---------------------|---------|
| `id`                  | `uuid`                       | NO    | `gen_random_uuid()` | Unique ID for the category. |
| `brand_id`            | `uuid`                       | NO    |                     | Brand this category belongs to. |
| `category_id`         | `uuid`                       | YES   |                     | Optional higher-level grouping (if used). |
| `name`                | `text`                       | NO    |                     | Category name shown in UI (e.g. “Testimonials”). |
| `detail`              | `text`                       | YES   |                     | Description / guidance for Ferdy’s copy. |
| `url`                 | `text`                       | YES   |                     | Default URL for this category’s posts. |
| `default_hashtags`    | `text[]`                     | YES   |                     | Default hashtags to apply. |
| `created_at`          | `timestamptz`                | YES   | `now()`             | When the category was created. |
| `channels`            | `text[]`                     | YES   | `'{}'::text[]`      | Channels for this category (e.g. `instagram_feed`, `linkedin_profile`). |
| `url_page_summary`    | `text`                       | YES   |                     | Summary of the page at `url` (fetched via refresh-url-summary). |
| `subcategory_type`    | `text`                       | NO    | `'unspecified'`     | Category type (events vs services vs promos). |
| `settings`            | `jsonb`                      | NO    | `'{}'::jsonb`       | Structured settings per type. |
| `default_copy_length` | `text`                       | YES   | `'medium'`          | Default copy length (short/medium/long). |
| `post_time`           | `time without time zone`     | YES   |                     | Default posting time if used (may be overridden by schedule rules). |

---

## 4. Wizard steps → Fields

The Category wizard has 4 steps:

1. **Type**
2. **Details**
3. **Schedule**
4. **Images**

### Step 1 — Type

User chooses one of:

- **Events**  
- **Products / Services**  
- **Promos**

These map to **`subcategory_type`** in the DB.

Current code (from `FrameworkItemWizard.tsx`) uses values like:

- `event_series`
- `service_or_programme`
- `promo_or_offer`

(Older/other rows may use `'unspecified'`.)

> ⚠ Note: if you later align these to `event`/`promotion`, you should update both the wizard options and any dependent logic. This doc reflects current implementation.

---

### Step 2 — Details

Fields:

- **Name*** → `subcategories.name`
- **Description*** → `subcategories.detail`
- **URL (optional)** → `subcategories.url`
- **Default hashtags (optional)** → `subcategories.default_hashtags` (text[])
- **Channels*** → `subcategories.channels` (text[]: e.g. `instagram_feed`, `instagram_story`, `facebook`, `linkedin_profile`)
- **Post length (default for this category)*** → `subcategories.default_copy_length` (`short` | `medium` | `long`)

These fields are all part of the **subcategory** itself and are saved via Supabase client calls in the wizard.

---

### Step 3 — Schedule

Question: **“How often should this post?”**

Two main frequency options:

1. **Weekly**
   - Choose days of the week (Mon–Sun).
   - Choose time of day.
   - Choose timezone.

2. **Monthly**
   - Either:
     - Pick specific days of the month (1–31), **or**
     - “Or post on” → an ordinal (First, Second, etc.) + weekday.
   - Choose time of day.
   - Choose timezone.

These do **not** write to `subcategories` directly.  
Instead, they create or update entries in:

- **`schedule_rules`**  
- For event-style categories, also **`event_occurrences`**

The wizard maintains schedule state as:

- `eventScheduling` (for events)
- `schedule` (for other types)

We document `schedule_rules` and `event_occurrences` in more depth in the **Schedule Rules** process doc; here we just note they are created as part of this flow.

---

### Step 4 — Images

User chooses:

- **Upload new**  
- **Use existing**  
- `+ Upload Content` button

The wizard then:

- Finds or creates a **tag** in the `tags` table:
  - `name = details.name`
  - `kind = 'subcategory'`
- Links selected assets to that tag via the **`asset_tags`** table.
- Avoids duplicate links by checking for existing `asset_tags` before inserting.

These tags + asset links are later used to pick images for this category via:

- `rpc_pick_asset_for_rule(schedule_rule_id)`
- Image filtering in the Content Library.

---

## 5. Underlying logic & main component

The main implementation lives in:

- **File:** `src/components/wizards/FrameworkItemWizard.tsx`

Key functions:

- **`handleFinish()`** — called when user clicks **“Finish”** on Step 4 (Images).
- **`ensureSubcategorySaved()`** — core save function for Steps 1–3.

### 5.1 `ensureSubcategorySaved()`

Responsibilities:

1. Validate Steps 1–3 data (type, details, schedule).
2. Insert or update the **`subcategories`** row.
3. Create or update **`schedule_rules`** corresponding to the selected schedule.
4. If the type is events, create **`event_occurrences`** rows based on the event schedule.
5. Return the `subcategoryId`.

This function calls Supabase directly from the client, e.g.:

- Insert into `subcategories`
- Insert into `schedule_rules`
- Insert into `event_occurrences` (for event types)

There is **no API route** for the main save; it uses Supabase client calls.

> Important: This save usually happens when moving from **Step 3 → Step 4**, so by the time the user is on Images, the subcategory + schedule already exist.

---

### 5.2 URL summary refresh: `/api/subcategories/[id]/refresh-url-summary`

After the subcategory is saved, the wizard calls a fire-and-forget API route:

- **Route:** `POST /api/subcategories/${subcategoryId}/refresh-url-summary`
- Purpose:
  - Fetch the page at `subcategories.url`
  - Generate a `url_page_summary`
  - Save it back to `subcategories.url_page_summary`

This gives the AI more context when generating copy for this category.

This call does not block the wizard; if it fails, the category is still created.

---

### 5.3 `handleFinish()` — Finish button on Step 4

When the user clicks **Finish**:

1. **Ensure subcategory exists**
   - If it hasn’t been saved yet, calls `ensureSubcategorySaved()`.

2. **Link images to the category**
   - Using `selectedAssetIds`:
     - Finds/creates a `tags` row with kind `'subcategory'` + name = category name.
     - Links each selected asset to that tag via `asset_tags`.
     - Skips links that already exist.

3. **Trigger auto Push to Drafts**
   - After assets are linked, it calls the Push to Drafts API for this brand:

     ```ts
     await fetch('/api/drafts/push', {
       method: 'POST',
       body: JSON.stringify({ brandId }),
       ...
     });
     ```

   - This invokes the draft generation flow documented separately:
     - `generateDraftsForBrand` (shared utility)
     - `drafts`, `post_jobs` creation
     - Automatic AI copy generation

4. **Redirect**
   - Navigates the user back to the **Categories** page.

Net effect: after finishing the wizard, the brand immediately gets a fresh set of drafts for this category, using the schedule and assets just configured.

---

## 6. Save timing and behaviour

- **When do we write the subcategory and schedule?**
  - On Step 3 completion (moving to Step 4), `ensureSubcategorySaved()` runs:
    - `subcategories` row created/updated.
    - `schedule_rules` and `event_occurrences` created/updated.

- **When do we link assets and generate drafts?**
  - On **Finish (Step 4)**:
    - Assets are tagged and linked.
    - `/api/drafts/push` is called for this brand.

- **Editing existing categories**
  - The same wizard is used; `ensureSubcategorySaved()` performs `update` rather than `insert` when there’s an existing `subcategoryId`.
  - Schedule changes will update `schedule_rules` / `event_occurrences`.
  - Images page can add/remove asset links via tags.

---

## 7. Dependencies on other processes

Category Creation interacts with several other documented processes:

- **Schedule Rules**
  - Created/updated during Step 3.
  - Used by `rpc_framework_targets` and the publishing pipeline.

- **Event Occurrences**
  - Used for event-type categories to represent multiple dates for the same event series.

- **Draft Generation**
  - Triggered after Finish via `/api/drafts/generate`.
  - Uses `schedule_rules`, `subcategories`, assets, etc.
  - Generates drafts for the next 30 days automatically.

- **Copy Generation**
  - Uses `subcategory_type`, `detail`, `url`, `url_page_summary`, `default_copy_length`, and the schedule info to build prompts.

---

## 8. History / notes

- **2025-12-05** — Category Creation flow documented based on `FrameworkItemWizard.tsx`, `subcategories` schema, and related Supabase functions.
- Behaviour may change if:
  - `subcategory_type` values are standardised (`event`, `promotion`, etc.).
  - Scheduling frequency types are expanded.
  - Asset-linking logic or tag structure is updated.

Mermaid
flowchart TD
    U[User] -->|Clicks 'Add Category'| W[Category Wizard]

    subgraph Wizard Steps
        W --> S1[Step 1: Type\n(event / service_or_programme / promo)]
        S1 --> S2[Step 2: Details\nname, description, URL, hashtags, channels, copy length]
        S2 --> S3[Step 3: Schedule\nweekly/monthly/specific, days, time, timezone]
        S3 --> S4[Step 4: Images\nupload or choose existing]
    end

    S3 -->|Next / auto-save| ENSURE[ensureSubcategorySaved()]
    ENSURE --> SUBC[(subcategories)]
    ENSURE --> SR[(schedule_rules)]
    ENSURE --> EO[(event_occurrences\nonly for event types)]

    S4 --> FINISH[handleFinish()]
    FINISH --> TAGS[(asset_tags\nlink assets to subcategory tag)]
    FINISH --> URLSUM[/api/subcategories/{id}/refresh-url-summary/]
    FINISH -->|optionally| PUSHBTN[User clicks 'Push to Drafts']

    PUSHBTN --> APIPUSH[/api/drafts/push/]
