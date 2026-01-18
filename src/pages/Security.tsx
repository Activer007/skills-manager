import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Shield, ShieldCheck, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { useSkills } from '../hooks/useSkills';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

const Security = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: installedSkills = [], refetch } = useSkills();
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(new Date());

  const handleScan = async () => {
    setScanning(true);
    try {
      await refetch();
      setLastScan(new Date());
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const riskCount = installedSkills.filter(s => s.status === 'unsafe').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
             <h2 className="text-2xl font-bold">
               {i18n.language === 'zh' ? '安全中心' : 'Security Center'}
             </h2>
             <p className="text-base-content/60">
               {i18n.language === 'zh'
                 ? '扫描并监控您的 Skills 以发现潜在漏洞'
                 : 'Scan and monitor your Skills for potential vulnerabilities'}
             </p>
        </div>
        <Button
            variant="primary"
            onClick={handleScan}
            disabled={scanning}
            isLoading={scanning}
        >
            {!scanning && <RefreshCw size={18} className="mr-2" />}
            {scanning ? t('scanning') : (i18n.language === 'zh' ? '立即扫描' : 'Scan Now')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardContent className="items-center text-center">
                <ShieldCheck size={48} className="text-success mb-2" />
                <h3 className="text-lg font-bold mb-2">
                  {i18n.language === 'zh' ? '系统状态' : 'System Status'}
                </h3>
                <p className="text-success font-medium text-lg">{t('safe')}</p>
                <p className="text-xs text-base-content/50">
                  {i18n.language === 'zh' ? '上次扫描' : 'Last scan'}: {lastScan?.toLocaleTimeString()}
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="items-center text-center">
                <Shield size={48} className="text-info mb-2" />
                <h3 className="text-lg font-bold mb-2">
                  {i18n.language === 'zh' ? '已扫描 Skills' : 'Scanned Skills'}
                </h3>
                <p className="text-2xl font-bold">{installedSkills.length}</p>
                <p className="text-xs text-base-content/50">
                  {i18n.language === 'zh' ? '总安装数' : 'Total installed'}
                </p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="items-center text-center">
                <ShieldAlert size={48} className="text-warning mb-2" />
                <h3 className="text-lg font-bold mb-2">
                  {i18n.language === 'zh' ? '发现风险' : 'Risks Found'}
                </h3>
                <p className="text-2xl font-bold">{riskCount}</p>
                <p className="text-xs text-base-content/50">
                  {i18n.language === 'zh' ? '需要处理' : 'Needs attention'}
                </p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
            <h3 className="text-lg font-bold mb-4">
              {i18n.language === 'zh' ? '扫描结果' : 'Scan Results'}
            </h3>
            <div className="overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Skill</th>
                            <th>{i18n.language === 'zh' ? '状态' : 'Status'}</th>
                            <th>{i18n.language === 'zh' ? '上次检查' : 'Last Check'}</th>
                            <th>{i18n.language === 'zh' ? '详情' : 'Details'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {installedSkills.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-0">
                                    <EmptyState
                                      variant="minimal"
                                      size="md"
                                      icon={<Shield />}
                                      title={i18n.language === 'zh' ? '暂无 Skills' : 'No Skills Found'}
                                      description={i18n.language === 'zh'
                                        ? '安装或导入 Skills 后，安全中心将自动监控'
                                        : 'Security center will monitor after installing skills'}
                                      action={{
                                        label: i18n.language === 'zh' ? '浏览市场' : 'Browse Marketplace',
                                        onClick: () => navigate('/marketplace'),
                                        variant: 'primary'
                                      }}
                                    />
                                </td>
                            </tr>
                        ) : (
                            installedSkills.map(skill => (
                                <tr key={skill.id}>
                                    <td className="font-medium">{skill.name}</td>
                                    <td>
                                        {skill.status === 'safe' && (
                                            <div className="flex items-center gap-2 text-success">
                                                <CheckCircle size={16} />
                                                <span>{i18n.language === 'zh' ? '通过' : 'Passed'}</span>
                                            </div>
                                        )}
                                        {skill.status === 'unsafe' && (
                                            <div className="flex items-center gap-2 text-error">
                                                <ShieldAlert size={16} />
                                                <span>{i18n.language === 'zh' ? '高风险' : 'High Risk'}</span>
                                            </div>
                                        )}
                                        {skill.status === 'unknown' && (
                                            <div className="flex items-center gap-2 text-warning">
                                                <Shield size={16} />
                                                <span>{i18n.language === 'zh' ? '未验证' : 'Unverified'}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td>{new Date().toLocaleDateString()}</td>
                                    <td>
                                      <Button variant="ghost" size="xs">
                                        {i18n.language === 'zh' ? '查看报告' : 'View Report'}
                                      </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Security;
