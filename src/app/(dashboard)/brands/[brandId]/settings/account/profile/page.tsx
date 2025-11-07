'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { supabase } from '@/lib/supabase-browser';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_image_url?: string;
  role: string;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_image_url: ''
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

      // Get user role
      const { data: membershipData, error: membershipError } = await supabase
        .from('brand_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', brandId)
        .single();

      if (membershipError) throw membershipError;

      const userProfile: UserProfile = {
        id: user.id,
        name: profileData.name || '',
        email: user.email || '',
        profile_image_url: profileData.profile_image_url,
        role: membershipData.role
      };

      setProfile(userProfile);
      setFormData({
        name: userProfile.name,
        email: userProfile.email,
        profile_image_url: userProfile.profile_image_url || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ferdy_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ferdy_assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_image_url: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading profile image:', error);
      setError('Failed to upload profile image');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          name: formData.name,
          profile_image_url: formData.profile_image_url
        })
        .eq('id', profile.id);

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
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
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
              {/* Breadcrumb */}
              <div className="mb-6">
                <Breadcrumb />
              </div>

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Profile</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage your personal information and account details</p>
              </div>

              {/* Profile Form */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                  {/* Profile Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Profile Image</label>
                    <div className="flex items-center space-x-4">
                      {formData.profile_image_url ? (
                        <div className="flex items-center space-x-3">
                          <img
                            src={formData.profile_image_url}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, profile_image_url: '' }))}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProfileImageUpload(file);
                            }}
                            className="text-sm text-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Role (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(profile.role)}`}>
                        {getRoleDisplayName(profile.role)}
                      </span>
                      <span className="text-sm text-gray-500">Role cannot be changed</span>
                    </div>
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
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
