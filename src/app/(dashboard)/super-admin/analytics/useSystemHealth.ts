'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export interface FailedJob {
  id: string;
  brand_name: string;
  channel: string;
  scheduled_at: string;
  error: string | null;
  status: string;
}

export interface PublishedJob {
  id: string;
  brand_name: string;
  channel: string;
  scheduled_at: string;
}

export interface PendingJob {
  id: string;
  brand_name: string;
  channel: string;
  scheduled_at: string;
  status: string;
}

export interface ActiveRule {
  id: string;
  brand_name: string;
  subcategory_name: string;
  frequency: string;
  channels: string[];
}

export interface CreatedDraft {
  id: string;
  brand_name: string;
  subcategory_name: string;
  scheduled_for: string;
}

export interface UnapprovedDraft {
  id: string;
  brand_name: string;
  subcategory_name: string;
  scheduled_for: string;
}

export interface ConnectedAccount {
  id: string;
  brand_name: string;
  provider: string;
  handle: string;
}

export interface DisconnectedAccount {
  id: string;
  brand_name: string;
  provider: string;
  handle: string;
  error: string | null;
  disconnected_since: string | null;
}

export interface ExpiringAccount {
  id: string;
  brand_name: string;
  provider: string;
  handle: string;
  token_expires_at: string;
}

export interface BrandWithoutDrafts {
  id: string;
  name: string;
}

export interface UpcomingDraft {
  id: string;
  brand_name: string;
  subcategory_name: string;
  scheduled_for: string;
  approved: boolean;
  channels: string[];
}

export interface ExpectedDraftSlot {
  key: string;
  brand_id: string;
  brand_name: string;
  subcategory_id: string;
  subcategory_name: string;
  frequency: string;
  scheduled_at: string;
  status: 'created' | 'missing';
  draft_id: string | null;
}

export interface ExpectedDraftsData {
  totalExpected: number;
  alreadyCreated: number;
  pendingCreation: number;
  slots: ExpectedDraftSlot[];
}

export interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'critical';
  overallMessage: string;
  publishing: {
    dueToday: number;
    published: number;
    failed: number;
    pending: number;
    overdue: number;
    successRate: number;
    failedJobs: FailedJob[];
    publishedJobs: PublishedJob[];
    pendingJobs: PendingJob[];
    lastCronRun: string | null;
  };
  drafts: {
    activeRules: number;
    createdToday: number;
    unapprovedUpcoming: number;
    activeRulesList: ActiveRule[];
    createdTodayList: CreatedDraft[];
    unapprovedList: UnapprovedDraft[];
    brandsWithoutDrafts: BrandWithoutDrafts[];
  };
  social: {
    connected: number;
    disconnected: number;
    expiringSoon: number;
    connectedAccounts: ConnectedAccount[];
    disconnectedAccounts: DisconnectedAccount[];
    expiringAccounts: ExpiringAccount[];
  };
  expectedDrafts: ExpectedDraftsData;
  upcomingThisWeek: UpcomingDraft[];
  loading: boolean;
  error: string | null;
}

