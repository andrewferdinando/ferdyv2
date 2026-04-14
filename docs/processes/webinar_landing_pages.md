# Webinar Management System

## Overview

Ferdy has a DB-driven webinar management system. New webinars are created from the Super Admin dashboard — no code changes required. Each webinar gets a standalone landing page at `/webinar/[slug]` with registration, calendar invites, automated pre-event reminders, and a post-event follow-up email sequence promoting onboarding sessions.

The system also includes a Calendly integration for onboarding bookings. When someone books an onboarding session via Calendly (whether from a webinar follow-up email or directly), automated prep reminder emails are sent before the session.

## How to create a new webinar

1. Go to **Super Admin → Webinars** (`/super-admin/webinars`)
2. Click **+ New Webinar** and fill in the form:
   - **Name** — e.g. "The Ferdy System: Melbourne" (slug auto-generated)
   - **Headline / Sub-headline** — landing page copy
   - **Date Label** — human-readable, shown on page (e.g. "Thursday 22 May, 7pm AEST - 30 mins + Q&A")
   - **Date & Time** — actual event datetime (used for calendar links and reminder scheduling)
   - **Duration** — in minutes (default 60)
   - **Webinar URL** — the join link (e.g. Zoho, Zoom). Shown in emails and calendar invites
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
| `src/app/api/emails/webinar-reminders/route.ts` | Hourly cron — sends 2-day, 1-day, 1-hour pre-event reminders |
| `src/app/api/emails/webinar-follow-ups/route.ts` | Hourly cron — sends post-event replay + follow-up emails |
| `src/lib/emails/webinar.ts` | Resend email helpers (confirmation, admin notification, reminders, follow-ups) |
| `src/lib/webinar-calendar.ts` | Shared calendar utilities (Google Calendar URL + ICS file) |
| `src/emails/WebinarConfirmation.tsx` | React Email template — registration confirmation |
| `src/emails/WebinarAdminNotification.tsx` | React Email template — admin notification on registration |
| `src/emails/WebinarReminder.tsx` | React Email template — 2-day, 1-day, 1-hour reminders |
| `src/emails/WebinarReplay.tsx` | React Email template — recording + onboarding offer |
| `src/emails/WebinarFollowUp1.tsx` | React Email template — onboarding reminder |
| `src/emails/WebinarFollowUp2.tsx` | React Email template — final deadline reminder |

### Data flow

```
Super Admin creates webinar → webinars table (DB)
                                    ↓
Landing page [slug]/page.tsx ← fetches active webinar from DB
                                    ↓
User registers → actions.ts → webinar_registrations table
                                    ↓
                              sendWebinarConfirmation() + sendWebinarAdminNotification()
                                    ↓
Pre-event cron (hourly) → sendWebinarReminder() per registrant
                                    ↓
                            [webinar happens]
                                    ↓
Post-event cron (hourly) → sendWebinarReplay() / sendWebinarFollowUp1() / sendWebinarFollowUp2()
```

### Page sections (in order)

1. **Hero** — Headline, sub-headline, date, CTA button
2. **Pain points** — Cards about social media struggles
3. **What you'll learn** — Numbered list from DB
4. **Who it's for** — Short paragraph
5. **About the host** — From DB
6. **Registration form** — First name + email, hidden config fields
7. **FAQ** — Common questions (edit in WebinarPage.tsx)

### Registration flow

1. User fills in first name + email
2. Server Action validates input with Zod
3. Validates webinar slug exists and is active in DB
4. Upserts to `webinar_registrations` table (deduplicates by email + slug)
5. Sends confirmation email + admin notification via Resend (`await Promise.all`)
6. Fires Meta Pixel `Lead` event on the client via `useEffect`
7. Shows inline thank-you state (no redirect) with "Add to calendar" buttons

### Add to Calendar (2-step thank-you flow)

After registration, the form is replaced with a 2-step progress UI:
- **Step 1** (auto-completed): "Registered - check your inbox"
- **Step 2** (action required): "Add to your calendar" with Google Calendar and Apple/Outlook buttons

Calendar logic is shared between the landing page and emails via `src/lib/webinar-calendar.ts`.

