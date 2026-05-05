import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Space, Spin, Table, message, Card, Statistic, Empty, Tag, Popconfirm } from 'antd';
import {
  AppstoreOutlined,
  AimOutlined,
  ScanOutlined,
  FileTextOutlined,
  FolderOutlined,
  DeleteOutlined,
  EditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { ProjectApi, ManageApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import './Welcome.css';

const TASK_CATEGORY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  classification: { color: '#722ed1', icon: <AppstoreOutlined /> },
  detection: { color: '#fa8c16', icon: <AimOutlined /> },
  semantic_segmentation: { color: '#1890ff', icon: <ScanOutlined /> },
  instance_segmentation: { color: '#52c41a', icon: <ScanOutlined /> },
  optical_character_recognition: { color: '#eb2f96', icon: <FileTextOutlined /> },
  point: { color: '#fa541c', icon: <AppstoreOutlined /> },
};

const snake2camel = (name: string) => {
  if (!name) return name;
  return name.toLowerCase().replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
};

export default function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    ManageApi.getVersion().catch(() => message.error(t('component.BackendUnavailable')));
    loadProjects();
  }, [t]);

  const loadProjects = () => {
    setLoading(true);
    ProjectApi.getAll()
      .then(setProjects)
      .catch(() => message.error(t('pages.welcome.loadingProjectsError')))
      .finally(() => setLoading(false));
  };

  const handleRemove = (projectId: number) => {
    setDeleting(true);
    ProjectApi.remove(projectId)
      .then(() => setProjects(prev => prev.filter(p => p.projectId !== projectId)))
      .finally(() => setDeleting(false));
  };

  const getCategoryConfig = (catName: string) => {
    const key = catName?.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    return TASK_CATEGORY_CONFIG[key || 'classification'] || TASK_CATEGORY_CONFIG.classification;
  };

  const columns = [
    {
      title: t('pages.welcome.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => {
        const catName = record.taskCategory?.name || '';
        const config = getCategoryConfig(catName);
        return (
          <Space>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.color,
              }}
            >
              {config.icon}
            </div>
            <span style={{ fontWeight: 500, fontSize: 15 }}>{text}</span>
          </Space>
        );
      },
    },
    {
      title: t('pages.welcome.projectCategory'),
      key: 'category',
      render: (_: any, project: Project) => {
        const catName = project.taskCategory?.name || '';
        const config = getCategoryConfig(catName);
        return (
          <Tag color={config.color} style={{ borderRadius: 4 }}>
            {t('global.' + snake2camel(catName))}
          </Tag>
        );
      },
    },
    {
      title: t('pages.welcome.dataDir'),
      dataIndex: 'dataDir',
      key: 'dataDir',
      ellipsis: true,
      render: (text: string) => (
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>
          <FolderOutlined style={{ marginRight: 4 }} />
          {text}
        </span>
      ),
    },
    {
      title: t('pages.welcome.actions'),
      key: 'actions',
      align: 'right' as const,
      width: 280,
      render: (_: any, project: Project) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/project_overview?projectId=${project.projectId}`)}
          >
            {t('pages.welcome.overview')}
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<RightOutlined />}
            onClick={() => {
              const catName = project.taskCategory?.name || 'classification';
              navigate(`/${catName}?projectId=${project.projectId}`);
            }}
          >
            {t('pages.welcome.label')}
          </Button>
          <Popconfirm
            title={t('pages.welcome.confirmDelete')}
            onConfirm={() => handleRemove(project.projectId!)}
            okText={t('global.yes')}
            cancelText={t('global.no')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="welcome-page">
      <Spin spinning={loading}>
        {projects.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card className="welcome-stat-card">
                <Statistic
                  title={t('pages.welcome.totalProjects')}
                  value={projects.length}
                  prefix={<FolderOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="welcome-stat-card">
                <Statistic
                  title={t('pages.welcome.classification')}
                  value={projects.filter(p => p.taskCategory?.name === 'classification').length}
                  prefix={<AppstoreOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="welcome-stat-card">
                <Statistic
                  title={t('pages.welcome.detection')}
                  value={projects.filter(p => p.taskCategory?.name === 'detection').length}
                  prefix={<AimOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="welcome-stat-card">
                <Statistic
                  title={t('pages.welcome.segmentation')}
                  value={projects.filter(p =>
                    p.taskCategory?.name === 'semantic_segmentation' ||
                    p.taskCategory?.name === 'instance_segmentation'
                  ).length}
                  prefix={<ScanOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 600 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Card
          title={
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {t('pages.welcome.myProjects')}
            </span>
          }
          className="welcome-projects-card"
          extra={
            <Button type="primary" onClick={() => navigate('/project/create')}>
              {t('pages.welcome.createProject')}
            </Button>
          }
        >
          <Spin tip={t('pages.tableList.deleting')} spinning={deleting}>
            {projects.length > 0 ? (
              <Table
                columns={columns}
                dataSource={projects}
                rowKey="projectId"
                pagination={false}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('pages.welcome.noProjects')}
                style={{ padding: '40px 0' }}
              >
                <Button type="primary" onClick={() => navigate('/project/create')}>
                  {t('pages.welcome.createFirstProject')}
                </Button>
              </Empty>
            )}
          </Spin>
        </Card>
      </Spin>
    </div>
  );
}
