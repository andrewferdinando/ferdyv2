'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import { useUserGroup } from '@/hooks/useUserGroup'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

export default function AccountTeamPage() {
  const { group, membership, loading: groupLoading } = useUserGroup()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function loadCurrentUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        setCurrentUserRole(profile?.role || null)
      } catch (err) {
        console.error('Error loading current user role:', err)
      }
    }

    loadCurrentUserRole()
  }, [])

  useEffect(() => {
    async function loadTeamMembers() {
      if (!group) {
        setLoading(false)
        return
      }

      try {
        // Get all group memberships
        const { data: memberships, error: membershipsError } = await supabase
          .from('group_memberships')
          .select('user_id, role')
          .eq('group_id', group.id)

        if (membershipsError) throw membershipsError

        // Get user details for each membership
        const members: TeamMember[] = []
        for (const membership of memberships || []) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('id', membership.user_id)
            .single()

          // Get email from auth metadata (this is a simplified approach)
          // In production, you'd want to store email in user_profiles or use a server-side function
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          members.push({
            id: membership.user_id,
            name: userProfile?.name || 'Unknown',
            email: membership.user_id === authUser?.id ? authUser.email || 'No email' : 'Email hidden',
            role: membership.role || 'member'
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

    if (!groupLoading) {
      loadTeamMembers()
    }
  }, [group, groupLoading])

  const canInviteMembers = currentUserRole && ['super_admin', 'admin'].includes(currentUserRole)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !inviteEmail) return

    setInviting(true)
    setError(null)
    setSuccess(null)

    try {
      // Call API to send invitation
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          groupId: group.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      setSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('member')
      setShowInviteForm(false)
      
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'owner': return 'Owner'
      case 'member': return 'Member'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'owner': return 'bg-purple-100 text-purple-800'
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Team</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Manage team members and their roles across your account.
                  </p>
                </div>
                {canInviteMembers && !showInviteForm && (
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5]"
                  >
                    Invite Team Member
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Invite Form */}
              {showInviteForm && (
                <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
                    <button
                      onClick={() => setShowInviteForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                        placeholder="colleague@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {currentUserRole === 'super_admin' && <option value="owner">Owner</option>}
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowInviteForm(false)}
                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={inviting}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50"
                      >
                        {inviting ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading || groupLoading ? (
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

                  {!canInviteMembers && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        To invite new team members or change roles, please contact your account administrator.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
