'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import { supabase } from '@/lib/supabase-browser';
import { Brand } from '@/hooks/useBrands';

export default function PostTimeSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state - store as HH:MM string
  const [defaultPostTime, setDefaultPostTime] = useState('');

  const fetchBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;

      setBrand(data);
      // Convert TIME to HH:MM format for input
      if (data.default_post_time) {
        // If it's already in HH:MM format, use it directly
        // If it's a full timestamp, extract just the time part
        const timeStr = typeof data.default_post_time === 'string' 
          ? data.default_post_time.substring(0, 5) // Extract HH:MM from HH:MM:SS
          : '';
        setDefaultPostTime(timeStr);
      } else {
        setDefaultPostTime('');
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Convert HH:MM to TIME format (PostgreSQL TIME accepts HH:MM:SS)
      const timeValue = defaultPostTime ? `${defaultPostTime}:00` : null;

      const { error } = await supabase
        .from('brands')
        .update({
          default_post_time: timeValue
        })
        .eq('id', brandId);

      if (error) throw error;

      setSuccess('Default post time updated successfully');
      fetchBrand(); // Refresh data
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating default post time:', error);
      setError('Failed to update default post time');
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
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Default Post Time</h1>
              </div>

              {/* Post Time Settings Form */}
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
                  {/* Default Post Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Post Time
                    </label>
                    <input
                      type="time"
                      value={defaultPostTime}
                      onChange={(e) => setDefaultPostTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                      step="60"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This time will automatically populate the time field when creating new subcategories. You can still override it for individual subcategories.
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