function getDateBounds(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useSystemHealth(selectedDate: Date): SystemHealthData {
  const [data, setData] = useState<Omit<SystemHealthData, 'loading' | 'error'>>({
    overall: 'healthy',
    overallMessage: 'All systems healthy',
    publishing: { dueToday: 0, published: 0, failed: 0, pending: 0, overdue: 0, successRate: 0, failedJobs: [], publishedJobs: [], pendingJobs: [], lastCronRun: null },
    drafts: { activeRules: 0, createdToday: 0, unapprovedUpcoming: 0, activeRulesList: [], createdTodayList: [], unapprovedList: [], brandsWithoutDrafts: [] },
    social: { connected: 0, disconnected: 0, expiringSoon: 0, connectedAccounts: [], disconnectedAccounts: [], expiringAccounts: [] },
    expectedDrafts: { totalExpected: 0, alreadyCreated: 0, pendingCreation: 0, slots: [] },
    upcomingThisWeek: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateBounds(selectedDate);
      const now = new Date().toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        postJobsRes,
        failedJobsRes,
        lastCronRes,
        activeRulesRes,
        createdTodayRes,
        unapprovedRes,
        brandsWithRulesRes,
        brandsWithDraftsRes,
        connectedRes,
        disconnectedRes,
        expiringSoonRes,
        upcomingDraftsRes,
      ] = await Promise.all([
        // 1. All post_jobs for the selected day (with brand + channel for detail tables)
        supabase
          .from('post_jobs')
          .select('id, status, scheduled_at, channel, brand_id, brands(name)', { count: 'exact' })
          .gte('scheduled_at', start)
          .lte('scheduled_at', end),

        // 2. Failed post_jobs with brand info
        supabase
          .from('post_jobs')
          .select('id, channel, scheduled_at, error, status, brand_id, brands(name)')
          .gte('scheduled_at', start)
          .lte('scheduled_at', end)
          .eq('status', 'failed')
          .order('scheduled_at', { ascending: false }),

        // 3. Last time the publish cron actually ran (from heartbeat table)
        supabase
          .from('cron_heartbeats')
          .select('last_ran_at')
          .eq('cron_name', 'publish')
          .maybeSingle(),

        // 4. Active schedule rules with details
        supabase
          .from('schedule_rules')
          .select('id, frequency, channels, brand_id, brands(name), subcategories(name)')
          .eq('is_active', true),

        // 5. Drafts created today with details
        supabase
          .from('drafts')
          .select('id, scheduled_for, brand_id, brands(name), subcategories(name)')
          .gte('created_at', start)
          .lte('created_at', end),

        // 6. Unapproved drafts with scheduled_for in the next 7 days
        supabase
          .from('drafts')
          .select('id, scheduled_for, brand_id, brands(name), subcategories(name)')
          .eq('approved', false)
          .gte('scheduled_for', now)
          .lte('scheduled_for', sevenDaysFromNow),

        // 7. Active brands with schedule rules (for "brands without drafts" check)
        supabase
          .from('brands')
          .select('id, name, schedule_rules!inner(id)')
          .eq('status', 'active')
          .eq('schedule_rules.is_active', true),

        // 8. Brands that have drafts in the next 7 days
        supabase
          .from('drafts')
          .select('brand_id')
          .gte('scheduled_for', now)
          .lte('scheduled_for', sevenDaysFromNow),

        // 9. Connected social accounts (active brands) with details
        supabase
          .from('social_accounts')
          .select('id, provider, handle, brand_id, brands!inner(name, status)')
          .eq('status', 'connected')
          .eq('brands.status', 'active'),

        // 10. Disconnected social accounts with details
        supabase
          .from('social_accounts')
          .select('id, provider, handle, status, updated_at, brand_id, brands!inner(name, status)')
          .in('status', ['expired', 'revoked', 'error', 'disconnected'])
          .eq('brands.status', 'active'),

        // 11. Expiring social accounts (connected, token expires within 7 days)
        supabase
          .from('social_accounts')
          .select('id, provider, handle, token_expires_at, brand_id, brands!inner(name, status)')
          .eq('status', 'connected')
          .eq('brands.status', 'active')
          .not('token_expires_at', 'is', null)
          .lte('token_expires_at', sevenDaysFromNow)
          .gte('token_expires_at', now),

        // 12. Upcoming drafts in the next 7 days
        supabase
          .from('drafts')
          .select('id, scheduled_for, approved, brand_id, brands(name), subcategories(name)')
          .gte('scheduled_for', now)
          .lte('scheduled_for', sevenDaysFromNow)
          .order('scheduled_for', { ascending: true }),
      ]);

      // --- Process Publishing ---
      const allJobs = (postJobsRes.data || []) as any[];
      const dueToday = postJobsRes.count || allJobs.length;
      const publishedRaw = allJobs.filter(j => j.status === 'published' || j.status === 'success');
      const published = publishedRaw.length;
      const failed = allJobs.filter(j => j.status === 'failed').length;
      const pendingStatuses = ['pending', 'generated', 'ready', 'publishing'];
      const pendingRaw = allJobs.filter(j => pendingStatuses.includes(j.status));
      const pending = pendingRaw.length;
      const overdue = pendingRaw.filter(j => j.scheduled_at && j.scheduled_at < now).length;
      const successRate = dueToday > 0 ? Math.round((published / dueToday) * 100) : 0;

      const publishedJobs: PublishedJob[] = publishedRaw.map((j: any) => ({
        id: j.id,
        brand_name: j.brands?.name || 'Unknown',
        channel: j.channel,
        scheduled_at: j.scheduled_at,
      }));

      const pendingJobsList: PendingJob[] = pendingRaw.map((j: any) => ({
        id: j.id,
        brand_name: j.brands?.name || 'Unknown',
        channel: j.channel,
        scheduled_at: j.scheduled_at,
        status: j.status,
      }));

      const failedJobs: FailedJob[] = (failedJobsRes.data || []).map((j: any) => ({
        id: j.id,
        brand_name: j.brands?.name || 'Unknown',
        channel: j.channel,
        scheduled_at: j.scheduled_at,
        error: j.error,
        status: j.status,
      }));

      const lastCronRun = lastCronRes.data?.last_ran_at || null;

      // --- Process Drafts ---
      const activeRulesData = (activeRulesRes.data || []) as any[];
      const activeRules = activeRulesData.length;
      const activeRulesList: ActiveRule[] = activeRulesData.map((r: any) => ({
        id: r.id,
        brand_name: r.brands?.name || 'Unknown',
        subcategory_name: r.subcategories?.name || 'Unknown',
        frequency: r.frequency,
        channels: r.channels || [],
      }));

      const createdTodayData = (createdTodayRes.data || []) as any[];
      const createdToday = createdTodayData.length;
      const createdTodayList: CreatedDraft[] = createdTodayData.map((d: any) => ({
        id: d.id,
        brand_name: d.brands?.name || 'Unknown',
        subcategory_name: d.subcategories?.name || 'Unknown',
        scheduled_for: d.scheduled_for,
      }));

      const unapprovedData = (unapprovedRes.data || []) as any[];
      const unapprovedUpcoming = unapprovedData.length;
      const unapprovedList: UnapprovedDraft[] = unapprovedData.map((d: any) => ({
        id: d.id,
        brand_name: d.brands?.name || 'Unknown',
        subcategory_name: d.subcategories?.name || 'Unknown',
        scheduled_for: d.scheduled_for,
      }));

      // Brands with rules but no upcoming drafts
      const brandsWithRules = (brandsWithRulesRes.data || []) as any[];
      const brandIdsWithDrafts = new Set(
        (brandsWithDraftsRes.data || []).map((d: any) => d.brand_id)
      );
      const brandsWithoutDrafts: BrandWithoutDrafts[] = brandsWithRules
        .filter(b => !brandIdsWithDrafts.has(b.id))
        .map(b => ({ id: b.id, name: b.name }));

      // --- Process Social ---
      const connectedData = (connectedRes.data || []) as any[];
      const connected = connectedData.length;
      const connectedAccounts: ConnectedAccount[] = connectedData.map((a: any) => ({
        id: a.id,
        brand_name: a.brands?.name || 'Unknown',
        provider: a.provider,
        handle: a.handle || '',
      }));

      const disconnectedAccounts: DisconnectedAccount[] = (disconnectedRes.data || []).map((a: any) => ({
        id: a.id,
        brand_name: a.brands?.name || 'Unknown',
        provider: a.provider,
        handle: a.handle || '',
        error: a.status,
        disconnected_since: a.updated_at,
      }));
      const disconnected = disconnectedAccounts.length;

      const expiringAccounts: ExpiringAccount[] = (expiringSoonRes.data || []).map((a: any) => ({
        id: a.id,
        brand_name: a.brands?.name || 'Unknown',
        provider: a.provider,
        handle: a.handle || '',
        token_expires_at: a.token_expires_at,
      }));
      const expiringSoon = expiringAccounts.length;

      // --- Process Upcoming Drafts ---
      const upcomingRaw = (upcomingDraftsRes.data || []) as any[];
      // Fetch post_jobs channels for upcoming drafts in a single query
      const upcomingDraftIds = upcomingRaw.map((d: any) => d.id);
      let upcomingChannelsMap: Record<string, string[]> = {};
      if (upcomingDraftIds.length > 0) {
        const { data: channelData } = await supabase
          .from('post_jobs')
          .select('draft_id, channel')
          .in('draft_id', upcomingDraftIds);
        if (channelData) {
          for (const row of channelData) {
            if (!upcomingChannelsMap[row.draft_id]) upcomingChannelsMap[row.draft_id] = [];
            if (row.channel && !upcomingChannelsMap[row.draft_id].includes(row.channel)) {
              upcomingChannelsMap[row.draft_id].push(row.channel);
            }
          }
        }
      }
      const upcomingThisWeek: UpcomingDraft[] = upcomingRaw.map((d: any) => ({
        id: d.id,
        brand_name: d.brands?.name || 'Unknown',
        subcategory_name: d.subcategories?.name || 'Unknown',
        scheduled_for: d.scheduled_for,
        approved: d.approved,
        channels: upcomingChannelsMap[d.id] || [],
      }));

      // --- Process Expected Drafts This Week ---
      const brandsForTargets = (brandsWithRulesRes.data || []) as any[];
      const targetResults = await Promise.all(
        brandsForTargets.map((b: any) =>
          supabase.rpc('rpc_framework_targets', { p_brand_id: b.id }).then((res: any) => ({
            brand_id: b.id as string,
            brand_name: b.name as string,
            targets: (res.data || []) as any[],
          }))
        )
      );

      // Flatten and filter to next 7 days
      const allTargets: { brand_id: string; brand_name: string; subcategory_id: string; frequency: string; scheduled_at: string }[] = [];
      for (const result of targetResults) {
        for (const t of result.targets) {
          if (t.scheduled_at >= now && t.scheduled_at <= sevenDaysFromNow) {
            allTargets.push({
              brand_id: result.brand_id,
              brand_name: result.brand_name,
              subcategory_id: t.subcategory_id,
              frequency: t.frequency,
              scheduled_at: t.scheduled_at,
            });
          }
        }
      }

      // Lookup subcategory names
      const uniqueSubcategoryIds = [...new Set(allTargets.map(t => t.subcategory_id))];
      let subcategoryNameMap: Record<string, string> = {};
      if (uniqueSubcategoryIds.length > 0) {
        const { data: subcatData } = await supabase
          .from('subcategories')
          .select('id, name')
          .in('id', uniqueSubcategoryIds);
        if (subcatData) {
          for (const s of subcatData) {
            subcategoryNameMap[s.id] = s.name;
          }
        }
      }

      // Batch-query existing framework drafts in the window
      // Also include published/deleted drafts so we don't flag them as "missing"
      const uniqueBrandIds = [...new Set(allTargets.map(t => t.brand_id))];
      let draftLookup: Record<string, string> = {};
      if (uniqueBrandIds.length > 0) {
        const { data: existingDrafts } = await supabase
          .from('drafts')
          .select('id, brand_id, subcategory_id, scheduled_for')
          .in('brand_id', uniqueBrandIds)
          .eq('schedule_source', 'framework')
          .gte('scheduled_for', now)
          .lte('scheduled_for', sevenDaysFromNow);
        if (existingDrafts) {
          for (const d of existingDrafts) {
            // Normalize timestamp to ISO millis format for reliable matching
            const normalizedTime = new Date(d.scheduled_for).toISOString();
            const key = `${d.brand_id}|${d.subcategory_id}|${normalizedTime}`;
            draftLookup[key] = d.id;
          }
        }
      }

      // Build slots
      const expectedSlots: ExpectedDraftSlot[] = allTargets.map(t => {
        // Normalize timestamp to ISO millis format for reliable matching
        const normalizedTime = new Date(t.scheduled_at).toISOString();
        const key = `${t.brand_id}|${t.subcategory_id}|${normalizedTime}`;
        const draftId = draftLookup[key] || null;
        return {
          key,
          brand_id: t.brand_id,
          brand_name: t.brand_name,
          subcategory_id: t.subcategory_id,
          subcategory_name: subcategoryNameMap[t.subcategory_id] || 'Unknown',
          frequency: t.frequency,
          scheduled_at: t.scheduled_at,
          status: draftId ? 'created' as const : 'missing' as const,
          draft_id: draftId,
        };
      });

      // Sort: missing first, then by scheduled_at ascending
      expectedSlots.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'missing' ? -1 : 1;
        return a.scheduled_at.localeCompare(b.scheduled_at);
      });

      const alreadyCreated = expectedSlots.filter(s => s.status === 'created').length;
      const expectedDrafts: ExpectedDraftsData = {
        totalExpected: expectedSlots.length,
        alreadyCreated,
        pendingCreation: expectedSlots.length - alreadyCreated,
        slots: expectedSlots,
      };

      // --- Compute overall health ---
      let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
      let overallMessage = 'All systems healthy';

      const hasCritical =
        (dueToday > 0 && successRate < 50) ||
        (disconnected > 0);

      const hasWarning =
        failed > 0 ||
        unapprovedUpcoming > 0 ||
        expiringSoon > 0 ||
        overdue > 0 ||
        brandsWithoutDrafts.length > 0;

      if (hasCritical) {
        overall = 'critical';
        overallMessage = 'Action required';
      } else if (hasWarning) {
        overall = 'warning';
        overallMessage = 'Attention needed';
      }

      setData({
        overall,
        overallMessage,
        publishing: { dueToday, published, failed, pending, overdue, successRate, failedJobs, publishedJobs, pendingJobs: pendingJobsList, lastCronRun },
        drafts: { activeRules, createdToday, unapprovedUpcoming, activeRulesList, createdTodayList, unapprovedList, brandsWithoutDrafts },
        social: { connected, disconnected, expiringSoon, connectedAccounts, disconnectedAccounts, expiringAccounts },
        expectedDrafts,
        upcomingThisWeek,
      });
    } catch (err) {
      console.error('[useSystemHealth] Failed to fetch health data:', err);
      setError('Unable to load system health data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, error };
}
