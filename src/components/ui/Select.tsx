import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="form-control w-full">
        {label && (
          <label htmlFor={selectId} className="label pb-1">
            <span className="label-text font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'select select-bordered w-full bg-white dark:bg-base-100 transition-all focus:ring-2 focus:ring-primary/20 focus:outline-none',
            error && 'select-error focus:ring-error/20',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';

export { Select };
