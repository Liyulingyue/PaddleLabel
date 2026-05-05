import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Space, Spin, Table, message, Card } from 'antd';
import {
  AppstoreOutlined,
  CameraOutlined,
  ScanOutlined,
  FileTextOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { ProjectApi, ManageApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import './Welcome.css';

const TASK_CATEGORIES = [
  {
    key: 'classification',
    labelKey: 'global.classification',
    avatar: '/pics/classification.jpg',
    id: 1,
    icon: <AppstoreOutlined />,
    color: '#722ed1',
    desc: 'Categorize images into classes',
  },
  {
    key: 'detection',
    labelKey: 'global.detection',
    avatar: '/pics/object_detection.jpg',
    id: 2,
    icon: <AimOutlined />,
    color: '#fa8c16',
    desc: 'Locate and identify objects',
  },
  {
    key: 'semanticSegmentation',
    labelKey: 'global.semanticSegmentation',
    avatar: '/pics/semantic_segmentation.jpg',
    id: 3,
    icon: <ScanOutlined />,
    color: '#1890ff',
    desc: 'Pixel-level segmentation',
  },
  {
    key: 'instanceSegmentation',
    labelKey: 'global.instanceSegmentation',
    avatar: '/pics/instance_segmentation.jpg',
    id: 4,
    icon: <ScanOutlined />,
    color: '#52c41a',
    desc: 'Instance-level segmentation',
  },
  {
    key: 'opticalCharacterRecognition',
    labelKey: 'global.opticalCharacterRecognition',
    avatar: '/pics/ocr.png',
    id: 7,
    icon: <FileTextOutlined />,
    color: '#f5222d',
    desc: 'Extract text from images',
  },
];

const snake2camel = (name: string) => {
  if (!name) return name;
  return name.toLowerCase().replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
};

interface ProjectsTableProps {
  onDeleting: boolean;
  setDeleting: (v: boolean) => void;
}

function ProjectsTable({ onDeleting, setDeleting }: ProjectsTableProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    ProjectApi.getAll().then(setProjects).catch(() => message.error(t('pages.welcome.loadingProjectsError')));
  }, [t]);

  const handleRemove = (projectId: number) => {
    setDeleting(true);
    ProjectApi.remove(projectId)
      .then(() => setProjects(prev => prev.filter(p => p.projectId !== projectId)))
      .finally(() => setDeleting(false));
  };

  const columns = [
    {
      title: t('pages.welcome.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#1a1a2e' }}>{text}</span>,
    },
    {
      title: t('pages.welcome.projectCategory'),
      key: 'category',
      render: (_: any, project: Project) => {
        const catName = project.taskCategory?.name || '';
        return t('global.' + snake2camel(catName));
      },
    },
    {
      title: t('pages.welcome.actions'),
      key: 'actions',
      align: 'right' as const,
      render: (_: any, project: Project) => (
        <Space size="middle">
          <Button
            style={{ background: 'rgba(241,162,0,1)', color: 'white', border: 'none' }}
            onClick={() => navigate(`/project_overview?projectId=${project.projectId}`)}
          >
            {t('pages.welcome.overview')}
          </Button>
          <Button
            style={{ background: 'rgba(0,100,248,1)', color: 'white', border: 'none' }}
            onClick={() => {
              const catName = project.taskCategory?.name || 'classification';
              navigate(`/${catName}?projectId=${project.projectId}`);
            }}
          >
            {t('pages.welcome.label')}
          </Button>
          <Button
            style={{ background: 'rgba(207,63,0,1)', color: 'white', border: 'none' }}
            onClick={() => handleRemove(project.projectId!)}
          >
            {t('pages.welcome.remove')}
          </Button>
        </Space>
      ),
    },
  ];

  if (!projects.length) return null;

  return (
    <Card
      title={<span style={{ fontSize: '1rem', fontWeight: 600 }}>{t('pages.welcome.myProjects')}</span>}
      className="welcome-card"
      styles={{ body: { padding: 0 } }}
    >
      <Table
        columns={columns}
        dataSource={projects}
        rowKey="projectId"
        pagination={false}
        onRow={(record) => ({
          style: { background: '#fff' },
        })}
      />
    </Card>
  );
}

export default function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    ManageApi.getVersion().catch(() => message.error(t('component.BackendUnavailable')));
  }, [t]);

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-card__header">
          <div>
            <h2 className="welcome-card__title">{t('pages.welcome.createProject')}</h2>
            <p className="welcome-card__subtitle">Choose a project type to get started</p>
          </div>
        </div>
        <Row gutter={[16, 16]} className="welcome-card__body">
          {TASK_CATEGORIES.map(cat => (
            <Col xs={24} sm={12} md={8} lg={5} key={cat.key}>
              <div
                className="welcome-type-card"
                onClick={() => navigate(`/project/create?taskCategory=${cat.key}`)}
              >
                <div className="welcome-type-card__img-wrap">
                  <img
                    className="welcome-type-card__img"
                    src={cat.avatar}
                    alt={t(cat.labelKey)}
                  />
                  <div
                    className="welcome-type-card__overlay"
                    style={{ background: `linear-gradient(135deg, ${cat.color}cc 0%, ${cat.color}88 100%)` }}
                  >
                    <div className="welcome-type-card__icon">{cat.icon}</div>
                    <div className="welcome-type-card__name">{t(cat.labelKey)}</div>
                  </div>
                </div>
                <div className="welcome-type-card__desc">{cat.desc}</div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <Spin tip={t('pages.tableList.deleting')} spinning={deleting} style={{ marginTop: 24 }}>
        <ProjectsTable onDeleting={deleting} setDeleting={setDeleting} />
      </Spin>
    </div>
  );
}
