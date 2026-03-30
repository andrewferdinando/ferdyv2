# Webinar Management System

## Overview

Ferdy has a DB-driven webinar management system. New webinars are created from the Super Admin dashboard — no code changes required. Each webinar gets a standalone landing page at `/webinar/[slug]` with registration, calendar invites, and automated pre-event reminder emails.

## How to create a new webinar

1. Go to **Super Admin → Webinars** (`/super-admin/webinars`)
2. Click **+ New Webinar** and fill in the form:
   - **Name** — e.g. "The Ferdy System: Melbourne" (slug auto-generated)
   - **Headline / Sub-headline** — landing page copy
   - **Date Label** — human-readable, shown on page (e.g. "Thursday 22 May, 7pm AEST - 30 mins + Q&A")
   - **Date & Time** — actual event datetime (used for calendar links and reminder scheduling)
   - **Duration** — in minutes (default 60)
   - **Zoom URL** — update before go-live
   - **Spots** — shown in urgency line on landing page
   - **Niche / Location** — for segmentation
   - **Host Name / Bio** — shown on landing page
   - **What You'll Learn** — one item per line
3. Webinar is created in **Draft** status. Click **Activate** when ready.
4. Landing page is live at `/webinar/{slug}`.

## Webinar lifecycle

```
Draft → Active → Completed
                ↘ Cancelled
```

- **Draft**: Webinar exists in DB but landing page is not publicly accessible
- **Active**: Landing page is live, registrations accepted, reminder emails scheduled
- **Completed**: Set after the event. Landing page no longer accessible. Enter attendance and onboarding metrics.
- **Cancelled**: Landing page removed. Can revert to Draft if needed.

## Architecture

### File structure

| File | Purpose |
|------|---------|
| `src/app/webinar/config.ts` | `WebinarConfig` TypeScript interface (type only) |
| `src/app/webinar/[slug]/page.tsx` | Next.js dynamic route — fetches webinar from DB, metadata, 404 handling |
| `src/app/webinar/[slug]/WebinarPage.tsx` | Client component — full landing page UI |
| `src/app/webinar/[slug]/actions.ts` | Server Action — form validation, Supabase insert, confirmation email |
| `src/app/(dashboard)/super-admin/webinars/page.tsx` | Super Admin management page |
| `src/app/api/super-admin/webinars/route.ts` | API route — GET/POST/PATCH for webinar CRUD |
| `src/app/api/emails/webinar-reminders/route.ts` | Hourly cron — sends 2-day, 1-day, 1-hour reminders |
| `src/lib/emails/webinar.ts` | Resend email helpers (confirmation + reminders) |
| `src/lib/webinar-calendar.ts` | Shared calendar utilities (Google Calendar URL + ICS file) |
| `src/emails/WebinarConfirmation.tsx` | React Email template — registration confirmation |
| `src/emails/WebinarReminder.tsx` | React Email template — 2-day, 1-day, 1-hour reminders |

### Data flow

```
Super Admin creates webinar → webinars table (DB)
                                    ↓
Landing page [slug]/page.tsx ← fetches active webinar from DB
                                    ↓
User registers → actions.ts → webinar_registrations table
                                    ↓
                              sendWebinarConfirmation() (fire-and-forget)
                                    ↓
Hourly cron checks reminder windows → sendWebinarReminder() per registrant
```

### Page sections (in order)

1. **Hero** — Headline, sub-headline, date, CTA button
2. **Pain points** — Cards about social media struggles
3. **What you'll learn** — Numbered list from DB
4. **Who it's for** — Short paragraph
5. **About the host** — From DB
6. **Social proof** — Testimonial (edit in WebinarPage.tsx)
7. **Registration form** — First name + email, hidden config fields
8. **FAQ** — Common questions (edit in WebinarPage.tsx)

### Registration flow

1. User fills in first name + email
2. Server Action validates input with Zod
3. Validates webinar slug exists and is active in DB
4. Upserts to `webinar_registrations` table (deduplicates by email + slug)
5. Fires confirmation email via Resend (non-blocking)
6. Shows inline thank-you state (no redirect) with "Add to calendar" buttons

### Add to Calendar (2-step thank-you flow)

After registration, the form is replaced with a 2-step progress UI:
- **Step 1** (auto-completed): "Registered - check your inbox"
- **Step 2** (action required): "Add to your calendar" with Google Calendar and Apple/Outlook buttons

Calendar logic is shared between the landing page and emails via `src/lib/webinar-calendar.ts`.

