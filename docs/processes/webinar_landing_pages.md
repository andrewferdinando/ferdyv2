# Webinar Landing Pages

## Overview

Ferdy has a multi-webinar landing page system that lets you launch new webinar/training registration pages by adding a single config object — no code changes required.

Each webinar gets a standalone page at `/webinar/[slug]` with its own headline, date, host info, and registration form. Pages are designed for cold Meta ad traffic (mobile-first, high-conversion layout).

## How to create a new webinar

1. Open `src/app/webinar/config.ts`
2. Add a new object to the `webinars` array:

```ts
{
  slug: 'ferdy-hospo-melbourne',          // URL-safe, unique
  name: 'The Ferdy System: Melbourne',     // Human-readable, used in emails
  niche: 'hospo',                          // For segmentation
  location: 'melbourne',                   // For segmentation
  headline: 'Your headline here',
  subHeadline: 'Your sub-headline here',
  date: 'Thursday 22 May, 7pm AEST',      // Human-readable, displayed on page
  datetime: '2026-05-22T19:00:00+10:00',  // ISO 8601 — used for calendar links
  duration_minutes: 60,                    // Used for calendar event end time
  zoom_url: 'https://zoom.us/j/...',       // Shown in calendar event; update before go-live
  spots: 50,                               // Shown in urgency line
  host: {
    name: 'Andrew',
    bio: 'Bio text here',
  },
  what_you_will_learn: [
    'Learning point 1',
    'Learning point 2',
  ],
}
```

3. Deploy. The page is live at `/webinar/ferdy-hospo-melbourne`.

That's it — no other files need to change.

## Architecture

### File structure

| File | Purpose |
|------|---------|
| `src/app/webinar/config.ts` | Webinar definitions array + `getWebinarBySlug()` helper |
| `src/app/webinar/[slug]/page.tsx` | Next.js dynamic route — metadata, static params, 404 handling |
| `src/app/webinar/[slug]/WebinarPage.tsx` | Client component — full landing page UI |
| `src/app/webinar/[slug]/actions.ts` | Server Action — form validation, Supabase insert, confirmation email |
| `src/lib/emails/webinar.ts` | Resend email helpers (confirmation + stubs for future sequences) |
| `src/emails/WebinarConfirmation.tsx` | React Email template for confirmation |
| `supabase/migrations/20260325_webinar_registrations.sql` | Database table + RLS policies |

### Page sections (in order)

1. **Hero** — Headline, sub-headline, date, CTA button
2. **Pain points** — 3 cards about hospo social media struggles
3. **What you'll learn** — Numbered list from config
4. **Who it's for** — Short paragraph
5. **About the host** — From config
6. **Social proof** — Testimonial placeholders (edit in WebinarPage.tsx)
7. **Registration form** — First name + email, hidden config fields
8. **FAQ** — 4 common questions

### Registration flow

1. User fills in first name + email
2. Server Action validates input with Zod
3. Upserts to `webinar_registrations` table (deduplicates by email + slug)
4. Fires confirmation email via Resend (non-blocking)
5. Shows inline thank-you state (no redirect) with "Add to calendar" buttons

### Add to Calendar

After successful registration, the thank-you state shows three calendar buttons:
- **Google Calendar** — opens a pre-filled Google Calendar event in a new tab
- **Apple / iCal** — downloads a `.ics` file
- **Outlook** — downloads the same `.ics` file

These pull event details from the config: `name` (title), `datetime` (ISO start time), `duration_minutes` (end time), and `zoom_url` (location field).

**Important**: The `datetime` field must be a valid ISO 8601 string (e.g. `2026-04-14T19:00:00+10:00`) for calendar links to work correctly. The `date` field is the human-readable display string. Both must be set.

Update `zoom_url` in config before the webinar goes live — it appears in the calendar event location.

### Database: `webinar_registrations`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| first_name | text | Not null |
| email | text | Not null |
| webinar_slug | text | From config, used for email sequence filtering |
| webinar_name | text | Human-readable, used in emails |
| niche | text | For segmentation (e.g. "hospo") |
| location | text | For segmentation (e.g. "sydney") |
| created_at | timestamptz | Default now() |

**RLS**: Anon can insert. Only service_role can read.

**Unique constraint**: One registration per email per webinar slug.

### Design notes

- **Standalone page** — no Ferdy app header/footer/nav
- **Mobile-first** — sticky "Register now" button on mobile appears after hero scrolls out
- **Warm palette** — stone/amber tones, not generic SaaS purple
- **Scroll reveals** — sections fade in via Intersection Observer
- **Font**: Inherits Inter from root layout

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes (existing) | Resend API key |
| `RESEND_WEBINAR_FROM_EMAIL` | Optional | From address for webinar emails. Falls back to `Ferdy <support@ferdy.io>` |

## Email sequences (future)

The confirmation email is live. Pre/post webinar sequences are stubbed in `src/lib/emails/webinar.ts`.

**Recommended approach**: Vercel Cron + API route

1. Create `/api/webinar/send-reminders` API route
2. Add Vercel Cron schedule (e.g. hourly)
3. Route queries `webinar_registrations` by slug, checks webinar date from config
4. Sends the appropriate email (1 week, 1 day, 1 hour before; day 0/1/3/5/7 after)
5. Track sent emails in a `webinar_emails_sent` table to prevent duplicates

## Updating testimonials

Social proof quotes are currently placeholders. Edit the testimonials array in `src/app/webinar/[slug]/WebinarPage.tsx` in the "Social proof" section.

## Updating FAQ

FAQ content is in `src/app/webinar/[slug]/WebinarPage.tsx` in the FAQ section. Edit the array directly.

## Changing the page design

All page UI is in `WebinarPage.tsx` (client component). The page uses Tailwind utility classes with stone/amber colour tokens. No external CSS file — everything is self-contained.
