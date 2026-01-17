import React, { useEffect, useState } from 'react';
import { Input } from './ui/Input';
import { Select, type SelectOption } from './ui/Select';
import { Switch } from './ui/Switch';
import { Button } from './ui/Button';
import { Save } from 'lucide-react';

// Define the schema types based on the docs
// { "key": { "type": "boolean", "label": "Enable Feature" } }

export interface ConfigSchemaItem {
  type: 'string' | 'number' | 'boolean' | 'enum';
  label: string;
  description?: string;
  default?: unknown;
  options?: string[] | { label: string; value: string | number }[]; // For enum
  required?: boolean;
}

export interface ConfigSchema {
  [key: string]: ConfigSchemaItem;
}

interface ConfigFormProps {
  schema: ConfigSchema;
  initialValues?: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
}

export const ConfigForm = ({
  schema,
  initialValues = {},
  onSave,
  isLoading = false,
}: ConfigFormProps) => {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize values with defaults if not present in initialValues
    const newValues = { ...initialValues };
    Object.keys(schema).forEach((key) => {
      if (newValues[key] === undefined && schema[key].default !== undefined) {
        newValues[key] = schema[key].default;
      }
    });
    // Only update if different to avoid infinite loops if this effect runs too often
    // But honestly, for this simple form, just setting it is fine if dependencies are stable.
    // To suppress lint warning properly, we should probably not set state in effect if we can avoid it,
    // or use a ref to track initialization.
    setValues(newValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]); // Only run when schema changes or on mount. ignoring initialValues deep changes for now

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};
    Object.keys(schema).forEach((key) => {
      if (schema[key].required && (values[key] === undefined || values[key] === '')) {
        newErrors[key] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave(values);
  };

  const renderField = (key: string, item: ConfigSchemaItem) => {
    const value = values[key] ?? '';
    const error = errors[key];

    switch (item.type) {
      case 'boolean':
        return (
          <div key={key} className="form-control mb-4">
             <div className="flex items-center justify-between">
                <div>
                    <span className="label-text font-medium text-slate-700 dark:text-slate-300 block">
                        {item.label}
                    </span>
                    {item.description && (
                         <span className="text-sm text-slate-500 dark:text-slate-400">
                             {item.description}
                         </span>
                    )}
                </div>
                <Switch
                    checked={!!value}
                    onChange={(checked) => handleChange(key, checked)}
                    label={value ? 'Enabled' : 'Disabled'}
                />
             </div>
             {error && <span className="text-error text-xs mt-1">{error}</span>}
          </div>
        );

      case 'enum': {
        const options: SelectOption[] = Array.isArray(item.options)
          ? item.options.map((opt) =>
              typeof opt === 'string'
                ? { label: opt, value: opt }
                : { label: opt.label, value: opt.value }
            )
          : [];

        return (
          <Select
            key={key}
            label={item.label}
            helperText={item.description}
            options={[{ label: 'Select an option', value: '' }, ...options]}
            value={value as string | number}
            onChange={(e) => handleChange(key, e.target.value)}
            error={error}
            className="mb-4"
          />
        );
      }

      case 'number':
        return (
            <Input
                key={key}
                type="number"
                label={item.label}
                helperText={item.description}
                value={value as number}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                error={error}
                className="mb-4"
            />
        );

      case 'string':
      default:
        return (
          <Input
            key={key}
            type="text"
            label={item.label}
            helperText={item.description}
            value={value as string}
            onChange={(e) => handleChange(key, e.target.value)}
            error={error}
            className="mb-4"
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-base-100 p-6 rounded-xl border border-gray-100 dark:border-base-200 shadow-sm">
        {Object.keys(schema).length === 0 ? (
            <div className="text-center text-slate-500 py-8 italic">
                No configuration fields defined for this skill.
            </div>
        ) : (
            Object.keys(schema).map((key) => renderField(key, schema[key]))
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={Object.keys(schema).length === 0}>
          <Save size={18} className="mr-2" />
          Save Changes
        </Button>
      </div>
    </form>
  );
};
