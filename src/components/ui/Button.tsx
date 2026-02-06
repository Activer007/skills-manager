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
      // 主要按钮 - 渐变效果 + 光效
      primary: 'btn-primary-gradient btn-shine text-white font-semibold px-4 shadow-md hover:shadow-xl btn-enhanced',
      // 次要按钮 - 保持原样
      secondary: 'btn-neutral text-neutral-content shadow-sm hover:shadow-md transition-all duration-normal',
      // 轮廓按钮 - 增强边框高光
      outline: 'btn-outline border-gradient hover:border-primary hover:text-primary transition-all duration-normal',
      // 幽灵按钮 - 毛玻璃效果
      ghost: 'btn-ghost hover:bg-primary/10 hover:text-primary glass-effect transition-all duration-normal',
      // 错误按钮 - 渐变效果
      error: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-lg hover:shadow-red-500/25 btn-enhanced transition-all duration-normal',
      // 链接按钮 - 保持原样
      link: 'btn-link hover:text-primary/80 transition-colors duration-fast',
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
