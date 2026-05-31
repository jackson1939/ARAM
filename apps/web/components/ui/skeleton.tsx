import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse bg-border-default rounded', className)} />
  );
}
