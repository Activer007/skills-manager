import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="form-control w-full">
        {label && (
          <label htmlFor={inputId} className="label pb-1">
            <span className="label-text font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'input input-bordered w-full bg-white dark:bg-base-100 transition-all focus:ring-2 focus:ring-primary/20 focus:outline-none',
            error && 'input-error focus:ring-error/20',
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <label className="label pt-1">
            <span className="label-text-alt text-slate-500">{helperText}</span>
          </label>
        )}
        {error && (
          <label className="label pt-1">
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
