'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useBrands } from '@/hooks/useBrands';
import { supabase } from '@/lib/supabase-browser';

const adminCards = [
  {
    title: 'Brand Details',
    description: 'Manage Business Information',
    href: '/super-admin/brand-details',
    cta: 'Manage Details',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: 'Add New Brand & Users',
    description: 'Create a new brand and onboard the first team members.',
    href: '/auth/sign-up',
    cta: 'Start Setup',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
];

type BrandPostInformation = {
  fb_post_examples: string[] | null;
  ig_post_examples: string[] | null;
  post_tone: string | null;
  avg_char_length: number | null;
  avg_word_count: number | null;
  analysed_at: string | null;
  updated_at: string | null;
};

function formatNumber(value: number | null, fractionDigits = 1) {
  if (value === null || Number.isNaN(value)) return null;
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return null;
  }
}

function PostList({ posts, emptyMessage }: { posts: string[]; emptyMessage: string }) {
  if (!posts.length) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {posts.map((post, index) => (
        <li
          key={`${index}-${post.slice(0, 8)}`}
          className="rounded-lg border border-gray-200 bg-white/60 p-3 text-sm text-gray-700 shadow-sm"
        >
          <p className="line-clamp-4 whitespace-pre-line">{post}</p>
        </li>
      ))}
    </ul>
  );
}

function PostInformationCard({
  brands,
  brandsLoading,
}: {
  brands: ReturnType<typeof useBrands>['brands'];
  brandsLoading: boolean;
}) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [info, setInfo] = useState<BrandPostInformation | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzeLoading, setReanalyzeLoading] = useState(false);

  const selectedBrand = useMemo(
    () => (selectedBrandId ? brands.find((brand) => brand.id === selectedBrandId) ?? null : null),
    [brands, selectedBrandId],
  );

  useEffect(() => {
    if (brandsLoading) return;

    const storedId =
      typeof window !== 'undefined' ? window.localStorage.getItem('selectedBrandId') : null;

    if (storedId && brands.some((brand) => brand.id === storedId)) {
      setSelectedBrandId(storedId);
      return;
    }

    if (brands.length > 0) {
      setSelectedBrandId(brands[0].id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('selectedBrandId', brands[0].id);
        window.localStorage.setItem('selectedBrandName', brands[0].name);
      }
    }
  }, [brands, brandsLoading]);

  const fetchPostInformation = useCallback(async (brandId: string) => {
    setInfoLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('brand_post_information')
        .select(
          'fb_post_examples, ig_post_examples, post_tone, avg_char_length, avg_word_count, analysed_at, updated_at',
        )
        .eq('brand_id', brandId)
        .maybeSingle<BrandPostInformation>();

      if (queryError) {
        throw queryError;
      }

      setInfo(data ?? null);
    } catch (err) {
      console.error('[super-admin post info] failed to load', err);
      setError('Unable to load post information for this brand.');
      setInfo(null);
    } finally {
      setInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
      setInfo(null);
      return;
    }

    fetchPostInformation(selectedBrandId);
  }, [fetchPostInformation, selectedBrandId]);

  const fbPosts = info?.fb_post_examples ?? [];
  const igPosts = info?.ig_post_examples ?? [];
  const allPosts = useMemo(
    () => [...fbPosts, ...igPosts].filter((text) => text && text.trim().length > 0),
    [fbPosts, igPosts],
  );

  const analysedAt = useMemo(
    () => formatDate(info?.analysed_at ?? info?.updated_at ?? null),
    [info?.analysed_at, info?.updated_at],
  );

  const handleReanalyse = useCallback(async () => {
    if (!selectedBrand) return;

    try {
      setReanalyzeLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('You must be signed in to re-analyse posts.');
      }

      const response = await fetch(
        `/api/super-admin/brands/${selectedBrand.id}/post-information/reanalyze`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Re-analysis failed. Please try again.');
      }

      await fetchPostInformation(selectedBrand.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-analysis failed. Please try again.');
    } finally {
      setReanalyzeLoading(false);
    }
  }, [fetchPostInformation, selectedBrand]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Post information</p>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedBrand ? selectedBrand.name : 'Select a brand'}
          </h2>
          {analysedAt && (
            <p className="mt-1 text-xs text-gray-500">Last analysed {analysedAt}</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleReanalyse}
            disabled={!selectedBrand || reanalyzeLoading}
            className="inline-flex items-center rounded-lg border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
          >
            {reanalyzeLoading ? 'Re-analysing…' : 'Re-analyse posts'}
          </button>
        </div>
      </div>
      <div className="px-6 py-6">
        {brandsLoading ? (
          <div className="space-y-4">
            {[0, 1].map((key) => (
              <div key={key} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !selectedBrand ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            Select a brand from the sidebar to view post information.
          </div>
        ) : infoLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !info ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            No post information available yet. Connect Facebook or Instagram to generate insights.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Facebook Post Examples</h3>
              <p className="mt-1 text-sm text-gray-500">Up to the last 10 Facebook posts.</p>
              <div className="mt-4">
                <PostList posts={fbPosts} emptyMessage="No Facebook posts found yet." />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Instagram Post Examples</h3>
              <p className="mt-1 text-sm text-gray-500">Up to the last 10 Instagram captions.</p>
              <div className="mt-4">
                <PostList posts={igPosts} emptyMessage="No Instagram posts found yet." />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Post Tone</h3>
              <p className="mt-1 text-sm text-gray-500">Generated from recent Meta posts.</p>
              <div className="mt-4">
                {info.post_tone ? (
                  <p className="text-base font-medium text-gray-900">{info.post_tone}</p>
                ) : (
                  <p className="text-sm text-gray-500">Not analysed yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Post Character Length</h3>
              <p className="mt-1 text-sm text-gray-500">Average length across recent posts.</p>
              <div className="mt-4 space-y-2">
                {info.avg_char_length !== null && info.avg_word_count !== null ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Average length:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatNumber(info.avg_char_length)}
                      </span>{' '}
                      characters,{' '}
                      <span className="font-semibold text-gray-900">
                        {formatNumber(info.avg_word_count)}
                      </span>{' '}
                      words
                    </p>
                    <p className="text-sm text-gray-500">
                      Based on {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'}.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not enough posts to analyse yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { brands, loading } = useBrands();

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
                Super Admin
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {adminCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group h-full rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#6366F1] transition-colors duration-200 group-hover:bg-[#6366F1] group-hover:text-white">
                        {card.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-200 group-hover:text-[#6366F1]">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{card.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-[#6366F1]">
                    <span>{card.cta ?? 'Open'}</span>
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            <PostInformationCard brands={brands} brandsLoading={loading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
