import { useEffect, useState, useCallback } from 'react';
import { Spin, message, Button, Modal, Input, ColorPicker, Popconfirm, List, Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PPStage from '@/components/PPStage';
import { ProjectApi, TaskApi, DataApi, LabelApi } from '@/services/api';
import type { Annotation, Label, Task, Data, Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import PPToolBarButton from '@/components/PPToolBarButton';

const BTN = '/pics/buttons/';

export default function Classification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDatas, setAllDatas] = useState<Data[]>([]);
  const [currIdx, setCurrIdx] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [activeLabels, setActiveLabels] = useState<Set<number>>(new Set());
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1890ff');
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const projectId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('projectId') ?? '';

  const currentData = allDatas[currIdx];
  const imgSrc = currentData?.dataId
    ? `/api/datas/${currentData.dataId}/image?sault=${currentData.sault}`
    : '';

  const isSingleClass = project?.otherSettings?.clasSubCatg === 'singleClass';

  useEffect(() => {
    if (!projectId) return;
    const pid = Number(projectId);
    setLoading(true);
    ProjectApi.get(pid).then(setProject);
    ProjectApi.getTasks(pid).then((taskList) => {
      setTasks(taskList);
      if (taskList.length > 0) {
        TaskApi.getDatas(taskList[0].taskId!).then((datas) => {
          const datasWithTaskId = datas.map((d: Data) => ({ ...d, taskId: taskList[0].taskId }));
          setAllDatas(datasWithTaskId);
        });
      }
    });
    ProjectApi.getLabels(pid).then(setLabels).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (currentData?.dataId) {
      DataApi.getAnnotations(currentData.dataId).then((anns) => {
        setAnnotations(anns);
        setActiveLabels(new Set(anns.map(a => a.labelId).filter((id): id is number => id !== undefined)));
      });
    }
  }, [currIdx, currentData]);

  const saveAnnotations = useCallback(async () => {
    if (!currentData?.dataId || saving) return;
    setSaving(true);
    try {
      const annsToSave: Partial<Annotation>[] = [...activeLabels].map(labelId => ({
        dataId: currentData.dataId,
        labelId,
      }));
      const saved = await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
      if (saved) {
        setAnnotations(saved);
      }
      message.success(t('pages.toolBar.autoSave'));
    } catch (err) {
      console.error('Save failed:', err);
      message.error(t('pages.detection.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [currentData?.dataId, activeLabels, saving, t]);

  const toggleLabel = useCallback(async (label: Label) => {
    if (!currentData?.dataId) return;
    const lid = label.labelId!;
    const newActive = new Set(activeLabels);

    if (activeLabels.has(lid)) {
      newActive.delete(lid);
    } else {
      if (isSingleClass) {
        newActive.clear();
      }
      newActive.add(lid);
    }
    setActiveLabels(newActive);

    try {
      const annsToSave = [...newActive].map(labelId => ({
        dataId: currentData.dataId,
        labelId,
      }));
      const saved = await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
      if (saved) {
        setAnnotations(saved);
        setActiveLabels(new Set(saved.map((a: Annotation) => a.labelId).filter((id: number | undefined): id is number => id !== undefined)));
      }
      message.success(t('pages.toolBar.autoSave'));
    } catch (err) {
      console.error('Toggle label failed:', err);
      setActiveLabels(activeLabels);
    }
  }, [currentData?.dataId, activeLabels, isSingleClass, t]);

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      message.error(t('component.PPAddLabelModal.requiresLabelName'));
      return;
    }
    try {
      const created = await LabelApi.create([{ name: newLabelName.trim(), color: newLabelColor }], Number(projectId));
      setLabels(prev => [...prev, ...created]);
      setAddLabelModalOpen(false);
      setNewLabelName('');
      setNewLabelColor('#1890ff');
    } catch {
      message.error('Failed to add label');
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    try {
      await LabelApi.remove(labelId);
      setLabels(prev => prev.filter(l => l.labelId !== labelId));
      setActiveLabels(prev => { const n = new Set(prev); n.delete(labelId); return n; });
    } catch {
      message.error('Failed to delete label');
    }
  };

  const handleDeleteAnnotation = async (annotationId: number) => {
    if (!currentData?.dataId) return;
    const remaining = annotations.filter(a => a.annotationId !== annotationId);
    const annsToSave = [...remaining].map(a => ({
      dataId: currentData.dataId,
      labelId: a.labelId!,
    }));
    await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
    setAnnotations(remaining);
    setActiveLabels(new Set(remaining.map(a => a.labelId).filter((id): id is number => id !== undefined)));
  };

  const handlePrev = useCallback(() => {
    if (currIdx > 0) {
      setCurrIdx(currIdx - 1);
    }
  }, [currIdx]);

  const handleNext = useCallback(() => {
    if (currIdx < allDatas.length - 1) {
      setCurrIdx(currIdx + 1);
    }
  }, [currIdx, allDatas.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'g' || e.key === 'G') handleNext();
      else if (e.key === 'f' || e.key === 'F') handlePrev();
      else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveAnnotations(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlePrev, handleNext, saveAnnotations]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <Spin size="large" />
      </div>
    );
  }

  const finished = activeLabels.size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Breadcrumb
        style={{ marginBottom: 12, flexShrink: 0 }}
        items={[
          { title: <HomeOutlined onClick={() => navigate('/')} style={{ cursor: 'pointer' }} /> },
          { title: <span onClick={() => navigate(`/project_overview?projectId=${projectId}`)} style={{ cursor: 'pointer' }}>{t('pages.toolBar.projectOverview')}</span> },
          { title: t('global.classification') },
        ]}
      />
      <div className="labelPageContainer">
      {/* Left Toolbar */}
      <div className="toolbarLeft">
        <PPToolBarButton imgSrc={`${BTN}zoom_in.png`} onClick={() => setScale(s => Math.min(10, s + 0.1))}>
          {t('pages.toolBar.zoomIn')}
        </PPToolBarButton>
        <PPToolBarButton imgSrc={`${BTN}zoom_out.png`} onClick={() => setScale(s => Math.max(0.1, s - 0.1))}>
          {t('pages.toolBar.zoomOut')}
        </PPToolBarButton>
        <PPToolBarButton imgSrc={`${BTN}save.png`} onClick={saveAnnotations} disabled={saving}>
          {t('pages.toolBar.save')}
        </PPToolBarButton>
        <PPToolBarButton imgSrc={`${BTN}move.png`} active>
          {t('pages.toolBar.move')}
        </PPToolBarButton>
        <PPToolBarButton imgSrc={`${BTN}clear_mark.png`} onClick={() => {
          setActiveLabels(new Set());
          setAnnotations([]);
        }}>
          {t('pages.toolBar.clearMark')}
        </PPToolBarButton>
      </div>

      {/* Main Stage */}
      <div id="dr" className="mainStage">
        <Spin spinning={false}>
          <div className="draw">
            <PPStage
              scale={scale}
              scaleChange={setScale}
              taskIndex={currIdx}
              currentTool="mover"
              imgSrc={imgSrc}
              annotations={annotations}
              setCurrentAnnotation={() => {}}
              onAnnotationAdd={() => {}}
              onAnnotationModify={() => {}}
            />
          </div>
          <div className="pblock">
            <div className="preButton" onClick={handlePrev}>
              {t('pages.toolBar.prevTask')}
            </div>
            <div className="progress">
              <div className="progressBar" style={{ width: '15rem' }}>
                <div
                  style={{
                    width: `${allDatas.length > 0 ? (finished / allDatas.length) * 100 : 0}%`,
                    height: 8,
                    background: '#1890ff',
                    borderRadius: 4,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <span className="progressDesc">
                {finished || 0}/{allDatas.length} | {currIdx + 1}/{allDatas.length}
              </span>
            </div>
            <div className="nextButton" onClick={handleNext}>
              {t('pages.toolBar.nextTask')}
            </div>
          </div>
        </Spin>
      </div>

      {/* Right Sidebar */}
      <div className="rightSideBar">
        {/* 上半部分：可选类别 + 添加类别 */}
        <div className="rightSidebarSection" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '4px solid #ddd' }}>
          <div className="labelListHeader" style={{ paddingLeft: '1.25rem', height: '2.188rem', lineHeight: '2.188rem', backgroundColor: '#e8eced', fontSize: '0.875rem', fontWeight: 500 }}>
            {t('component.PPLabelList.labelList')}
          </div>
          <List
            className="labelList"
            size="large"
            style={{ flex: 1, minHeight: 0 }}
            footer={
              <Button
                style={{ height: 40, fontSize: '0.75rem', width: '100%' }}
                type="primary"
                onClick={() => setAddLabelModalOpen(true)}
                block
              >
                {t('component.PPLabelList.addLabel')}
              </Button>
            }
            bordered={false}
            dataSource={labels}
            locale={{ emptyText: t('pages.detection.noLabels') }}
            renderItem={(item: Label) => {
              const isActive = activeLabels.has(item.labelId!);
              return (
                <List.Item
                  className="annotationListItem"
                  style={{
                    background: isActive ? '#e6f7ff' : undefined,
                    borderLeft: `4px solid ${item.color}`,
                    padding: '0.5rem 0.813rem',
                  }}
                  onClick={() => toggleLabel(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        flexShrink: 0,
                        marginRight: 8,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: '0.75rem' }}>{item.name}</span>
                    <Popconfirm
                      title={`${t('global.ok')}?`}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteLabel(item.labelId!);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText={t('global.ok')}
                      cancelText={t('global.cancel')}
                    >
                      <Button size="small" type="text" danger onClick={(e) => e.stopPropagation()}>
                        ×
                      </Button>
                    </Popconfirm>
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
        {/* 下半部分：标注结果 */}
        <div className="rightSidebarSection" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="labelListHeader" style={{ paddingLeft: '1.25rem', height: '2.188rem', lineHeight: '2.188rem', backgroundColor: '#e8eced', fontSize: '0.875rem', fontWeight: 500 }}>
            {t('component.PPAnnotationList.annotationResult')}
          </div>
          <List
            className="annotationList"
            size="large"
            style={{ flex: 1, minHeight: 0 }}
            bordered={false}
            dataSource={annotations}
            locale={{ emptyText: t('pages.detection.noAnnotations') }}
            renderItem={(item: Annotation) => (
              <List.Item
                className="annotationListItem"
                style={{ padding: '0.5rem 0.813rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: item.label?.color || '#ccc',
                      flexShrink: 0,
                      marginRight: 8,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: '0.75rem' }}>
                    {item.label?.name || `Label ${item.labelId}`}
                  </span>
                  <Popconfirm
                    title={`${t('global.ok')}?`}
                    onConfirm={() => {
                      handleDeleteAnnotation(item.annotationId!);
                    }}
                    okText={t('global.ok')}
                    cancelText={t('global.cancel')}
                  >
                    <Button size="small" type="text" danger>
                      ×
                    </Button>
                  </Popconfirm>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>

      {/* Add Label Modal */}
      <Modal
        title={t('component.PPAddLabelModal.addLabel')}
        open={addLabelModalOpen}
        onOk={handleAddLabel}
        onCancel={() => setAddLabelModalOpen(false)}
        okText={t('global.ok')}
        cancelText={t('global.cancel')}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>{t('component.PPAddLabelModal.labelName')}</label>
          <Input
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            placeholder={t('component.PPAddLabelModal.requiresLabelName')}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>{t('component.PPAddLabelModal.selectColor')}</label>
          <ColorPicker value={newLabelColor} onChange={c => setNewLabelColor(c.toHexString())} showText />
        </div>
      </Modal>
    </div>
    </div>
  );
}
