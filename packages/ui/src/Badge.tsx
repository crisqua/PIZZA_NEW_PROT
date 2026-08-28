import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide transition-colors',
          {
            'bg-primary/[.13] text-primary border border-primary/[.27]': variant === 'default',
            'bg-success/10 text-success': variant === 'success',
            'bg-warning/10 text-warning': variant === 'warning',
            'bg-destructive/10 text-destructive': variant === 'destructive',
            'bg-info/10 text-info': variant === 'info',
            'bg-secondary text-secondary-foreground': variant === 'secondary',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
