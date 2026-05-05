import { Button, Space } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { Data } from '@/types';

interface Props {
  datas: Data[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function ImageNav({ datas, currentIndex, onNavigate }: Props) {
  if (datas.length === 0) return null;

  return (
    <div className="image-nav" style={{ padding: 8, textAlign: 'center' }}>
      <Space>
        <Button
          icon={<LeftOutlined />}
          disabled={currentIndex <= 0}
          onClick={() => onNavigate(currentIndex - 1)}
        />
        <span>{currentIndex + 1} / {datas.length}</span>
        <Button
          icon={<RightOutlined />}
          disabled={currentIndex >= datas.length - 1}
          onClick={() => onNavigate(currentIndex + 1)}
        />
      </Space>
    </div>
  );
}
