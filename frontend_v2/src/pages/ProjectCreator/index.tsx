import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Select, Button, ColorPicker, message, List, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useProjectStore } from '@/stores/projectStore';
import { getRandomColor } from '@/utils/color';

interface LabelForm {
  name: string;
  color: string;
}

const TASK_TYPES = [
  { value: 1, label: 'Classification' },
  { value: 2, label: 'Object Detection' },
  { value: 3, label: 'Semantic Segmentation' },
  { value: 5, label: 'OCR' },
  { value: 8, label: 'Point Annotation' },
];

export default function ProjectCreator() {
  const navigate = useNavigate();
  const { createProject } = useProjectStore();
  const [form] = Form.useForm();
  const [labels, setLabels] = useState<LabelForm[]>([]);
  const [loading, setLoading] = useState(false);

  const addLabel = () => {
    setLabels([...labels, { name: `Label ${labels.length + 1}`, color: getRandomColor() }]);
  };

  const removeLabel = (index: number) => {
    setLabels(labels.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, field: 'name' | 'color', value: string) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], [field]: value };
    setLabels(newLabels);
  };

  const handleSubmit = async (values: { name: string; description: string; task_category_id: number; data_dir: string }) => {
    setLoading(true);
    try {
      const project = await createProject({
        name: values.name,
        description: values.description,
        task_category_id: values.task_category_id,
        data_dir: values.data_dir || '',
        labels: labels.map((l, i) => ({ name: l.name, color: l.color })),
      });
      message.success('Project created');
      navigate(`/project/${project.project_id}`);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to create project');
    }
    setLoading(false);
  };

  return (
    <Card title={<FormattedMessage id="projectCreator.title" />}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label={<FormattedMessage id="projectCreator.name" />}
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label={<FormattedMessage id="projectCreator.description" />}
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          name="task_category_id"
          label={<FormattedMessage id="projectCreator.taskType" />}
          rules={[{ required: true, message: 'Required' }]}
        >
          <Select options={TASK_TYPES} />
        </Form.Item>

        <Form.Item
          name="data_dir"
          label={<FormattedMessage id="projectCreator.dataDir" />}
        >
          <Input placeholder="/path/to/images" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            Labels
            <Button type="link" icon={<PlusOutlined />} onClick={addLabel} size="small">
              Add
            </Button>
          </div>
          <List
            size="small"
            dataSource={labels}
            renderItem={(label, index) => (
              <List.Item
                actions={[<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeLabel(index)} />]}
              >
                <Space>
                  <ColorPicker
                    value={label.color}
                    onChange={(c) => updateLabel(index, 'color', c.toHexString())}
                    size="small"
                  />
                  <Input
                    value={label.name}
                    onChange={(e) => updateLabel(index, 'name', e.target.value)}
                    style={{ width: 150 }}
                    size="small"
                  />
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              <FormattedMessage id="projectCreator.create" />
            </Button>
            <Button onClick={() => navigate('/')}>
              <FormattedMessage id="projectCreator.cancel" />
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
