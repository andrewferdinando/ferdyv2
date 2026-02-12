'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  partialCount: 'Posts currently partially published',
  failedCount: 'Post jobs currently in failed state',
  socialStatus: 'Whether the brand has any connected social account',
  lastDraftGenerated: 'When the most recent draft was created — click for details',
  nextDraftGenerated: 'Furthest-out date with a generated draft — shows pipeline reach',
  nextScheduledPublish: 'Earliest upcoming scheduled post',
  lowMediaCount: 'Categories with fewer than 3 media assets',
  subscriptionStatus: 'Stripe subscription status via group',
  daysActive: 'Days since brand was created',
};

interface ColumnDef {
  key: SortKey;
  label: string;
  align?: 'left' | 'right';
}

const ALL_COLUMNS: ColumnDef[] = [
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
  { key: 'nextDraftGenerated', label: 'Next Draft', align: 'left' },
  { key: 'nextScheduledPublish', label: 'Next Publish', align: 'left' },
  { key: 'lowMediaCount', label: 'Low Media', align: 'right' },
  { key: 'subscriptionStatus', label: 'Subscription', align: 'left' },
  { key: 'daysActive', label: 'Days Active', align: 'right' },
];

const COLUMN_MAP = Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c]));

// Default order of moveable columns (everything except Brand)
const DEFAULT_MOVEABLE_KEYS: SortKey[] = ALL_COLUMNS.slice(1).map((c) => c.key);

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

  // Column order (moveable columns only — Brand is always first)
  const [moveableKeys, setMoveableKeys] = useState<SortKey[]>(DEFAULT_MOVEABLE_KEYS);

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    title: string;
    brandName: string;
    content: React.ReactNode;
  } | null>(null);

  // Full ordered columns
  const orderedColumns = useMemo(
    () => [COLUMN_MAP['name'], ...moveableKeys.map((k) => COLUMN_MAP[k])],
    [moveableKeys]
  );

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

  // Drag handlers for column reorder
  const handleDragStart = useCallback((moveIdx: number) => {
    dragIdx.current = moveIdx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, moveIdx: number) => {
    e.preventDefault();
    setDragOverIdx(moveIdx);
  }, []);

  const handleDrop = useCallback(
    (dropMoveIdx: number) => {
      const fromIdx = dragIdx.current;
      if (fromIdx === null || fromIdx === dropMoveIdx) {
        dragIdx.current = null;
        setDragOverIdx(null);
        return;
      }
      setMoveableKeys((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(dropMoveIdx, 0, moved);
        return next;
      });
      dragIdx.current = null;
      setDragOverIdx(null);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    dragIdx.current = null;
    setDragOverIdx(null);
  }, []);

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
      latestNextDraft: null as string | null,
      earliestNextPublish: null as string | null,
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

      if (r.socialStatus === 'disconnected') sum.disconnectedCount++;
      if (r.subscriptionStatus === 'past_due' || r.subscriptionStatus === 'canceled')
        sum.subIssueCount++;

      if (r.lastDraftGenerated) {
        if (!sum.oldestLastDraft || r.lastDraftGenerated < sum.oldestLastDraft) {
          sum.oldestLastDraft = r.lastDraftGenerated;
        }
      }
      if (r.nextDraftGenerated) {
        if (!sum.latestNextDraft || r.nextDraftGenerated > sum.latestNextDraft) {
          sum.latestNextDraft = r.nextDraftGenerated;
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

  // Render a summary cell by column key
  function renderSummaryCell(key: SortKey) {
    const align = COLUMN_MAP[key]?.align === 'right' ? 'text-right' : 'text-left';
    const base = `px-3 py-2 text-xs ${align}`;

    switch (key) {
      case 'name':
        return <td className={base}>All ({filtered.length})</td>;
      case 'draftsGenerated30d':
        return <td className={base}>{summary.draftsGenerated30d.toLocaleString()}</td>;
      case 'upcoming30d':
        return <td className={base}>{summary.upcoming30d.toLocaleString()}</td>;
      case 'draftCount':
        return <td className={base}>{summary.draftCount.toLocaleString()}</td>;
      case 'scheduledCount':
        return <td className={base}>{summary.scheduledCount.toLocaleString()}</td>;
      case 'publishedCount':
        return <td className={base}>{summary.publishedCount.toLocaleString()}</td>;
      case 'partialCount':
        return (
          <td className={base}>
            {summary.partialCount > 0 ? (
              <span className="text-amber-600">{summary.partialCount}</span>
            ) : (
              summary.partialCount
            )}
          </td>
        );
      case 'failedCount':
        return (
          <td className={base}>
            {summary.failedCount > 0 ? (
              <span className="text-red-600">{summary.failedCount}</span>
            ) : (
              summary.failedCount
            )}
          </td>
        );
      case 'socialStatus':
        return (
          <td className={base}>
            {summary.disconnectedCount > 0 ? (
              <span className="text-red-600">{summary.disconnectedCount} disc.</span>
            ) : (
              <span className="text-green-600">All OK</span>
            )}
          </td>
        );
      case 'lastDraftGenerated':
        return (
          <td className={base}>
            {summary.oldestLastDraft ? formatRelativeDate(summary.oldestLastDraft) : '—'}
          </td>
        );
      case 'nextDraftGenerated':
        return (
          <td className={base}>
            {summary.latestNextDraft ? formatFutureDate(summary.latestNextDraft) : '—'}
          </td>
        );
      case 'nextScheduledPublish':
        return (
          <td className={base}>
            {summary.earliestNextPublish ? formatFutureDate(summary.earliestNextPublish) : '—'}
          </td>
        );
      case 'lowMediaCount':
        return (
          <td className={base}>
            {summary.lowMediaCount > 0 ? (
              <span className="text-amber-600">{summary.lowMediaCount}</span>
            ) : (
              summary.lowMediaCount
            )}
          </td>
        );
      case 'subscriptionStatus':
        return (
          <td className={base}>
            {summary.subIssueCount > 0 ? (
              <span className="text-red-600">{summary.subIssueCount} issues</span>
            ) : (
              <span className="text-green-600">All OK</span>
            )}
          </td>
        );
      case 'daysActive':
        return <td className={base}>—</td>;
      default:
        return <td className={base}>—</td>;
    }
  }

  // Open last draft modal
  function openLastDraftModal(row: BrandHealthRow) {
    if (!row.lastDraftInfo) return;
    const d = row.lastDraftInfo;
    setModal({
      title: 'Last Generated Draft',
      brandName: row.name,
      content: (
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-gray-500">Status:</span>{' '}
            <span className="capitalize">{d.status.replace('_', ' ')}</span>
          </div>
          {d.subcategoryName && (
            <div>
              <span className="font-medium text-gray-500">Category:</span> {d.subcategoryName}
            </div>
          )}
          {d.scheduledFor && (
            <div>
              <span className="font-medium text-gray-500">Scheduled for:</span>{' '}
              {new Date(d.scheduledFor).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-500">Created:</span>{' '}
            {row.lastDraftGenerated
              ? new Date(row.lastDraftGenerated).toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </div>
          {d.copy && (
            <div>
              <span className="font-medium text-gray-500">Copy:</span>
              <p className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700 max-h-40 overflow-y-auto">
                {d.copy}
              </p>
            </div>
          )}
          <div className="pt-2">
            <Link
              href={`/brands/${row.id}/edit-post/${d.id}`}
              className="text-[#6366F1] hover:underline text-xs font-medium"
              onClick={() => setModal(null)}
            >
              Open in editor
            </Link>
          </div>
        </div>
      ),
    });
  }

  // Open partial/failed modal
  function openIdsModal(
    title: string,
    brandName: string,
    brandId: string,
    description: string,
    ids: string[]
  ) {
    setModal({
      title,
      brandName,
      content: (
        <div className="space-y-2 text-sm">
          <p className="text-gray-500">{description}</p>
          <ul className="space-y-1">
            {ids.map((id) => (
              <li key={id}>
                <Link
                  href={`/brands/${brandId}/edit-post/${id}`}
                  className="text-[#6366F1] hover:underline text-xs"
                  onClick={() => setModal(null)}
                >
                  View post {id.slice(0, 8)}...
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  // Render a data cell by column key
  function renderDataCell(key: SortKey, row: BrandHealthRow) {
    switch (key) {
      case 'name':
        return (
          <td className="px-3 py-2 text-xs whitespace-nowrap">
            <Link
              href={`/brands/${row.id}/schedule`}
              className="text-[#6366F1] hover:underline font-medium"
            >
              {row.name}
            </Link>
          </td>
        );
      case 'draftsGenerated30d':
        return (
          <td className="px-3 py-2 text-right text-xs">
            {numCell(row.draftsGenerated30d, row.draftsGenerated30d === 0 ? 'text-red-600 font-medium' : '')}
          </td>
        );
      case 'upcoming30d':
        return (
          <td className="px-3 py-2 text-right text-xs">
            {numCell(row.upcoming30d, row.upcoming30d === 0 ? 'text-amber-600 font-medium' : '')}
          </td>
        );
      case 'draftCount':
        return <td className="px-3 py-2 text-right text-xs">{row.draftCount.toLocaleString()}</td>;
      case 'scheduledCount':
        return <td className="px-3 py-2 text-right text-xs">{row.scheduledCount.toLocaleString()}</td>;
      case 'publishedCount':
        return <td className="px-3 py-2 text-right text-xs">{row.publishedCount.toLocaleString()}</td>;
      case 'partialCount':
        return (
          <td
            className={`px-3 py-2 text-right text-xs ${row.partialCount > 0 ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (row.partialCount > 0 && row.partialDraftIds.length > 0) {
                openIdsModal(
                  'Partially Published Posts',
                  row.name,
                  row.id,
                  `${row.partialCount} post(s) published to some channels but not all.`,
                  row.partialDraftIds
                );
              }
            }}
          >
            {numCell(row.partialCount, row.partialCount > 0 ? 'text-amber-600 font-medium hover:underline' : '')}
          </td>
        );
      case 'failedCount':
        return (
          <td
            className={`px-3 py-2 text-right text-xs ${row.failedCount > 0 ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (row.failedCount > 0 && row.failedDraftIds.length > 0) {
                openIdsModal(
                  'Failed Posts',
                  row.name,
                  row.id,
                  `${row.failedCount} post job(s) currently failed.`,
                  row.failedDraftIds
                );
              }
            }}
          >
            {numCell(row.failedCount, row.failedCount > 0 ? 'text-red-600 font-medium hover:underline' : '')}
          </td>
        );
      case 'socialStatus':
        return <td className="px-3 py-2 text-xs">{socialBadge(row.socialStatus)}</td>;
      case 'lastDraftGenerated':
        return (
          <td
            className={`px-3 py-2 text-xs whitespace-nowrap ${lastDraftColor(row.lastDraftGenerated)} ${row.lastDraftInfo ? 'cursor-pointer hover:underline' : ''}`}
            onClick={() => openLastDraftModal(row)}
          >
            {formatRelativeDate(row.lastDraftGenerated)}
          </td>
        );
      case 'nextDraftGenerated':
        return (
          <td className="px-3 py-2 text-xs whitespace-nowrap">
            {formatFutureDate(row.nextDraftGenerated)}
          </td>
        );
      case 'nextScheduledPublish':
        return (
          <td className={`px-3 py-2 text-xs whitespace-nowrap ${!row.nextScheduledPublish ? 'text-amber-600' : ''}`}>
            {formatFutureDate(row.nextScheduledPublish)}
          </td>
        );
      case 'lowMediaCount':
        return (
          <td className="px-3 py-2 text-right text-xs">
            {numCell(row.lowMediaCount, row.lowMediaCount > 0 ? 'text-amber-600 font-medium' : '')}
          </td>
        );
      case 'subscriptionStatus':
        return <td className="px-3 py-2 text-xs">{subscriptionBadge(row.subscriptionStatus)}</td>;
      case 'daysActive':
        return <td className="px-3 py-2 text-right text-xs">{row.daysActive}</td>;
      default:
        return <td className="px-3 py-2 text-xs">—</td>;
    }
  }

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
                    {orderedColumns.map((col, colIdx) => {
                      const isActive = sortKey === col.key;
                      const tooltip = COLUMN_TOOLTIPS[col.key];
                      const isBrand = col.key === 'name';
                      // moveableIdx is the index within moveableKeys (colIdx - 1 since Brand is 0)
                      const moveIdx = colIdx - 1;
                      const isDragOver = !isBrand && dragOverIdx === moveIdx;

                      return (
                        <th
                          key={col.key}
                          className={`whitespace-nowrap px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          } ${isDragOver ? 'bg-indigo-50' : ''}`}
                          onClick={() => handleSort(col.key)}
                          draggable={!isBrand}
                          onDragStart={!isBrand ? () => handleDragStart(moveIdx) : undefined}
                          onDragOver={!isBrand ? (e) => handleDragOver(e, moveIdx) : undefined}
                          onDrop={!isBrand ? () => handleDrop(moveIdx) : undefined}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="inline-flex items-center gap-1">
                            {!isBrand && (
                              <span className="text-gray-300 cursor-grab text-[10px]">⠿</span>
                            )}
                            {col.label}
                            {tooltip && (
                              <span
                                title={tooltip}
                                className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-400 leading-none cursor-help"
                              >
                                i
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px]">
                                {sortDir === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Summary row */}
                  <tr className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-800">
                    {orderedColumns.map((col) => (
                      <React.Fragment key={col.key}>
                        {renderSummaryCell(col.key)}
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Brand rows */}
                  {sorted.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      {orderedColumns.map((col) => (
                        <React.Fragment key={col.key}>
                          {renderDataCell(col.key, row)}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}

                  {sorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={orderedColumns.length}
                        className="px-3 py-8 text-center text-sm text-gray-500"
                      >
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

      {/* Detail modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModal(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{modal.title}</h3>
                <p className="text-xs text-gray-500">{modal.brandName}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {modal.content}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
