import { useState } from 'react';
import { Modal, Form, Input, Button, Space, Radio, message } from 'antd';
import { FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { ProjectApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import DirectoryBrowser from '@/components/DirectoryBrowser';

const exportFormats: Record<string, string[]> = {
  classification: ['singleClassFolder', 'singleClassList'],
  detection: ['coco', 'voc', 'yolo'],
  semanticSegmentation: ['mask', 'coco'],
  instanceSegmentation: ['mask', 'coco'],
  opticalCharacterRecognition: ['txt', 'json'],
  point: ['labelme'],
};

const toApiFormat: Record<string, Record<string, string>> = {
  classification: { singleClassFolder: 'singleClassFolder', singleClassList: 'singleClassList' },
  opticalCharacterRecognition: { json: 'json', txt: 'txt' },
};

const toApiKey = (taskCategory: string, key: string) =>
  toApiFormat[taskCategory]?.[key] ?? key;

interface Props {
  project: Project | null;
  visible?: boolean;
}

export default function ExportModal({ project, visible }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [labelFormat, setLabelFormat] = useState<string>();
  const [dirBrowserOpen, setDirBrowserOpen] = useState(false);
  const [form] = Form.useForm();

  const taskCategory = project?.taskCategory?.name || 'classification';
  const formats = exportFormats[taskCategory] || [];
  const defaultExportDir = project?.dataDir ? `${project.dataDir}_output` : '';

  const handleSelectDirectory = (path: string) => {
    form.setFieldValue('exportDir', path);
  };

  if (!visible) return null;

  return (
    <span>
      <Button type="primary" onClick={() => {
        if (defaultExportDir && !form.getFieldValue('exportDir')) {
          form.setFieldValue('exportDir', defaultExportDir);
        }
        setOpen(true);
      }}>{t('component.PPExportModal.export')}</Button>
      <Modal title={t('component.PPExportModal.title')} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="horizontal" onFinish={async (values) => {
          setLoading(true);
          try {
            await ProjectApi.exportDataset(project!.projectId!, {
              exportDir: values.exportDir,
              exportFormat: toApiKey(taskCategory, values.exportFormat),
              segMaskType: values.segMaskType,
            });
            message.success(t('component.PPExportModal.exportSuccess'));
            setOpen(false);
          } catch (err: any) {
            message.error(err?.response?.data?.detail || t('pages.tableList.addFailed'));
          } finally {
            setLoading(false);
          }
        }}>
          <Form.Item name="exportDir" label={t('component.PPExportModal.path')} rules={[{ required: true, message: t('component.PPExportModal.nullPath') }]}>
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
            <Form.Item name="exportFormat" label={t('component.PPExportModal.labelFormat')} rules={[{ required: true, message: t('component.PPExportModal.nullLabelFormat') }]}>
              <Radio.Group onChange={(e) => setLabelFormat(e.target.value)}>
                {formats.map(k => (
                  <Radio key={k} value={k}>{t('global.labelFormat.' + k) || k}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          )}
          {labelFormat === 'mask' && taskCategory === 'semanticSegmentation' && (
            <Form.Item name="segMaskType" label={t('component.PPCreator.segMaskType')}>
              <Radio.Group value="grayscale">
                {['grayscale', 'pseudo'].map(k => (
                  <Radio key={k} value={k}>{t('global.segMaskType.' + k)}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item wrapperCol={{ offset: 8 }}>
            <Space>
              <Button onClick={() => { setOpen(false); form.resetFields(); }}>{t('global.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={loading}>{t('component.PPExportModal.export')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {dirBrowserOpen && (
        <DirectoryBrowser
          open={dirBrowserOpen}
          onClose={() => setDirBrowserOpen(false)}
          onSelect={handleSelectDirectory}
          initialPath={form.getFieldValue('exportDir') || defaultExportDir}
        />
      )}
    </span>
  );
}
