'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase-browser';
import type { BrandHealthRow } from '@/app/api/super-admin/system-health/route';
import Link from 'next/link';

type SortKey = keyof BrandHealthRow;
type SortDir = 'asc' | 'desc';

const COLUMN_TOOLTIPS: Record<string, string> = {
  name: 'Brand name — click to open schedule',
  draftsGenerated30d: 'Number of drafts created in the last 30 days',
  upcoming30d: 'Draft or scheduled posts in the next 30 days',
  draftCount: 'Total posts with "draft" status',
  scheduledCount: 'Total posts with "scheduled" status',
  publishedCount: 'Total posts with "published" status',
  partialCount: 'Posts published to some channels but not all',
  failedCount: 'Post jobs that failed to publish',
  socialStatus: 'Whether the brand has any connected social account',
  lastDraftGenerated: 'When the most recent draft was created',
  nextScheduledPublish: 'Earliest upcoming scheduled post',
  lowMediaCount: 'Categories with fewer than 3 media assets',
  subscriptionStatus: 'Stripe subscription status via group',
  daysActive: 'Days since brand was created',
};

function hasIssues(row: BrandHealthRow): boolean {
  const lastDraftMs = row.lastDraftGenerated
    ? Date.now() - new Date(row.lastDraftGenerated).getTime()
    : Infinity;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return (
    row.failedCount > 0 ||
    row.partialCount > 0 ||
    row.socialStatus === 'disconnected' ||
    row.draftsGenerated30d === 0 ||
    row.upcoming30d === 0 ||
    lastDraftMs > sevenDays ||
    row.subscriptionStatus === 'past_due' ||
    row.subscriptionStatus === 'canceled' ||
    row.lowMediaCount > 0
  );
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Today';
    if (futureDays === 1) return 'Tomorrow';
    return `In ${futureDays}d`;
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

function formatFutureDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays}d`;
}

function lastDraftColor(iso: string | null): string {
  if (!iso) return 'text-red-600';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = diffMs / (24 * 60 * 60 * 1000);
  if (days > 7) return 'text-red-600';
  if (days > 2) return 'text-amber-600';
  return '';
}

function subscriptionBadge(status: string | null) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-700',
    past_due: 'bg-red-100 text-red-700',
    canceled: 'bg-red-100 text-red-700',
    unpaid: 'bg-red-100 text-red-700',
    incomplete: 'bg-gray-100 text-gray-600',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function socialBadge(status: 'active' | 'disconnected' | 'none') {
  if (status === 'active')
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Active
      </span>
    );
  if (status === 'disconnected')
    return (
      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Disconnected
      </span>
    );
  return <span className="text-xs text-gray-400">None</span>;
}

interface ColumnDef {
  key: SortKey;
  label: string;
  align?: 'left' | 'right';
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Brand', align: 'left' },
  { key: 'draftsGenerated30d', label: 'Drafts 30d', align: 'right' },
  { key: 'upcoming30d', label: 'Upcoming 30d', align: 'right' },
  { key: 'draftCount', label: 'Draft', align: 'right' },
  { key: 'scheduledCount', label: 'Scheduled', align: 'right' },
  { key: 'publishedCount', label: 'Published', align: 'right' },
  { key: 'partialCount', label: 'Partial', align: 'right' },
  { key: 'failedCount', label: 'Failed', align: 'right' },
  { key: 'socialStatus', label: 'Social', align: 'left' },
  { key: 'lastDraftGenerated', label: 'Last Draft', align: 'left' },
  { key: 'nextScheduledPublish', label: 'Next Publish', align: 'left' },
  { key: 'lowMediaCount', label: 'Low Media', align: 'right' },
  { key: 'subscriptionStatus', label: 'Subscription', align: 'left' },
  { key: 'daysActive', label: 'Days Active', align: 'right' },
];

function HeaderCell({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: ColumnDef;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === col.key;
  const tooltip = COLUMN_TOOLTIPS[col.key];
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 ${
        col.align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(col.key)}
    >
      <span className="inline-flex items-center gap-1">
        {col.label}
        {tooltip && (
          <span className="group relative">
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-400 leading-none">
              i
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
        {isActive && (
          <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
}

function numCell(value: number, color?: string) {
  return <span className={color}>{value.toLocaleString()}</span>;
}

export default function AnalyticsPage() {
  const [brands, setBrands] = useState<BrandHealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [socialFilter, setSocialFilter] = useState<'all' | 'active' | 'disconnected'>('all');
  const [subFilter, setSubFilter] = useState<string>('all');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/super-admin/system-health', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load system health data');

        const data = await res.json();
        if (!cancelled) {
          setBrands(data.brands ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const filtered = useMemo(() => {
    let rows = brands;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }

    if (socialFilter !== 'all') {
      rows = rows.filter((r) => r.socialStatus === socialFilter);
    }

    if (subFilter !== 'all') {
      rows = rows.filter((r) => r.subscriptionStatus === subFilter);
    }

    if (showIssuesOnly) {
      rows = rows.filter(hasIssues);
    }

    return rows;
  }, [brands, search, socialFilter, subFilter, showIssuesOnly]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => {
    const rows = filtered;
    const sum = {
      draftsGenerated30d: 0,
      upcoming30d: 0,
      draftCount: 0,
      scheduledCount: 0,
      publishedCount: 0,
      partialCount: 0,
      failedCount: 0,
      disconnectedCount: 0,
      lowMediaCount: 0,
      subIssueCount: 0,
      oldestLastDraft: null as string | null,
      earliestNextPublish: null as string | null,
      totalDaysActive: 0,
    };

    for (const r of rows) {
      sum.draftsGenerated30d += r.draftsGenerated30d;
      sum.upcoming30d += r.upcoming30d;
      sum.draftCount += r.draftCount;
      sum.scheduledCount += r.scheduledCount;
      sum.publishedCount += r.publishedCount;
      sum.partialCount += r.partialCount;
      sum.failedCount += r.failedCount;
      sum.lowMediaCount += r.lowMediaCount;
      sum.totalDaysActive += r.daysActive;

      if (r.socialStatus === 'disconnected') sum.disconnectedCount++;
      if (r.subscriptionStatus === 'past_due' || r.subscriptionStatus === 'canceled')
        sum.subIssueCount++;

      if (r.lastDraftGenerated) {
        if (!sum.oldestLastDraft || r.lastDraftGenerated < sum.oldestLastDraft) {
          sum.oldestLastDraft = r.lastDraftGenerated;
        }
      }
      if (r.nextScheduledPublish) {
        if (!sum.earliestNextPublish || r.nextScheduledPublish < sum.earliestNextPublish) {
          sum.earliestNextPublish = r.nextScheduledPublish;
        }
      }
    }

    return sum;
  }, [filtered]);

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">
            System Health
          </h1>
        </div>

        {/* Filter bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] w-48"
            />

            <select
              value={socialFilter}
              onChange={(e) => setSocialFilter(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            >
              <option value="all">Social: All</option>
              <option value="active">Social: Active</option>
              <option value="disconnected">Social: Disconnected</option>
            </select>

            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            >
              <option value="all">Subscription: All</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Cancelled</option>
              <option value="trialing">Trialing</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showIssuesOnly}
                onChange={(e) => setShowIssuesOnly(e.target.checked)}
                className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
              />
              Has Issues
            </label>

            <span className="ml-auto text-xs text-gray-500">
              {filtered.length} of {brands.length} brands
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-gray-500">Loading health data...</div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {COLUMNS.map((col) => (
                      <HeaderCell
                        key={col.key}
                        col={col}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Summary row */}
                  <tr className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">
                    <td className="px-3 py-2 text-xs">
                      All ({filtered.length})
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.draftsGenerated30d.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.upcoming30d.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.draftCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.scheduledCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.publishedCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.partialCount > 0 ? (
                        <span className="text-amber-600">{summary.partialCount}</span>
                      ) : (
                        summary.partialCount
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.failedCount > 0 ? (
                        <span className="text-red-600">{summary.failedCount}</span>
                      ) : (
                        summary.failedCount
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {summary.disconnectedCount > 0 ? (
                        <span className="text-red-600">{summary.disconnectedCount} disc.</span>
                      ) : (
                        <span className="text-green-600">All OK</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {summary.oldestLastDraft
                        ? formatRelativeDate(summary.oldestLastDraft)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {summary.earliestNextPublish
                        ? formatFutureDate(summary.earliestNextPublish)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {summary.lowMediaCount > 0 ? (
                        <span className="text-amber-600">{summary.lowMediaCount}</span>
                      ) : (
                        summary.lowMediaCount
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {summary.subIssueCount > 0 ? (
                        <span className="text-red-600">{summary.subIssueCount} issues</span>
                      ) : (
                        <span className="text-green-600">All OK</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">—</td>
                  </tr>

                  {/* Brand rows */}
                  {sorted.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <Link
                          href={`/brands/${row.id}/schedule`}
                          className="text-[#6366F1] hover:underline font-medium"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {numCell(
                          row.draftsGenerated30d,
                          row.draftsGenerated30d === 0 ? 'text-red-600 font-medium' : ''
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {numCell(
                          row.upcoming30d,
                          row.upcoming30d === 0 ? 'text-amber-600 font-medium' : ''
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{row.draftCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-xs">{row.scheduledCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-xs">{row.publishedCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {numCell(
                          row.partialCount,
                          row.partialCount > 0 ? 'text-amber-600 font-medium' : ''
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {numCell(
                          row.failedCount,
                          row.failedCount > 0 ? 'text-red-600 font-medium' : ''
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{socialBadge(row.socialStatus)}</td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap ${lastDraftColor(row.lastDraftGenerated)}`}>
                        {formatRelativeDate(row.lastDraftGenerated)}
                      </td>
                      <td className={`px-3 py-2 text-xs whitespace-nowrap ${!row.nextScheduledPublish ? 'text-amber-600' : ''}`}>
                        {formatFutureDate(row.nextScheduledPublish)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {numCell(
                          row.lowMediaCount,
                          row.lowMediaCount > 0 ? 'text-amber-600 font-medium' : ''
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {subscriptionBadge(row.subscriptionStatus)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">{row.daysActive}</td>
                    </tr>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-3 py-8 text-center text-sm text-gray-500">
                        No brands match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