**Important**: The `datetime` field must be a valid ISO 8601 string for calendar links to work correctly. The `date_label` field is the human-readable display string. Both must be set.

## Email system

### Email templates

#### Pre-webinar

| Template | File | Sent when | Primary CTA |
|----------|------|-----------|-------------|
| Confirmation | `WebinarConfirmation.tsx` | Immediately on registration | Join link + Add to Google Calendar + .ics attachment |
| Admin notification | `WebinarAdminNotification.tsx` | Immediately on registration (to andrew@ferdy.io) | — |
| 2-day reminder | `WebinarReminder.tsx` | 2 days before event | Join link + Add to Google Calendar + .ics attachment |
| 1-day reminder | `WebinarReminder.tsx` | 1 day before event | Join link (primary CTA) |
| 1-hour reminder | `WebinarReminder.tsx` | 1 hour before event | Join link (primary CTA) |

All pre-webinar emails include the webinar join link (stored in `zoom_url` column). The confirmation and 2-day reminder also include `.ics` file attachments and Google Calendar links. The 1-day and 1-hour reminders use the join link as the primary CTA button.

#### Post-webinar

| Template | File | Sent when | Primary CTA |
|----------|------|-----------|-------------|
| Replay + offer | `WebinarReplay.tsx` | 30 mins after end (only if `recording_url` is set) | Watch recording + Book onboarding session |
| Onboarding reminder | `WebinarFollowUp1.tsx` | ~24 hours after end | Book your session |
| Final deadline | `WebinarFollowUp2.tsx` | ~47 hours after end (Fri 9am for a Tues webinar) | Book before midday |

Post-webinar emails promote a free onboarding session with a time-limited discount (20% off every month). The replay email won't send until you add the `recording_url` to the webinar in the DB. The `booking_url` column should point to the Calendly onboarding link.

### Pre-webinar reminder cron

- **Route**: `/api/emails/webinar-reminders`
- **Schedule**: Hourly via Vercel Cron (`0 * * * *` in `vercel.json`)
- **Logic**: Fetches active webinars with future datetimes, checks if each reminder window has been reached but not yet sent
- **Idempotency**: `reminder_2day_sent_at`, `reminder_1day_sent_at`, `reminder_1hour_sent_at` columns on the `webinars` table prevent double-sends

### Post-webinar follow-up cron

- **Route**: `/api/emails/webinar-follow-ups`
- **Schedule**: Hourly via Vercel Cron (`0 * * * *` in `vercel.json`)
- **Logic**: Fetches active webinars with past datetimes, checks if each follow-up window has been reached but not yet sent
- **Replay guard**: The replay email will NOT send until `recording_url` is set in the DB. After the webinar, update it via Supabase or Super Admin and the next cron run will trigger the email.
- **Booking URL**: Must be set in the `booking_url` column. All 3 follow-up emails use it as the CTA link.
- **Idempotency**: `followup_replay_sent_at`, `followup_reminder1_sent_at`, `followup_reminder2_sent_at` columns prevent double-sends

### Email functions

In `src/lib/emails/webinar.ts`:
- `sendWebinarConfirmation(data)` — sent on registration
- `sendWebinarAdminNotification(data)` — sent to andrew@ferdy.io on registration
- `sendWebinarReminder(data, '2day' | '1day' | '1hour')` — sent by pre-webinar cron
- `sendWebinarReplay(data)` — recording + onboarding offer, sent by follow-up cron
- `sendWebinarFollowUp1(data)` — onboarding reminder, sent by follow-up cron
- `sendWebinarFollowUp2(data)` — final deadline reminder, sent by follow-up cron

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
| zoom_url | text | Webinar join link (Zoho/Zoom/etc). Shown in emails + calendar invites |
| spots | int | Default 50 |
| host_name, host_bio | text | Shown on landing page |
| what_you_will_learn | text[] | Numbered list items |
| status | text | draft / active / completed / cancelled |
| attendance_count | int | Manually entered post-event |
| onboarding_booked_count | int | Manually entered post-event |
| recording_url | text | Set after webinar — triggers replay email |
| booking_url | text | Calendly onboarding booking link — used in post-webinar follow-up emails |
| reminder_2day_sent_at | timestamptz | Idempotency guard |
| reminder_1day_sent_at | timestamptz | Idempotency guard |
| reminder_1hour_sent_at | timestamptz | Idempotency guard |
| followup_replay_sent_at | timestamptz | Idempotency guard |
| followup_reminder1_sent_at | timestamptz | Idempotency guard |
| followup_reminder2_sent_at | timestamptz | Idempotency guard |
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

