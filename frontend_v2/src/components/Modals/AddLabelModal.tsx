import { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, Space } from 'antd';
import ColorBall from '../ColorBall';
import type { Label } from '@/services/types';
import { useTranslation } from 'react-i18next';

const generatedColorList = [
  '#FF0000', '#008000', '#0000FF', '#FFFF00', '#FFA500', '#00FFFF', '#8B00FF',
  '#FFC0CB', '#7CFC00', '#007FFF', '#800080', '#36BF36', '#DAA520', '#800000',
  '#008B8B', '#B22222', '#E6D933', '#000080', '#FF00FF', '#FFFF99', '#87CEEB',
  '#5C50E6', '#CD5C5C', '#20B2AA', '#E680FF', '#4D1F00', '#006374', '#B399FF',
  '#8B4513', '#BA55D3', '#C0C0C0', '#808080', '#000000',
];

interface Props {
  order?: number;
  visible?: boolean;
  hideColorPicker?: boolean;
  defaultLabel?: Label;
  onLabelAdd: (label: Label) => void;
  onCancel?: () => void;
}

export default function AddLabelModal({ order = 0, visible, hideColorPicker, defaultLabel, onLabelAdd, onCancel }: Props) {
  const { t } = useTranslation();
  const [newLabelColor, setNewLabelColor] = useState(defaultLabel?.color || generatedColorList[order]);
  const [form] = Form.useForm();

  useEffect(() => {
    setNewLabelColor(defaultLabel?.color || generatedColorList[order]);
    form.setFieldsValue({ labelname: defaultLabel?.name });
  }, [visible, defaultLabel, order]);

  return (
    <Modal title={t('component.PPAddLabelModal.addLabel')} open={visible} onCancel={onCancel} footer={null}>
      <Form form={form} layout="horizontal" onFinish={(values) => {
        onLabelAdd({ name: values.labelname, color: newLabelColor });
        form.resetFields();
      }}>
        <Form.Item name="labelname" label={t('component.PPAddLabelModal.labelName')} rules={[{ required: true, message: t('component.PPAddLabelModal.requiresLabelName') }]}>
          <Input autoComplete="off" />
        </Form.Item>
        {!hideColorPicker && (
          <Form.Item label={t('component.PPAddLabelModal.selectColor')} name="color">
            <ColorBall
              color={newLabelColor}
              changeable
              onChange={(color) => setNewLabelColor(color)}
            />
          </Form.Item>
        )}
        <Form.Item wrapperCol={{ offset: 8 }}>
          <Space>
            <Button onClick={() => { onCancel?.(); form.resetFields(); }}>{t('global.cancel')}</Button>
            <Button type="primary" htmlType="submit">{t('global.ok')}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
