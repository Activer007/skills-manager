/**
 * ========================================
 * Design System Showcase
 * 展示新的 v2.0 设计系统组件
 * ========================================
 */

import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useState } from 'react';
import { Shield, Zap, Palette, Sparkles } from 'lucide-react';

const selectOptions = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三' },
];

export default function DesignShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Design System v2.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-primary">
            现代/科技感设计系统
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            基于现有设计系统增强，添加渐变、毛玻璃效果、精致阴影和微交互，保持风格一致性
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: '科技感渐变', desc: '微妙的渐变效果增强视觉层次' },
            { icon: Zap, title: '精致交互', desc: '流畅的动画和微交互反馈' },
            { icon: Palette, title: '毛玻璃效果', desc: '现代化的半透明背景模糊' },
          ].map((feature, index) => (
            <Card key={index} className="group hover:scale-105 transition-transform duration-normal">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/25 transition-all duration-normal">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Buttons Showcase */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            按钮组件
          </h2>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary" className="shadow-lg">主要按钮</Button>
                <Button variant="secondary">次要按钮</Button>
                <Button variant="outline">轮廓按钮</Button>
                <Button variant="ghost">幽灵按钮</Button>
                <Button variant="error">错误按钮</Button>
                <Button variant="primary" isLoading>加载中</Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 items-center">
                <Button variant="primary" size="xs">XS</Button>
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges Showcase */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">徽章组件</h2>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Badge variant="primary" size="xs">XS</Badge>
                <Badge variant="primary" size="sm">Small</Badge>
                <Badge variant="primary" size="md">Medium</Badge>
                <Badge variant="primary" size="lg">Large</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">表单组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Input
                  label="输入框"
                  placeholder="请输入内容..."
                  helperText="这是辅助文本"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Select
                  label="下拉选择"
                  options={selectOptions}
                  helperText="请选择一个选项"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Input
                  label="错误状态"
                  error="这是错误提示信息"
                  defaultValue="invalid input"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Input
                  label="禁用状态"
                  disabled
                  placeholder="此输入框已禁用"
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cards Showcase */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">卡片组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:scale-105 transition-transform duration-normal">
              <CardHeader>
                <CardTitle>基础卡片</CardTitle>
                <CardDescription>这是卡片的描述文本</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  卡片内容区域，可以放置任何内容。
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="primary" size="sm">操作</Button>
              </CardFooter>
            </Card>

            <Card className="hover:scale-105 transition-transform duration-normal">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>带徽章的卡片</CardTitle>
                  <Badge variant="success">New</Badge>
                </div>
                <CardDescription>展示不同状态的徽章</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  支持多种徽章变体和尺寸。
                </p>
              </CardContent>
            </Card>

            <Card className="card-tech-gradient hover:scale-105 transition-transform duration-normal">
              <CardHeader>
                <CardTitle>科技感渐变卡片</CardTitle>
                <CardDescription>特殊的背景渐变效果</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  使用渐变背景增强视觉层次。
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">了解更多</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Modal Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">对话框组件</h2>
          <Card>
            <CardContent className="p-8">
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                className="shadow-lg"
              >
                打开对话框
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="增强对话框"
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                确认
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              这是对话框内容，展示了增强的设计系统效果：
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>毛玻璃背景效果</li>
              <li>渐变边框和标题</li>
              <li>柔和的阴影系统</li>
              <li>流畅的动画过渡</li>
            </ul>
          </div>
        </Modal>

        {/* Special Effects */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">特殊效果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gradient">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">渐变边框</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  悬停时显示渐变边框高光效果
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">毛玻璃效果</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  半透明背景 + 背景模糊
                </p>
              </CardContent>
            </Card>

            <Card className="hover:glow-primary transition-all duration-normal">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">发光效果</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  悬停时显示彩色发光阴影
                </p>
              </CardContent>
            </Card>

            <Card className="animate-pulse-glow">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">脉冲动画</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  持续的脉冲发光动画
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Design System v2.0 - 现代/科技感设计增强
          </p>
        </footer>

      </div>
    </div>
  );
}
