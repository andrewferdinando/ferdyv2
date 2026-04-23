# Partner Programme

The Partner Programme lets external referrers earn a recurring 20% commission on the monthly revenue of any Ferdy group they bring in. It is a **reporting-only** system that runs alongside Ferdy's core product: it must never affect onboarding, billing, draft generation, or publishing. This document describes the public-facing pages, the Super Admin tooling, the data model, and the end-to-end processes (registration → enquiry → sale → commission → monthly BCTI payout).

---

## Isolation Guarantee

All Partner-related code is wrapped in isolated try/catch blocks and separate modules so that a failure in partner side-effects can never break core flows:

- Stripe webhook partner handlers (`invoice.paid`, `credit_note.created`) are each wrapped in their own try/catch inside `src/app/api/stripe/webhook/route.ts`. Any thrown error is logged and swallowed.
- Partner email sending lives in `src/lib/emails/partnerEmails.ts` (separate from the main `send.ts`) so a missing template or Resend failure cannot cascade.
- Partner DB tables have **service-role-only** RLS policies. No client SDK ever reads or writes them.
- BCTI PDF generation (`src/server/partners/bctiPdf.ts`) is a pure module — it never touches shared state.
- No partner code path exists in draft generation, publishing, or the brand/group onboarding routes.

---

## Public Pages

### `/partners` — Marketing + Registration

Hidden public page (not linked from main nav, `noindex`). Split into two files:

- `src/app/(marketing)/partners/page.tsx` — static marketing content
- `src/app/(marketing)/partners/PartnerRegistrationForm.tsx` — client component with the registration form

**Page structure:**

1. **Hero** — Portrait of Andrew + headline + subtitle + stat bar (20% recurring / $29.40 per brand / paid monthly). Portrait is `/images/andrew-headshot.jpg`.
2. **How it works** — Four-step timeline (sign up → refer → we close → we pay).
3. **What counts** — Example intro email showing the kind of referral that qualifies.
4. **What you earn** — "$29.40 per brand per month" card with the math.
5. **How you get paid** — BCTI preview card showing a sample Buyer Created Tax Invoice layout, plus the monthly payment cadence.
6. **Good to know** — Card grid covering commission stop conditions, refund clawback, tax treatment, overseas partners.
7. **Registration form** — Name, email, phone, country, GST-registered (NZ only), then either **NZ bank details** or **Wise email** depending on country.
8. **Personal sign-off** — Short note from Andrew.
9. **Footer** — Link to `/partners/terms`.

**Form behaviour:**

- Country select drives conditional payment fields. If country = New Zealand: collect GST number (optional), bank account name, bank account number. Otherwise: collect Wise payment email. Validation is enforced server-side via Zod `superRefine`.
- Submit button is always enabled. Errors are always rendered in a banner at the top of the form, AND the first invalid field is scrolled into view via `useEffect` + `scrollIntoView`.
- On success the form is replaced with a success panel, and a `useRef` + `useEffect` scrolls the panel into view so users don't miss it.
- Selects use custom chevron styling (`appearance-none pr-10` + positioned `<ChevronDown>` icon) to avoid the native chevron being flush against the border.

### `/partners/terms` — Terms & Conditions

`src/app/(marketing)/partners/terms/page.tsx`. Plain content page (`noindex`), 720px max-width, back-link top and bottom. Contains 19 clauses covering eligibility, commission rate, payment timing, refunds/clawback, termination, and IP. Key clauses to be aware of:

- **Clause 2** and **Clause 7** have overseas-partner carve-outs (Wise payment instead of NZ bank).
- **Clause 13** pays commission for the **lifetime of the referred group's subscription** (no 3-month cutoff).

---

## Registration API

`POST /api/partners/register` — public (no auth), rate-limited 5 requests/hour/IP via the in-memory limiter in `src/lib/rate-limit-inmem.ts`.

**Flow:**

1. Parse body with a Zod schema that uses `superRefine` to require NZ bank fields when `country === 'NZ'` and Wise email otherwise.
2. Encrypt `bank_account_number` (NZ only) with `encryptToken()` from `src/lib/encryption.ts` (AES-256-GCM, existing helper).
3. Insert a row into `partners` with `status = 'pending'`.
4. Send two emails via `partnerEmails.ts`:
   - **To the partner**: `PartnerRegistrationConfirmation` — welcome + what happens next.
   - **To `andrew@ferdy.io`**: `PartnerRegistrationNotification` — includes applicant details and `paymentMethod` string (either `"NZ bank transfer"` or `"Wise to <email>"`). **The raw bank account number is never included in the notification email.**
5. Respond `{ ok: true }`.

Errors are logged but the user always sees a generic "please try again" banner.

---

## Super Admin Pages

Entry point added to `src/app/(dashboard)/super-admin/page.tsx` (Partners card).

### `/super-admin/partners` — Tabbed shell

`src/app/(dashboard)/super-admin/partners/page.tsx` with three tabs:

