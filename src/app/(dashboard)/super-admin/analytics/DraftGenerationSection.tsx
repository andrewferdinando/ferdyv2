'use client';

import { useState } from 'react';
import type { BrandWithoutDrafts, ActiveRule, CreatedDraft, UnapprovedDraft } from './useSystemHealth';
import ExpandableMetricCard from './ExpandableMetricCard';
import { getChannelLabel } from '@/lib/channels';

interface DraftGenerationSectionProps {
  activeRules: number;
  createdToday: number;
  unapprovedUpcoming: number;
  activeRulesList: ActiveRule[];
  createdTodayList: CreatedDraft[];
  unapprovedList: UnapprovedDraft[];
  brandsWithoutDrafts: BrandWithoutDrafts[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

export default function DraftGenerationSection({
  activeRules,
  createdToday,
  unapprovedUpcoming,
  activeRulesList,
  createdTodayList,
  unapprovedList,
  brandsWithoutDrafts,
}: DraftGenerationSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const createdColor =
    createdToday === 0 && activeRules > 0 ? 'text-amber-600' : 'text-gray-900';
  const unapprovedColor =
    unapprovedUpcoming > 5 ? 'text-rose-600' : unapprovedUpcoming > 0 ? 'text-amber-600' : 'text-gray-900';

  function toggle(key: string) {
    setExpanded(prev => prev === key ? null : key);
  }

  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Draft Generation
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ExpandableMetricCard
          label="Active Rules"
          value={activeRules}
          color="text-gray-900"
          expandable={activeRulesList.length > 0}
          expanded={expanded === 'rules'}
          onClick={() => toggle('rules')}
        />
        <ExpandableMetricCard
          label="Created Today"
          value={createdToday}
          color={createdColor}
          expandable={createdTodayList.length > 0}
          expanded={expanded === 'created'}
          onClick={() => toggle('created')}
        />
        <ExpandableMetricCard
          label="Unapproved (7 days)"
          value={unapprovedUpcoming}
          color={unapprovedColor}
          expandable={unapprovedList.length > 0}
          expanded={expanded === 'unapproved'}
          onClick={() => toggle('unapproved')}
        />
      </div>

      {/* Active Rules detail table */}
      {expanded === 'rules' && activeRulesList.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {activeRulesList.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{rule.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{rule.subcategory_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 capitalize">{rule.frequency}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {rule.channels.map(c => getChannelLabel(c)).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Created Today detail table */}
      {expanded === 'created' && createdTodayList.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {createdTodayList.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{draft.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{draft.subcategory_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(draft.scheduled_for)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unapproved detail table */}
      {expanded === 'unapproved' && unapprovedList.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {unapprovedList.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{draft.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{draft.subcategory_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(draft.scheduled_for)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {brandsWithoutDrafts.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            <span className="mr-1.5">⚠</span>
            Brands with no upcoming drafts:{' '}
            <span className="font-normal">
              {brandsWithoutDrafts.map(b => b.name).join(', ')}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
