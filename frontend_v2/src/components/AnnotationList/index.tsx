import { List, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useLabelStore } from '@/stores/labelStore';

interface Props {
  projectId: number;
  dataId: number;
}

export default function AnnotationList({ projectId, dataId }: Props) {
  const { annotations } = useAnnotationStore();
  const { labels } = useLabelStore();

  const getLabelName = (labelId: number) => {
    const label = labels.find(l => (l.label_id || l.id) === labelId);
    return label?.name || 'Unknown';
  };

  const getLabelColor = (labelId: number) => {
    const label = labels.find(l => (l.label_id || l.id) === labelId);
    return label?.color || '#000';
  };

  return (
    <div className="annotation-list">
      <div className="annotation-list-header">
        <span><FormattedMessage id="project.tasks" /></span>
        <span>{annotations.length}</span>
      </div>
      {annotations.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
          <FormattedMessage id="annotation.noAnnotations" />
        </div>
      ) : (
        <List
          size="small"
          dataSource={annotations}
          renderItem={(annotation, index) => (
            <List.Item
              key={annotation.frontend_id}
              style={{ borderLeft: `3px solid ${getLabelColor(annotation.label_id)}` }}
              extra={
                <Popconfirm
                  title="Delete annotation?"
                  onConfirm={() => {
                    if (annotation.annotation_id) {
                      useAnnotationStore.getState().deleteAnnotation(dataId, annotation.annotation_id);
                    } else {
                      useAnnotationStore.getState().removeAnnotation(annotation.frontend_id);
                    }
                  }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              }
            >
              <List.Item.Meta
                title={`${index + 1}. ${getLabelName(annotation.label_id)}`}
                description={annotation.type}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
