# Add Brand Process

**File:** `doc/processes/add-brand.md`  
**Owner:** Andrew / Ferdy core team  
**Last updated:** 2025-12-08

## Purpose

Document how a new **Brand** is created in Ferdy via the `/account/add-brand` page, including:

- What the UI does
- Which Supabase tables are touched
- How defaults are set up for downstream processes (categories, drafts, engine room, etc.)

This is mainly for developers and AI coding tools (Cursor) so they understand the data flow and can safely extend or refactor.

---

## Entry Points

- **UI page:** `https://www.ferdy.io/account/add-brand`
- **User type:** Internal operator / Ferdy admin (for now all clients are manually onboarded)
- **Auth:** Admin must be signed in (Supabase Auth)

---

## UI Flow (Current Behaviour)

1. Admin navigates to `/account/add-brand`.
2. Admin fills out the **Add Brand** form.
   - **Required:**
     - `name` (Brand name, e.g. "Highlands Motorsport Park")
   - **Optional (but recommended):**
     - `website_url` (e.g. `https://www.highlands.co.nz`)
     - `country_code` (e.g. `NZ`)
   - **Hidden / defaulted:**
     - `timezone` default is `Pacific/Auckland` (can be extended in future).
3. Admin submits the form.
4. On success:
   - User is redirected to the brand context (e.g. brand dashboard or categories).
   - The admin user is associated with the brand via `brand_memberships`.
5. On failure:
   - Error is shown in the UI (toast / inline error).
   - No brand is created.

> **Note:** Exact UI field names and redirect target may change — this document is focused on the data flow.

---

## Data Flow (Supabase)

When the admin submits the form, the following DB operations happen.

### 1. Insert into `brands`

**Table:** `brands`

Relevant columns:

- `id` (uuid, PK, default `gen_random_uuid()`)
- `name` (text, required)
- `timezone` (text, default `'Pacific/Auckland'`)
- `created_at` (timestamptz, default `now()`)
- `website_url` (text, nullable)
- `country_code` (text, nullable)
- `brand_summary` (jsonb, nullable)
- `brand_summary_status` (text, default `'idle'`)
- `brand_summary_updated_at` (timestamptz, nullable)
- `default_post_time` (time, nullable)
- `ai_summary` (text, nullable)
- `ai_summary_last_generated_at` (timestamptz, nullable)

**Typical insert payload (conceptual):**

```ts
insert into brands {
  name: <brandName>,                 // from form
  website_url: <websiteUrl?>,        // from form
  country_code: <countryCode?>,      // from form
  timezone: 'Pacific/Auckland',      // default for now
  // All other fields rely on defaults or remain null
}
Notes:

brand_summary and ai_summary are filled later by background/engine processes.

default_post_time may be set later from Engine Room settings.

2. Insert into brand_memberships
Immediately after creating the brand, the currently authenticated user is associated with it.

Table: brand_memberships

Relevant columns:

id (uuid, PK, default gen_random_uuid())

brand_id (uuid, FK → brands.id, required)

user_id (uuid, FK → auth.users.id, required)

role (text, default 'editor')

created_at (timestamptz, default now())

Typical insert payload (conceptual):

ts
Copy code
insert into brand_memberships {
  brand_id: <newBrandId>,    // id from brands insert
  user_id: auth.uid(),       // current logged-in admin
  role: 'editor' | 'admin',  // currently 'editor' by default in DB
}
TODO / Clarify:

In code, we may want to treat the creator as owner or admin instead of the default 'editor'.

If so, either override the default in the insert or change the DB default.

3. Insert into brand_post_information
On brand creation, a baseline row is created to store brand-level posting defaults and analysis metadata.

Table: brand_post_information

Relevant columns:

id (uuid, PK, default gen_random_uuid())

brand_id (uuid, FK → brands.id, required)

fb_post_examples (text[], default {})

ig_post_examples (text[], default {})

post_tone (text, nullable)

avg_char_length (numeric, nullable)

avg_word_count (numeric, nullable)

analysed_at (timestamptz, default now())

created_at (timestamptz, default now())

updated_at (timestamptz, default now())

default_post_time (time, nullable)

default_copy_length (text, nullable)

Typical insert payload (conceptual):

ts
Copy code
insert into brand_post_information {
  brand_id: <newBrandId>,
  fb_post_examples: '{}',       // empty arrays by default
  ig_post_examples: '{}',
  post_tone: null,              // to be inferred later
  avg_char_length: null,
  avg_word_count: null,
  default_post_time: null,      // can be set via Engine Room
  default_copy_length: null,    // can be set via Engine Room
}
This row is used by Ferdy’s copy/image generation engine to:

Store tone of voice

Store analysed post examples

Provide brand-level defaults for copy length and posting time.

High-Level Flow (Mermaid)
mermaid
Copy code
flowchart TD

  A[Admin visits /account/add-brand] --> B[Fill in Add Brand form<br/>name, website_url, country_code]
  B --> C[Submit form]

  C --> D[Insert into brands]
  D -->|on success| E[Insert into brand_memberships<br/>(current user + new brand)]
  D --> F[Insert into brand_post_information<br/>(defaults for tone & posting)]

  E --> G[Redirect to brand context<br/>(e.g. dashboard or categories)]
  F --> G

  C -->|on error| H[Show error message in UI<br/>No brand created]
RLS / Security Considerations
brand_memberships RLS should ensure:

Only authenticated users can create memberships.

Users can only see memberships for brands they belong to.

brands RLS should:

Allow inserts for authenticated users.

Restrict selects/updates to members of that brand.

brand_post_information RLS should:

Restrict rows by brand_id → membership check.

TODO / Check in code: Confirm that inserts are done via service-role or via client with RLS policies that allow creation for auth.uid().

Future Enhancements / Notes
Multi-timezone support: Allow setting timezone at brand creation.

Owner vs editor roles: Decide on standard roles (owner, admin, editor) and update default.

Automation: Auto-trigger AI brand summary generation after brand creation (if not already wired).

Validation: Enforce website_url format and country_code standards (e.g. ISO).