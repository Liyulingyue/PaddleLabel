import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Progress, Popconfirm, Spin, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useProjectStore } from '@/stores/projectStore';
import { getProjectProgress } from '@/api/project';
import type { Project } from '@/types';

const TASK_TYPE_NAMES: Record<number, string> = {
  1: 'classification',
  2: 'detection',
  3: 'semantic_segmentation',
  4: 'instance_segmentation',
  5: 'ocr',
  8: 'point',
};

export default function Welcome() {
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, removeProject } = useProjectStore();
  const [progress, setProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const fetchProgress = async () => {
      const prog: Record<number, number> = {};
      for (const p of projects) {
        try {
          const res = await getProjectProgress(p.project_id);
          const pct = res.total > 0 ? Math.round((res.finished / res.total) * 100) : 0;
          prog[p.project_id] = pct;
        } catch {
          prog[p.project_id] = 0;
        }
      }
      setProgress(prog);
    };
    if (projects.length > 0) {
      fetchProgress();
    }
  }, [projects]);

  const handleDelete = async (id: number) => {
    await removeProject(id);
  };

  const getLabelingPath = (project: Project) => {
    const typeMap: Record<number, string> = {
      1: 'classification',
      2: 'detection',
      3: 'semantic_segmentation',
      4: 'instance_segmentation',
      5: 'ocr',
      8: 'point',
    };
    const type = typeMap[project.task_category_id] || 'detection';
    return `/project/${project.project_id}/label/${type}`;
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2><FormattedMessage id="welcome.projects" /></h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/project/create')}>
          <FormattedMessage id="welcome.createProject" />
        </Button>
      </div>

      {projects.length === 0 ? (
        <Empty description={<FormattedMessage id="welcome.noProjects" />}>
          <Button type="primary" onClick={() => navigate('/project/create')}>
            <FormattedMessage id="welcome.createProject" />
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} md={8} lg={6} key={project.project_id}>
              <Card
                title={project.name}
                extra={
                  <Popconfirm
                    title={<FormattedMessage id="welcome.confirmDelete" />}
                    onConfirm={() => handleDelete(project.project_id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>
                }
                actions={[
                  <Button
                    key="label"
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => navigate(getLabelingPath(project))}
                  >
                    <FormattedMessage id="project.startLabeling" />
                  </Button>,
                ]}
              >
                <p style={{ color: '#666', fontSize: 12 }}>{project.description || 'No description'}</p>
                <Tag color="blue"><FormattedMessage id={`taskTypes.${TASK_TYPE_NAMES[project.task_category_id] || 'detection'}`} /></Tag>
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    <FormattedMessage id="project.progress" />: {progress[project.project_id] || 0}%
                  </span>
                  <Progress
                    percent={progress[project.project_id] || 0}
                    size="small"
                    showInfo={false}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
