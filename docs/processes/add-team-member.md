# Add Team Member Process

**File:** `doc/processes/add-team-member.md`  
**Owner:** Andrew / Ferdy core team  
**Last updated:** 2025-12-08

## Purpose

Document how a **team member is invited to a brand** in Ferdy via the Team page, including:

- UI flow (what the inviter sees and does)
- Auth flow (what Supabase does)
- Brand membership creation timing (when `brand_memberships` is populated)
- Notes for future email provider migration (Supabase → Resend)

This is for developers and AI coding tools (Cursor) so they can safely extend or refactor the invite/onboarding process.

---

## Entry Points

- **UI page:**  
  `https://www.ferdy.io/brands/:brandId/account/team`

- **Who uses this page:**  
  An existing member of the brand (typically you during onboarding) who wants to invite another user.

- **Auth requirement:**  
  User must be signed in via Supabase Auth and must belong to the brand.

---

## UI Flow

From the Team page, the inviter clicks a button (e.g. **“Invite Team Member”**).  
This opens the **Invite Team Member** modal:

**Fields:**

- **Name** – Free-text input (invited person’s full name)
- **Email Address** – Email input
- **Role** – Dropdown, default: **Editor**  
  (Exact list of roles lives in the front-end; typically includes `Editor` and may include others like `Admin`.)

**Buttons:**

- **Cancel** – Close modal, do nothing.
- **Send Invitation** – Trigger invite flow.

**Behaviour on “Send Invitation”:**

1. Client validates input (required fields + email format).
2. Client calls a backend/server-side function (or directly calls Supabase Auth admin API) to:
   - Create or find a user in **Supabase Auth** for the given email.
   - Trigger an **invite / verification email** to that address.
3. UI shows a success or error state (e.g. toast or inline message).

---

## Auth Behaviour (Supabase)

### What we have confirmed

From Supabase Auth → Users:

- When **Send Invitation** is clicked:
  - A new **Auth user record is created immediately** for the invited email.
  - The user’s status shows as **“Waiting for verification”** (they have not yet signed in).
  - No `brand_memberships` row is created at this point.
- The invited user receives an email sent by **Supabase** (current state):
  - The email contains a link for verification / sign-in.

### What this means

- Ferdy/Supabase creates the **user at invite time**, not at first sign-in.
- However, **brand access is not granted yet** – there is no membership row until after they sign in (see next section).

---

## Brand Membership Creation

**Table:** `brand_memberships`

Relevant columns:

- `id` (uuid, PK, default `gen_random_uuid()`)
- `brand_id` (uuid, FK → brands.id, required)
- `user_id` (uuid, FK → auth.users.id, required)
- `role` (text, default `'editor'`)
- `created_at` (timestamptz, default `now()`)

### Confirmed behaviour

> **Ferdy waits until the invited user signs in to create the `brand_memberships` row.**

So the sequence is:

1. **At invite time:**
   - Auth user is created in Supabase.
   - No `brand_memberships` row exists yet for that user + brand.

2. **At first successful sign-in (after clicking the invite email link):**
   - Some application logic runs (in your Next.js app / backend) that:
     - Detects that this user has been invited to a specific brand.
     - Creates a row in `brand_memberships` with:
       - `brand_id` = the brand that issued the invite.
       - `user_id` = this user’s Supabase user ID.
       - `role` = the role that was chosen in the invite modal (e.g. `editor`).

3. **After membership creation:**
   - The user can see and access the brand inside Ferdy.
   - The Team page will list them as a member.

### Implementation detail (to be checked in code later)

The app must store **which brand** and **which role** the user was invited with, so that it can create the correct `brand_memberships` row on first login. This is typically done via:

- Auth `user_metadata`, or
- A separate `invitations` table keyed by email, or
- Signed token/query parameters in the invite link.

This file intentionally does **not** guess which pattern is used; it only records the **observable behaviour**.

---

## End-to-End Flow (Mermaid)

This diagram shows **what actually happens**, based on the confirmed behaviour.

```mermaid
flowchart TD

  A[Existing brand member<br/>on /brands/:brandId/account/team] --> B[Click 'Invite Team Member']
  B --> C[Invite Modal<br/>Name, Email, Role]
  C --> D[Click 'Send Invitation']

  D --> E[Client validates input]
  E --> F[Backend/Supabase Auth<br/>create user + send invite email]

  F --> G[Auth user exists<br/>Status: Waiting for verification]
  G -.->|No brand_memberships row yet| H[(brand_memberships)]

  %% Second phase: invited user flow
  I[User opens invite email<br/>and clicks link] --> J[Supabase verifies email<br/>User signs in]
  J --> K[App logic on first login<br/>detect invite → create brand_memberships row]
  K --> L[(brand_memberships)]
  L --> M[User now has access<br/>to that brand in Ferdy]
Key points:

The Auth user is created at invite time.

The brand_memberships row is created at first successful sign-in.

Current Email Behaviour
All invite emails are currently sent by Supabase.

Emails come from the Supabase-configured sender identity.

The app does not yet use Resend for these invitations.

Future State – Moving Invitations to Resend
When you switch to Resend for email delivery:

Supabase Auth will still:

Create the user.

Generate verification / magic-link tokens.

Resend will:

Send branded emails from a @ferdy.io address.

Use templates for:

“You’ve been invited to join [Brand Name] on Ferdy.”

Possibly additional onboarding messaging.

A likely future pattern:

Backend calls Supabase to create the user and generate an invite/verification link.

Backend calls Resend with:

Recipient email

Invite/verification link

brand_name, role, etc. for personalisation.

Resend handles the actual email delivery.

This process file should be updated once the Resend integration is implemented.

RLS / Security Considerations (Conceptual)
Only members of a brand should be able to invite others to that brand.

Creation of brand_memberships rows should be restricted so:

A user cannot add themselves to arbitrary brands.

Invite processing logic ensures brand_id and user_id are correctly set.

When reviewing RLS:

Check that brand_memberships insert/updates are only allowed via:

Trusted backend logic, or

Policies that use auth.uid() and validated invite metadata.