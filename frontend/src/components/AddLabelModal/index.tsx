import { useState } from 'react';
import { Modal, Input, ColorPicker } from 'antd';
import type { Label } from '@/services/types';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  labelName: string;
  labelColor: string;
  onLabelNameChange: (name: string) => void;
  onLabelColorChange: (color: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export default function AddLabelModal({ open, labelName, labelColor, onLabelNameChange, onLabelColorChange, onOk, onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('component.PPAddLabelModal.addLabel')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('global.ok')}
      cancelText={t('global.cancel')}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>{t('component.PPAddLabelModal.labelName')}</label>
        <Input
          value={labelName}
          onChange={e => onLabelNameChange(e.target.value)}
          placeholder={t('component.PPAddLabelModal.requiresLabelName')}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 8 }}>{t('component.PPAddLabelModal.selectColor')}</label>
        <ColorPicker value={labelColor} onChange={c => onLabelColorChange(c.toHexString())} showText />
      </div>
    </Modal>
  );
}
