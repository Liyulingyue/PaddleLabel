import { useState } from 'react';
import { Modal, Form, Input, Button, Space, Radio, message } from 'antd';
import { FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { ProjectApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import DirectoryBrowser from '@/components/DirectoryBrowser';

const createInfo: Record<string, { labelFormats?: Record<string, string> }> = {
  classification: { labelFormats: { single_class: 'Single Class', multi_class: 'Multi Class' } },
  detection: { labelFormats: { coco: 'COCO', voc: 'VOC', yolo: 'YOLO' } },
  semanticSegmentation: { labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: '' } },
  instanceSegmentation: { labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: '' } },
  opticalCharacterRecognition: { labelFormats: { txt: 'txt' } },
};

const snake2camel = (name: string) => name?.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) || name;

const formatKey = (key: string) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

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
  const labelFormats = createInfo[taskCategory]?.labelFormats || {};
  const labelFormatKeys = Object.keys(labelFormats);

  const show = visible !== undefined ? visible : false;
  const canShow = show || !labelFormatKeys.length;

  const handleSelectDirectory = (path: string) => {
    form.setFieldValue('path', path);
  };

  if (!canShow && !labelFormatKeys.length) return null;

  return (
    <span>
      <Button type="primary" onClick={() => setOpen(true)}>{t('component.PPImportModal.import')}</Button>
      <Modal title={t('component.PPImportModal.title')} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="horizontal" onFinish={async (values) => {
          setLoading(true);
          try {
            await ProjectApi.importDataset(project!.projectId!, { importDir: values.path, importFormat: values.labelFormat });
            setOpen(false);
            onFinish?.();
          } catch {
            message.error(t('pages.tableList.addFailed'));
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
          {labelFormatKeys.length > 0 && (
            <Form.Item name="labelFormat" label={t('component.PPImportModal.labelFormat')}>
              <Radio.Group>
                {labelFormatKeys.map(k => (
                  <Radio key={k} value={k}>{t('global.labelFormat.' + formatKey(k)) || k}</Radio>
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

      <DirectoryBrowser
        open={dirBrowserOpen}
        onClose={() => setDirBrowserOpen(false)}
        onSelect={handleSelectDirectory}
        initialPath={form.getFieldValue('path')}
      />
    </span>
  );
}
