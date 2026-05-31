import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-bold rounded-input transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-[var(--green)] hover:bg-[var(--forest-2)] text-white shadow-[0_4px_14px_rgba(47,125,79,0.3)] hover:-translate-y-px': variant === 'primary',
            'bg-card hover:bg-bg-page text-black-heading border border-border-default': variant === 'secondary',
            'hover:bg-[var(--alt)] text-body-text': variant === 'ghost',
            'bg-[var(--rust)] hover:bg-[#8B2B20] text-white': variant === 'danger',
            'px-3 py-1.5 text-[13px]': size === 'sm',
            'px-4 py-2 text-sm':       size === 'md',
            'px-5 py-2.5 text-[15px]': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
