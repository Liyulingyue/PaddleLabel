import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Form, Input, Select, Button, message } from 'antd';
import { FormattedMessage } from 'react-intl';
import { useProjectStore } from '@/stores/projectStore';
import { predictProject } from '@/api/project';

export default function ML() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, fetchProject, updateProject } = useProjectStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject(Number(id));
    }
  }, [id, fetchProject]);

  useEffect(() => {
    if (currentProject) {
      form.setFieldsValue({
        mlBackendUrl: currentProject.other_settings?.mlBackendUrl || '',
        modelName: currentProject.other_settings?.modelName || '',
      });
    }
  }, [currentProject, form]);

  const handleSubmit = async (values: { mlBackendUrl: string; modelName: string }) => {
    if (!id) return;
    setLoading(true);
    try {
      await updateProject(Number(id), {
        other_settings: {
          ...currentProject?.other_settings,
          mlBackendUrl: values.mlBackendUrl,
          modelName: values.modelName,
        },
      });
      message.success('Settings saved');
    } catch {
      message.error('Failed to save');
    }
    setLoading(false);
  };

  return (
    <Card title="ML Model Settings">
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="mlBackendUrl" label="ML Backend URL">
          <Input placeholder="http://localhost:8080" />
        </Form.Item>
        <Form.Item name="modelName" label="Model Name">
          <Select
            options={[
              { value: 'PP-YOLOE', label: 'PP-YOLOE' },
              { value: 'PaddleSeg', label: 'PaddleSeg' },
              { value: 'PP-OCR', label: 'PP-OCR' },
            ]}
            placeholder="Select model"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            <FormattedMessage id="common.save" />
          </Button>
        </Form.Item>
      </Form>

      <Card title="Predict" style={{ marginTop: 16 }}>
        <p>Run ML model to generate predictions for unlabeled images.</p>
        <Button
          type="primary"
          onClick={async () => {
            if (!id) return;
            try {
              await predictProject(Number(id), {
                ml_backend_url: form.getFieldValue('mlBackendUrl') || 'http://localhost:1234',
                model: form.getFieldValue('modelName') || 'PicoDet',
              });
              message.success('Prediction started');
            } catch {
              message.error('Prediction failed');
            }
          }}
        >
          Start Prediction
        </Button>
      </Card>
    </Card>
  );
}