- **Partners** — `src/components/super-admin/partners/PartnersTab.tsx`. List of all partners with stats (active groups, total commission earned, pending payout).
- **Enquiries** — `src/components/super-admin/partners/EnquiriesTab.tsx`. Cross-partner enquiry log with Add modal, Convert modal, and inline status dropdown. The Convert modal only shows groups whose subscription_status is `active`, `past_due`, or `trialing` (incomplete/canceled groups are hidden). Groups are listed as clickable rows with a search box.
- **Pending Payouts** — `src/components/super-admin/partners/PendingPayoutsTab.tsx`. Period picker + 3-step flow (review → generate BCTIs → send → mark paid).

### `/super-admin/partners/[id]` — Partner detail

`src/app/(dashboard)/super-admin/partners/[id]/page.tsx` with sub-tabs:

- **Profile** — `PartnerProfile.tsx`. Editable fields, conditional NZ-vs-Wise UI, Stripe promo code link-out.
- **Enquiries** — `PartnerEnquiries.tsx`. Per-partner enquiry list.
- **Sales** — `PartnerSales.tsx`. Groups attributed to this partner.
- **Commissions** — `PartnerCommissions.tsx`. Line items (pending + paid).
- **Payouts** — `PartnerPayouts.tsx`. BCTI history with PDF download.

---

## Data Model

Four new tables + one nullable FK on `groups`. Schema lives in `supabase/migrations/20260423_create_partner_programme_tables.sql`. All tables are RLS-enabled with **service-role-only** policies.

### `partners`
Applicant record. Fields: `id`, `full_name`, `email` (unique), `phone`, `country`, `gst_number`, `gst_registered`, `bank_account_name`, `bank_account_number_encrypted`, `wise_email`, `status` (`pending` | `approved` | `suspended`), `stripe_promo_code_id`, `created_at`, `approved_at`. `bank_account_name` and `bank_account_number_encrypted` are nullable (see `20260423_relax_partner_bank_fields_nullable.sql`) because overseas partners use Wise.

### `partner_enquiries`
Referral leads before they convert to paying customers. Fields: `id`, `partner_id`, `enquiry_date`, `prospect_company`, `prospect_contact_name`, `prospect_email`, `status` (`new` | `converted` | `lost` | `expired`), `group_id` (FK to `groups` once converted), `converted_at`, `expires_at`, `notes`, `created_at`.

### `partner_commissions`
One row per paid invoice × referred group. Fields: `id`, `partner_id`, `group_id`, `stripe_invoice_id` (unique with `partner_id`), `stripe_credit_note_id`, `amount_cents`, `currency`, `invoice_paid_at`, `status` (`pending` | `paid` | `reversed`), `payout_id`, `created_at`. Unique index on `(partner_id, stripe_invoice_id)` and `(partner_id, stripe_credit_note_id)` provides webhook idempotency.

### `partner_payouts`
Monthly BCTI rollups. Fields: `id`, `partner_id`, `period_start`, `period_end`, `bcti_number` (from `next_bcti_number()` sequence), `total_cents`, `gst_cents`, `status` (`draft` | `sent` | `paid`), `pdf_storage_path`, `sent_at`, `paid_at`, `created_at`.

### `groups.partner_enquiry_id` (nullable FK)
Added to `groups` to attribute a group to the enquiry that produced it. Nullable because the vast majority of groups have no partner attribution. Because two FKs now exist between `partner_enquiries` and `groups` (forward via `partner_enquiries.group_id`, backward via `groups.partner_enquiry_id`), all PostgREST joins must use the explicit hint `groups!partner_enquiries_group_id_fkey(name)`.

### Supporting objects
- `next_bcti_number()` — Postgres function in `20260423_create_next_bcti_number_fn.sql` that wraps `nextval()` on the BCTI sequence. Guarantees gap-free sequential numbering required by IRD.
- Storage bucket `partner-bctis` for the generated PDFs (service-role access only).

---

## Processes

### 1. Registration → Approval
Partner fills the public form → row inserted with `status = 'pending'` → Andrew reviews in `/super-admin/partners` → opens partner detail → approves (sets `status = 'approved'`, records `approved_at`, creates a Stripe promo code and stores `stripe_promo_code_id`). The promo code is the mechanism by which a referred group is attributed (see next step).

### 2. Enquiry Logged
When a partner tells Andrew about a prospect (via email, Slack, etc.), Andrew logs it in the **Enquiries** tab — `POST /api/super-admin/partners/enquiries`. The enquiry starts in `status = 'new'`.

### 3. Enquiry → Sale (Conversion)
When the prospect signs up and subscribes, Andrew clicks **Convert to sale** on the enquiry, picks the matching group (the picker is filtered to live subscriptions only), and submits. This calls `POST /api/super-admin/partners/enquiries/[id]/convert`, which:
- Sets `partner_enquiries.status = 'converted'` and records `group_id`, `converted_at`.
- Sets `groups.partner_enquiry_id` to attribute the group.

