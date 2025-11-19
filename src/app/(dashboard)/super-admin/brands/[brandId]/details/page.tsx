'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase-browser';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { useToast } from '@/components/ui/ToastProvider';

interface Brand {
  id: string;
  name: string;
  website_url: string | null;
  ai_summary: string | null;
  ai_summary_last_generated_at: string | null;
  created_at: string;
}

export default function BrandDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const brandId = params.brandId as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    if (!brandId) {
      setError('Brand ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('brands')
        .select('id, name, website_url, ai_summary, ai_summary_last_generated_at, created_at')
        .eq('id', brandId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Brand not found');
      }

      setBrand(data as Brand);
    } catch (err) {
      console.error('Error fetching brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brand details');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const handleGenerateSummary = async () => {
    if (!brandId) return;

    try {
      setGenerating(true);
      setError(null);

      // Get session token for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('You must be signed in to generate summaries.');
      }

      // Call the API endpoint to trigger summary generation
      const response = await fetch(`/api/brands/${brandId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMsg = payload.error || payload.details || 'Failed to generate summary. Please try again.';
        throw new Error(errorMsg);
      }

      const result = await response.json().catch(() => ({}));
      
      showToast({
        title: result.ok ? 'AI summary generated successfully!' : 'AI summary generation started',
        type: 'success',
        message: result.message || 'The summary has been generated and saved.',
      });

      // Refresh brand data to show the new summary
      await fetchBrand();
    } catch (err) {
      console.error('Error generating summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
      showToast({
        title: 'Error generating summary',
        type: 'error',
        message: err instanceof Error ? err.message : 'Please try again later.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
              <p className="text-sm text-gray-600">Loading brand details…</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !brand) {
    return (
      <AppLayout>
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border border-red-200 rounded-xl p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading brand</h2>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => router.push('/super-admin')}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Super Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <Breadcrumb className="mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
                Brand Details
              </h1>
              {brand && (
                <p className="mt-1 text-sm text-gray-600">{brand.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {brand && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Brand Name</h3>
                      <p className="text-gray-900">{brand.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Website URL</h3>
                      {brand.website_url ? (
                        <a
                          href={brand.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6366F1] hover:underline break-all"
                        >
                          {brand.website_url}
                        </a>
                      ) : (
                        <p className="text-gray-500 italic">No website URL</p>
                      )}
                    </div>
                    {brand.ai_summary_last_generated_at && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Summary Last Generated</h3>
                        <p className="text-gray-900">{formatDate(brand.ai_summary_last_generated_at) || 'Unknown'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">AI Summary</h2>
                    {brand.website_url && (
                      <button
                        onClick={handleGenerateSummary}
                        disabled={generating}
                        className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#4F46E5] hover:to-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {generating ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {brand.ai_summary ? 'Regenerate Summary' : 'Generate Summary'}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {brand.ai_summary ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {brand.ai_summary}
                      </p>
                    </div>
                  ) : brand.website_url ? (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                      <p className="text-sm text-gray-500 mb-4">
                        No AI summary has been generated yet.
                      </p>
                      <p className="text-xs text-gray-400">
                        Click "Generate Summary" above to create an AI-powered summary based on the brand's website.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                      <p className="text-sm text-gray-500">
                        Cannot generate AI summary: This brand does not have a website URL set.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

