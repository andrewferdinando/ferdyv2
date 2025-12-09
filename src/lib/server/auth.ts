'use server'

import { supabaseAdmin } from '@/lib/supabase-server'

const ADMIN_ROLES = new Set(['admin'])

export async function requireAdminForBrand(brandId: string, userId: string) {
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

  if (!data || !ADMIN_ROLES.has(data.role)) {
    throw new Error('You do not have permission to manage this team')
  }

  return true
}


