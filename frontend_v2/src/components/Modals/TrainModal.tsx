import { useState } from 'react';
import { Modal, Form, Input, Button, Space, message } from 'antd';
import type { Project } from '@/services/types';
import { ModelApi } from '@/services/mlApi';
import { useTranslation } from 'react-i18next';

interface Props {
  project: Project;
  trainModel: (dataDir: string) => void;
}

export default function TrainModal({ project, trainModel }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  return (
    <span>
      <Button type="primary" onClick={() => setOpen(true)}>{t('component.split.train')}</Button>
      <Modal title={t('component.PPTrainModal.title')} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={() => {
          const dataDir = form.getFieldValue('dataDir');
          if (!dataDir) {
            message.error(t('component.PPTrainModal.pleaseInputDataDir'));
            return;
          }
          trainModel(dataDir);
          setOpen(false);
        }}>
          <Form.Item name="dataDir" label={t('component.PPTrainModal.dataDirectory')} rules={[{ required: true, message: t('component.PPTrainModal.pleaseInputDataDir') }]}>
            <Input placeholder={t('component.PPTrainModal.dataDirPlaceholder')} />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 8 }}>
            <Space>
              <Button onClick={() => setOpen(false)}>{t('global.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={loading}>{t('component.PPTrainModal.startTraining')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </span>
  );
}
