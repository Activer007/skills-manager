/**
 * DesignShowpage 组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DesignShowcase from './DesignShowcase';

describe('DesignShowcase', () => {
  describe('渲染测试', () => {
    it('应该正确渲染标题', () => {
      render(<DesignShowcase />);
      expect(screen.getByText('现代/科技感设计系统')).toBeInTheDocument();
    });

    it('应该渲染所有组件部分', () => {
      render(<DesignShowcase />);

      // 检查主要部分
      expect(screen.getByText('按钮组件')).toBeInTheDocument();
      expect(screen.getByText('徽章组件')).toBeInTheDocument();
      expect(screen.getByText('表单组件')).toBeInTheDocument();
      expect(screen.getByText('卡片组件')).toBeInTheDocument();
      expect(screen.getByText('对话框组件')).toBeInTheDocument();
      expect(screen.getByText('特殊效果')).toBeInTheDocument();
    });

    it('应该渲染所有按钮变体', () => {
      render(<DesignShowcase />);

      expect(screen.getByText('主要按钮')).toBeInTheDocument();
      expect(screen.getByText('次要按钮')).toBeInTheDocument();
      expect(screen.getByText('轮廓按钮')).toBeInTheDocument();
      expect(screen.getByText('幽灵按钮')).toBeInTheDocument();
      expect(screen.getByText('错误按钮')).toBeInTheDocument();
      expect(screen.getByText('加载中')).toBeInTheDocument();
    });

    it('应该渲染所有徽章变体', () => {
      render(<DesignShowcase />);

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Outline')).toBeInTheDocument();
      expect(screen.getByText('Ghost')).toBeInTheDocument();
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });

    it('应该渲染特性卡片', () => {
      render(<DesignShowcase />);

      expect(screen.getByText('科技感渐变')).toBeInTheDocument();
      expect(screen.getByText('精致交互')).toBeInTheDocument();
      expect(screen.getByText('毛玻璃效果')).toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    it('应该能打开对话框', () => {
      render(<DesignShowcase />);

      const openButton = screen.getByText('打开对话框');
      fireEvent.click(openButton);

      expect(screen.getByText('增强对话框')).toBeInTheDocument();
    });

    it('应该能关闭对话框', async () => {
      render(<DesignShowcase />);

      // 打开对话框
      const openButton = screen.getByText('打开对话框');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('增强对话框')).toBeInTheDocument();
      });

      // 点击取消按钮
      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('增强对话框')).not.toBeInTheDocument();
      });
    });

    it('应该能通过确认按钮关闭对话框', async () => {
      render(<DesignShowcase />);

      // 打开对话框
      const openButton = screen.getByText('打开对话框');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('增强对话框')).toBeInTheDocument();
      });

      // 点击确认按钮
      const confirmButton = screen.getByText('确认');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('增强对话框')).not.toBeInTheDocument();
      });
    });
  });

  describe('表单组件测试', () => {
    it('应该渲染所有表单输入框', () => {
      render(<DesignShowcase />);

      expect(screen.getByLabelText('输入框')).toBeInTheDocument();
      expect(screen.getByLabelText('下拉选择')).toBeInTheDocument();
      expect(screen.getByLabelText('错误状态')).toBeInTheDocument();
      expect(screen.getByLabelText('禁用状态')).toBeInTheDocument();
    });

    it('应该显示错误状态', () => {
      render(<DesignShowcase />);

      const errorInput = screen.getByLabelText('错误状态');
      expect(errorInput).toHaveValue('invalid input');
    });

    it('应该禁用输入框', () => {
      render(<DesignShowcase />);

      const disabledInput = screen.getByLabelText('禁用状态');
      expect(disabledInput).toBeDisabled();
    });
  });

  describe('卡片组件测试', () => {
    it('应该渲染所有类型的卡片', () => {
      render(<DesignShowcase />);

      expect(screen.getByText('基础卡片')).toBeInTheDocument();
      expect(screen.getByText('带徽章的卡片')).toBeInTheDocument();
      expect(screen.getByText('科技感渐变卡片')).toBeInTheDocument();
    });

    it('应该在卡片中显示 New 徽章', () => {
      render(<DesignShowcase />);

      const badge = screen.getByText('New');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('特殊效果测试', () => {
    it('应该渲染特殊效果卡片', () => {
      render(<DesignShowcase />);

      expect(screen.getByText('渐变边框')).toBeInTheDocument();
      expect(screen.getByText('毛玻璃效果')).toBeInTheDocument();
      expect(screen.getByText('发光效果')).toBeInTheDocument();
      expect(screen.getByText('脉冲动画')).toBeInTheDocument();
    });
  });

  describe('响应式设计测试', () => {
    it('应该有正确的响应式类名', () => {
      const { container } = render(<DesignShowcase />);

      // 检查是否有响应式的 grid 布局
      const grids = container.querySelectorAll('.grid-cols-1');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('可访问性测试', () => {
    it('应该有正确的语义化 HTML', () => {
      render(<DesignShowcase />);

      // 检查是否有 header 元素
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // 检查按钮是否有正确的角色
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('模态框应该有正确的 ARIA 属性', async () => {
      render(<DesignShowcase />);

      const openButton = screen.getByText('打开对话框');
      fireEvent.click(openButton);

      await waitFor(() => {
        const dialog = screen.getByText('增强对话框').closest('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      });
    });
  });

  describe('动画测试', () => {
    it('应该有正确的动画类名', () => {
      const { container } = render(<DesignShowcase />);

      // 检查是否有动画类
      const animatedElements = container.querySelectorAll('[class*="animate-"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });

  describe('主题支持测试', () => {
    it('应该支持暗色主题类名', () => {
      const { container } = render(<DesignShowcase />);

      // 检查是否有暗色主题的支持
      const darkElements = container.querySelectorAll('[class*="dark:"]');
      expect(darkElements.length).toBeGreaterThan(0);
    });
  });
});
