/**
 * Supabase admin client for test setup/teardown.
 * Uses the service_role key from .env.test to bypass RLS.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'PASTE_SERVICE_ROLE_KEY_HERE') {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.test. ' +
    'Get it from: https://supabase.com/dashboard/project/yrldovxoekpdgeqpucmt/settings/api'
  );
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Test user helpers ───

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(email: string, password: string, fullName: string): Promise<TestUser> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) throw new Error(`createTestUser(${email}): ${error.message}`);

  // Create profile
  await supabaseAdmin.from('profiles').upsert({
    user_id: data.user.id,
    full_name: fullName,
    role: 'admin',
  }, { onConflict: 'user_id' });

  return { id: data.user.id, email, password };
}

export async function deleteTestUser(userId: string) {
  // Cascade deletes handle memberships etc.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) console.warn(`deleteTestUser(${userId}): ${error.message}`);
}

// ─── Test group/brand helpers ───

export interface TestGroup {
  id: string;
  name: string;
}

export async function createTestGroup(name: string, ownerId: string): Promise<TestGroup> {
  const { data, error } = await supabaseAdmin
    .from('groups')
    .insert({
      name,
      currency: 'nzd',
      country_code: 'NZ',
      price_per_brand_cents: 14700,
      subscription_status: 'active',
    })
    .select('id, name')
    .single();

  if (error) throw new Error(`createTestGroup(${name}): ${error.message}`);

  // Add owner membership
  await supabaseAdmin.from('group_memberships').insert({
    group_id: data.id,
    user_id: ownerId,
    role: 'owner',
  });

  return data;
}

export interface TestBrand {
  id: string;
  name: string;
  groupId: string;
}

export async function createTestBrand(name: string, groupId: string, adminUserId: string): Promise<TestBrand> {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .insert({
      name,
      group_id: groupId,
      timezone: 'Pacific/Auckland',
      country_code: 'NZ',
      status: 'active',
    })
    .select('id, name, group_id')
    .single();

  if (error) throw new Error(`createTestBrand(${name}): ${error.message}`);

  // Add brand admin
  await supabaseAdmin.from('brand_memberships').insert({
    brand_id: data.id,
    user_id: adminUserId,
    role: 'admin',
  });

  return { id: data.id, name: data.name, groupId: data.group_id };
}

// ─── Cleanup ───

export async function cleanupTestGroup(groupId: string) {
  // Delete brands (cascades to brand_memberships, brand_invites, etc.)
  await supabaseAdmin.from('brands').delete().eq('group_id', groupId);
  // Delete group memberships
  await supabaseAdmin.from('group_memberships').delete().eq('group_id', groupId);
  // Delete group
  await supabaseAdmin.from('groups').delete().eq('id', groupId);
}

export async function addGroupMember(groupId: string, userId: string, role: 'owner' | 'admin' | 'member') {
  const { error } = await supabaseAdmin.from('group_memberships').upsert({
    group_id: groupId,
    user_id: userId,
    role,
  }, { onConflict: 'group_id,user_id' });

  if (error) throw new Error(`addGroupMember: ${error.message}`);
}

export async function addBrandMember(brandId: string, userId: string, role: 'admin' | 'editor') {
  const { error } = await supabaseAdmin.from('brand_memberships').upsert({
    brand_id: brandId,
    user_id: userId,
    role,
  }, { onConflict: 'brand_id,user_id' });

  if (error) throw new Error(`addBrandMember: ${error.message}`);
}
