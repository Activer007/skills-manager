import { useSkills } from '../hooks/useSkills';
import { Zap, Box, HardDrive, TrendingUp, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { cn } from '../utils/cn';

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: string;
};

const StatCard = ({ title, value, icon: Icon, color, bgColor, trend }: StatCardProps) => (
  <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
    <CardContent className="p-6 flex items-start justify-between relative">
       <div className="z-10">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
          {trend && (
             <p className="text-xs font-medium text-emerald-500 flex items-center gap-1 mt-2">
                <TrendingUp size={12} />
                {trend}
             </p>
          )}
       </div>
       <div className={cn("p-3 rounded-xl z-10", bgColor, color)}>
          <Icon size={24} />
       </div>

       {/* Decorative Background */}
       <div className={cn("absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10", color.replace('text-', 'bg-'))} />
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { data: installedSkills = [] } = useSkills();

  // Mock Data for Charts
  const usageData = i18n.language === 'zh' ? [
    { name: '周一', calls: 140, errors: 2 },
    { name: '周二', calls: 230, errors: 5 },
    { name: '周三', calls: 180, errors: 3 },
    { name: '周四', calls: 290, errors: 8 },
    { name: '周五', calls: 350, errors: 4 },
    { name: '周六', calls: 120, errors: 1 },
    { name: '周日', calls: 150, errors: 2 },
  ] : [
    { name: 'Mon', calls: 140, errors: 2 },
    { name: 'Tue', calls: 230, errors: 5 },
    { name: 'Wed', calls: 180, errors: 3 },
    { name: 'Thu', calls: 290, errors: 8 },
    { name: 'Fri', calls: 350, errors: 4 },
    { name: 'Sat', calls: 120, errors: 1 },
    { name: 'Sun', calls: 150, errors: 2 },
  ];

  const categoryData = [
    { name: 'Coding', value: 45, color: '#3b82f6' },
    { name: 'Productivity', value: 25, color: '#10b981' },
    { name: 'Security', value: 20, color: '#f59e0b' },
    { name: 'Other', value: 10, color: '#64748b' },
  ];

  const systemSkillsCount = installedSkills.filter(s => s.type === 'system').length;
  const projectSkillsCount = installedSkills.filter(s => s.type === 'project').length;
  const safeSkillsCount = installedSkills.filter(s => s.status === 'safe').length;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('installedSkills')}
          value={installedSkills.length}
          icon={Zap}
          color="text-blue-500"
          bgColor="bg-blue-50 dark:bg-blue-500/10"
          trend="+12% this week"
        />
        <StatCard
          title={t('systemLevel')}
          value={systemSkillsCount}
          icon={HardDrive}
          color="text-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatCard
          title={t('projectLevel')}
          value={projectSkillsCount}
          icon={Box}
          color="text-amber-500"
          bgColor="bg-amber-50 dark:bg-amber-500/10"
        />
        <StatCard
          title="Security Score"
          value={`${Math.round((safeSkillsCount / (installedSkills.length || 1)) * 100)}%`}
          icon={ShieldCheck}
          color="text-emerald-500"
          bgColor="bg-emerald-50 dark:bg-emerald-500/10"
          trend="All systems nominal"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>{t('skillUsageTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCalls)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side Panel: Categories & Activity */}
        <div className="space-y-6">
            {/* Category Distribution */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Skill Categories</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{installedSkills.length}</div>
                            <div className="text-xs text-slate-500">Total</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>{t('recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                        {[
                            { title: 'Installed "Git Commander"', time: '2 min ago', color: 'bg-blue-500' },
                            { title: 'Updated "Web Search"', time: '2 hours ago', color: 'bg-emerald-500' },
                            { title: 'Security Scan Completed', time: 'Yesterday', color: 'bg-purple-500' },
                        ].map((item, i) => (
                            <div key={i} className="relative pl-8 flex flex-col gap-1">
                                <div className={cn("absolute left-[15px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-base-100", item.color)} />
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                                <span className="text-xs text-slate-400">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
