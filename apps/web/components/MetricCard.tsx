import { Skeleton } from './ui/skeleton';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: 'green' | 'blue' | 'yellow' | 'purple';
  loading?: boolean;
}

const colorMap = {
  green:  { ico: 'bg-green-light   text-green-mid',   ring: 'border-[var(--gl)]'  },
  blue:   { ico: 'bg-slate-light   text-slate',        ring: 'border-[var(--slate-wash)]' },
  yellow: { ico: 'bg-[var(--amber-wash)] text-[var(--amber)]', ring: 'border-[var(--amber-wash)]' },
  purple: { ico: 'bg-purple-50     text-purple-600',   ring: 'border-purple-100'   },
};

export function MetricCard({ label, value, sub, icon: Icon, color = 'green', loading }: MetricCardProps) {
  const c = colorMap[color];

  if (loading) return (
    <div className="bg-card border border-border-default rounded-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-9 h-9 rounded-[10px]" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-8 w-24 rounded mb-2" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  );

  const [num, unit] = value.split(' ');

  return (
    <div className="bg-card border border-border-default rounded-card p-5 shadow-card hover:-translate-y-0.5 hover:shadow-card-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${c.ico}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </div>
        <span className="font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase text-muted-text">
          {label}
        </span>
      </div>
      <p className="font-display text-[32px] font-bold text-black-heading tracking-[-0.03em] leading-none">
        {num}
        {unit && <small className="text-[17px] font-semibold text-muted-text ml-1">{unit}</small>}
      </p>
      {sub && (
        <p className="text-[12px] font-semibold text-muted-text mt-2">{sub}</p>
      )}
    </div>
  );
}
