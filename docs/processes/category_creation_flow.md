# Category / Subcategory Creation Flow — Ferdy

> **Updated:** 2026-02-27 — Draft generation now happens on Finish (Step 4), not Step 3. Generator skips categories with `setup_complete=false`. Double-click guard added to wizard buttons.

## TL;DR (for AI tools)

"Categories" in the UI are stored as **`subcategories`** in the database.

**Create mode** uses a 4-step wizard (Type → Details → Schedule → Images).
**Edit mode** uses an accordion layout where all sections (Details, Schedule, Images) are expandable panels — the user can jump directly to any section without stepping through.

Both modes:

- Create/update a row in `subcategories` for the category itself.
- Create or update `schedule_rules` rows (and `event_occurrences` for events).
- Link selected assets to the category via `tags` and `asset_tags`.
- Optionally refresh the URL summary for the category URL.

**Create mode:** Saving the subcategory + schedule happens when moving from Step 3 → Step 4 (via `ensureSubcategorySaved()`). Assets are linked and draft generation is triggered on **"Finish and Generate Drafts"** (Step 4). The category is created with `setup_complete=false` until Step 4 completes.
**Edit mode:** A single "Save changes" (or "Save & generate drafts" for draft categories) button calls `handleFinish()` → `ensureSubcategoryUpdated()`, which updates all data (subcategory, schedule, assets) in one pass.

**Safety guards:**
- The draft generator **skips categories with `setup_complete=false`**, preventing premature draft creation during wizard setup.
- A **double-click guard** (ref lock) prevents `handleNext` and `handleFinish` from running concurrently.

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

- Button: **"Add Category"** → launches the **Create Category** wizard (4-step flow).
- Each category row also has an **Edit** action → opens the **Edit Category** accordion layout.

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

## 4. Create mode — Wizard steps → Fields

The **create mode** wizard has 4 steps:

1. **Type**
2. **Details**
3. **Schedule**
4. **Images**

