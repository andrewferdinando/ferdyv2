'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { supabase } from '@/lib/supabase-browser';
import { Brand } from '@/hooks/useBrands';

// Country options for dropdown
const countries = [
  { code: 'NZ', name: 'New Zealand', timezone: 'Pacific/Auckland' },
  { code: 'AU', name: 'Australia', timezone: 'Australia/Sydney' },
  { code: 'US', name: 'United States', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', timezone: 'America/Toronto' },
  { code: 'GB', name: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'DE', name: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris' },
  { code: 'JP', name: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'SG', name: 'Singapore', timezone: 'Asia/Singapore' },
  { code: 'IN', name: 'India', timezone: 'Asia/Kolkata' },
];

export default function BrandSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    country_code: '',
    timezone: ''
  });

  const fetchBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;

      setBrand(data);
      setFormData({
        name: data.name || '',
        website_url: data.website_url || '',
        country_code: data.country_code || '',
        timezone: data.timezone || 'Pacific/Auckland'
      });
    } catch (error) {
      console.error('Error fetching brand:', error);
      setError('Failed to load brand information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, [brandId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-update timezone when country changes
    if (field === 'country_code') {
      const selectedCountry = countries.find(c => c.code === value);
      if (selectedCountry) {
        setFormData(prev => ({
          ...prev,
          country_code: value,
          timezone: selectedCountry.timezone
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: formData.name,
          website_url: formData.website_url || null,
          country_code: formData.country_code || null,
          timezone: formData.timezone
        })
        .eq('id', brandId);

      if (error) throw error;

      setSuccess('Brand settings updated successfully');
      fetchBrand(); // Refresh data
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating brand:', error);
      setError('Failed to update brand settings');
    } finally {
      setSaving(false);
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

  if (!brand) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Error loading brand</p>
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
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Brand Settings</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage your brand information, timezone, and country settings</p>
              </div>

              {/* Brand Settings Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
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
                  {/* Brand Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      placeholder="Enter your brand name"
                      required
                    />
                  </div>

                  {/* Website URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      placeholder="https://your-website.com"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => handleInputChange('country_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      required
                    >
                      <option value="">Select a country</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone *
                    </label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      placeholder="Pacific/Auckland"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This timezone will be used for scheduling posts and displaying times
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white px-6 py-2 rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
