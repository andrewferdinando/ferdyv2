'use client';

import type { UpcomingDraft } from './useSystemHealth';
import { getChannelLabel } from '@/lib/channels';

interface UpcomingDraftsSectionProps {
  drafts: UpcomingDraft[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

export default function UpcomingDraftsSection({ drafts }: UpcomingDraftsSectionProps) {
  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Upcoming This Week{drafts.length > 0 ? ` (${drafts.length})` : ''}
      </h2>

      {drafts.length === 0 ? (
        <p className="text-sm text-gray-500">No drafts scheduled for the next 7 days.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {drafts.map((draft) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{draft.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{draft.subcategory_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(draft.scheduled_for)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {draft.approved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Needs Approval
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {draft.channels.length > 0
                      ? draft.channels.map(c => getChannelLabel(c)).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
