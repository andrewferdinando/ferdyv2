'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';
import { getBrandRoleDisplay, getGroupRoleDisplay } from '@/lib/roles';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface GroupWithBrands {
  groupId: string;
  groupName: string;
  groupRole: string;
  brands: Array<{
    brandId: string;
    brandName: string;
    brandRole: string;
  }>;
}

export default function ProfilePage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groupsWithBrands, setGroupsWithBrands] = useState<GroupWithBrands[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const userProfile: UserProfile = {
        id: user.id,
        name: profileData.name || '',
        email: user.email || '',
      };

      setProfile(userProfile);
      setFormData({
        name: userProfile.name,
        email: userProfile.email,
      });

      // Fetch all group memberships for the user
      const { data: groupMemberships, error: gmError } = await supabase
        .from('group_memberships')
        .select('group_id, role, groups(id, name)')
        .eq('user_id', user.id);

      if (gmError) {
        console.error('Error fetching group memberships:', gmError);
      }

      // Fetch all brand memberships for the user
      const { data: brandMemberships, error: bmError } = await supabase
        .from('brand_memberships')
        .select('brand_id, role, brands(id, name, group_id)')
        .eq('user_id', user.id);

      if (bmError) {
        console.error('Error fetching brand memberships:', bmError);
      }

      // Build groups with their brands
      const groups: GroupWithBrands[] = (groupMemberships || []).map((gm: any) => {
        const group = gm.groups;
        const brandsInGroup = (brandMemberships || [])
          .filter((bm: any) => bm.brands?.group_id === group?.id)
          .map((bm: any) => ({
            brandId: bm.brands.id,
            brandName: bm.brands.name,
            brandRole: bm.role,
          }))
          .sort((a: any, b: any) => a.brandName.localeCompare(b.brandName));

        return {
          groupId: group?.id || gm.group_id,
          groupName: group?.name || 'Unknown Group',
          groupRole: gm.role,
          brands: brandsInGroup,
        };
      }).sort((a: GroupWithBrands, b: GroupWithBrands) => a.groupName.localeCompare(b.groupName));

      setGroupsWithBrands(groups);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile (profiles table, not user_profiles view)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          full_name: formData.name,
        })
        .eq('user_id', profile.id);

      if (profileError) throw profileError;

      // Update auth user email if changed
      if (formData.email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) throw emailError;
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
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

  if (!profile) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Error loading profile</p>
              <p className="text-sm">Please try refreshing the page</p>
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
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Profile</h1>
              </div>

              {/* Profile Form */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
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

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none transition-all duration-150"
                      placeholder="Enter your name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none transition-all duration-150"
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-6 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Your Groups & Brands */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Groups & Brands</h2>

                {groupsWithBrands.length === 0 ? (
                  <p className="text-sm text-gray-500">No groups or brands found.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {groupsWithBrands.map((group) => {
                      const groupDisplay = getGroupRoleDisplay(group.groupRole);
                      return (
                        <div key={group.groupId} className="py-4 first:pt-0 last:pb-0">
                          {/* Group header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {group.groupName}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${groupDisplay.color}`}>
                              {groupDisplay.label}
                            </span>
                          </div>

                          {/* Brands in this group */}
                          {group.brands.length > 0 ? (
                            <div className="ml-4 space-y-1.5">
                              {group.brands.map((brand) => {
                                const brandDisplay = getBrandRoleDisplay(brand.brandRole);
                                return (
                                  <div key={brand.brandId} className="flex items-center justify-between py-1">
                                    <span className="text-sm text-gray-600">{brand.brandName}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${brandDisplay.color}`}>
                                      {brandDisplay.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="ml-4 text-xs text-gray-400">No brands assigned</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
