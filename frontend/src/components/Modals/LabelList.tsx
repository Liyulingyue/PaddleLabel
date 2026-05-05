import { useState } from 'react';
import { Modal, Form, Input, Button, Space, Radio, message, List } from 'antd';
import { ProjectApi, LabelApi } from '@/services/api';
import type { Project, Label } from '@/services/types';
import AddLabelModal from './AddLabelModal';
import { ColorBall } from '@/components/ColorBall';
import { useTranslation } from 'react-i18next';

const generatedColorList = [
  '#FF0000', '#008000', '#0000FF', '#FFFF00', '#FFA500', '#00FFFF', '#8B00FF',
  '#FFC0CB', '#7CFC00', '#007FFF', '#800080', '#36BF36', '#DAA520', '#800000',
  '#008B8B', '#B22222', '#E6D933', '#000080', '#FF00FF', '#FFFF99', '#87CEEB',
  '#5C50E6', '#CD5C5C', '#20B2AA', '#E680FF', '#4D1F00', '#006374', '#B399FF',
  '#8B4513', '#BA55D3', '#C0C0C0', '#808080', '#000000',
];

interface Props {
  project: Project | null;
  labels?: Label[];
  onLabelsChange?: (labels: Label[]) => void;
}

export default function LabelList({ project, labels = [], onLabelsChange }: Props) {
  const { t } = useTranslation();
  const [addModalVisible, setAddLabelModalVisible] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  const handleLabelAdd = async (label: Label) => {
    try {
      await LabelApi.create([label], project?.projectId, true);
      onLabelsChange?.([...labels, label]);
    } catch {
      message.error(t('pages.tableList.addFailed'));
    }
  };

  const handleLabelDelete = async (label: Label) => {
    try {
      if (label.labelId) await ProjectApi.remove(label.labelId);
      onLabelsChange?.(labels.filter(l => l.labelId !== label.labelId));
    } catch {
      message.error(t('component.label.deleteSuccess'));
    }
  };

  return (
    <div>
      <List
        size="large"
        header={<div>{t('component.PPLabelList.labelList')}</div>}
        bordered
        dataSource={labels}
        renderItem={(label) => (
          <List.Item
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ColorBall color={label.color} />
            <span style={{ flex: 1 }}>{label.name}</span>
            <Button
              size="small"
              danger
              onClick={() => handleLabelDelete(label)}
            >{t('component.PPLabelList.delete')}</Button>
          </List.Item>
        )}
        footer={
          <div>
            <Button type="primary" block style={{ marginTop: 8 }} onClick={() => { setEditingLabel(null); setAddLabelModalVisible(true); }}>
              {t('component.PPLabelList.addLabel')}
            </Button>
          </div>
        }
      />
      <AddLabelModal
        visible={addModalVisible}
        order={labels.length}
        defaultLabel={editingLabel || undefined}
        onLabelAdd={(label) => {
          handleLabelAdd(label);
          setAddLabelModalVisible(false);
        }}
        onCancel={() => setAddLabelModalVisible(false)}
      />
    </div>
  );
}
