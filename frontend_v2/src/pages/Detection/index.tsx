import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Spin, message } from 'antd';
import Toolbar from '@/components/Toolbar';
import LabelList from '@/components/LabelList';
import AnnotationList from '@/components/AnnotationList';
import ImageNav from '@/components/ImageNav';
import PPStage from '@/components/PPStage';
import { useProjectStore } from '@/stores/projectStore';
import { useLabelStore } from '@/stores/labelStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useImage } from '@/hooks/useImage';
import { getProjectTasks } from '@/api/project';
import { getTaskDatas } from '@/api/task';
import type { Task, Data, Annotation } from '@/types';

const { Sider, Content } = Layout;

export default function Detection() {
  const { id } = useParams<{ id: string }>();
  const { fetchProject } = useProjectStore();
  const { fetchLabels } = useLabelStore();
  const { annotations, fetchAnnotations, addAnnotation, updateAnnotation, removeAnnotation, saveAnnotation } = useAnnotationStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [datas, setDatas] = useState<Data[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentData = datas[currentIndex] || null;
  const { image, imageUrl, loading: imageLoading } = useImage(currentData?.data_id || null, currentData?.sault);

  useEffect(() => {
    if (id) {
      const projectId = Number(id);
      fetchProject(projectId);
      fetchLabels(projectId);
      loadTasks(projectId);
    }
  }, [id, fetchProject, fetchLabels]);

  const loadTasks = async (projectId: number) => {
    setLoading(true);
    try {
      const taskList = await getProjectTasks(projectId);
      setTasks(taskList);

      const allDatas: Data[] = [];
      for (const task of taskList) {
        try {
          const taskDatas = await getTaskDatas(task.task_id);
          allDatas.push(...taskDatas);
        } catch {}
      }
      setDatas(allDatas);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (currentData?.data_id) {
      fetchAnnotations(currentData.data_id);
    }
  }, [currentData, fetchAnnotations]);

  const handleAnnotationAdd = useCallback((annotation: Omit<Annotation, 'annotation_id'>) => {
    addAnnotation(annotation);
  }, [addAnnotation]);

  const handleSave = async () => {
    if (!currentData) return;
    try {
      for (const annotation of annotations) {
        await saveAnnotation(currentData.data_id, annotation);
      }
      message.success('Saved');
    } catch {
      message.error('Save failed');
    }
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < datas.length) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <Layout style={{ height: 'calc(100vh - 64px)' }}>
      <Sider width={250} style={{ background: '#fff', overflow: 'auto' }}>
        {id && <LabelList projectId={Number(id)} />}
        {currentData && (
          <AnnotationList projectId={Number(id)} dataId={currentData.data_id} />
        )}
      </Sider>

      <Layout>
        <Toolbar onSave={handleSave} />
        <Content style={{ padding: 0, position: 'relative' }}>
          {imageLoading ? (
            <Spin style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          ) : (
            <PPStage
              image={image}
              imageUrl={imageUrl}
              data={currentData}
              annotations={annotations}
              onAnnotationAdd={handleAnnotationAdd}
              onAnnotationUpdate={updateAnnotation}
              onAnnotationRemove={removeAnnotation}
              onSave={handleSave}
            />
          )}
        </Content>
        <ImageNav datas={datas} currentIndex={currentIndex} onNavigate={handleNavigate} />
      </Layout>
    </Layout>
  );
}
