import { useLabelStore } from '@/stores/labelStore';
import { List, Tag, Button, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import type { Label } from '@/types';

interface Props {
  projectId: number;
}

export default function LabelList({ projectId }: Props) {
  const { labels, selectedLabel, selectLabel, createLabel, removeLabel } = useLabelStore();

  const handleAdd = async () => {
    const colors = ['#ff4d4f', '#52c41a', '#1890ff', '#faad14', '#722ed1', '#eb2f96'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const name = `Label ${labels.length + 1}`;
    await createLabel(projectId, { name, color: randomColor });
  };

  const handleDelete = async (label: Label) => {
    const id = label.label_id || label.id;
    if (id) {
      await removeLabel(projectId, id);
    }
  };

  return (
    <div className="label-list">
      <div className="label-list-header">
        <span><FormattedMessage id="project.labels" /></span>
        <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleAdd} />
      </div>
      <List
        size="small"
        dataSource={labels}
        renderItem={(label) => (
          <List.Item
            className={selectedLabel?.label_id === label.label_id || selectedLabel?.id === label.id ? 'selected' : ''}
            onClick={() => selectLabel(label)}
            actions={[
              <Popconfirm
                key="delete"
                title="Delete this label?"
                onConfirm={() => handleDelete(label)}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ]}
          >
            <Tag color={label.color}>{label.name}</Tag>
          </List.Item>
        )}
      />
    </div>
  );
}
