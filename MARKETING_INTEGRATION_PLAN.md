# Marketing Pages Integration Plan

## Current State Analysis

### Existing Next.js App Structure
- **Framework**: Next.js 15.5.7 with App Router
- **Root page** (`/`): Currently redirects authenticated users to `/brands`, unauthenticated to `/auth/sign-in`
- **Existing routes**:
  - `/auth/*` - Authentication pages
  - `/brands/*` - Main dashboard and app functionality
  - `/terms` - Terms page
  - `/privacy` - Privacy page
  - `/data-deletion` - Data deletion page

### Marketing Website (Vite Reference)
- **Pages to integrate**:
  - Home (landing page with hero, features, pricing, examples)
  - Features section
  - How it Works section
  - Examples section
  - Pricing section
  - Contact page
- **Components**:
  - Header with navigation
  - Hero section
  - Features grid
  - How it Works steps
  - Examples/testimonials
  - Pricing cards
  - Footer

## Integration Approach

### Strategy
1. **Replace root page** (`/`) with marketing landing page instead of redirect
2. **Add new marketing routes**:
   - `/` - Home/landing page
   - `/contact` - Contact page (if not exists)
3. **Update existing pages**:
   - Keep `/terms` and `/privacy` but style them to match marketing design
4. **Create reusable components**:
   - Marketing layout (different from dashboard layout)
   - Marketing header with "Log in" button → `/auth/sign-in`
   - Marketing footer
   - Section components (Hero, Features, HowItWorks, Examples, Pricing)

### Technical Implementation
1. Create `src/app/(marketing)` route group for marketing pages
2. Create marketing layout with header/footer
3. Port components from Vite app to Next.js React Server Components
4. Extract and adapt Tailwind styles
5. Ensure "Log in" button links to `/auth/sign-in`
6. Ensure "Get Started" button links to `/auth/sign-in` (or signup flow)

### Files to Create
- `src/app/(marketing)/layout.tsx` - Marketing layout
- `src/app/(marketing)/page.tsx` - Home page (replaces current redirect)
- `src/app/(marketing)/contact/page.tsx` - Contact page
- `src/components/marketing/Header.tsx`
- `src/components/marketing/Footer.tsx`
- `src/components/marketing/Hero.tsx`
- `src/components/marketing/Features.tsx`
- `src/components/marketing/HowItWorks.tsx`
- `src/components/marketing/Examples.tsx`
- `src/components/marketing/Pricing.tsx`

### Files to Modify
- Move current `src/app/page.tsx` logic to middleware or keep as fallback
- Update `src/app/terms/page.tsx` to use marketing layout
- Update `src/app/privacy/page.tsx` to use marketing layout

## No Changes Required
- ✅ DNS settings
- ✅ Domain configuration (www.ferdy.io stays as-is)
- ✅ Supabase settings
- ✅ OAuth redirect URLs
- ✅ Environment variables
- ✅ Existing `/brands/*` routes
- ✅ Existing `/auth/*` routes
- ✅ Database or backend logic

## Testing Plan
1. Run locally with `npm run dev`
2. Verify marketing pages render correctly
3. Verify "Log in" button navigates to `/auth/sign-in`
4. Verify authenticated users can still access `/brands`
5. Verify existing app functionality is unaffected
6. Show preview to user for approval before deploying

## Deployment
- After user approval, push to GitHub
- Vercel will auto-deploy (assuming existing Vercel setup)
- No manual DNS or domain changes needed
