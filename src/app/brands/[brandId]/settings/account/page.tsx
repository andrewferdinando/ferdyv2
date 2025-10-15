'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { Input } from '@/components/ui/Input'
import { Form } from '@/components/ui/Form'
import { useBrandMembers } from '@/hooks/useBrandMembers'
import { useInviteUser } from '@/hooks/useInviteUser'
import { useSetMemberRole } from '@/hooks/useSetMemberRole'
import { useRemoveMember } from '@/hooks/useRemoveMember'

// Icons
const UserPlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function AccountSettingsPage() {
  const params = useParams()
  const brandId = params.brandId as string

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('editor')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { members, loading, error: membersError, refetch } = useBrandMembers(brandId)
  const { inviteUser, loading: inviteLoading } = useInviteUser()
  const { setMemberRole, loading: roleLoading } = useSetMemberRole()
  const { removeMember, loading: removeLoading } = useRemoveMember()

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await inviteUser(brandId, inviteEmail, inviteRole)
      setMessage('User invited successfully!')
      setInviteEmail('')
      setInviteRole('editor')
      setShowInviteForm(false)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'editor') => {
    try {
      await setMemberRole(brandId, userId, newRole)
      setMessage('Role updated successfully!')
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this brand?`)) {
      return
    }

    try {
      await removeMember(brandId, userId)
      setMessage('Member removed successfully!')
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600 mt-1">Manage your team members and permissions</p>
            </div>
            
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium"
            >
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Invite User
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              {message}
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Invite Form */}
          {showInviteForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
              
              <Form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="Enter user's email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Admins can manage team members and brand settings. Editors can create and manage posts.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 bg-[#6366F1] text-white rounded-md hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteLoading ? 'Inviting...' : 'Send Invitation'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            </div>
          )}

          {/* Team Members List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                </div>
              ) : membersError ? (
                <div className="px-6 py-4 text-red-600">
                  Error loading team members: {membersError}
                </div>
              ) : members.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No team members found
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.user_id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.full_name || 'No name set'}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Role:</span>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value as 'admin' | 'editor')}
                          disabled={roleLoading}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#6366F1] disabled:opacity-50"
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Joined {formatDate(member.joined_at)}
                      </div>
                      
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.email)}
                        disabled={removeLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
