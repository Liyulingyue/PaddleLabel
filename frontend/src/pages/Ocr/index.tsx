import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Spin, message, Button, Modal, Input, ColorPicker, List, Popconfirm, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import PPStage, { pageRef } from '@/components/PPStage';
import { ProjectApi, TaskApi, DataApi, LabelApi } from '@/services/api';
import type { Annotation, Label, Task, Data } from '@/services/types';
import { useTranslation } from 'react-i18next';
import PPToolBarButton from '@/components/PPToolBarButton';
import PageHeader from '@/components/PageHeader';
import PPRectangle from '@/components/PPDrawTool/PPRectangle';
import PPPolygon from '@/components/PPDrawTool/PPPolygon';
import './index.css';

const BTN = '/pics/buttons/';

export default function Ocr() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDatas, setAllDatas] = useState<Data[]>([]);
  const [currIdx, setCurrIdx] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<Label | undefined>();
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | undefined>();
  const [currentTool, setCurrentTool] = useState<string>('polygon');
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [frontendId, setFrontendId] = useState(0);
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1890ff');
  const [saving, setSaving] = useState(false);

  const pageRef = useRef<pageRef>(null);
  const projectId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('projectId') ?? '';

  const currentData = allDatas[currIdx];
  const imgSrc = currentData?.dataId ? `/api/datas/${currentData.dataId}/image?sault=${currentData.sault}` : '';

  useEffect(() => {
    if (!projectId) return;
    const pid = Number(projectId);
    setLoading(true);
    ProjectApi.getTasks(pid).then((taskList) => {
      setTasks(taskList);
      if (taskList.length > 0) {
        TaskApi.getDatas(taskList[0].taskId!).then((datas) => {
          setAllDatas(datas);
          if (datas.length > 0 && datas[0].dataId) {
            DataApi.getAnnotations(datas[0].dataId).then(setAnnotations);
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
  }, [currIdx, currentData]);

  const saveAnnotations = async () => {
    if (!currentData?.dataId) return;
    setSaving(true);
    try {
      await DataApi.setAnnotations(String(currentData.dataId), annotations);
      message.success(t('pages.toolBar.saveSuccess'));
    } catch {
      message.error(t('pages.detection.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const onAnnotationAdd = useCallback((anno: Annotation) => {
    setAnnotations(prev => [...prev, anno]);
    setSelectedAnnotation(anno);
  }, []);

  const onAnnotationModify = useCallback((anno: Annotation) => {
    setAnnotations(prev => prev.map(a => a.frontendId === anno.frontendId ? anno : a));
  }, []);

  const onAnnotationDelete = useCallback((anno: Annotation) => {
    setAnnotations(prev => prev.filter(a => a.frontendId !== anno.frontendId));
    setSelectedAnnotation(undefined);
  }, []);

  const handlePrev = useCallback(() => {
    if (currIdx > 0) { saveAnnotations(); setCurrIdx(currIdx - 1); }
  }, [currIdx, annotations, currentData]);

  const handleNext = useCallback(() => {
    if (currIdx < allDatas.length - 1) { saveAnnotations(); setCurrIdx(currIdx + 1); }
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
    polygon: PPPolygon(drawToolParam),
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

  const finished = allDatas.filter(d => annotations.some(a => a.dataId === d.dataId)).length;

  const ocrAnnotations = annotations.filter(a => a.type === 'ocr_polygon' || a.type === 'ocr_rectangle');
  const ocrData = ocrAnnotations.map(a => {
    const parts = a.result?.split('||');
    const text = parts?.[1]?.split('|')?.[0] || '';
    return { key: a.frontendId, annotation: a, text };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <PageHeader projectId={projectId} categoryLabel={t('global.opticalCharacterRecognition')} />
      <div className="labelPageContainer">
      {/* Left Toolbar */}
      <div className="toolbarLeft">
        <PPToolBarButton
          imgSrc={`${BTN}polygon.png`}
          active={currentTool === 'polygon'}
          onClick={() => setCurrentTool('polygon')}
        >
          {t('pages.toolBar.polygon')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}rectangle.png`}
          active={currentTool === 'rectangle'}
          onClick={() => setCurrentTool('rectangle')}
        >
          {t('pages.toolBar.rectangle')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}zoom_in.png`}
          onClick={() => setScale(s => Math.min(10, s + 0.1))}
        >
          {t('pages.toolBar.zoomIn')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}zoom_out.png`}
          onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
        >
          {t('pages.toolBar.zoomOut')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}save.png`}
          onClick={saveAnnotations}
          disabled={saving}
        >
          {t('pages.toolBar.save')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}move.png`}
          active={currentTool === 'mover'}
          onClick={() => setCurrentTool('mover')}
        >
          {t('pages.toolBar.move')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc={`${BTN}clear_mark.png`}
          onClick={() => setAnnotations([])}
        >
          {t('pages.toolBar.clearMark')}
        </PPToolBarButton>
      </div>

      {/* Main Stage */}
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
      <div className="rightSideBar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: 16, background: '#1727C2', color: 'white', fontWeight: 'bold' }}>
          {t('pages.detection.ocrResults')}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          <Table
            size="small"
            dataSource={ocrData}
            pagination={{ pageSize: 10, size: 'small' }}
            columns={[
              {
                title: t('pages.detection.text'),
                dataIndex: 'text',
                key: 'text',
                render: (text: string) => <span style={{ fontSize: 12 }}>{text || '-'}</span>,
              },
              {
                title: t('pages.detection.action'),
                key: 'action',
                width: 50,
                render: (_: unknown, r: { annotation: Annotation }) => (
                  <Button size="small" type="text" danger onClick={() => onAnnotationDelete(r.annotation)}>
                    ×
                  </Button>
                ),
              },
            ]}
          />
        </div>

        <List
          className="labelList"
          size="large"
          header={<div className="labelListHeader">{t('component.PPLabelList.labelList')}</div>}
          footer={
            <div className="labelListFooter">
              <Button
                style={{ height: 40, fontSize: '0.75rem', width: '100%' }}
                type="primary"
                onClick={() => setAddLabelModalOpen(true)}
                block
              >
                {t('component.PPLabelList.addLabel')}
              </Button>
            </div>
          }
          bordered
          dataSource={labels}
          locale={{ emptyText: t('pages.detection.noLabels') }}
          renderItem={(item: Label) => (
            <List.Item
              className="annotationListItem"
              style={{
                background: selectedLabel?.labelId === item.labelId ? '#e6f7ff' : undefined,
                borderLeft: `4px solid ${item.color}`,
                padding: '0.5rem 0.813rem',
              }}
              onClick={() => setSelectedLabel(item)}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0, marginRight: 8 }} />
                <span style={{ flex: 1, fontSize: '0.75rem' }}>{item.name}</span>
                <Popconfirm
                  title={`${t('global.ok')}?`}
                  onConfirm={() => handleDeleteLabel(item.labelId!)}
                  okText={t('global.ok')}
                  cancelText={t('global.cancel')}
                >
                  <Button size="small" type="text" danger>×</Button>
                </Popconfirm>
              </div>
            </List.Item>
          )}
        />
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
