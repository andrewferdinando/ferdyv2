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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_image_url: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      // Debug: Test Supabase connection and bucket access
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      console.log('Supabase Anon Key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
      
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets, 'Error:', bucketsError);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get user's role for the current brand (from URL)
      console.log('Current brand from URL:', brandId);

      let role = 'editor'; // default
      if (brandId) {
        console.log('Fetching role for brand:', brandId);
        const { data: membershipData, error: membershipError } = await supabase
          .from('brand_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('brand_id', brandId)
          .single();

        if (membershipError) {
          console.error('Error fetching membership data:', membershipError);
        } else if (membershipData) {
          role = membershipData.role;
          console.log('Found role:', role);
        }
      }

      const userProfile: UserProfile = {
        id: user.id,
        name: profileData.name || '',
        email: user.email || '',
        profile_image_url: profileData.profile_image_url,
        role: role
      };

      setProfile(userProfile);
      setFormData({
        name: userProfile.name,
        email: userProfile.email,
        profile_image_url: userProfile.profile_image_url || ''
      });
      console.log('Profile loaded with image URL:', userProfile.profile_image_url);
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

  const handleProfileImageUpload = async (file: File) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      // Check available buckets and use the first one, or create ferdy-assets
      const { data: buckets } = await supabase.storage.listBuckets();
      console.log('Available buckets for upload:', buckets);
      
      let bucketName = 'ferdy-assets';
      
      // If no buckets exist, try to create ferdy-assets bucket
      if (!buckets || buckets.length === 0) {
        console.log('No buckets found, attempting to create ferdy-assets bucket');
        const { error: createError } = await supabase.storage.createBucket('ferdy-assets', {
          public: true
        });
        
        if (createError) {
          console.error('Failed to create bucket:', createError);
          throw new Error('No storage buckets available and cannot create new bucket. Please check Supabase storage configuration.');
        }
        console.log('Successfully created ferdy-assets bucket');
      } else {
        // Use the first available bucket if ferdy-assets doesn't exist
        const ferdyBucket = buckets.find(b => b.name === 'ferdy-assets');
        if (!ferdyBucket) {
          bucketName = buckets[0].name;
          console.log('Using first available bucket:', bucketName);
        }
      }
      
      console.log('Uploading to bucket:', bucketName, 'Path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: true // Allow overwriting if file exists
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload image');
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      console.log('Upload successful, public URL:', data.publicUrl);

      console.log('Setting form data with URL:', data.publicUrl);
      setFormData(prev => ({ ...prev, profile_image_url: data.publicUrl }));
      setSuccess('Profile image uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading profile image:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload profile image');
    } finally {
      setUploading(false);
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
              {/* Breadcrumb */}
              <div className="mb-6">
                <Breadcrumb brandName="Demo" />
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
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              console.error('Image load error for URL:', formData.profile_image_url, e);
                              // Show placeholder on error
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center';
                              placeholder.innerHTML = `
                                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                              `;
                              target.parentNode?.insertBefore(placeholder, target.nextSibling);
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', formData.profile_image_url);
                            }}
                          />
                          <div className="flex flex-col space-y-2">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, profile_image_url: '' }))}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(formData.profile_image_url, '_blank')}
                              className="text-blue-600 hover:text-blue-700 text-xs"
                            >
                              Test URL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                            {uploading ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2">
                            <label className="cursor-pointer bg-[#6366F1] text-white px-4 py-2 rounded-lg hover:bg-[#4F46E5] transition-colors text-sm font-medium">
                              {uploading ? 'Uploading...' : 'Choose Image'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleProfileImageUpload(file);
                                }}
                                className="hidden"
                                disabled={uploading}
                              />
                            </label>
                            <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                          </div>
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
