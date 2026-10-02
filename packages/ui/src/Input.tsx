import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  // "minimal" (PROTCLINEW, Sprint 1): campo so' com linha inferior, label small-caps
  // acima, valor serifado -- usado so' pelo Checkout/AddressForm do apps/cliente
  // (Sprint 6). Sem essa prop (default "default"), o HTML/classes gerados sao
  // EXATAMENTE os de antes -- apps/pizzaria e apps/admin-pizzarias nunca passam
  // "variant", entao continuam identicos bit-a-bit.
  variant?: 'default' | 'minimal';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, variant = 'default', ...props }, ref) => {
    if (variant === 'minimal') {
      return (
        <div className="w-full">
          {label && (
            <label className="block mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </label>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-0 py-2 bg-transparent border-0 border-b rounded-none',
              'font-serif text-base text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:border-primary',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:pointer-events-none',
              error ? 'border-destructive focus:border-destructive' : 'border-border',
              className
            )}
            {...props}
          />
          {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        </div>
      );
    }

    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-input-background border border-border rounded-lg',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:pointer-events-none',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
