-- Ferdy Database Migration
-- Comprehensive schema for multi-tenant social media management platform
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- AUTH & TENANCY TABLES
-- ========================================

-- 1. User profiles
CREATE TABLE profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role text CHECK (role IN ('admin','editor','viewer')) DEFAULT 'editor',
    created_at timestamptz DEFAULT now(),
    last_login_at timestamptz
);

-- 2. Brands (multi-tenant)
CREATE TABLE brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    timezone text NOT NULL DEFAULT 'Pacific/Auckland',
    created_at timestamptz DEFAULT now()
);

-- Unique constraint on brand names (case-insensitive)
CREATE UNIQUE INDEX brands_name_unique ON brands (LOWER(name));

-- 3. Brand memberships (user access to brands)
CREATE TABLE brand_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('owner','admin','editor','viewer')) DEFAULT 'editor',
    created_at timestamptz DEFAULT now(),
    UNIQUE (brand_id, user_id)
);

-- Indexes for brand_memberships
CREATE INDEX brand_memberships_brand_id ON brand_memberships (brand_id);
CREATE INDEX brand_memberships_user_id ON brand_memberships (user_id);

-- ========================================
-- SOCIAL CONNECTIONS & INTEGRATIONS
-- ========================================

-- 4. Social media accounts
CREATE TABLE social_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    provider text CHECK (provider IN ('facebook','instagram','tiktok','linkedin','x')) NOT NULL,
    account_id text NOT NULL,
    handle text,
    token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamptz,
    status text CHECK (status IN ('connected','expired','revoked','error')) DEFAULT 'connected',
    connected_by_user_id uuid REFERENCES auth.users(id),
    last_refreshed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Index for social_accounts
CREATE INDEX social_accounts_brand_provider ON social_accounts (brand_id, provider);

-- 5. Brand integrations (non-social)
CREATE TABLE brand_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    provider text NOT NULL,
    status text,
    settings jsonb,
    created_at timestamptz DEFAULT now()
);

-- Index for brand_integrations
CREATE INDEX brand_integrations_brand_provider ON brand_integrations (brand_id, provider);

-- ========================================
-- CONTENT LIBRARY & PREFERENCES
-- ========================================

-- 6. Assets (images, videos, etc.)
CREATE TABLE assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    title text,
    storage_path text NOT NULL,
    width int,
    height int,
    aspect_ratio text CHECK (aspect_ratio IN ('original','1:1','4:5','1.91:1')) DEFAULT 'original',
    crop_windows jsonb,
    tags text[],
    created_at timestamptz DEFAULT now()
);

-- Indexes for assets
CREATE INDEX assets_brand_id ON assets (brand_id);
CREATE INDEX assets_tags_gin ON assets USING GIN (tags);

-- 7. Content preferences
CREATE TABLE content_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid UNIQUE NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    default_aspect_ratio text CHECK (default_aspect_ratio IN ('1:1','4:5','1.91:1')) DEFAULT '1:1',
    allowed_aspect_ratios text[],
    tone_default text,
    hashtag_strategy jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ========================================
-- TAXONOMY
-- ========================================

-- 8. Categories
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Unique constraint on category names per brand (case-insensitive)
CREATE UNIQUE INDEX categories_brand_name_unique ON categories (brand_id, LOWER(name));
CREATE INDEX categories_brand_id ON categories (brand_id);

-- 9. Subcategories
CREATE TABLE subcategories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    detail text,
    url text,
    default_hashtags text[],
    created_at timestamptz DEFAULT now()
);

-- Unique constraint on subcategory names per brand/category (case-insensitive)
CREATE UNIQUE INDEX subcategories_brand_category_name_unique ON subcategories (brand_id, category_id, LOWER(name));
CREATE INDEX subcategories_brand_id ON subcategories (brand_id);
CREATE INDEX subcategories_category_id ON subcategories (category_id);

-- ========================================
-- SCHEDULING & GENERATION & PUBLISHING
-- ========================================

-- 10. Schedule rules
CREATE TABLE schedule_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name text,
    category_id uuid REFERENCES categories(id),
    subcategory_id uuid REFERENCES subcategories(id),
    tone text,
    hashtag_rule jsonb,
    image_tag_rule jsonb,
    frequency text CHECK (frequency IN ('daily','weekly','monthly')) NOT NULL,
    times_per_week int,
    days_of_week int[],
    day_of_month int,
    nth_week int,
    weekday int,
    time_of_day time,
    channels text[],
    timezone text,
    is_active boolean DEFAULT true,
    first_run_month date,
    last_run_month date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for schedule_rules
CREATE INDEX schedule_rules_brand_active ON schedule_rules (brand_id, is_active);

-- 11. Post jobs (individual scheduled posts)
CREATE TABLE post_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    schedule_rule_id uuid REFERENCES schedule_rules(id),
    channel text CHECK (channel IN ('facebook','instagram','tiktok','linkedin','x')) NOT NULL,
    target_month date NOT NULL,
    scheduled_at timestamptz NOT NULL,
    scheduled_local timestamptz,
    scheduled_tz text,
    status text CHECK (status IN ('pending','generated','ready','publishing','published','failed','canceled')) DEFAULT 'pending',
    error text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for post_jobs
CREATE INDEX post_jobs_brand_scheduled ON post_jobs (brand_id, scheduled_at);
CREATE INDEX post_jobs_status_scheduled ON post_jobs (status, scheduled_at);
CREATE INDEX post_jobs_schedule_rule ON post_jobs (schedule_rule_id);

