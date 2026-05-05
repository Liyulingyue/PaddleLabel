import { List, Button, Spin } from 'antd';
import type { Annotation } from '@/services/types';
import { ColorBall } from '@/components/ColorBall';
import { useTranslation } from 'react-i18next';

interface Props {
  annotations: Annotation[];
  currAnnotation?: Annotation;
  currAnnotations?: Annotation;
  onAnnotationModify: (annotation: Annotation) => void;
  onAnnotationDelete: (annotation: Annotation) => void;
  onAnnotationAdd?: () => void;
  onAnnotationSelect: (annotation: Annotation | undefined) => void;
  disabled?: boolean;
  type?: string;
}

export default function AnnotationList({ annotations, currAnnotation, currAnnotations, onAnnotationModify, onAnnotationDelete, onAnnotationAdd, onAnnotationSelect, disabled, type }: Props) {
  const { t } = useTranslation();
  const added = new Set<number>();
  const labelId = new Map<number, Annotation>();
  const items: Annotation[] = [];

  if (type === 'semantic_segmentation' && annotations?.length > 0) {
    for (const anno of annotations) {
      if (added.has(anno.frontendId!)) continue;
      if (anno.type === 'rubber') continue;
      if (labelId.has(anno.labelId!)) {
        const old = labelId.get(anno.labelId!)!;
        if (old.frontendId! < anno.frontendId!) {
          labelId.set(anno.labelId!, anno);
        }
      } else {
        labelId.set(anno.labelId!, anno);
      }
      added.add(anno.frontendId!);
    }
    labelId.forEach((anno) => items.push(anno));
  } else {
    if (annotations) {
      for (const anno of annotations) {
        if (added.has(anno.frontendId!)) continue;
        items.push(anno);
        added.add(anno.frontendId!);
      }
    }
  }

  const displayItems = type === 'Detection' ? items.sort((a, b) => (a.annotationId || 0) - (b.annotationId || 0)) : items;

  return (
    <Spin spinning={disabled}>
      <List
        size="large"
        header={<div>{t('component.PPAnnotationList.annotationList')}</div>}
        bordered
        dataSource={displayItems}
        renderItem={(item) => (
          <List.Item
            style={{
              cursor: disabled ? 'default' : 'pointer',
              background: (currAnnotations ? item.frontendId == currAnnotations.frontendId : item.frontendId == currAnnotation?.frontendId) ? '#e6f7ff' : 'transparent',
            }}
            onClick={() => !disabled && onAnnotationSelect(item)}
          >
            <span>{item.label?.name || `${t('pages.detection.label_')} ${item.labelId}`}</span>
            {item.label?.color && <ColorBall color={item.label.color} />}
            <Button
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationDelete(item);
              }}
              style={{ marginLeft: 8 }}
            >{t('component.PPAnnotationList.delete')}</Button>
          </List.Item>
        )}
        footer={onAnnotationAdd ? (
          <div>
            <Button type="primary" block onClick={onAnnotationAdd}>{t('component.PPAnnotationList.addAnnotation')}</Button>
          </div>
        ) : <div />}
      />
    </Spin>
  );
}
