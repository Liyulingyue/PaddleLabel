import React from 'react';
import PPLabelList from '@/components/PPLabelPage/PPLabelList';
import PPAnnotationList from '@/components/PPLabelPage/PPAnnotationList';
import { message } from 'antd';
import serviceUtils from '@/services/serviceUtils';
import type { Annotation } from '@/models/Annotation';

interface SidebarProps {
  label: any;
  annotation: any;
  setCurrentAnnotation: (anno?: Annotation) => void;
  onHideLabel: (change: boolean, id: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ label, annotation, setCurrentAnnotation, onHideLabel }) => {
  return (
    <div className="rightSideBar">
      <PPLabelList
        labels={label.all}
        activeIds={label.activeIds}
        onLabelSelect={label.onSelect}
        onLabelDelete={label.remove}
        disabled={false}
        onLabelAdd={(lab) => {
          const projectIdStr = serviceUtils.getQueryVariable('projectId');
          const projectId = projectIdStr ? parseInt(projectIdStr, 10) : undefined;
          if (!projectId) {
            message.error('无法获取项目ID');
            return;
          }
          label.create({ ...lab, projectId: projectId }).then((newLabel) => {
            setCurrentAnnotation(undefined);
            label.setCurr(newLabel);
          });
        }}
        onHideLabel={onHideLabel}
      />
      <PPAnnotationList
        disabled={false}
        type={'Detection'}
        currAnnotation={annotation.curr}
        annotations={annotation.all}
        onAnnotationSelect={(selectedAnno) => {
          if (!selectedAnno?.delete) setCurrentAnnotation(selectedAnno);
          // 保持原有行为
          const items = annotation.all;
          const id = selectedAnno.annotationId;
          const item = items.find((i) => i.annotationId === id);
          if (item) {
            const index = items.indexOf(item);
            items.splice(index, 1);
            items.push(item);
            annotation.setAll(items);
          }
        }}
        onAnnotationAdd={() => {
          setCurrentAnnotation(undefined);
        }}
        onAnnotationModify={() => {}}
        onAnnotationDelete={(anno: Annotation) => {
          annotation.setAll(annotation.all.filter((x) => x.frontendId != anno.frontendId));
          setCurrentAnnotation(undefined);
          annotation.remove(anno);
        }}
      />
    </div>
  );
};

export default Sidebar;
