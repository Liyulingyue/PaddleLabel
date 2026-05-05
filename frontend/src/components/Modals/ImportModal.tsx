import { useState } from 'react';
import { Modal, Form, Input, Button, Space, Radio, message } from 'antd';
import { FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { ProjectApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import DirectoryBrowser from '@/components/DirectoryBrowser';

const importFormats: Record<string, string[]> = {
  classification: ['singleClassFolder', 'singleClassList', 'multiClassList'],
  detection: ['coco', 'voc', 'yolo'],
  semanticSegmentation: ['mask', 'coco', 'eiseg'],
  instanceSegmentation: ['mask', 'coco', 'eiseg'],
  opticalCharacterRecognition: ['txt', 'json'],
  point: ['labelme'],
};

const toApiFormat: Record<string, Record<string, string>> = {
  classification: { singleClassFolder: 'singleClassFolder', singleClassList: 'singleClassList', multiClassList: 'multiClassList' },
  opticalCharacterRecognition: { json: 'json', txt: 'txt' },
};

const toApiKey = (taskCategory: string, key: string) =>
  toApiFormat[taskCategory]?.[key] ?? key;

interface Props {
  project: Project | null;
  onFinish?: () => void;
  visible?: boolean;
}

export default function ImportModal({ project, onFinish, visible }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dirBrowserOpen, setDirBrowserOpen] = useState(false);
  const [form] = Form.useForm();

  const taskCategory = project?.taskCategory?.name || 'classification';
  const formats = importFormats[taskCategory] || [];

  const handleSelectDirectory = (path: string) => {
    form.setFieldValue('path', path);
  };

  if (!visible && !formats.length) return null;

  return (
    <span>
      <Button type="primary" onClick={() => setOpen(true)}>{t('component.PPImportModal.import')}</Button>
      <Modal title={t('component.PPImportModal.title')} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="horizontal" onFinish={async (values) => {
          setLoading(true);
          try {
            await ProjectApi.importDataset(project!.projectId!, {
              importDir: values.path,
              importFormat: toApiKey(taskCategory, values.labelFormat || ''),
            });
            setOpen(false);
            onFinish?.();
          } catch (err: any) {
            message.error(err?.response?.data?.detail || t('pages.tableList.addFailed'));
          } finally {
            setLoading(false);
          }
        }}>
          <Form.Item name="path" label={t('component.PPImportModal.path')} rules={[{ required: true, message: t('component.PPImportModal.nullPath') }]}>
            <Input.Search
              placeholder={t('component.PPCreator.absolutePath')}
              prefix={<FolderOpenOutlined style={{ color: '#bfbfbf', marginRight: 4 }} />}
              enterButton={<SearchOutlined />}
              onSearch={() => setDirBrowserOpen(true)}
              readOnly
              style={{ cursor: 'pointer' }}
            />
          </Form.Item>
          {formats.length > 0 && (
            <Form.Item name="labelFormat" label={t('component.PPImportModal.labelFormat')}>
              <Radio.Group>
                {formats.map(k => (
                  <Radio key={k} value={k}>{t('global.labelFormat.' + k) || k}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item wrapperCol={{ offset: 8 }}>
            <Space>
              <Button onClick={() => { setOpen(false); form.resetFields(); }}>{t('global.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={loading}>{t('component.PPImportModal.import')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {dirBrowserOpen && (
        <DirectoryBrowser
          open={dirBrowserOpen}
          onClose={() => setDirBrowserOpen(false)}
          onSelect={handleSelectDirectory}
          initialPath={form.getFieldValue('path') || ''}
        />
      )}
    </span>
  );
}
