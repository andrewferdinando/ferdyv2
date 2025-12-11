'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

interface Brand {
  id: string
  name: string
}

interface BrandAssignment {
  brandId: string
  role: 'admin' | 'editor'
}

export default function AccountTeamPage() {
  const { group, membership, loading: groupLoading } = useUserGroup()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [brandAssignments, setBrandAssignments] = useState<BrandAssignment[]>([])
  const [selectAllBrands, setSelectAllBrands] = useState(false)
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
    async function loadData() {
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

          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          members.push({
            id: membership.user_id,
            name: userProfile?.name || 'Unknown',
            email: membership.user_id === authUser?.id ? authUser.email || 'No email' : 'Email hidden',
            role: membership.role || 'member'
          })
        }

        setTeamMembers(members)

        // Load brands for assignment (only active brands)
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name')
          .eq('group_id', group.id)
          .eq('status', 'active')
          .order('name')

        if (brandsError) throw brandsError
        setBrands(brandsData || [])

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (!groupLoading) {
      loadData()
    }
  }, [group, groupLoading])

  const canInviteMembers = currentUserRole && ['super_admin', 'admin'].includes(currentUserRole)

  const handleBrandToggle = (brandId: string) => {
    setBrandAssignments(prev => {
      const exists = prev.find(a => a.brandId === brandId)
      if (exists) {
        return prev.filter(a => a.brandId !== brandId)
      } else {
        return [...prev, { brandId, role: 'editor' }]
      }
    })
  }

  const handleBrandRoleChange = (brandId: string, role: 'admin' | 'editor') => {
    setBrandAssignments(prev =>
      prev.map(a => a.brandId === brandId ? { ...a, role } : a)
    )
  }

  const handleSelectAllBrands = (checked: boolean) => {
    setSelectAllBrands(checked)
    if (checked) {
      setBrandAssignments(brands.map(b => ({ brandId: b.id, role: 'editor' })))
    } else {
      setBrandAssignments([])
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !inviteEmail) return

    setInviting(true)
    setError(null)
    setSuccess(null)

    try {
      // Get current user's name for the email
      const { data: { user } } = await supabase.auth.getUser()
      let inviterName = 'A team member'
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single()
        inviterName = profile?.full_name || 'A team member'
      }

      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          groupRole: inviteRole,
          groupId: group.id,
          brandAssignments: brandAssignments,
          inviterName: inviterName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      setSuccess(`Invitation sent to ${inviteEmail} with access to ${brandAssignments.length} brand(s)`)
      setInviteEmail('')
      setInviteRole('member')
      setBrandAssignments([])
      setSelectAllBrands(false)
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
                      onClick={() => {
                        setShowInviteForm(false)
                        setBrandAssignments([])
                        setSelectAllBrands(false)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleInvite} className="space-y-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>

                      </select>
                      <p className="mt-1 text-xs text-gray-500">Account-level permissions for billing and settings</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Brand Access</label>
                        <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectAllBrands}
                            onChange={(e) => handleSelectAllBrands(e.target.checked)}
                            className="mr-2 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                          />
                          Select All Brands
                        </label>
                      </div>

                      {brands.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-lg">
                          No brands available. Create a brand first.
                        </p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                          {brands.map((brand) => {
                            const assignment = brandAssignments.find(a => a.brandId === brand.id)
                            const isSelected = !!assignment

                            return (
                              <div key={brand.id} className="p-3 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center cursor-pointer flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleBrandToggle(brand.id)}
                                      className="mr-3 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                                    />
                                    <span className="text-sm text-gray-900">{brand.name}</span>
                                  </label>

                                  {isSelected && (
                                    <select
                                      value={assignment.role}
                                      onChange={(e) => handleBrandRoleChange(brand.id, e.target.value as 'admin' | 'editor')}
                                      className="ml-3 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="editor">Editor</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Selected: {brandAssignments.length} of {brands.length} brands
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteForm(false)
                          setBrandAssignments([])
                          setSelectAllBrands(false)
                        }}
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
                          <Link
                            key={member.id}
                            href={`/account/team/${member.id}`}
                            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                                {getRoleDisplayName(member.role)}
                              </span>
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
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
