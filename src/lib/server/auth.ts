'use server'

import { supabaseAdmin } from '@/lib/supabase-server'

const BRAND_ADMIN_ROLES = new Set(['admin'])
const GROUP_ADMIN_ROLES = new Set(['owner', 'admin', 'super_admin'])

export async function requireAdminForBrand(brandId: string, userId: string) {
  // Check brand-level admin role first
  const { data, error } = await supabaseAdmin
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('requireAdminForBrand error', error)
    throw new Error('Unable to verify permissions')
  }

  if (data && BRAND_ADMIN_ROLES.has(data.role)) {
    return true
  }

  // Fall back to group-level admin check
  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('group_id')
    .eq('id', brandId)
    .maybeSingle()

  if (brand?.group_id) {
    const { data: groupMembership } = await supabaseAdmin
      .from('group_memberships')
      .select('role')
      .eq('group_id', brand.group_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (groupMembership && GROUP_ADMIN_ROLES.has(groupMembership.role)) {
      return true
    }
  }

  throw new Error('You do not have permission to manage this team')
}


