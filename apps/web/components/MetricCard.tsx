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

  const spaceIdx = value.indexOf(' ');
  const num  = spaceIdx === -1 ? value : value.slice(0, spaceIdx);
  const unit = spaceIdx === -1 ? '' : value.slice(spaceIdx + 1);

  return (
    <div className="bg-card border border-border-default rounded-card p-4 sm:p-5 shadow-card hover:-translate-y-0.5 hover:shadow-card-md transition-all duration-300 min-w-0">
      <div className="flex items-start justify-between gap-1 mb-3 sm:mb-4">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-[9px] sm:rounded-[10px] flex items-center justify-center flex-shrink-0 ${c.ico}`}>
          <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
        </div>
        <span className="font-mono text-[9.5px] sm:text-[10.5px] font-medium tracking-[0.12em] uppercase text-muted-text text-right leading-tight">
          {label}
        </span>
      </div>
      <p className="font-display font-bold text-black-heading tracking-[-0.03em] leading-none min-w-0 break-words"
         style={{ fontSize: 'clamp(17px, 4.5vw, 32px)' }}>
        {num}
        {unit && <small className="font-semibold text-muted-text ml-1" style={{ fontSize: 'clamp(12px, 2.5vw, 17px)' }}>{unit}</small>}
      </p>
      {sub && (
        <p className="text-[11px] sm:text-[12px] font-semibold text-muted-text mt-1.5 sm:mt-2 truncate">{sub}</p>
      )}
    </div>
  );
}
