'use client';

import type { ExpectedDraftsData } from './useSystemHealth';
import ExpandableMetricCard from './ExpandableMetricCard';

interface ExpectedDraftsSectionProps {
  data: ExpectedDraftsData;
}

function formatDate(value: string | null) {
  if (!value) return '\u2014';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '\u2014';
  }
}

export default function ExpectedDraftsSection({ data }: ExpectedDraftsSectionProps) {
  const createdColor =
    data.totalExpected > 0 && data.alreadyCreated === data.totalExpected
      ? 'text-emerald-600'
      : 'text-gray-900';
  const pendingColor =
    data.pendingCreation > 0 ? 'text-amber-600' : 'text-gray-900';

  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Expected Drafts This Week ({data.totalExpected})
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ExpandableMetricCard
          label="Total Expected"
          value={data.totalExpected}
          color="text-gray-900"
        />
        <ExpandableMetricCard
          label="Already Created"
          value={data.alreadyCreated}
          color={createdColor}
        />
        <ExpandableMetricCard
          label="Pending Creation"
          value={data.pendingCreation}
          color={pendingColor}
        />
      </div>

      {data.slots.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled For</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.slots.map((slot) => (
                <tr key={slot.key} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{slot.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{slot.subcategory_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 capitalize">{slot.frequency}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(slot.scheduled_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {slot.status === 'created' ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Created
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No drafts expected in the next 7 days.
        </div>
      )}
    </section>
  );
}