## Tracking

- **Meta Pixel** — Installed site-wide (ID: `3770739559807740`). Fires `PageView` on every page and `Lead` on successful webinar registration.
- **Google Analytics 4** — Installed site-wide via `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var.

## Calendly Onboarding Integration

### Overview

When someone books an onboarding session via Calendly (from post-webinar emails or directly), a Calendly webhook stores the booking and triggers automated prep reminder emails.

### File structure

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/calendly/route.ts` | Webhook endpoint — receives Calendly events, stores bookings, sends emails |
| `src/app/api/emails/onboarding-reminders/route.ts` | Hourly cron — sends 2-day, 1-day, 1-hour prep reminders |
| `src/lib/emails/onboarding.ts` | Resend email helpers (confirmation, reminders, rescheduled) |
| `src/emails/OnboardingConfirmation.tsx` | React Email template — booking confirmation + prep checklist |
| `src/emails/OnboardingReminder2Day.tsx` | React Email template — 2-day reminder + full prep checklist |
| `src/emails/OnboardingReminder1Day.tsx` | React Email template — 1-day reminder + quick checklist |
| `src/emails/OnboardingReminder1Hour.tsx` | React Email template — 1-hour nudge |
| `src/emails/OnboardingRescheduled.tsx` | React Email template — rescheduled notification + prep checklist |

### Data flow

```
Customer books via Calendly → Calendly webhook → onboarding_bookings table
                                                        ↓
                                                  sendOnboardingConfirmation()
                                                        ↓
                                        Hourly cron checks reminder windows
                                                        ↓
                              sendOnboardingReminder2Day/1Day/1Hour() per booking
```

### Webhook events handled

| Calendly Event | Action |
|---------------|--------|
| `invitee.created` (new booking) | Insert booking + send confirmation email |
| `invitee.created` (reschedule) | Insert new booking + send rescheduled email (detected via `old_invitee` field) |
| `invitee.canceled` | Update booking status to `canceled` — no further reminders sent |

### Onboarding email templates

| Template | File | Sent when | Content |
|----------|------|-----------|---------|
| Confirmation | `OnboardingConfirmation.tsx` | Immediately on booking | Booking confirmed + full prep checklist |
| 2-day reminder | `OnboardingReminder2Day.tsx` | 2 days before session | Full prep checklist |
| 1-day reminder | `OnboardingReminder1Day.tsx` | 1 day before session | Quick checkbox checklist |
| 1-hour reminder | `OnboardingReminder1Hour.tsx` | 1 hour before session | Short nudge |
| Rescheduled | `OnboardingRescheduled.tsx` | On reschedule | New date + prep checklist |

### Prep checklist (included in onboarding emails)

