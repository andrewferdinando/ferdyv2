'use client';

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

interface ExpandableMetricCardProps {
  label: string;
  value: string | number;
  color: string;
  expandable?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

export default function ExpandableMetricCard({
  label,
  value,
  color,
  expandable = false,
  expanded = false,
  onClick,
}: ExpandableMetricCardProps) {
  const interactive = expandable && typeof onClick === 'function';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); } } : undefined}
      className={[
        'rounded-xl border bg-white p-5 shadow-sm transition-colors',
        expanded ? 'border-[#6366F1]' : 'border-gray-200',
        interactive ? 'cursor-pointer hover:border-gray-300' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="mt-1 text-sm text-gray-500">{label}</p>
        </div>
        {interactive && (
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </div>
    </div>
  );
}
