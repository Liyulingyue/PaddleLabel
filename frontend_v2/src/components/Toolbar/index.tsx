import { Button, Space, Tooltip, Slider } from 'antd';
import {
  DragOutlined,
  BorderOutlined,
  GatewayOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useToolStore } from '@/stores/toolStore';
import type { ToolType } from '@/types';
import './styles.css';

const tools: { key: ToolType; icon: React.ReactNode; name: string }[] = [
  { key: 'mover', icon: <DragOutlined />, name: 'tools.mover' },
  { key: 'rectangle', icon: <BorderOutlined />, name: 'tools.rectangle' },
  { key: 'polygon', icon: <GatewayOutlined />, name: 'tools.polygon' },
  { key: 'brush', icon: <EditOutlined />, name: 'tools.brush' },
  { key: 'rubber', icon: <DeleteOutlined />, name: 'tools.rubber' },
];

interface Props {
  onSave?: () => void;
}

export default function Toolbar({ onSave }: Props) {
  const { currentTool, setTool, brushSize, setBrushSize } = useToolStore();

  return (
    <div className="toolbar">
      <Space>
        {tools.map(tool => (
          <Tooltip key={tool.key} title={<FormattedMessage id={tool.name} />}>
            <Button
              type={currentTool === tool.key ? 'primary' : 'default'}
              icon={tool.icon}
              onClick={() => setTool(tool.key)}
            />
          </Tooltip>
        ))}
      </Space>
      {currentTool === 'brush' && (
        <div className="brush-size">
          <span>Size:</span>
          <Slider
            min={1}
            max={50}
            value={brushSize}
            onChange={setBrushSize}
            style={{ width: 120 }}
          />
          <span>{brushSize}</span>
        </div>
      )}
      <Space>
        <Button type="primary" onClick={onSave}>
          <FormattedMessage id="annotation.save" />
        </Button>
      </Space>
    </div>
  );
}