1. Have a think about what your categories will be
2. Have your image/video library ready
3. Make sure you know your Facebook password
4. Set up 2-factor authentication for Facebook ([guide](https://www.ferdy.io/help/meta-2fa))
5. Have a credit card ready for sign-up

### `onboarding_bookings` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| calendly_event_uri | text | Unique — Calendly event URI |
| email | text | Not null |
| first_name | text | Not null |
| booking_datetime | timestamptz | Session start time |
| status | text | scheduled / canceled |
| reminder_2day_sent_at | timestamptz | Idempotency guard |
| reminder_1day_sent_at | timestamptz | Idempotency guard |
| reminder_1hour_sent_at | timestamptz | Idempotency guard |
| created_at | timestamptz | Default now() |

### Onboarding reminder cron

- **Route**: `/api/emails/onboarding-reminders`
- **Schedule**: Hourly via Vercel Cron (`0 * * * *` in `vercel.json`)
- **Logic**: Fetches bookings where `status = 'scheduled'` and `booking_datetime` is in the future, checks reminder windows
- **Idempotency**: `reminder_*_sent_at` columns prevent double-sends

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes (existing) | Resend API key |
| `RESEND_WEBINAR_FROM_EMAIL` | Optional | From address. Falls back to `Ferdy <support@ferdy.io>` |
| `CALENDLY_PERSONAL_TOKEN` | Yes | Calendly API token (scopes: webhooks, scheduled_events:read, users:read) |

## Design notes

- **Standalone page** — no Ferdy app header/footer/nav
- **Mobile-first** — sticky "Register now" button on mobile appears after hero scrolls out
- **Warm palette** — stone/amber tones
- **Scroll reveals** — sections fade in via Intersection Observer
- **Font**: Inherits Inter from root layout

## Updating static content

- **FAQ**: Edit the FAQ array in `WebinarPage.tsx`
- **Pain points / "Who it's for"**: Edit directly in `WebinarPage.tsx` — currently hospo-specific

## Post-webinar checklist

After the webinar ends:
1. **Add recording URL**: Update `recording_url` in the `webinars` table via Supabase. The replay email will auto-send on the next hourly cron run.
2. **Verify booking URL**: Ensure `booking_url` is set to the Calendly onboarding link.
3. The follow-up cron handles the rest — replay + 2 reminder emails send automatically at the scheduled windows.
4. Onboarding bookings via Calendly automatically trigger the prep email sequence.
5. After the follow-up sequence completes, mark the webinar as **Completed** in Super Admin.

## Full email journey (customer perspective)

A customer who registers for the webinar, attends, then books onboarding will receive up to 12 emails:

| # | Phase | Email | Timing |
|---|-------|-------|--------|
| 1 | Pre-webinar | Registration confirmation | Immediately on sign-up |
| 2 | Pre-webinar | 2-day reminder | 2 days before webinar |
| 3 | Pre-webinar | 1-day reminder | 1 day before webinar |
| 4 | Pre-webinar | 1-hour reminder | 1 hour before webinar |
| 5 | Post-webinar | Replay + onboarding offer | 30 mins after end (once recording_url set) |
| 6 | Post-webinar | Onboarding reminder | ~24 hours after end |
| 7 | Post-webinar | Final deadline reminder | ~47 hours after end |
| 8 | Onboarding | Booking confirmation + prep checklist | Immediately on Calendly booking |
| 9 | Onboarding | 2-day prep reminder | 2 days before session |
| 10 | Onboarding | 1-day prep reminder | 1 day before session |
| 11 | Onboarding | 1-hour nudge | 1 hour before session |
| — | Onboarding | Rescheduled notification | If session is rescheduled |

Admin also receives a notification email (to andrew@ferdy.io) on every webinar registration.

## How to create a new webinar (instruction for Claude)

Copy and customise this prompt when asking Claude to set up a new webinar:

```
Please set up a new Ferdy webinar with these details:
- Name: [e.g. "The Ferdy System: Melbourne"]
- Date: [e.g. "Tuesday 20 May at 10am AEST"]
- Duration: [e.g. 60 minutes]
- Webinar link: [e.g. Zoho/Zoom URL]
- Calendly onboarding link: https://calendly.com/ferdy-app/ferdy-onboarding
- Niche: [e.g. hospo]
- Location: [e.g. melbourne]

Please:
1. Create the webinar in the DB via Supabase (calculate the correct UTC datetime, check if daylight saving applies)
2. Set the zoom_url to the webinar link
3. Set the booking_url to the Calendly link
4. Update any hardcoded dates on the landing page (WebinarPage.tsx) if they exist
5. Verify the date_label matches the correct timezone (AEST vs AEDT)
6. Commit and push to main

After the webinar I will provide the recording URL to trigger the replay email.
```

**Important timezone notes:**
- AEST (UTC+10) applies April–October (standard time)
- AEDT (UTC+11) applies October–April (daylight saving)
- NZST (UTC+12) / NZDT (UTC+13) — 2-3 hours ahead of Sydney
- Always verify which timezone is active for the webinar date

## Future enhancements

- Making hardcoded landing page copy (pain points, FAQ) configurable per webinar via DB
- Webinar link field configurable from Super Admin (currently `zoom_url` column name is legacy)
