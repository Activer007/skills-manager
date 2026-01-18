import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      // 主要按钮：添加阴影增强层次感
      primary: 'btn-primary text-primary-content shadow-sm hover:shadow-md',
      // 次要按钮
      secondary: 'btn-neutral text-neutral-content shadow-sm hover:shadow-md',
      // 轮廓按钮
      outline: 'btn-outline hover:border-primary hover:text-primary',
      // 幽灵按钮：彩色悬停效果
      ghost: 'btn-ghost hover:bg-primary/10 hover:text-primary',
      // 错误按钮
      error: 'btn-error text-error-content shadow-sm hover:shadow-md hover:bg-error/90',
      // 链接按钮
      link: 'btn-link hover:text-primary/80',
    };

    const sizes = {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          // 统一使用 rounded-md (8px)
          // 统一过渡：duration-normal (200ms)
          // 禁用状态：透明度降低
          'btn font-medium normal-case transition-all duration-normal rounded-md disabled:opacity-70 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
