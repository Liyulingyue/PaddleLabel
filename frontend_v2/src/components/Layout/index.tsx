import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { useUserStore } from '@/stores/userStore';
import { FormattedMessage } from 'react-intl';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <FormattedMessage id="welcome.projects" /> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529', padding: '0 24px' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>PaddleLabel</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
            <FormattedMessage id="welcome.createProject" />
          </Button>
          {user && (
            <Button onClick={logout}>Logout</Button>
          )}
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content style={{ marginTop: 24 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
