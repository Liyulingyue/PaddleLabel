import { Outlet, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Button, Dropdown } from 'antd';
import { PlusOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';

const { Header, Content } = AntLayout;

const PROJECT_TYPES = [
  { key: 'classification', label: 'global.classification' },
  { key: 'detection', label: 'global.detection' },
  { key: 'semanticSegmentation', label: 'global.semanticSegmentation' },
  { key: 'instanceSegmentation', label: 'global.instanceSegmentation' },
  { key: 'opticalCharacterRecognition', label: 'global.opticalCharacterRecognition' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const { t, i18n } = useTranslation();

  const langLabel = i18n.language === 'zh' ? '中文' : 'EN';

  const langItems = [
    { key: 'en', label: 'EN' },
    { key: 'zh', label: '中文' },
  ];

  const createItems = PROJECT_TYPES.map(p => ({
    key: p.key,
    label: t(p.label),
  }));

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529', padding: '0 24px' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>
          PaddleLabel
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Dropdown menu={{ items: langItems, onClick: ({ key }) => i18n.changeLanguage(key) }} placement="bottomRight">
            <Button icon={<GlobalOutlined />}>{langLabel}</Button>
          </Dropdown>
          <Dropdown menu={{ items: createItems, onClick: ({ key }) => navigate(`/project/create`) }} placement="bottomRight">
            <Button type="primary" icon={<PlusOutlined />}>
              {t('pages.welcome.createProject')}
            </Button>
          </Dropdown>
          {user && (
            <Button onClick={logout}>{t('component.globalHeader.logout')}</Button>
          )}
        </div>
      </Header>
      <Content style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '0 24px 24px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </Content>
    </AntLayout>
  );
}