> In **edit mode**, Steps 2–4 are presented as accordion sections (Details, Schedule, Images) instead of sequential steps. The Type is shown as a read-only badge. All fields are identical — only the layout differs. See [Section 4.5](#45--edit-mode-accordion-layout) below.

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
- **Channels*** → `subcategories.channels` (text[]: e.g. `instagram`, `instagram_story`, `facebook`, `linkedin`)
  - Channels are normalized when saved to `schedule_rules.channels`: `instagram` → `instagram_feed`, `linkedin` → `linkedin_profile`
  - Normalized channels are used by draft generation as the single source of truth
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

### 4.5 — Edit mode: Accordion layout

When editing an existing category, the UI shows an **accordion layout** instead of the stepped wizard:

- **Type badge** — read-only pill at the top showing the category type (e.g. "Events"). Not editable.
- **Details section** — collapsible panel containing all Step 2 fields (name, description, URL, hashtags, channels, copy length).
- **Schedule section** — collapsible panel containing all Step 3 fields. Title is "Event dates" for event-type categories, "Schedule" otherwise.
- **Images section** — collapsible panel containing all Step 4 fields (upload/library, sortable grid).

Behaviour:

- All sections **start collapsed**. Each shows a summary line when collapsed (e.g. "Friday Night Social · Instagram Feed, Facebook · medium posts").
- Multiple sections can be open simultaneously.
- A single **"Save changes"** button at the bottom saves all data in one pass (see [Section 5.4](#54-ensuresubcategoryupdated--edit-mode-save)).
- On validation error, the relevant section **auto-expands** so the user sees the error message.

---

## 5. Underlying logic & main component

The main implementation lives in:

- **File:** `src/components/wizards/FrameworkItemWizard.tsx`

Key functions:

- **`handleFinish()`** — called when user clicks **"Finish and Generate Drafts"** (create mode Step 4) or **"Save changes"** / **"Save & generate drafts"** (edit mode).
- **`ensureSubcategorySaved()`** — core save function for create mode (Steps 1–3).
- **`ensureSubcategoryUpdated()`** — core save function for edit mode (updates all data in one pass).

### 5.1 `ensureSubcategorySaved()` (create mode)

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

### 5.3 `handleFinish()` — Finish and Generate Drafts / Save changes

**Create mode** — When the user clicks **"Finish and Generate Drafts"** on Step 4:

(In edit mode, `handleFinish()` delegates to `ensureSubcategoryUpdated()` — see [Section 5.4](#54-ensuresubcategoryupdated--edit-mode-save) below.)

When the user clicks **Finish and Generate Drafts**:

1. **Ensure subcategory exists**
   - If it hasn’t been saved yet, calls `ensureSubcategorySaved()`.

2. **Link images to the category**
   - Using `selectedAssetIds`:
     - Finds/creates a `tags` row with kind `’subcategory’` + name = category name.
     - Links each selected asset to that tag via `asset_tags`.
     - Skips links that already exist.

3. **Mark setup as complete**
   - Sets `subcategories.setup_complete = true` BEFORE triggering draft generation.
   - This is required because the draft generator skips categories with `setup_complete=false`.

4. **Trigger draft generation**
   - Calls `/api/drafts/generate` with `{ brandId }`.
   - The generator creates drafts only for categories with `setup_complete=true`, so other in-progress categories are not affected.

5. **Redirect**
   - Navigates the user to the **Schedule page (Drafts tab)**.

**Note:** Draft generation is NOT triggered during Step 3 → Step 4 (`ensureSubcategorySaved()`). It only happens here in `handleFinish()` after images are linked and `setup_complete` is set to `true`. This prevents premature draft creation for categories still being configured.

---

### 5.4 `ensureSubcategoryUpdated()` — Edit mode save

In edit mode, `handleFinish()` calls `ensureSubcategoryUpdated()` instead of `ensureSubcategorySaved()`. This function updates all data in a single pass:

1. **Validate** — checks required fields (name, description, channels). On validation error, auto-expands the relevant accordion section.
2. **Update `subcategories`** row — name, detail, url, hashtags, channels, copy length, type, settings.
3. **Upsert `schedule_rules`** — updates frequency, days, time, timezone, channels (normalized).
4. **Update `event_occurrences`** — for event-type categories, syncs occurrence rows.
5. **Link assets** — finds/creates the subcategory tag and syncs `asset_tags` for selected assets.
6. **Refresh URL summary** — fire-and-forget call to `/api/subcategories/{id}/refresh-url-summary`.
7. **Redirect** — navigates back to the Categories page.

Unlike create mode (where save happens incrementally across steps), edit mode saves everything at once when the user clicks **"Save changes"**.

---

## 6. Save timing and behaviour

- **When do we write the subcategory and schedule?**
  - On Step 3 completion (moving to Step 4), `ensureSubcategorySaved()` runs:
    - `subcategories` row created with `setup_complete = false`.
    - `schedule_rules` and `event_occurrences` created/updated.
    - **Draft generation is NOT triggered here.** The category remains incomplete.

- **When do we link assets and generate drafts?**
  - On **"Finish and Generate Drafts" (Step 4)**, `handleFinish()` runs:
    - Assets are tagged and linked.
    - `setup_complete` is set to `true`.
    - `/api/drafts/generate` is called — generates drafts **only** for categories with `setup_complete=true`.

- **Editing existing categories (edit mode — accordion layout)**
  - Uses `ensureSubcategoryUpdated()` instead of `ensureSubcategorySaved()`.
  - All data (subcategory, schedule, assets) is saved in one pass when the user clicks **"Save changes"**.
  - Validation errors auto-expand the relevant accordion section.
  - No step progression — the user edits whichever section they need and saves once.

---

## 7. Dependencies on other processes

Category Creation interacts with several other documented processes:

- **Schedule Rules**
  - Created/updated during Step 3 (create mode) or on Save (edit mode).
  - Used by `rpc_framework_targets` and the publishing pipeline.

- **Event Occurrences**
  - Used for event-type categories to represent multiple dates for the same event series.

- **Draft Generation**
  - Triggered in `handleFinish()` (Step 4) AFTER images are linked and `setup_complete` is set to `true`.
  - The generator **skips categories with `setup_complete=false`**, preventing premature draft creation.
  - Uses `schedule_rules.channels` (normalized) as the single source of truth for channels.
  - Creates one `post_jobs` row per channel, with `post_jobs.schedule_rule_id` always set.
  - Generates drafts for the next 30 days automatically.

- **Copy Generation**
  - Uses `subcategory_type`, `detail`, `url`, `url_page_summary`, `default_copy_length`, and the schedule info to build prompts.

---

## 8. History / notes

- **2025-12-05** — Category Creation flow documented based on `FrameworkItemWizard.tsx`, `subcategories` schema, and related Supabase functions.
- **2026-02-09** — Edit mode refactored from stepped wizard to accordion layout. Create mode unchanged. Added `ensureSubcategoryUpdated()` documentation. Event dates description changed to "Input the detail for your event date(s)".
- **2026-02-27** — Draft generation moved from Step 3 to Step 4 (`handleFinish()`). Generator now skips categories with `setup_complete=false`. Wizard "Finish" button renamed to "Finish and Generate Drafts". Double-click guard added to prevent concurrent `handleNext`/`handleFinish` execution.
- Behaviour may change if:
  - `subcategory_type` values are standardised (`event`, `promotion`, etc.).
  - Scheduling frequency types are expanded.
  - Asset-linking logic or tag structure is updated.

### Mermaid — Create mode

```mermaid
flowchart TD
    U[User] -->|Clicks 'Add Category'| W[Category Wizard]

    subgraph Wizard Steps
        W --> S1[Step 1: Type\n(event / service_or_programme / promo)]
        S1 --> S2[Step 2: Details\nname, description, URL, hashtags, channels, copy length]
        S2 --> S3[Step 3: Schedule\nweekly/monthly/specific, days, time, timezone]
        S3 --> S4[Step 4: Images\nupload or choose existing]
    end

    S3 -->|Next: Media| ENSURE[ensureSubcategorySaved\nsetup_complete=false]
    ENSURE --> SUBC[(subcategories)]
    ENSURE --> SR[(schedule_rules)]
    ENSURE --> EO[(event_occurrences\nonly for event types)]

    S4 --> FINISH[handleFinish\nFinish and Generate Drafts]
    FINISH --> TAGS[(asset_tags\nlink assets to subcategory tag)]
    FINISH --> SETUP[setup_complete = true]
    SETUP --> GEN[/api/drafts/generate\nskips setup_complete=false]
    FINISH --> URLSUM[/api/subcategories/{id}/refresh-url-summary/]
```

### Mermaid — Edit mode (accordion)

```mermaid
flowchart TD
    U[User] -->|Clicks 'Edit' on a category| ACC[Accordion Layout]

    ACC --> TYPE[Type badge\nread-only]
    ACC --> DET[Details section\nexpandable]
    ACC --> SCHED[Schedule section\nexpandable]
    ACC --> IMG[Images section\nexpandable]

    ACC -->|Save changes| UPDATE[ensureSubcategoryUpdated()]
    UPDATE --> SUBC[(subcategories)]
    UPDATE --> SR[(schedule_rules)]
    UPDATE --> EO[(event_occurrences\nif event type)]
    UPDATE --> TAGS[(asset_tags)]
    UPDATE --> URLSUM[/api/subcategories/{id}/refresh-url-summary/]
```
