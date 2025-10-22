# Authentication Setup Guide

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site URL for email redirects (optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Setup

1. Run the main migration: `supabase_migration.sql`
2. Run the RPC functions: `supabase_rpc_functions.sql`
3. Run the test data setup: `setup_test_data.sql`

## Features Implemented

### Authentication
- ✅ Email/password sign-in and sign-up pages
- ✅ Route protection with RequireAuth component
- ✅ Sign-out functionality in sidebar
- ✅ Session management with Supabase

### Team Management
- ✅ Account Settings → Team page for brand admins
- ✅ Invite users via email with role assignment
- ✅ View team members with roles and join dates
- ✅ Change member roles (admin/editor)
- ✅ Remove members from brands
- ✅ Secure API endpoints with proper authorization

### Security
- ✅ Server-side admin verification
- ✅ RLS policies enforced via RPC functions
- ✅ Service role key protection (never exposed to client)
- ✅ Super admin role support

## Usage

1. **Sign Up**: Users can create accounts at `/auth/sign-up`
2. **Sign In**: Users can sign in at `/auth/sign-in`
3. **Team Management**: Brand admins can manage teams at `/brands/[brandId]/engine-room/account`
4. **Route Protection**: All brand routes are protected and require authentication

## Super Admin Setup

To set yourself as a super admin, update your profile in the database:

```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE user_id = 'your_user_id';
```

Super admins have access to all brands and can manage any team.
