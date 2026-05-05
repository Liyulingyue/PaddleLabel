import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spin, message } from 'antd';
import PageHeader from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import PPStage, { pageRef } from '@/components/PPStage';
import { ProjectApi, TaskApi, DataApi, LabelApi } from '@/services/api';
import type { Annotation, Label, Task, Data } from '@/services/types';
import { useTranslation } from 'react-i18next';
import PPRectangle from '@/components/PPDrawTool/PPRectangle';
import LabelListPanel from '@/components/LabelListPanel';
import AnnotationListPanel from '@/components/AnnotationListPanel';
import ToolBar from '@/components/PageToolBar';
import BottomNav from '@/components/BottomNav';
import AddLabelModal from '@/components/AddLabelModal';
import './index.css';

const BTN = '/pics/buttons/';

export default function Detection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDatas, setAllDatas] = useState<Data[]>([]);
  const [currIdx, setCurrIdx] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<Label | undefined>();
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | undefined>();
  const [currentTool, setCurrentTool] = useState<string>('rectangle');
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [frontendId, setFrontendId] = useState(0);
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1890ff');
  const [saving, setSaving] = useState(false);
  const annotationsRef = useRef<Annotation[]>([]);

  const pageRef = useRef<pageRef>(null);
  const projectId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('projectId') ?? '';

  const currentData = allDatas[currIdx];
  const imgSrc = currentData?.dataId
    ? `/api/datas/${currentData.dataId}/image?sault=${currentData.sault}`
    : '';

  useEffect(() => {
    if (!projectId) return;
    const pid = Number(projectId);
    setLoading(true);
    ProjectApi.getTasks(pid).then((taskList) => {
      setTasks(taskList);
      if (taskList.length > 0) {
        const taskId = taskList[0].taskId!;
        TaskApi.getDatas(taskId).then((datas) => {
          const datasWithTaskId = datas.map(d => ({ ...d, taskId }));
          setAllDatas(datasWithTaskId);
          if (datasWithTaskId.length > 0 && datasWithTaskId[0].dataId) {
            DataApi.getAnnotations(datasWithTaskId[0].dataId!).then(setAnnotations);
          }
        });
      }
    });
    ProjectApi.getLabels(pid).then(setLabels);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (currentData?.dataId) {
      DataApi.getAnnotations(currentData.dataId).then(setAnnotations);
      setSelectedAnnotation(undefined);
    }
  }, [currIdx, currentData?.dataId]);

  const saveAnnotations = async () => {
    if (!currentData?.dataId) {
      console.warn('[Detection] No currentData or dataId, skipping save');
      return;
    }
    setSaving(true);
    try {
      const annsToSave = annotationsRef.current.map(a => ({
        dataId: currentData.dataId,
        labelId: a.labelId!,
        result: a.result || '',
        type: a.type as Annotation['type'],
      }));
      const saved = await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
      if (saved) {
        annotationsRef.current = saved;
        setAnnotations(saved);
      }
      message.success(t('pages.toolBar.saveSuccess'));
    } catch (err: any) {
      console.error('[Detection] Save failed:', err);
      message.error(t('pages.detection.saveFailed') + ': ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const onAnnotationAdd = useCallback((anno: Annotation) => {
    annotationsRef.current = [...annotationsRef.current, anno];
    setAnnotations([...annotationsRef.current]);
    setSelectedAnnotation(anno);
  }, []);

  const onAnnotationModify = useCallback(async (anno: Annotation) => {
    annotationsRef.current = annotationsRef.current.map(a => a.frontendId === anno.frontendId ? anno : a);
    setAnnotations([...annotationsRef.current]);
    if (!currentData?.dataId) return;
    try {
      const annsToSave = annotationsRef.current.map(a => ({
        dataId: currentData.dataId,
        labelId: a.labelId!,
        result: a.result || '',
        type: a.type as Annotation['type'],
      }));
      const saved = await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
      if (saved) {
        annotationsRef.current = saved;
        setAnnotations(saved);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
    setSelectedAnnotation(undefined);
  }, [currentData?.dataId]);

  const onAnnotationDelete = useCallback(async (anno: Annotation) => {
    const remaining = annotationsRef.current.filter(a =>
      a.annotationId !== anno.annotationId || a.frontendId !== anno.frontendId
    );
    annotationsRef.current = remaining;
    setAnnotations(remaining);
    if (!currentData?.dataId) return;
    try {
      const annsToSave = remaining.map(a => ({
        dataId: currentData.dataId,
        labelId: a.labelId!,
        result: a.result || '',
        type: a.type as Annotation['type'],
      }));
      await DataApi.setAnnotations(String(currentData.dataId), annsToSave as Annotation[]);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
    setSelectedAnnotation(undefined);
  }, [currentData?.dataId]);

  const handlePrev = useCallback(() => {
    if (currIdx > 0) {
      saveAnnotations();
      setCurrIdx(currIdx - 1);
    }
  }, [currIdx, annotations, currentData]);

  const handleNext = useCallback(() => {
    if (currIdx < allDatas.length - 1) {
      saveAnnotations();
      setCurrIdx(currIdx + 1);
    }
  }, [currIdx, annotations, currentData, allDatas.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'g' || e.key === 'G') handleNext();
    else if (e.key === 'f' || e.key === 'F') handlePrev();
    else if ((e.key === 'd' || e.key === 'D') && selectedAnnotation) onAnnotationDelete(selectedAnnotation);
    else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveAnnotations(); }
  }, [handlePrev, handleNext, selectedAnnotation, onAnnotationDelete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const drawToolParam = useMemo(() => ({
    dataId: currentData?.dataId,
    currentLabel: selectedLabel,
    scale,
    currentTool: currentTool as any,
    annotations,
    currentAnnotation: selectedAnnotation,
    onAnnotationAdd,
    onAnnotationModify,
    onAnnotationupdata: onAnnotationModify,
    modifyAnnoByFrontendId: onAnnotationModify,
    onMouseUp: () => {},
    onMouseDown: () => {},
    frontendIdOps: { frontendId, setFrontendId },
    pathName: window.location.pathname,
    ChanegeTool: setCurrentTool,
    preTool: '',
    isLabel: '',
  }), [currentData?.dataId, selectedLabel, scale, currentTool, annotations, selectedAnnotation, frontendId, onAnnotationAdd, onAnnotationModify]);

  const drawTool = useMemo(() => ({
    rectangle: PPRectangle(drawToolParam),
    brush: undefined,
    rubber: undefined,
    interactor: undefined,
  }), [drawToolParam]);

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
      if (selectedLabel?.labelId === labelId) setSelectedLabel(undefined);
    } catch {
      message.error('Failed to delete label');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <Spin size="large" />
      </div>
    );
  }

  const finished = allDatas.filter(d =>
    annotations.some(a => a.dataId === d.dataId)
  ).length;

  const leftTools = [
    { key: 'rectangle', imgSrc: 'rectangle.png', label: t('pages.toolBar.rectangle'), active: currentTool === 'rectangle', onClick: () => setCurrentTool('rectangle') },
    { key: 'zoom_in', imgSrc: 'zoom_in.png', label: t('pages.toolBar.zoomIn'), onClick: () => setScale(s => Math.min(10, s + 0.1)) },
    { key: 'zoom_out', imgSrc: 'zoom_out.png', label: t('pages.toolBar.zoomOut'), onClick: () => setScale(s => Math.max(0.1, s - 0.1)) },
    { key: 'save', imgSrc: 'save.png', label: t('pages.toolBar.save'), disabled: saving, onClick: saveAnnotations },
    { key: 'move', imgSrc: 'move.png', label: t('pages.toolBar.move'), active: currentTool === 'mover', onClick: () => setCurrentTool('mover') },
    { key: 'clear_mark', imgSrc: 'clear_mark.png', label: t('pages.toolBar.clearMark'), onClick: () => setAnnotations([]) },
    { key: 'edit', imgSrc: 'edit.png', label: t('pages.toolBar.edit'), active: currentTool === 'editor', onClick: () => setCurrentTool('editor') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <PageHeader projectId={projectId} categoryLabel={t('global.detection')} />
      <div className="labelPageContainer">
        <ToolBar position="left" tools={leftTools} />

        <div id="dr" className="mainStage">
          <Spin spinning={false}>
            <div className="draw">
              <PPStage
                ref={pageRef}
                scale={scale}
                scaleChange={setScale}
                taskIndex={currIdx}
                annotations={annotations}
                currentTool={currentTool as any}
                currentAnnotation={selectedAnnotation}
                currentLabel={selectedLabel}
                labels={labels}
                setCurrentAnnotation={(anno: Annotation | undefined) => setSelectedAnnotation(anno)}
                onAnnotationAdd={onAnnotationAdd}
                onAnnotationModify={onAnnotationModify}
                onAnnotationModifyComplete={() => {}}
                onAnnotationModifyUP={onAnnotationModify}
                drawTool={drawTool as any}
                frontendIdOps={{ frontendId, setFrontendId }}
                imgSrc={imgSrc}
                transparency={100}
                ChanegeTool={(tool: string) => setCurrentTool(tool)}
              />
            </div>
            <BottomNav
              finished={finished}
              total={allDatas.length}
              current={currIdx + 1}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </Spin>
        </div>

        <div className="rightSideBar">
          <LabelListPanel
            labels={labels}
            selectedLabel={selectedLabel}
            onLabelSelect={(label) => { setSelectedLabel(label); setCurrentTool('rectangle'); }}
            onLabelDelete={handleDeleteLabel}
            onAddLabel={() => setAddLabelModalOpen(true)}
          />
          <AnnotationListPanel
            annotations={annotations}
            labels={labels}
            selectedAnnotation={selectedAnnotation}
            onAnnotationSelect={setSelectedAnnotation}
            onAnnotationDelete={onAnnotationDelete}
          />
        </div>

        <AddLabelModal
          open={addLabelModalOpen}
          labelName={newLabelName}
          labelColor={newLabelColor}
          onLabelNameChange={setNewLabelName}
          onLabelColorChange={setNewLabelColor}
          onOk={handleAddLabel}
          onCancel={() => setAddLabelModalOpen(false)}
        />
      </div>
    </div>
  );
}
