import { clsx } from 'clsx';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

export function Badge({ variant = 'gray', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      {
        'bg-green-100 text-green-700':  variant === 'green',
        'bg-yellow-100 text-yellow-700': variant === 'yellow',
        'bg-red-100 text-red-700':      variant === 'red',
        'bg-bg-page text-body-text':      variant === 'gray',
        'bg-blue-100 text-blue-700':    variant === 'blue',
      }
    )}>
      {children}
    </span>
  );
}
