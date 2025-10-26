import React from 'react';
import { message } from 'antd';
import PPToolBar from '@/components/PPLabelPage/PPToolBar';
import PPToolBarButton from '@/components/PPLabelPage/PPToolBarButton';

interface ToolBarProps {
  tool: any;
  scale: any;
  annotation: any;
  data: any;
  label: any;
  annHistory: any;
  tbIntl: (key: string) => string;
  setCurrentAnnotation: (anno?: any) => void;
  setPreTools: (tool: string) => void;
  setInteractorData: (data: any) => void;
  setflags: (flag: boolean) => void;
  serviceUtils: any;
  project: any;
  onClearAllAnnotations: () => Promise<void>;
}

const ToolBar: React.FC<ToolBarProps> = ({
  tool,
  scale,
  annotation,
  data,
  label,
  annHistory,
  tbIntl,
  setCurrentAnnotation,
  setPreTools,
  setInteractorData,
  setflags,
  serviceUtils,
  project,
  onClearAllAnnotations,
}) => {
  return (
    <PPToolBar>
      <PPToolBarButton
        imgSrc="./pics/buttons/rectangle.png"
        active={tool.curr == 'rectangle'}
        onClick={() => {
          if (!label.curr) {
            message.error(tbIntl('chooseCategoryFirst'));
            return;
          }
          tool.setCurr('rectangle');
          setPreTools('rectangle');
          setCurrentAnnotation(undefined);
        }}
      >
        {tbIntl('rectangle')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/zoom_in.png"
        onClick={() => {
          scale.change(0.1);
        }}
      >
        {tbIntl('zoomIn')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/zoom_out.png"
        onClick={() => {
          scale.change(-0.1);
        }}
      >
        {tbIntl('zoomOut')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/save.png"
        onClick={() => {
          annotation.pushToBackend(data.curr?.dataId);
        }}
      >
        {tbIntl('save')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/move.png"
        active={tool.curr == 'mover'}
        onClick={() => {
          tool.setCurr('mover');
          setPreTools('mover');
        }}
      >
        {tbIntl('move')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/prev.png"
        onClick={() => {
          annHistory.backward().then((res: any) => {
            if (res) {
              annotation.setAll(res.annos);
              setCurrentAnnotation(res.currAnno);
              annotation.pushToBackend(data.curr?.dataId, res.annos);
            }
          });
        }}
      >
        {tbIntl('unDo')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/next.png"
        onClick={() => {
          annHistory.forward().then((res: any) => {
            if (res) {
              annotation.pushToBackend(data.curr?.dataId, res.annos);
              setCurrentAnnotation(res.currAnno);
            }
          });
        }}
      >
        {tbIntl('reDo')}
      </PPToolBarButton>
      <PPToolBarButton
        imgSrc="./pics/buttons/clear_mark.png"
        onClick={() => {
          annotation.clear();
          annHistory.record({ annos: [] });
          tool.setCurr(undefined);
          setPreTools('');
          label.setCurr(undefined);
        }}
      >
        {tbIntl('clearMark')}
      </PPToolBarButton>
      {/* 清空全部标注按钮 */}
      <PPToolBarButton
        imgSrc="./pics/buttons/clear_mark.png"
        onClick={onClearAllAnnotations}
      >
        清空全部标注
      </PPToolBarButton>
    </PPToolBar>
  );
};

export default ToolBar;
