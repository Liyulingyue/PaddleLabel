import { useState } from 'react';
import { Modal, Form, Input, Button, Space, message } from 'antd';
import type { Project } from '@/services/types';
import { ModelApi } from '@/services/mlApi';
import { useTranslation } from 'react-i18next';

const DEFAULT_ML_URL = 'http://127.0.0.1:1234';

interface Props {
  visible?: boolean;
  onCancel?: () => void;
  model?: any;
  project?: Project;
  setVisible: (v: boolean) => void;
}

export default function InteractorModal({ visible, onCancel, model, project, setVisible }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const saveMlsettings = async () => {
    if (!project) {
      message.error(t('pages.ml.pleaseChooseProject'));
      return;
    }
    const values = form.getFieldsValue();
    const otherSettings = { ...project.otherSettings, ...values };
    setVisible(false);
    message.info(t('component.PPInteractorModal.settingSaved'));
  };

  return (
    <Modal title={t('component.PPInteractorModal.title')} open={visible} onCancel={onCancel} footer={null} width={600}>
      <Form form={form} layout="horizontal" onFinish={saveMlsettings}>
        <Form.Item name="mlBackendUrl" label={t('component.PPInteractorModal.mlBackendUrl')} initialValue={DEFAULT_ML_URL}>
          <Input autoComplete="off" placeholder={DEFAULT_ML_URL} />
        </Form.Item>
        <Form.Item name="modelFilePath" label={t('component.PPInteractorModal.modelPath')}>
          <Input autoComplete="off" placeholder={t('component.PPInteractorModal.pathPh')} />
        </Form.Item>
        <Form.Item name="paramFilePath" label={t('component.PPInteractorModal.weightPath')}>
          <Input autoComplete="off" placeholder={t('component.PPInteractorModal.pathPh')} />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 8 }}>
          <Space>
            <Button onClick={onCancel}>{t('global.cancel')}</Button>
            <Button type="primary" htmlType="submit">{t('global.ok')}</Button>
          </Space>
        </Form.Item>
      </Form>
      <div style={{ color: 'red', fontSize: 14, marginTop: 8 }}>{t('component.PPInteractorModal.loadFail')}</div>
    </Modal>
  );
}
