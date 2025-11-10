'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';
import { fetchTeamState, sendTeamInvite } from './actions';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  brand_name: string;
}

interface PendingInvite {
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [, startTransition] = useTransition();

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Get user's role for the current brand (from URL)
      console.log('Fetching role for brand:', brandId);
      const { data: membershipData, error: membershipError } = await supabase
        .from('brand_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', brandId)
        .single();

      let role = 'editor'; // default
      if (membershipError) {
        console.error('Error fetching membership data:', membershipError);
      } else if (membershipData) {
        role = membershipData.role;
        console.log('Found role:', role);
      }

      setUserRole(role);
    } catch (membershipError) {
      console.error('Error checking user role:', membershipError);
      setError('Failed to verify permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (!brandId || !currentUserId) return;

    if (userRole && (userRole === 'admin' || userRole === 'super_admin')) {
      startTransition(async () => {
        try {
          const data = await fetchTeamState(brandId);
          setTeamMembers(data.members);
          setPendingInvites(data.invites);
        } catch (err) {
          console.error(err);
          setError('Unable to load team members');
        }
      });
    }
  }, [userRole, brandId, currentUserId]);

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setInviting(true);
    setError('');

    try {
      console.log('Attempting to invite user:', inviteEmail, 'with role:', inviteRole);

      if (!currentUserId) {
        throw new Error('Unable to determine current user');
      }

      await sendTeamInvite({
        brandId,
        email: inviteEmail.trim(),
        role: inviteRole as 'admin' | 'editor',
        inviterId: currentUserId,
      });

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('editor');
      setShowInviteForm(false);
      
      // Refresh team members
      startTransition(async () => {
        const data = await fetchTeamState(brandId);
        setTeamMembers(data.members);
        setPendingInvites(data.invites);
      });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error inviting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  // Check if user has permission to view this page
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You need admin or super admin permissions to access team management.</p>
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Team</h1>
                    <p className="text-gray-600 mt-1 text-sm">Invite team members and manage roles and permissions</p>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Invite Member</span>
                  </button>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-6">
                  {success}
                </div>
              )}

              {/* Invite Form Modal */}
              {showInviteForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none transition-all duration-150"
                          placeholder="Enter email address"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none transition-all duration-150 appearance-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setShowInviteForm(false)}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInviteUser}
                        disabled={inviting}
                        className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {inviting ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members List */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members ({teamMembers.length + pendingInvites.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <div key={`${member.id}-${member.brand_name}`} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          <p className="text-xs text-gray-400">{member.brand_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {getRoleDisplayName(member.role)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {pendingInvites.map((invite) => (
                    <div key={`${invite.email}-${invite.created_at}`} className="px-6 py-4 flex items-center justify-between bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invite.email}</p>
                          <p className="text-xs text-gray-500">{new Date(invite.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invite.role)}`}>
                          {getRoleDisplayName(invite.role)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
