'use client';

import type { BrandWithoutDrafts } from './useSystemHealth';

interface DraftGenerationSectionProps {
  activeRules: number;
  createdToday: number;
  unapprovedUpcoming: number;
  brandsWithoutDrafts: BrandWithoutDrafts[];
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function DraftGenerationSection({
  activeRules,
  createdToday,
  unapprovedUpcoming,
  brandsWithoutDrafts,
}: DraftGenerationSectionProps) {
  const createdColor =
    createdToday === 0 && activeRules > 0 ? 'text-amber-600' : 'text-gray-900';
  const unapprovedColor =
    unapprovedUpcoming > 5 ? 'text-rose-600' : unapprovedUpcoming > 0 ? 'text-amber-600' : 'text-gray-900';

  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Draft Generation
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard label="Active Rules" value={activeRules} color="text-gray-900" />
        <MetricCard label="Created Today" value={createdToday} color={createdColor} />
        <MetricCard label="Unapproved (7 days)" value={unapprovedUpcoming} color={unapprovedColor} />
      </div>

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
