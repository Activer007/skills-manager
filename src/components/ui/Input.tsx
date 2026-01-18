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
            // 统一圆角：rounded-md (8px)
            // 统一过渡：duration-normal (200ms)
            // 统一焦点环：ring-2
            'input input-bordered w-full bg-base-100 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-gray-200 dark:border-base-300 transition-all duration-normal rounded-md focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary',
            error && 'input-error focus:ring-error/20 focus:border-error',
            className
          )}
          aria-invalid={!!error} {...props}
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
