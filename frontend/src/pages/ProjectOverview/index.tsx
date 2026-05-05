import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Button, message, Card } from 'antd';
import { ProjectApi, TaskApi } from '@/services/api';
import type { Task, Project } from '@/services/types';
import ImportModal from '@/components/Modals/ImportModal';
import ExportModal from '@/components/Modals/ExportModal';
import SplitDatasetModal from '@/components/Modals/SplitDatasetModal';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from 'react-i18next';

const SET_NAMES: Record<number, string> = {
  0: 'train',
  1: 'val',
  2: 'test',
};

export default function ProjectOverview() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [updateTable, setUpdateTable] = useState(0);

  useEffect(() => {
    if (!projectId) {
      message.error(t('pages.projectOverview.noValidProjectId'));
      navigate('/');
      return;
    }
    const pid = Number(projectId);
    ProjectApi.get(pid).then(setProject).catch(() => navigate('/'));
    ProjectApi.getTasks(pid).then(setTasks);
  }, [projectId, t, navigate]);

  if (!projectId) return null;

  const taskCategoryName = project?.taskCategory?.name || 'classification';
  const hasTasks = tasks.length > 0;
  const isDetection = taskCategoryName === 'detection';
  const isClassification = taskCategoryName === 'classification';
  const isOCR = taskCategoryName === 'optical_character_recognition';

  const reloadTasks = () => {
    ProjectApi.getTasks(Number(projectId)).then(setTasks);
    setUpdateTable(prev => prev + 1);
  };

  const columns = [
    {
      title: t('pages.projectOverview.id'),
      dataIndex: 'taskId',
      key: 'taskId',
      width: '25%',
      align: 'center' as const,
    },
    {
      title: t('pages.projectOverview.annotationCount'),
      dataIndex: 'annotationCount',
      key: 'taskId',
      width: '25%',
      align: 'center' as const,
    },
    {
      title: t('pages.projectOverview.split'),
      dataIndex: 'set',
      key: 'split',
      width: '25%',
      align: 'center' as const,
      render: (setIdx: number) => SET_NAMES[setIdx] || setIdx,
    },
    {
      dataIndex: 'taskId',
      key: 'actions',
      align: 'center' as const,
      render: (taskId: number) => (
        <Button
          type="primary"
          onClick={() => {
            localStorage.setItem('currTaskId', String(taskId));
            navigate(`/${taskCategoryName}?projectId=${projectId}`);
          }}
        >
          {t('pages.welcome.label')}
        </Button>
      ),
    },
  ];

  const headerActions = (
    <>
      <Button
        type="primary"
        onClick={() => navigate(`/${taskCategoryName}?projectId=${projectId}`)}
        disabled={!hasTasks}
      >
        {t('pages.welcome.label')}
      </Button>
      <Button
        onClick={() => navigate(`/project/create?projectId=${projectId}`)}
      >
        {t('pages.projectOverview.projectSettings')}
      </Button>
      <SplitDatasetModal projectId={Number(projectId)} visible={hasTasks} onFinish={reloadTasks} />
      <ExportModal project={project} visible={hasTasks} />
      <ImportModal project={project} visible={hasTasks} onFinish={reloadTasks} />
      {(isDetection || isClassification || isOCR) && (
        <Button
          onClick={() => {
            const path = isOCR ? '/project_ocr_ai' : '/project_ai';
            navigate(`${path}?projectId=${projectId}`);
          }}
        >
          {t('pages.projectOverview.autoInferenceSettings')}
        </Button>
      )}
    </>
  );

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <PageHeader projectId={projectId} actions={headerActions} showBack={false} />
      
      <Card title={`${t('pages.projectOverview.tasks')} (${tasks.length})`}>
        {!hasTasks ? (
          <ImportModal project={project} onFinish={reloadTasks} />
        ) : (
          <span key={updateTable}>
            <Table
              columns={columns}
              dataSource={[...tasks]}
              rowKey="taskId"
              pagination={false}
            />
          </span>
        )}
      </Card>
    </div>
  );
}
