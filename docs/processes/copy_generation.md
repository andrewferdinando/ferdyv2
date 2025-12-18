# Copy Generation

## TL;DR (for AI tools)

- Copy is generated in **batches** via `processBatchCopyGeneration()` in `src/lib/generateCopyBatch.ts`.
- Input = array of `DraftCopyInput` objects, each describing:
  - draft ID
  - subcategory (category) metadata
  - schedule info (frequency / dates)
  - variation hints
  - options (length, hashtags mode, etc.)
- The system uses **OpenAI** as the LLM provider.
- Prompts include:
- subcategory title, description, URL, copy length
- subcategory type (event / service_or_programme / promo)
- schedule context (date / date range vs ongoing)
- brand examples: last ~10 posts from FB & IG via the social APIs
- **For event_series with frequency='specific':** occurrence-specific URL and summary (if available), falling back to subcategory URL/summary
- Generated copy is written back to the `drafts` table (`copy`, `copy_model`, `copy_meta`, `generated_by`, `copy_status`).

---

## 1. Entry point

The main entry point for batch copy generation is:

```ts
// src/lib/generateCopyBatch.ts
export async function processBatchCopyGeneration(
  brandId: string,
  drafts: DraftCopyInput[]
) { ... }
This is called from the draft generator:

```ts
// src/lib/server/draftGeneration.ts (simplified)
const draftsInput: DraftCopyInput[] = ... // built from drafts needing copy
const result = await processBatchCopyGeneration(brandId, draftsInput);
```

So every time the generator runs and creates drafts (or finds existing drafts needing copy), it automatically calls `processBatchCopyGeneration()` to populate their copy. Copy generation is automatic and non-optional.

2. DraftCopyInput shape
The DraftCopyInput type (from generateCopyBatch.ts) roughly looks like:

ts
Copy code
type DraftCopyInput = {
  draftId: string;
  subcategoryId?: string;
  subcategory: {
    name: string;
    url: string;                          // May be occurrence URL for event_series
    description?: string;
    frequency_type: "daily" | "weekly" | "monthly" | "date" | "date_range";
    url_page_summary?: string | null;     // May be occurrence summary for event_series
    default_copy_length: "short" | "medium" | "long";
  };
  subcategory_type: string | null;        // event / service_or_programme / promo_or_offer / unspecified
  subcategory_settings: Record<string, any> | null;
  schedule?: {
    frequency: string;                    // daily / weekly / monthly / specific
    event_date?: string;                  // YYYY-MM-DD for single-date events
  };
  scheduledFor?: string;                  // ISO datetime when the post will go out
  prompt: string;                         // base instruction, e.g. "Write copy for this post"
  variation_hint?: string | null;         // angle to vary copy when multiple posts come from same subcategory
  options: {
    hashtags?: { mode: "auto" | "none" };
    // length intentionally omitted – default_copy_length is used
  };
};
Important notes:

default_copy_length comes from the subcategory (subcategories.default_copy_length).

frequency_type is derived from the schedule rule:

Events: date / date_range

Ongoing: daily / weekly / monthly

variation_hint is used to rotate angles (benefits, urgency, atmosphere, etc.) when multiple drafts share the same subcategory.

3. Data sources used in prompts
For each batch run, processBatchCopyGeneration() gathers:

Subcategory metadata

Name (title of post category)

Description (what Ferdy should talk about)

URL (for extra context and call to action)

URL page summary (if previously scraped)

default copy length

Schedule metadata

Frequency: daily / weekly / monthly / specific

Whether this represents:

an ongoing thing (e.g. “Every Monday’s workout”)

a specific event date

a date range (event that spans multiple days)

If event-type: event date or date range.

Brand examples (social history)

For each brand, Ferdy fetches ~10 recent posts from:

Instagram (feed)

Facebook

This is done via the respective social APIs (Meta Graph API).

These examples are used to infer:

Tone of voice

Use of emojis

Use of hashtags

Typical length and structure

Variation hints

For recurring posts (e.g. multiple promos/events in one series), we rotate variation_hint strings such as:

“Explain what this is and who it’s for.”

“Focus on key benefits and outcomes.”

“Highlight what people can expect on the day.”

“Emphasise the experience and atmosphere.”

“Give a clear ‘why now’ without being pushy.”

This helps prevent repetitive copy even when schedules are highly regular.

4. Prompt construction & OpenAI call
The prompt used with OpenAI is defined in a separate helper (e.g. src/lib/postCopy.ts or similar). It typically includes:

System message:

Tells the model it is writing social copy for Ferdy.

Explains that it must follow brand tone extracted from examples.

Explains copy length (“short” vs “medium” vs “long”).

Defines rules around emojis and hashtags.

User message:

Subcategory name and description.

Type of content: event / promo / service / etc.

Event date or schedule context (“upcoming event on 5 July”, “every Thursday class”).

URL and URL summary (to pull key selling points or factual details).

Variation hint (“focus on benefits”, “focus on experience”, etc.).

Any options (e.g. hashtags auto vs none).

The code then calls OpenAI’s chat completion API:

ts
Copy code
// Pseudocode
const response = await openai.chat.completions.create({
  model: OPENAI_MODEL_NAME,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  temperature: 0.7,
});
The chosen model name is stored in a constant (e.g. OPENAI_MODEL_NAME) and written into drafts.copy_model.

5. Writing back to drafts
For each successful generation:

drafts.copy is updated with the generated text.

drafts.generated_by = 'ai'.

drafts.copy_model records the model (e.g. gpt-4.1-mini).

drafts.copy_meta may store:

tokens used

raw prompt fragments

variation index

drafts.copy_status is set to something like done.

If the generation fails:

drafts.copy_status is set to failed.

Error details may be stored in copy_meta.

The draft remains editable; user can still type their own copy.

6. When copy generation is triggered
Copy generation is **automatic and non-optional** for all drafts created by the generator:

The generator (`generateDraftsForBrand`) automatically triggers copy generation:

- It finds drafts needing copy within the 30-day window:
  - Newly created drafts (with null or placeholder copy).
  - Existing drafts with null or `"Post copy coming soon…"` copy.
- It builds the `DraftCopyInput[]` array from those drafts.
- It calls `processBatchCopyGeneration(brandId, draftsInput)`.

This behaviour ensures:

- Framework-based drafts always get copy generated automatically.
- There is no "regenerate copy" concept — copy is generated once per draft.
- Manual drafts can optionally use the same pipeline if wired up.

7. Notes & future changes
If you:

change the model (OpenAI version),

change the prompt format,

add new subcategory types or frequency types,

or add new brand-level controls for emojis / CTA style,

you should update this file and the prompt helper file.

For AI tools: always treat generateCopyBatch.ts and the prompt helper as the single source of truth for how social copy is generated in Ferdy.

Mermaid:
flowchart TD
    GEN[Draft Generator\n(generateDraftsForBrand)] --> BATCH[Build DraftCopyInput[]]

    subgraph Inputs
        SUBC[(subcategories\nname, description,\nurl, default_copy_length,\nurl_page_summary)]
        SRULE[(schedule_rules\nfrequency, dates)]
        BPI[(brand_post_information\nfb/ig examples,\npost_tone, defaults)]
        BRAND[(brands\nwebsite_url, brand_summary)]
    end

    SUBC --> BATCH
    SRULE --> BATCH
    BPI --> BATCH
    BRAND --> BATCH

    BATCH --> PROC[processBatchCopyGeneration()]
    PROC --> PROMPT[Construct system + user prompts]

    PROMPT --> OPENAI[[OpenAI\nchat.completions]]
    OPENAI --> PROC

    PROC --> DRAFTS[(drafts\ncopy, copy_model,\ncopy_meta, copy_status)]


