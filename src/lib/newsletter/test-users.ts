import { supabaseAdmin } from '@/lib/supabase-server'

const TEST_USER_PATTERN = /^andrew\+.*@adhoc\.help$/i

export function isTestUserEmail(email: string): boolean {
  return TEST_USER_PATTERN.test(email)
}

export async function getTestUsers() {
  // Get all users who are flagged as test users OR match the email pattern
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, name, is_test_user, created_at')
    .eq('is_test_user', true)

  if (error) {
    throw new Error(`Failed to fetch test users: ${error.message}`)
  }

  // Also get their emails from auth.users
  const userIds = (data || []).map(p => p.user_id)
  if (userIds.length === 0) return []

  const { data: authUsers, error: authError } = await supabaseAdmin
    .auth.admin.listUsers({ perPage: 1000 })

  if (authError) {
    throw new Error(`Failed to fetch auth users: ${authError.message}`)
  }

  const authMap = new Map(
    authUsers.users.map(u => [u.id, u.email])
  )

  // Also find any users matching the email pattern who aren't flagged yet
  const unflaggedTestUsers = authUsers.users
    .filter(u => u.email && isTestUserEmail(u.email) && !userIds.includes(u.id))
    .map(u => u.id)

  // Get profiles for unflagged test users
  let unflaggedProfiles: typeof data = []
  if (unflaggedTestUsers.length > 0) {
    const { data: extra } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, name, is_test_user, created_at')
      .in('user_id', unflaggedTestUsers)

    unflaggedProfiles = extra || []
  }

  const allProfiles = [...(data || []), ...unflaggedProfiles]

  return allProfiles.map(p => ({
    user_id: p.user_id,
    name: p.name || p.full_name || '',
    email: authMap.get(p.user_id) || '',
    is_test_user: p.is_test_user,
    created_at: p.created_at,
  }))
}
