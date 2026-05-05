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
  const labelFormats = createInfo[taskCategory]?.labelFormats || {};
  const labelFormatKeys = Object.keys(labelFormats).filter(k => k !== 'eiseg');

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
              exportFormat: values.exportFormat,
              segMaskType: values.segMaskType,
            });
            message.success(t('component.PPExportModal.exportSuccess'));
            setOpen(false);
          } catch {
            message.error(t('pages.tableList.addFailed'));
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
          <Form.Item name="exportFormat" label={t('component.PPExportModal.labelFormat')} rules={[{ required: true, message: t('component.PPExportModal.nullLabelFormat') }]}>
            <Radio.Group onChange={(e) => setLabelFormat(e.target.value)}>
              {labelFormatKeys.map(k => (
                <Radio key={k} value={k}>{t('global.labelFormat.' + formatKey(k)) || k}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
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

      <DirectoryBrowser
        open={dirBrowserOpen}
        onClose={() => setDirBrowserOpen(false)}
        onSelect={handleSelectDirectory}
        initialPath={form.getFieldValue('exportDir')}
      />
    </span>
  );
}
