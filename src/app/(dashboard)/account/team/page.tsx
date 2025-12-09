'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

export default function AccountTeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Get all users in the account (simplified - you may want to add group filtering)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, role')
          .order('role')

        if (profilesError) throw profilesError

        // Get user details
        const members: TeamMember[] = []
        for (const profile of profiles || []) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('id', profile.user_id)
            .single()

          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.user_id)
          
          members.push({
            id: profile.user_id,
            name: userProfile?.name || 'Unknown',
            email: authUser?.email || 'No email',
            role: profile.role || 'member'
          })
        }

        setTeamMembers(members)
        setLoading(false)
      } catch (err: any) {
        console.error('Error loading team members:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadTeamMembers()
  }, [])

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'member': return 'Member'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Team</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage team members and their roles across your account.
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
                    
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">No team members found.</p>
                    ) : (
                      <div className="space-y-4">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                              {getRoleDisplayName(member.role)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      To invite new team members or change roles, please contact your account administrator.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
