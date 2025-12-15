'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useBrands } from '@/hooks/useBrands';
import { Select } from '@/components/ui/Input';

type PostStatus = 'all' | 'scheduled' | 'published' | 'not_published';

interface PostReport {
  id: string;
  brand_name: string;
  subcategory_type: string | null;
  subcategory_name: string | null;
  channels: string[];
  scheduled_for: string | null;
  status: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return '—';
  }
}

function getStatusBadge(status: string, scheduledFor: string | null) {
  const now = new Date();
  const scheduled = scheduledFor ? new Date(scheduledFor) : null;
  
  // Check for "not published" condition
  if (scheduled && scheduled < now && status !== 'published') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Not published
      </span>
    );
  }
  
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Published
        </span>
      );
    case 'scheduled':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Scheduled
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Draft
        </span>
      );
    case 'partially_published':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Partial
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
}

export default function PostsReportTab() {
  const { brands, loading: brandsLoading } = useBrands();
  const [posts, setPosts] = useState<PostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<PostStatus>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('drafts')
        .select(`
          id,
          brand_id,
          scheduled_for,
          status,
          channel,
          subcategory_id,
          brands!inner(name),
          subcategories(name, type)
        `, { count: 'exact' })
        .order('scheduled_for', { ascending: false, nullsFirst: false });

      // Apply brand filter
      if (brandFilter !== 'all') {
        query = query.eq('brand_id', brandFilter);
      }

      // Apply status filter
      const now = new Date().toISOString();
      if (statusFilter === 'scheduled') {
        query = query.eq('status', 'scheduled').gte('scheduled_for', now);
      } else if (statusFilter === 'published') {
        query = query.eq('status', 'published');
      } else if (statusFilter === 'not_published') {
        query = query.neq('status', 'published').lt('scheduled_for', now);
      }

      // Apply date range filter
      if (dateFrom) {
        query = query.gte('scheduled_for', dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('scheduled_for', endDate.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      const formattedPosts: PostReport[] = (data || []).map((post: any) => ({
        id: post.id,
        brand_name: post.brands?.name || 'Unknown',
        subcategory_type: post.subcategories?.type || null,
        subcategory_name: post.subcategories?.name || null,
        channels: post.channel ? [post.channel] : [],
        scheduled_for: post.scheduled_for,
        status: post.status,
      }));

      setPosts(formattedPosts);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[PostsReportTab] Failed to fetch posts:', err);
      setError('Unable to load posts report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandFilter, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [brandFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Filters */}
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PostStatus)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'published', label: 'Published' },
                { value: 'not_published', label: 'Not published' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <Select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All brands' },
                ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
              ]}
              disabled={brandsLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {error && (
          <div className="p-4 text-center text-red-600">{error}</div>
        )}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No posts found matching the filters.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {post.brand_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.subcategory_type || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.subcategory_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.channels.length > 0 ? post.channels.join(', ') : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(post.scheduled_for)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(post.status, post.scheduled_for)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