**Important**: The `datetime` field must be a valid ISO 8601 string for calendar links to work correctly. The `date_label` field is the human-readable display string. Both must be set.

## Email system

### Email templates

| Template | File | Sent when | Primary CTA |
|----------|------|-----------|-------------|
| Confirmation | `WebinarConfirmation.tsx` | Immediately on registration | Add to Google Calendar + .ics attachment |
| 2-day reminder | `WebinarReminder.tsx` | 2 days before event | Add to Google Calendar + .ics attachment |
| 1-day reminder | `WebinarReminder.tsx` | 1 day before event | Join link (Zoom) |
| 1-hour reminder | `WebinarReminder.tsx` | 1 hour before event | Join link (Zoom) |

The confirmation and 2-day reminder include a `.ics` file attachment. The 1-day and 1-hour reminders show the Zoom join link as the primary CTA.

### Reminder cron

- **Route**: `/api/emails/webinar-reminders`
- **Schedule**: Hourly via Vercel Cron (`0 * * * *` in `vercel.json`)
- **Logic**: Fetches active webinars with future datetimes, checks if each reminder window has been reached but not yet sent
- **Idempotency**: `reminder_2day_sent_at`, `reminder_1day_sent_at`, `reminder_1hour_sent_at` columns on the `webinars` table prevent double-sends

### Email functions

In `src/lib/emails/webinar.ts`:
- `sendWebinarConfirmation(data)` — sent on registration
- `sendWebinarReminder(data, '2day' | '1day' | '1hour')` — sent by cron

## Database

### `webinars` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| slug | text | Unique, auto-generated from name |
| name | text | Human-readable |
| headline, sub_headline | text | Landing page copy |
| niche, location | text | Segmentation |
| date_label | text | Human-readable date shown on page |
| datetime | timestamptz | Actual event time (calendar/email logic) |
| duration_minutes | int | Default 60 |
| zoom_url | text | Update before go-live |
| spots | int | Default 50 |
| host_name, host_bio | text | Shown on landing page |
| what_you_will_learn | text[] | Numbered list items |
| status | text | draft / active / completed / cancelled |
| attendance_count | int | Manually entered post-event |
| onboarding_booked_count | int | Manually entered post-event |
| reminder_2day_sent_at | timestamptz | Idempotency guard |
| reminder_1day_sent_at | timestamptz | Idempotency guard |
| reminder_1hour_sent_at | timestamptz | Idempotency guard |
| created_at, updated_at | timestamptz | Timestamps |

**RLS**: Anon can SELECT where `status = 'active'`. Service_role has full access.

### `webinar_registrations` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| first_name | text | Not null |
| email | text | Not null |
| webinar_slug | text | Links to webinar |
| webinar_name | text | Human-readable, used in emails |
| niche | text | Segmentation |
| location | text | Segmentation |
| created_at | timestamptz | Default now() |

**RLS**: Anon can INSERT. Only service_role can read.

**Unique constraint**: One registration per email per webinar slug.

## Super Admin dashboard

The webinars page at `/super-admin/webinars` shows:

- **Create form**: All webinar fields, creates in Draft status
- **Webinar cards** (one per webinar):
  - Name, date, status badge
  - Registration count (from DB)
  - Attendance count (click to edit)
  - Onboarding booked count (click to edit)
  - Show-up rate (attendance / registrations)
  - Booking rate (onboarding / attendance)
  - Reminder status badges (pending / sent)
  - Copy landing page URL button
  - Status actions (Activate, Mark Completed, Cancel, Revert to Draft)

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes (existing) | Resend API key |
| `RESEND_WEBINAR_FROM_EMAIL` | Optional | From address. Falls back to `Ferdy <support@ferdy.io>` |

## Design notes

- **Standalone page** — no Ferdy app header/footer/nav
- **Mobile-first** — sticky "Register now" button on mobile appears after hero scrolls out
- **Warm palette** — stone/amber tones
- **Scroll reveals** — sections fade in via Intersection Observer
- **Font**: Inherits Inter from root layout

## Updating static content

- **Testimonials**: Edit the testimonials array in `WebinarPage.tsx` (Social proof section)
- **FAQ**: Edit the FAQ array in `WebinarPage.tsx`
- **Pain points / "Who it's for"**: Edit directly in `WebinarPage.tsx` — currently hospo-specific

## Future enhancements

- Post-webinar replay email (template stub exists in `src/lib/emails/webinar.ts`)
- Follow-up email sequences (day 1/3/5/7 stubs exist)
- Making hardcoded landing page copy (pain points, FAQ, testimonials) configurable per webinar via DB
