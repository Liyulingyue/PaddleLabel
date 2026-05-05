import { List, Button, Popconfirm } from 'antd';
import type { Label } from '@/services/types';
import { useTranslation } from 'react-i18next';

interface Props {
  labels: Label[];
  selectedLabel?: Label;
  onLabelSelect: (label: Label) => void;
  onLabelDelete: (labelId: number) => void;
  onAddLabel: () => void;
}

export default function LabelListPanel({ labels, selectedLabel, onLabelSelect, onLabelDelete, onAddLabel }: Props) {
  const { t } = useTranslation();
  return (
    <List
      className="labelList"
      size="large"
      header={<div className="labelListHeader">{t('component.PPLabelList.labelList')}</div>}
      footer={
        <div className="labelListFooter">
          <Button
            style={{ height: 40, fontSize: '0.75rem', width: '100%' }}
            type="primary"
            onClick={onAddLabel}
            block
          >
            {t('component.PPLabelList.addLabel')}
          </Button>
        </div>
      }
      bordered
      dataSource={labels}
      locale={{ emptyText: t('pages.detection.noLabels') }}
      renderItem={(item: Label) => (
        <List.Item
          className="annotationListItem"
          style={{
            background: selectedLabel?.labelId === item.labelId ? '#e6f7ff' : undefined,
            borderLeft: `4px solid ${item.color}`,
            padding: '0.5rem 0.813rem',
          }}
          onClick={() => onLabelSelect(item)}
        >
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: item.color,
                flexShrink: 0,
                marginRight: 8,
              }}
            />
            <span style={{ flex: 1, fontSize: '0.75rem' }}>{item.name}</span>
            <Popconfirm
              title={`${t('global.ok')}?`}
              onConfirm={() => onLabelDelete(item.labelId!)}
              okText={t('global.ok')}
              cancelText={t('global.cancel')}
            >
              <Button size="small" type="text" danger>×</Button>
            </Popconfirm>
          </div>
        </List.Item>
      )}
    />
  );
}