-- 12. Drafts (generated content)
CREATE TABLE drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    post_job_id uuid REFERENCES post_jobs(id) ON DELETE CASCADE,
    channel text,
    copy text,
    hashtags text[],
    asset_ids uuid[],
    tone text,
    generated_by text CHECK (generated_by IN ('ai','human','ai+human')) DEFAULT 'ai',
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    approved boolean DEFAULT false
);

-- Indexes for drafts
CREATE INDEX drafts_brand_id ON drafts (brand_id);
CREATE INDEX drafts_post_job_id ON drafts (post_job_id);

-- 13. Publishes (actual posts sent to social platforms)
CREATE TABLE publishes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    post_job_id uuid REFERENCES post_jobs(id) ON DELETE CASCADE,
    draft_id uuid REFERENCES drafts(id),
    channel text,
    social_account_id uuid REFERENCES social_accounts(id),
    published_at timestamptz,
    external_post_id text,
    external_url text,
    status text CHECK (status IN ('queued','success','failed','retry')) DEFAULT 'queued',
    error text,
    attempt int DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Indexes for publishes
CREATE INDEX publishes_brand_id ON publishes (brand_id);
CREATE INDEX publishes_post_job_id ON publishes (post_job_id);

-- 14. Runs (observability/idempotency)
CREATE TABLE runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name text,
    scope jsonb,
    status text CHECK (status IN ('started','success','failed')),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz
);

-- Indexes for runs
CREATE INDEX runs_brand_name ON runs (brand_id, name);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Brand-scoped tables policies
-- Helper function for brand access check
CREATE OR REPLACE FUNCTION user_has_brand_access(brand_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM brand_memberships bm 
        WHERE bm.brand_id = brand_uuid 
        AND bm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for brand edit access check
CREATE OR REPLACE FUNCTION user_has_brand_edit_access(brand_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM brand_memberships bm 
        WHERE bm.brand_id = brand_uuid 
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner','admin','editor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brands policies
CREATE POLICY "Users can view brands they're members of" ON brands
    FOR SELECT USING (user_has_brand_access(id));

CREATE POLICY "Users can edit brands they have edit access to" ON brands
    FOR ALL USING (user_has_brand_edit_access(id));

-- Brand memberships policies
CREATE POLICY "Users can view memberships for brands they're members of" ON brand_memberships
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage memberships for brands they have edit access to" ON brand_memberships
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Social accounts policies
CREATE POLICY "Users can view social accounts for brands they're members of" ON social_accounts
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage social accounts for brands they have edit access to" ON social_accounts
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Brand integrations policies
CREATE POLICY "Users can view integrations for brands they're members of" ON brand_integrations
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage integrations for brands they have edit access to" ON brand_integrations
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Assets policies
CREATE POLICY "Users can view assets for brands they're members of" ON assets
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage assets for brands they have edit access to" ON assets
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Content preferences policies
CREATE POLICY "Users can view content preferences for brands they're members of" ON content_preferences
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage content preferences for brands they have edit access to" ON content_preferences
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Categories policies
CREATE POLICY "Users can view categories for brands they're members of" ON categories
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage categories for brands they have edit access to" ON categories
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Subcategories policies
CREATE POLICY "Users can view subcategories for brands they're members of" ON subcategories
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage subcategories for brands they have edit access to" ON subcategories
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Schedule rules policies
CREATE POLICY "Users can view schedule rules for brands they're members of" ON schedule_rules
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage schedule rules for brands they have edit access to" ON schedule_rules
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Post jobs policies
CREATE POLICY "Users can view post jobs for brands they're members of" ON post_jobs
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage post jobs for brands they have edit access to" ON post_jobs
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Drafts policies
CREATE POLICY "Users can view drafts for brands they're members of" ON drafts
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage drafts for brands they have edit access to" ON drafts
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Publishes policies
CREATE POLICY "Users can view publishes for brands they're members of" ON publishes
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage publishes for brands they have edit access to" ON publishes
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- Runs policies
CREATE POLICY "Users can view runs for brands they're members of" ON runs
    FOR SELECT USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage runs for brands they have edit access to" ON runs
    FOR ALL USING (user_has_brand_edit_access(brand_id));

-- ========================================
-- TRIGGERS & FUNCTIONS
-- ========================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_content_preferences_updated_at 
    BEFORE UPDATE ON content_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_schedule_rules_updated_at 
    BEFORE UPDATE ON schedule_rules 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ========================================
-- COMMENTS & DOCUMENTATION
-- ========================================

-- Add helpful comments to key tables
COMMENT ON TABLE brands IS 'Multi-tenant brands/organizations';
COMMENT ON TABLE brand_memberships IS 'User access control for brands';
COMMENT ON TABLE schedule_rules IS 'Rules that define when and what to post';
COMMENT ON TABLE post_jobs IS 'Individual scheduled posts generated from rules';
COMMENT ON TABLE drafts IS 'Generated content ready for review/approval';
COMMENT ON TABLE publishes IS 'Actual posts sent to social platforms';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Ferdy database schema created successfully!';
    RAISE NOTICE 'All tables have RLS enabled with appropriate policies.';
    RAISE NOTICE 'Users can now sign up and be automatically assigned profiles.';
END $$;
