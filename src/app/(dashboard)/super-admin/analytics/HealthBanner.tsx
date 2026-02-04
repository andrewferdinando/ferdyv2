'use client';

interface HealthBannerProps {
  overall: 'healthy' | 'warning' | 'critical';
  overallMessage: string;
}

const config = {
  healthy: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
    symbol: '●',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
    symbol: '⚠',
  },
  critical: {
    bg: 'bg-rose-50 border-rose-200',
    icon: 'text-rose-600',
    text: 'text-rose-800',
    dot: 'bg-rose-500',
    symbol: '✕',
  },
};

export default function HealthBanner({ overall, overallMessage }: HealthBannerProps) {
  const c = config[overall];

  return (
    <div className={`rounded-xl border p-4 ${c.bg} flex items-center gap-3`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${c.dot} bg-opacity-20`}>
        <span className={`text-lg ${c.icon}`}>{c.symbol}</span>
      </span>
      <span className={`text-sm font-semibold ${c.text}`}>{overallMessage}</span>
    </div>
  );
}