### 4. Commission Accrual (Stripe Webhook)
Every time Stripe fires `invoice.paid` for a group with an attributed enquiry, the isolated partner handler in `src/server/partners/commissionWebhook.ts`:
- Looks up the `partner_id` via `groups.partner_enquiry_id → partner_enquiries.partner_id`.
- Calculates 20% of the invoice amount (NZD, pre-GST).
- Inserts a row into `partner_commissions` with `status = 'pending'`. Idempotent via the unique `(partner_id, stripe_invoice_id)` index.

When Stripe fires `credit_note.created` (for refunds), the handler inserts a negative-amount commission row with `status = 'reversed'`, linked by `stripe_credit_note_id`. **Important:** `credit_note.created` must be manually enabled in the Stripe Dashboard under Webhook → Edit destination.

### 5. Monthly BCTI Payout
At month end in the Pending Payouts tab:

1. **Review** — Andrew picks a period. The UI calls `GET /api/super-admin/partners/pending-payouts` which groups all `pending` commissions by partner.
2. **Generate BCTIs** — `POST /api/super-admin/partners/payouts/generate` for each partner:
   - Reserves a sequential BCTI number via `next_bcti_number()`.
   - Builds an A4 IRD-compliant PDF via `src/server/partners/bctiPdf.ts` (pdf-lib). Header uses `FERDY_LEGAL_NAME`, `FERDY_GST_NUMBER`, `FERDY_LEGAL_ADDRESS` env vars.
   - Uploads the PDF to the `partner-bctis` storage bucket.
   - Inserts a `partner_payouts` row with `status = 'draft'`.
3. **Send** — `POST /api/super-admin/partners/payouts/[id]/send` emails the partner via `PartnerBCTI` template with the PDF attached, then flips `status` to `sent`.
4. **Mark paid** — After the bank transfer / Wise payment clears, Andrew clicks **Mark paid**. This calls `POST /api/super-admin/partners/payouts/[id]/mark-paid`, which flips the payout to `paid` AND flips every linked commission row to `status = 'paid'` and sets `commissions.payout_id`.

Any pending commissions not included in a payout can be rolled forward to the next period via `POST /api/super-admin/partners/payouts/roll-forward`.

---

## Environment Variables

Set on Vercel for all environments:

- `FERDY_LEGAL_NAME` — Legal entity name printed at the top of the BCTI PDF (e.g. `Ferdy AI Limited`).
- `FERDY_GST_NUMBER` — NZ GST number printed on the BCTI.
- `FERDY_LEGAL_ADDRESS` — Registered address printed on the BCTI.

Existing env vars re-used:
- `ENCRYPTION_KEY` — used to encrypt bank account numbers.
- Stripe + Supabase service-role keys.

---

## Stripe Setup Checklist

1. In the Stripe Dashboard → Webhooks → the production destination → Edit destination → add **`credit_note.created`** to the event list. Without this, refund clawbacks will not be recorded.
2. `invoice.paid` should already be enabled for billing; the partner handler re-uses it.

---

## Key File Locations

| Area | Path |
|---|---|
| Public page | `src/app/(marketing)/partners/page.tsx` |
| Registration form | `src/app/(marketing)/partners/PartnerRegistrationForm.tsx` |
| Terms page | `src/app/(marketing)/partners/terms/page.tsx` |
| Registration API | `src/app/api/partners/register/route.ts` |
| Webhook partner handlers | `src/server/partners/commissionWebhook.ts` |
| BCTI PDF builder | `src/server/partners/bctiPdf.ts` |
| Partner emails | `src/lib/emails/partnerEmails.ts` |
| Email templates | `src/emails/PartnerRegistrationConfirmation.tsx`, `PartnerRegistrationNotification.tsx`, `PartnerBCTI.tsx` |
| Super Admin shell | `src/app/(dashboard)/super-admin/partners/page.tsx` |
| Super Admin detail | `src/app/(dashboard)/super-admin/partners/[id]/page.tsx` |
| Super Admin components | `src/components/super-admin/partners/*.tsx` |
| Super Admin APIs | `src/app/api/super-admin/partners/**/route.ts` |
| Migrations | `supabase/migrations/20260423_*.sql` |
| Auth helper | `src/lib/server/super-admin-auth.ts` |
| Partner server helpers | `src/lib/server/partners.ts` |
| Rate limiter | `src/lib/rate-limit-inmem.ts` |

---

## Gotchas

- **FK ambiguity on `partner_enquiries ↔ groups` joins** — always specify `groups!partner_enquiries_group_id_fkey(name)`. The reverse FK (`groups.partner_enquiry_id`) exists and PostgREST cannot pick automatically.
- **Bank number never leaves the DB encrypted** — the notification email uses only a `paymentMethod` string. Decryption happens only inside the Super Admin partner detail API.
- **BCTI numbers must be gap-free** — use `next_bcti_number()` RPC only. Never manually assign.
- **Group picker must filter subscription_status** — only `active`, `past_due`, `trialing` groups can be converted against. See `src/app/api/super-admin/partners/groups/route.ts`.
- **pnpm lockfile** — when adding dependencies, use `pnpm install`. Vercel runs `--frozen-lockfile` and will fail on `package-lock.json`.
