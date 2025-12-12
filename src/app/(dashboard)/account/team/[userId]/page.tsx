'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { supabase } from '@/lib/supabase-browser'
import { useUserGroup } from '@/hooks/useUserGroup'

interface TeamMember {
  id: string
  name: string
  email: string
  groupRole: string
}

interface Brand {
  id: string
  name: string
}

interface BrandAccess {
  brandId: string
  brandName: string
  role: 'admin' | 'editor'
}

export default function TeamMemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { group, loading: groupLoading } = useUserGroup()
  
  const [member, setMember] = useState<TeamMember | null>(null)
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [brandAccess, setBrandAccess] = useState<BrandAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
      if (!group || !userId) {
        setLoading(false)
        return
      }

      try {
        // Load team member info
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('user_id, name, full_name')
          .eq('user_id', userId)
          .single()

        const { data: groupMembership } = await supabase
          .from('group_memberships')
          .select('role')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .single()

        if (!groupMembership) {
          setError('Team member not found in this group')
          setLoading(false)
          return
        }

        // Get email (simplified - in production use server-side)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        setMember({
          id: userId,
          name: userProfile?.name || userProfile?.full_name || 'Unknown',
          email: userId === authUser?.id ? authUser.email || 'No email' : 'Email hidden',
          groupRole: groupMembership.role || 'member',
        })

        // Load all brands in the group
        const { data: brandsData } = await supabase
          .from('brands')
          .select('id, name')
          .eq('group_id', group.id)
          .order('name')

        setAllBrands(brandsData || [])

        // Load member's brand access
        const { data: brandMemberships } = await supabase
          .from('brand_memberships')
          .select('brand_id, role, brands(name)')
          .eq('user_id', userId)

        const access: BrandAccess[] = (brandMemberships || []).map((bm: any) => ({
          brandId: bm.brand_id,
          brandName: bm.brands?.name || 'Unknown Brand',
          role: bm.role,
        }))

        setBrandAccess(access)
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
  }, [group, groupLoading, userId])

  const canManage = currentUserRole && ['super_admin', 'admin'].includes(currentUserRole)

  const handleToggleBrand = (brandId: string, brandName: string) => {
    setBrandAccess(prev => {
      const exists = prev.find(a => a.brandId === brandId)
      if (exists) {
        return prev.filter(a => a.brandId !== brandId)
      } else {
        return [...prev, { brandId, brandName, role: 'editor' }]
      }
    })
  }

  const handleRoleChange = (brandId: string, role: 'admin' | 'editor') => {
    setBrandAccess(prev =>
      prev.map(a => a.brandId === brandId ? { ...a, role } : a)
    )
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Delete all existing brand memberships for this user
      await supabase
        .from('brand_memberships')
        .delete()
        .eq('user_id', userId)

      // Insert new brand memberships
      if (brandAccess.length > 0) {
        const memberships = brandAccess.map(a => ({
          brand_id: a.brandId,
          user_id: userId,
          role: a.role,
        }))

        const { error: insertError } = await supabase
          .from('brand_memberships')
          .insert(memberships)

        if (insertError) throw insertError
      }

      setSuccess('Brand access updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error saving brand access:', err)
      setError(err.message)
    } finally {
      setSaving(false)
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
              <div className="mb-8">
                <Link
                  href="/account/team"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Team
                </Link>
                
                {member && (
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
                      {member.name}
                    </h1>
                    <div className="mt-2 flex items-center space-x-3">
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.groupRole)}`}>
                        {getRoleDisplayName(member.groupRole)}
                      </span>
                    </div>
                  </div>
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

              {loading || groupLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]"></div>
                </div>
              ) : !member ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">Team member not found</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Brand Access</h2>
                      {canManage && (
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      )}
                    </div>

                    {allBrands.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No brands available</p>
                    ) : (
                      <div className="space-y-2">
                        {allBrands.map((brand) => {
                          const access = brandAccess.find(a => a.brandId === brand.id)
                          const hasAccess = !!access

                          return (
                            <div key={brand.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <label className="flex items-center cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={hasAccess}
                                  onChange={() => handleToggleBrand(brand.id, brand.name)}
                                  disabled={!canManage}
                                  className="mr-3 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1] disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-900">{brand.name}</span>
                              </label>

                              {hasAccess && (
                                <select
                                  value={access.role}
                                  onChange={(e) => handleRoleChange(brand.id, e.target.value as 'admin' | 'editor')}
                                  disabled={!canManage}
                                  className="ml-3 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none disabled:opacity-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="editor">Editor</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <p className="mt-4 text-xs text-gray-500">
                      Access to {brandAccess.length} of {allBrands.length} brands
                    </p>
                  </div>

                  {!canManage && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        You don't have permission to modify brand access. Contact an administrator.
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
