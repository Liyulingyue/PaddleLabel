import { List } from 'antd';
import { Button } from 'antd';
import type { Annotation, Label } from '@/services/types';
import { useTranslation } from 'react-i18next';

interface Props {
  annotations: Annotation[];
  labels: Label[];
  selectedAnnotation?: Annotation;
  onAnnotationSelect: (annotation: Annotation) => void;
  onAnnotationDelete: (annotation: Annotation) => void;
  filterType?: string;
}

export default function AnnotationListPanel({
  annotations,
  labels,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  filterType,
}: Props) {
  const { t } = useTranslation();
  const displayAnnotations = filterType ? annotations.filter(a => a.type !== 'rubber') : annotations;
  return (
    <List
      className="annotationList"
      size="large"
      header={<div className="annotationListHeader">{t('component.PPAnnotationList.annotationList')}</div>}
      bordered
      dataSource={displayAnnotations}
      locale={{ emptyText: 'No annotations yet' }}
      renderItem={(item: Annotation) => (
        <List.Item
          className="annotationListItem"
          style={{
            background: selectedAnnotation?.frontendId === item.frontendId ? '#e6f7ff' : undefined,
            padding: '0.5rem 0.813rem',
          }}
          onClick={() => onAnnotationSelect(item)}
        >
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', flex: 1 }}>
              {labels.find(l => l.labelId === item.labelId)?.name || `Label ${item.labelId}`} - {item.type}
            </span>
            <span
              style={{ cursor: 'pointer', color: 'red', fontSize: 16, padding: '0 4px' }}
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationDelete(item);
              }}
            >
              ×
            </span>
          </div>
        </List.Item>
      )}
    />
  );
}
