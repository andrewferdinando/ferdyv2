'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';
import { GROUP_ROLES, BRAND_ROLES, getBrandRoleDisplay } from '@/lib/roles';
import {
  fetchTeamState,
  sendTeamInvite,
  updateTeamMemberRole,
  removeTeamMember,
  cancelTeamInvite,
  transferGroupOwnership,
  getSocialAccountsConnectedByUser,
} from './actions';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  groupRole: string;
  created_at: string;
  brand_name: string;
}

interface PendingInvite {
  email: string;
  invitee_name?: string | null;
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
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [removingInviteEmail, setRemovingInviteEmail] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [roleGuideOpen, setRoleGuideOpen] = useState(false);

  // Transfer ownership state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Social account warning state (used when removing a member)
  const [socialAccountWarnings, setSocialAccountWarnings] = useState<Array<{ brandName: string; provider: string }>>([]);
  const [loadingSocialWarnings, setLoadingSocialWarnings] = useState(false);

  // Current user's group role
  const [currentUserGroupRole, setCurrentUserGroupRole] = useState<string>('');

  // Group context for invite flow
  const [groupName, setGroupName] = useState<string>('');
  const [allBrands, setAllBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [inviteGroupRole, setInviteGroupRole] = useState<'admin' | 'member'>('member');
  const [inviteBrandAssignments, setInviteBrandAssignments] = useState<Record<string, 'admin' | 'editor' | null>>({});
  const [inviteStep, setInviteStep] = useState<1 | 2>(1);

  const refreshTeam = useCallback(async () => {
    if (!brandId) {
      return;
    }

    const data = await fetchTeamState(brandId);

    if (currentUserId) {
      const orderedMembers = [...data.members].sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      });
      setTeamMembers(orderedMembers);

      // Track the current user's group role
      const currentMember = data.members.find(m => m.id === currentUserId);
      if (currentMember) {
        setCurrentUserGroupRole(currentMember.groupRole);
      }
    } else {
      setTeamMembers(data.members);
    }

    setPendingInvites(data.invites);
    if (data.groupName) setGroupName(data.groupName);
    if (data.allBrands) setAllBrands(data.allBrands);
  }, [brandId, currentUserId]);

  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Get user's role for the current brand (from URL)
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
      }

      setUserRole(role);
    } catch (membershipError) {
      console.error('Error checking user role:', membershipError);
      setError('Failed to verify permissions');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    checkUserRole();
  }, [checkUserRole]);

  useEffect(() => {
    if (!brandId || !currentUserId) return;

    if (userRole && (userRole === 'admin' || userRole === 'super_admin')) {
      startTransition(() => {
        refreshTeam().catch((err) => {
          console.error(err);
          setError('Unable to load team members');
        });
      });
    }
  }, [userRole, brandId, currentUserId, refreshTeam]);

  const handleInviteUser = async () => {
    if (!inviteName.trim()) {
      setError('Please enter their name');
      return;
    }
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setInviting(true);
    setError('');

    try {
      if (!currentUserId) {
        throw new Error('Unable to determine current user');
      }

      await sendTeamInvite({
        brandId,
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole as 'admin' | 'editor',
        groupRole: inviteGroupRole,
        inviterId: currentUserId,
      });

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('editor');
      setInviteGroupRole('member');
      setInviteBrandAssignments({});
      setInviteStep(1);
      setShowInviteForm(false);

      // Refresh team members
      startTransition(() => {
        refreshTeam().catch((refreshErr) => {
          console.error(refreshErr);
          setError('Unable to refresh team members');
        });
      });

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error inviting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveInvite = async (invite: PendingInvite) => {
    if (!currentUserId) {
      setError('Unable to determine current user');
      return;
    }

    setRemovingInviteEmail(invite.email);
    setError('');
    setSuccess('');

    try {
      await cancelTeamInvite({
        brandId,
        email: invite.email,
        requesterId: currentUserId,
      });

      await refreshTeam();
      setSuccess('Pending invite removed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('handleRemoveInvite error', err);
      setError(err instanceof Error ? err.message : 'Unable to remove invite');
    } finally {
      setRemovingInviteEmail(null);
    }
  };

  const isGroupOwnerOrAdmin = (member: TeamMember) =>
    member.groupRole === 'owner' || member.groupRole === 'admin' || member.groupRole === 'super_admin';
  const isGroupOwner = (member: TeamMember) =>
    member.groupRole === 'owner' || member.groupRole === 'super_admin';

  const getBrandRoleLabel = (role: string) => getBrandRoleDisplay(role).label;
  const getBrandRoleColor = (role: string) => getBrandRoleDisplay(role).color;

  const handleRoleUpdate = async (member: TeamMember, nextRole: 'admin' | 'editor') => {
    if (member.role === nextRole) {
      return;
    }

    if (!currentUserId) {
      setError('Unable to determine current user');
      return;
    }

    setRoleUpdatingId(member.id);
    setError('');
    setSuccess('');

    try {
      await updateTeamMemberRole({
        brandId,
        memberId: member.id,
        role: nextRole,
        requesterId: currentUserId,
      });

      await refreshTeam();
      setSuccess(`${member.name || member.email} is now ${getBrandRoleLabel(nextRole)}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('handleRoleUpdate error', err);
      setError(err instanceof Error ? err.message : 'Unable to update role');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !currentUserId) {
      return;
    }

    setRemovingMember(true);
    setError('');
    setSuccess('');

    try {
      await removeTeamMember({
        brandId,
        memberId: memberToRemove.id,
        requesterId: currentUserId,
      });

      await refreshTeam();
      setMemberToRemove(null);
      setSuccess('Team member removed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('handleConfirmRemove error', err);
      setError(err instanceof Error ? err.message : 'Unable to remove team member');
    } finally {
      setRemovingMember(false);
    }
  };

  const isCurrentUserOwner = currentUserGroupRole === 'owner' || currentUserGroupRole === 'super_admin';

  const handleTransferOwnership = async () => {
    if (!transferTargetId || !currentUserId) return;

    setTransferring(true);
    setError('');

    try {
      await transferGroupOwnership({
        brandId,
        newOwnerId: transferTargetId,
        requesterId: currentUserId,
      });

      await refreshTeam();
      setShowTransferModal(false);
      setTransferTargetId(null);
      setSuccess('Group ownership transferred successfully.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('handleTransferOwnership error', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setTransferring(false);
    }
  };

  const handleRemoveMemberClick = async (member: TeamMember) => {
    setMemberToRemove(member);
    setSocialAccountWarnings([]);

    // Check for social account connections
    setLoadingSocialWarnings(true);
    try {
      const warnings = await getSocialAccountsConnectedByUser(brandId, member.id);
      setSocialAccountWarnings(warnings);
    } catch (err) {
      console.error('Error loading social account warnings:', err);
    } finally {
      setLoadingSocialWarnings(false);
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
              <p className="text-gray-600">You need admin permissions to access team management.</p>
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
                  </div>
                  <div className="flex items-center space-x-3">
                    {isCurrentUserOwner && (
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                      >
                        <span>Transfer Group Ownership</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 flex items-center space-x-2"
                    >
                      <span>Invite Member</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Guide */}
              <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setRoleGuideOpen(!roleGuideOpen)}
                  className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Understanding roles</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${roleGuideOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {roleGuideOpen && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <p className="mt-3 text-sm text-gray-500 mb-4">
                      Your group has two levels of access &mdash; <strong>group-level</strong> (applies across all brands) and <strong>brand-level</strong> (per brand).
                    </p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Group-level</p>
                        <div className="space-y-2">
                          <div className="flex items-start space-x-4">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${GROUP_ROLES.owner.color}`}>
                              {GROUP_ROLES.owner.label}
                            </span>
                            <span className="text-sm text-gray-600">{GROUP_ROLES.owner.description}</span>
                          </div>
                          <div className="flex items-start space-x-4">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${GROUP_ROLES.admin.color}`}>
                              {GROUP_ROLES.admin.label}
                            </span>
                            <span className="text-sm text-gray-600">{GROUP_ROLES.admin.description}</span>
                          </div>
                          <div className="flex items-start space-x-4">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${GROUP_ROLES.member.color}`}>
                              {GROUP_ROLES.member.label}
                            </span>
                            <span className="text-sm text-gray-600">{GROUP_ROLES.member.description}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Brand-level</p>
                        <div className="space-y-2">
                          <div className="flex items-start space-x-4">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BRAND_ROLES.admin.color}`}>
                              {BRAND_ROLES.admin.label}
                            </span>
                            <span className="text-sm text-gray-600">{BRAND_ROLES.admin.description}</span>
                          </div>
                          <div className="flex items-start space-x-4">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BRAND_ROLES.editor.color}`}>
                              {BRAND_ROLES.editor.label}
                            </span>
                            <span className="text-sm text-gray-600">{BRAND_ROLES.editor.description}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* Invite Form Modal — Two-step flow */}
              {showInviteForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                    {/* Step indicator */}
                    <div className="flex items-center space-x-2 mb-4">
                      <div className={`h-1.5 flex-1 rounded-full ${inviteStep >= 1 ? 'bg-[#6366F1]' : 'bg-gray-200'}`} />
                      <div className={`h-1.5 flex-1 rounded-full ${inviteStep >= 2 ? 'bg-[#6366F1]' : 'bg-gray-200'}`} />
                    </div>

                    {inviteStep === 1 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Invite to {groupName || 'your group'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Step 1 of 2 &mdash; Person &amp; group role</p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                              type="text"
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none transition-all duration-150"
                              placeholder="Enter full name"
                            />
                          </div>

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
                            <label className="block text-sm font-medium text-gray-700 mb-3">Group Role</label>
                            <div className="space-y-2">
                              <label
                                className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                                  inviteGroupRole === 'admin'
                                    ? 'border-[#6366F1] bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="groupRole"
                                  checked={inviteGroupRole === 'admin'}
                                  onChange={() => setInviteGroupRole('admin')}
                                  className="mt-0.5 mr-3 text-[#6366F1] focus:ring-[#6366F1]"
                                />
                                <div>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_ROLES.admin.color}`}>
                                    {GROUP_ROLES.admin.label}
                                  </span>
                                  <p className="mt-1 text-xs text-gray-500">{GROUP_ROLES.admin.description}</p>
                                </div>
                              </label>
                              <label
                                className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                                  inviteGroupRole === 'member'
                                    ? 'border-[#6366F1] bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="groupRole"
                                  checked={inviteGroupRole === 'member'}
                                  onChange={() => setInviteGroupRole('member')}
                                  className="mt-0.5 mr-3 text-[#6366F1] focus:ring-[#6366F1]"
                                />
                                <div>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_ROLES.member.color}`}>
                                    {GROUP_ROLES.member.label}
                                  </span>
                                  <p className="mt-1 text-xs text-gray-500">{GROUP_ROLES.member.description}</p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            onClick={() => {
                              setShowInviteForm(false);
                              setInviteStep(1);
                              setInviteName('');
                              setInviteEmail('');
                              setInviteGroupRole('member');
                              setInviteBrandAssignments({});
                              setInviteRole('editor');
                            }}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!inviteName.trim()) { setError('Please enter their name'); return; }
                              if (!inviteEmail.trim()) { setError('Please enter an email address'); return; }
                              setError('');
                              if (inviteGroupRole === 'admin') {
                                // Group Admins get all brands — go to step 2 to pick default brand role
                                const assignments: Record<string, 'admin' | 'editor' | null> = {};
                                allBrands.forEach(b => { assignments[b.id] = 'admin'; });
                                setInviteBrandAssignments(assignments);
                              } else {
                                // Members — start with current brand pre-selected
                                const assignments: Record<string, 'admin' | 'editor' | null> = {};
                                allBrands.forEach(b => { assignments[b.id] = b.id === brandId ? 'editor' : null; });
                                setInviteBrandAssignments(assignments);
                              }
                              setInviteStep(2);
                            }}
                            className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}

                    {inviteStep === 2 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Brand Access</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Step 2 of 2 &mdash; {inviteGroupRole === 'admin'
                            ? `Group Admins have access to all brands in ${groupName || 'the group'}. Choose the brand role for each.`
                            : `Select which brands in ${groupName || 'the group'} this member should access.`}
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {allBrands.map(brand => {
                            const isAssigned = inviteBrandAssignments[brand.id] !== null && inviteBrandAssignments[brand.id] !== undefined;
                            const brandRole = inviteBrandAssignments[brand.id] || 'editor';
                            const isGroupAdmin = inviteGroupRole === 'admin';

                            return (
                              <div key={brand.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isAssigned ? 'border-[#6366F1] bg-indigo-50' : 'border-gray-200'}`}>
                                <label className="flex items-center flex-1 cursor-pointer">
                                  {!isGroupAdmin && (
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => {
                                        setInviteBrandAssignments(prev => ({
                                          ...prev,
                                          [brand.id]: prev[brand.id] ? null : 'editor',
                                        }));
                                      }}
                                      className="mr-3 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                                    />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{brand.name}</span>
                                </label>
                                {(isAssigned || isGroupAdmin) && (
                                  <select
                                    value={brandRole}
                                    onChange={(e) => {
                                      setInviteBrandAssignments(prev => ({
                                        ...prev,
                                        [brand.id]: e.target.value as 'admin' | 'editor',
                                      }));
                                    }}
                                    className="ml-3 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                                  >
                                    <option value="admin">Brand Admin</option>
                                    <option value="editor">Brand Editor</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {inviteGroupRole !== 'admin' && Object.values(inviteBrandAssignments).every(v => !v) && (
                          <p className="mt-2 text-xs text-amber-600">Select at least one brand for this member.</p>
                        )}

                        <div className="flex justify-between mt-6">
                          <button
                            onClick={() => setInviteStep(1)}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Back
                          </button>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setShowInviteForm(false);
                                setInviteStep(1);
                                setInviteName('');
                                setInviteEmail('');
                                setInviteGroupRole('member');
                                setInviteBrandAssignments({});
                                setInviteRole('editor');
                              }}
                              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                // For now, use the first assigned brand for the invite
                                // The backend will be extended to handle multi-brand in a future iteration
                                const assignedBrands = Object.entries(inviteBrandAssignments)
                                  .filter(([, role]) => role !== null)
                                  .map(([id, role]) => ({ brandId: id, role: role! }));

                                if (assignedBrands.length === 0 && inviteGroupRole !== 'admin') {
                                  setError('Please select at least one brand.');
                                  return;
                                }

                                // Compute the role directly instead of using state (async setState won't update in time)
                                const currentBrandAssignment = assignedBrands.find(a => a.brandId === brandId);
                                const resolvedRole = currentBrandAssignment?.role || assignedBrands[0]?.role || 'editor';

                                if (!inviteName.trim()) { setError('Please enter their name'); return; }
                                if (!inviteEmail.trim()) { setError('Please enter an email address'); return; }
                                if (!currentUserId) { setError('Unable to determine current user'); return; }

                                setInviting(true);
                                setError('');
                                try {
                                  await sendTeamInvite({
                                    brandId,
                                    email: inviteEmail.trim(),
                                    name: inviteName.trim(),
                                    role: resolvedRole as 'admin' | 'editor',
                                    groupRole: inviteGroupRole,
                                    brandAssignments: assignedBrands,
                                    inviterId: currentUserId,
                                  });
                                  setSuccess(`Invitation sent to ${inviteEmail}`);
                                  setShowInviteForm(false);
                                  setInviteStep(1);
                                  setInviteName('');
                                  setInviteEmail('');
                                  setInviteGroupRole('member');
                                  setInviteBrandAssignments({});
                                  setInviteRole('editor');
                                  refreshTeam();
                                } catch (err: any) {
                                  setError(err.message || 'Failed to send invitation');
                                } finally {
                                  setInviting(false);
                                }
                              }}
                              disabled={inviting}
                              className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-4 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {inviting ? 'Sending...' : 'Send Invitation'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
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
                  {teamMembers.map((member) => {
                    const groupAdminFlag = isGroupOwnerOrAdmin(member);
                    const ownerFlag = isGroupOwner(member);
                    const canEditMember = !ownerFlag && member.id !== currentUserId;
                    return (
                      <div key={`${member.id}-${member.brand_name}`} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          <p className="text-xs text-gray-400">{member.brand_name}</p>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center gap-2">
                            {groupAdminFlag && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${GROUP_ROLES[member.groupRole]?.color || GROUP_ROLES.member.color}`}>
                                {GROUP_ROLES[member.groupRole]?.label || 'Member'}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBrandRoleColor(member.role)}`}>
                              {getBrandRoleLabel(member.role)}
                            </span>
                          </div>
                          {member.id === currentUserId && (
                            <span className="text-xs text-gray-400">You</span>
                          )}
                          {canEditMember ? (
                            <>
                              <div className="relative">
                                <select
                                  value={member.role === 'admin' ? 'admin' : 'editor'}
                                  onChange={(event) =>
                                    handleRoleUpdate(
                                      member,
                                      event.target.value as 'admin' | 'editor',
                                    )
                                  }
                                  disabled={roleUpdatingId === member.id}
                                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 focus:border-[#6366F1] focus:outline-none focus:ring-4 focus:ring-[#EEF2FF] transition-all appearance-none"
                                >
                                  <option value="editor">Brand Editor</option>
                                  <option value="admin">Brand Admin</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                  <svg
                                    className="h-3.5 w-3.5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveMemberClick(member)}
                                disabled={roleUpdatingId === member.id}
                                className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </>
                          ) : null}
                          {roleUpdatingId === member.id && (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#6366F1]" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {pendingInvites.map((invite) => (
                    <div key={`${invite.email}-${invite.created_at}`} className="px-6 py-4 flex items-center justify-between bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">
                          {invite.invitee_name || invite.email}
                        </p>
                        <p className="text-sm text-gray-500">{invite.email}</p>
                        <p className="text-xs text-gray-500">{new Date(invite.created_at).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBrandRoleColor(invite.role)}`}>
                          {getBrandRoleLabel(invite.role)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                        <button
                          onClick={() => handleRemoveInvite(invite)}
                          disabled={removingInviteEmail === invite.email}
                          className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {removingInviteEmail === invite.email ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Remove Member Confirmation Modal */}
        {memberToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Remove team member</h3>
              <p className="mt-3 text-sm text-gray-600">
                Are you sure you want to remove{' '}
                <span className="font-medium text-gray-900">
                  {memberToRemove.name || memberToRemove.email}
                </span>{' '}
                from{' '}
                <span className="font-medium text-gray-900">{memberToRemove.brand_name}</span>? They
                will lose access immediately.
              </p>

              {/* Social account connection warning */}
              {loadingSocialWarnings && (
                <div className="mt-3 text-xs text-gray-400">Checking social account connections...</div>
              )}
              {socialAccountWarnings.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-800">Social account connections</p>
                  <p className="mt-1 text-xs text-amber-700">
                    {memberToRemove.name || 'This member'} connected social accounts for the following brands.
                    These connections may need to be re-established from each brand&apos;s Integrations page.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {socialAccountWarnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700">
                        <span className="font-medium">{w.brandName}</span> &mdash; {w.provider}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setMemberToRemove(null); setSocialAccountWarnings([]); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  disabled={removingMember}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemove}
                  disabled={removingMember}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {removingMember ? 'Removing...' : 'Remove member'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Group Ownership</h3>
              <p className="mt-2 text-sm text-gray-600">
                Select a Group Admin to become the new Group Owner. You will become a Group Admin after the transfer.
              </p>

              <div className="mt-4 space-y-2">
                {teamMembers
                  .filter(m => m.groupRole === 'admin' && m.id !== currentUserId)
                  .map(member => (
                    <label
                      key={member.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        transferTargetId === member.id
                          ? 'border-[#6366F1] bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="transferTarget"
                        checked={transferTargetId === member.id}
                        onChange={() => setTransferTargetId(member.id)}
                        className="mr-3 text-[#6366F1] focus:ring-[#6366F1]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </label>
                  ))}
                {teamMembers.filter(m => m.groupRole === 'admin' && m.id !== currentUserId).length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-left">
                    No Group Admins available. Promote a Group Member to Group Admin first before transferring ownership.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowTransferModal(false); setTransferTargetId(null); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  disabled={transferring}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={transferring || !transferTargetId}
                  className="rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-[#4F46E5] hover:to-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transferring ? 'Transferring...' : 'Transfer Ownership'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireAuth>
  );
}
