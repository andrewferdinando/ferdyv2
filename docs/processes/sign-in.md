# Sign-In & Invite Acceptance Process

**File:** `doc/processes/sign-in.md`  
**Owner:** Andrew / Ferdy core team  
**Last updated:** 2025-12-08

## Purpose

Document how users:

1. **Accept an invite and create their account** (first-time setup), and  
2. **Sign in with email and password** via the Ferdy sign-in page.

This is for developers and AI coding tools (Cursor) so they understand how Supabase Auth, invitations, and brand access connect.

---

## Entry Points

### 1. Standard sign-in page

- **URL:** `https://www.ferdy.io/auth/sign-in`

**UI (current):**

- Heading: **“Sign in to your account”**
- Link: **“create a new account”** (separate self-signup flow, not documented here)
- Fields:
  - `Email address`
  - `Password`
- Primary button: **“Sign in”**

No magic link or OAuth options are shown in the current UI.

---

### 2. Invite email (first-time users)

When a team member is invited from the Team page, Supabase sends an email that looks like:

> **Subject/body example:**  
> *“You have been invited”*  
> *You have been invited to create a user on https://ferdy.io. Follow this link to accept the invite:*  
> **Accept the invite** (link)

Key behaviour:

- The link is a **Supabase invite link**.
- The user is asked to **set their own password** as part of accepting the invite.
- After that, they can use the normal **email + password** sign-in form at `/auth/sign-in`.

---

## First-Time Flow: Accepting an Invite

This is what happens for a **brand new user** who has just been invited.

### 1. Invitation already created

From the **Add Team Member** process (see separate doc):

- A Supabase Auth user is created immediately for the invited email.
- Status in Supabase: **“Waiting for verification”**.
- No `brand_memberships` row exists yet.
- Supabase sends the invite email with the **“Accept the invite”** link.

### 2. User accepts the invite

1. User clicks **“Accept the invite”** in the email.
2. They are taken to an **invite acceptance page** (Supabase-driven), where:
   - Their email is pre-filled/locked, and
   - They are asked to **set a password**.
3. On submit:
   - Supabase validates and stores the password.
   - The user is now a verified, password-based user.

> Exact URL and whether this is a Supabase-hosted or Ferdy-hosted screen is implementation detail and can be checked later; functionally, the user sets a password via the invite link.

### 3. First successful sign-in and brand membership

After setting their password, one of two things happens (depending on your routing config):

- They may be automatically signed in and redirected into Ferdy, or
- They may need to go to `/auth/sign-in` and log in with email + password.

On **first successful sign-in**:

- Some Ferdy app logic runs (in Next.js/backend) that:
  - Detects that this user has been invited to a specific brand.
  - Creates a row in `brand_memberships`:

    ```ts
    insert into brand_memberships {
      brand_id: <invitedBrandId>,
      user_id: auth.uid(),
      role: <role chosen during invite>, // e.g. 'editor'
    }
    ```

- Once this row exists, the user has access to that brand.

> For details of how the invite stores `brand_id` and `role` (metadata table vs auth metadata vs token), see **Add Team Member process** and underlying code.

---

## Standard Sign-In Flow (Existing Users)

For any **existing user** who already has a password:

1. User visits `https://www.ferdy.io/auth/sign-in`.
2. UI shows:
   - Email address field
   - Password field
   - “Sign in” button
   - Link: “create a new account” (self-serve signup, not covered here).

3. User enters:
   - Their email (must match the email stored in Supabase Auth).
   - Their password (set via invite or via normal signup).

4. They click **“Sign in”**.

5. The app calls Supabase Auth **email/password sign-in**:

   - Supabase:
     - Verifies the email and password
     - Creates a session / issues a JWT
   - On success:
     - User is redirected into the Ferdy app.
     - The app can query `brand_memberships` using `auth.uid()` to determine which brands they can access.
   - On failure:
     - Supabase returns an error (e.g. invalid login).
     - The UI should display an appropriate error message.

> Exact redirect location (e.g. “last brand used”, “brand picker”, or “first brand in membership list”) is determined by app routing and can be documented separately.

---

## Data / Auth Flow Summary

### Tables and systems involved

- **Supabase Auth (auth.users)**  
  - Stores user identity, email, password hash, and any metadata.
  - User is created at **invite time**.

- **brand_memberships**  
  - Stores which brands each user can access and with what role.
  - Row is created at **first successful sign-in for invited users** (see Add Team Member doc).

- **Session handling**  
  - Supabase issues a session token after successful sign-in.
  - Ferdy uses `auth.uid()` from the session to:
    - Fetch `brand_memberships`
    - Scope queries to the user’s brands.

---

## Mermaid – Invite → First Sign-In

```mermaid
flowchart TD

  A[Team member sends invite<br/>from Team page] --> B[Supabase Auth<br/>create user + send invite email]
  B --> C[Invite email received<br/>'Accept the invite' link]

  C --> D[User clicks link<br/>invite acceptance page]
  D --> E[User sets password<br/>and confirms]

  E --> F[Supabase verifies & stores password<br/>User is now verified]
  F --> G[User signs in (auto or via /auth/sign-in)]

  G --> H[Ferdy app logic on first login<br/>create brand_memberships row]
  H --> I[User has brand access<br/>normal sign-in from now on]
Mermaid – Standard Email + Password Sign-In
mermaid
Copy code
flowchart TD

  J[User visits /auth/sign-in] --> K[Enter email + password]
  K --> L[Click 'Sign in']

  L --> M[Supabase Auth<br/>verify credentials]
  M -->|success| N[Session created<br/>auth.uid() available]
  N --> O[Ferdy fetches brand_memberships<br/>and routes user into app]

  M -->|failure| P[Error returned<br/>UI shows sign-in error]
Future State – Resend Integration (High-Level Note)
Currently:

Supabase sends the invite email with its default template and sender identity.

Planned:

Supabase will still be used for:

User creation

Invite tokens

Password verification

Resend will be used for:

Sending branded emails from @ferdy.io

Using custom templates for:

Invite / “Accept the invite”

Possibly login-related notifications (if implemented)

Expected pattern:

Backend requests an invite / verification token from Supabase.

Backend calls Resend to send an email that includes:

The invite link with token

Brand context (name, logo, etc.).

The rest of the flow (set password → sign in → create membership) stays conceptually the same.

This file should be updated once the Resend-based invite flow is implemented.