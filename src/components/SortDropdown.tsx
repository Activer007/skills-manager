import { useTranslation } from 'react-i18next';
import { ArrowDownAZ, ArrowUpAZ, Calendar, Star } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { useState, useRef, useEffect } from 'react';

export type SortOption = 'stars' | 'updated' | 'name' | 'name-desc';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    {
      value: 'stars',
      label: i18n.language === 'zh' ? '热门程度 (Stars)' : 'Most Popular (Stars)',
      icon: <Star size={16} />
    },
    {
      value: 'updated',
      label: i18n.language === 'zh' ? '最近更新' : 'Recently Updated',
      icon: <Calendar size={16} />
    },
    {
      value: 'name',
      label: i18n.language === 'zh' ? '名称 (A-Z)' : 'Name (A-Z)',
      icon: <ArrowDownAZ size={16} />
    },
    {
        value: 'name-desc',
        label: i18n.language === 'zh' ? '名称 (Z-A)' : 'Name (Z-A)',
        icon: <ArrowUpAZ size={16} />
    }
  ];

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="flex items-center gap-2 min-w-[160px] justify-between bg-white dark:bg-base-100"
        onClick={() => setIsOpen(!isOpen)}
        title={i18n.language === 'zh' ? '选择排序方式' : 'Select sort option'}
        data-testid="sort-dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          {selectedOption.icon}
          <span className="text-sm font-medium">{selectedOption.label}</span>
        </div>
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-base-100 rounded-xl shadow-xl border border-gray-100 dark:border-base-300 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="listbox"
          data-testid="sort-dropdown-menu"
        >
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left",
                  value === option.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-base-200"
                )}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                title={option.label}
                role="option"
                aria-selected={value === option.value}
                data-testid={`sort-option-${option.value}`}
              >
                <span className={cn(
                    "flex items-center justify-center w-5 h-5",
                    value === option.value ? "text-primary" : "text-slate-400"
                )}>
                    {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
