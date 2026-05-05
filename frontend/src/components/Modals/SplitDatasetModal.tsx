import { useState } from 'react';
import { Modal, Form, InputNumber, Button, Space, Row, Col, message } from 'antd';
import { ProjectApi } from '@/services/api';
import { useTranslation } from 'react-i18next';

interface Props {
  projectId: number;
  visible?: boolean;
  onFinish?: () => void;
}

export default function SplitDatasetModal({ projectId, visible, onFinish }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [trainData, setTrainData] = useState(60);
  const [validationData, setValidationData] = useState(20);
  const [testData, setTestData] = useState(20);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  if (!visible) return null;

  return (
    <span>
      <Button type="primary" onClick={() => setOpen(true)}>{t('pages.toolBar.divideData')}</Button>
      <Modal title={t('component.PPSplitDatasetModal.title')} open={open} onCancel={() => setOpen(false)} footer={null} width={500}>
        <Form form={form} layout="vertical" onFinish={async () => {
          if (trainData + validationData + testData !== 100) {
            message.error(t('component.PPSplitDatasetModal.not100'));
            return;
          }
          setLoading(true);
          try {
            await ProjectApi.splitDataset(projectId, { train: trainData, val: validationData, test: testData });
            setOpen(false);
            onFinish?.();
          } catch {
            message.error(t('component.PPSplitDatasetModal.fail'));
          } finally {
            setLoading(false);
          }
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={t('component.PPSplitDatasetModal.train')}>
                <InputNumber addonAfter="%" defaultValue={60} precision={0} min={0} max={100} value={trainData} onChange={v => setTrainData(v || 0)} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('component.PPSplitDatasetModal.validation')}>
                <InputNumber addonAfter="%" defaultValue={20} precision={0} min={0} max={100} value={validationData} onChange={v => setValidationData(v || 0)} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('component.PPSplitDatasetModal.test')}>
                <InputNumber addonAfter="%" defaultValue={20} precision={0} min={0} max={100} value={testData} onChange={v => setTestData(v || 0)} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item wrapperCol={{ offset: 8 }}>
            <Space>
              <Button onClick={() => { setOpen(false); form.resetFields(); }}>{t('global.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={loading}>{t('global.ok')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </span>
  );
}
