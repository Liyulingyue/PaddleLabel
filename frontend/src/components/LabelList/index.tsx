import { List, Button, Spin } from 'antd';
import type { Label } from '@/services/types';
import ColorBall from '../ColorBall';
import AddLabelModal from '../Modals/AddLabelModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  labels?: Label[];
  activeIds?: Set<number>;
  selectedLabel?: Label;
  hideEye?: boolean;
  hideColorPicker?: boolean;
  onLabelModify?: (label: Label) => void;
  onLabelDelete: (label: Label) => void;
  onLabelAdd: (label: Label) => void;
  onLabelSelect: (label: Label) => void;
  onHideLabel?: (change: boolean, id: number) => void;
  disabled?: boolean;
  refresh?: number;
}

export default function LabelList({ labels = [], activeIds, selectedLabel, hideEye, hideColorPicker, onLabelModify, onLabelDelete, onLabelAdd, onLabelSelect, onHideLabel, disabled }: Props) {
  const { t } = useTranslation();
  const [addModalVisible, setAddLabelModalVisible] = useState(false);

  return (
    <>
      <List
        size="large"
        header={<div>{t('component.PPLabelList.labelList')}</div>}
        bordered
        dataSource={labels}
        renderItem={(item) => (
          <List.Item
            style={{
              cursor: disabled ? 'default' : 'pointer',
              background: activeIds?.has(item.labelId!) ? '#e6f7ff' : 'transparent',
              padding: '8px 12px',
            }}
            onClick={() => !disabled && onLabelSelect(item)}
          >
            <span style={{ flex: 1 }}>{item.name}</span>
            {!hideColorPicker && <ColorBall color={item.color} />}
            <Button
              size="small"
              danger
              onClick={(e) => {
                e.stopPropagation();
                onLabelDelete(item);
              }}
              style={{ marginLeft: 8 }}
            >{t('component.label.delete')}</Button>
          </List.Item>
        )}
        footer={
          <div>
            <Button type="primary" disabled={disabled} onClick={() => setAddLabelModalVisible(true)} block>{t('component.PPLabelList.addLabel')}</Button>
          </div>
        }
      />
      <AddLabelModal
        visible={addModalVisible}
        order={labels.length}
        hideColorPicker={hideColorPicker}
        onLabelAdd={(label) => {
          onLabelAdd(label);
          setAddLabelModalVisible(false);
        }}
        onCancel={() => setAddLabelModalVisible(false)}
      />
    </>
  );
}
