'use client';

import type { FailedJob } from './useSystemHealth';

interface PublishingSectionProps {
  dueToday: number;
  published: number;
  failed: number;
  pending: number;
  overdue: number;
  successRate: number;
  failedJobs: FailedJob[];
  lastCronRun: string | null;
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    failed: 'bg-rose-100 text-rose-700',
    pending: 'bg-amber-100 text-amber-700',
    published: 'bg-emerald-100 text-emerald-700',
    success: 'bg-emerald-100 text-emerald-700',
  };
  const cls = styles[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function formatTime(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function timeAgo(isoDate: string | null): { text: string; color: string } {
  if (!isoDate) return { text: 'Never', color: 'text-rose-600' };
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  let text: string;
  if (diffMin < 1) text = 'Just now';
  else if (diffMin < 60) text = `${diffMin} min ago`;
  else text = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;

  let color: string;
  if (diffMin < 10) color = 'text-emerald-600';
  else if (diffMin < 30) color = 'text-amber-600';
  else color = 'text-rose-600';

  return { text, color };
}

export default function PublishingSection({
  dueToday,
  published,
  failed,
  pending,
  overdue,
  successRate,
  failedJobs,
  lastCronRun,
}: PublishingSectionProps) {
  const pubColor = dueToday > 0 && published === dueToday ? 'text-emerald-600' : published > 0 ? 'text-amber-600' : 'text-gray-900';
  const failColor = failed > 0 ? 'text-rose-600' : 'text-gray-900';
  const pendColor = overdue > 0 ? 'text-amber-600' : 'text-gray-900';
  const rateColor = successRate >= 90 ? 'text-emerald-600' : successRate >= 50 ? 'text-amber-600' : 'text-rose-600';
  const cron = timeAgo(lastCronRun);

  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Publishing
      </h2>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Due Today" value={dueToday} color="text-gray-900" />
        <MetricCard label="Published" value={published} color={pubColor} />
        <MetricCard label="Failed" value={failed} color={failColor} />
        <MetricCard label="Pending" value={pending} color={pendColor} />
        <MetricCard label="Success Rate" value={dueToday > 0 ? `${successRate}%` : '—'} color={dueToday > 0 ? rateColor : 'text-gray-400'} />
      </div>

      {/* Failed jobs table */}
      {failedJobs.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Error</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {failedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{job.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{job.channel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatTime(job.scheduled_at)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500" title={job.error || ''}>{job.error || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={job.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cron indicator */}
      <p className={`mt-3 text-sm ${cron.color}`}>
        <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: 'currentColor' }} />
        Publish cron last ran: {cron.text}
      </p>
    </section>
  );
}
