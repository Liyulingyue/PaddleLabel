import { Popover } from 'antd';
import { useState } from 'react';

interface Props {
  color?: string;
  changeable?: boolean;
  onChange?: (color: string) => void;
}

export function ColorBall({ color = '#FFF', changeable, onChange }: Props) {
  const [localColor, setLocalColor] = useState(color);

  if (changeable) {
    return (
      <Popover
        placement="bottom"
        content={
          <div style={{ width: 200, height: 40, background: `linear-gradient(to right, ${localColor}, #fff)` }} />
        }
        trigger="click"
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: localColor,
            cursor: 'pointer',
            border: '1px solid #ccc',
            display: 'inline-block',
            verticalAlign: 'middle',
          }}
        />
      </Popover>
    );
  }

  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        verticalAlign: 'middle',
        border: '1px solid #ccc',
      }}
    />
  );
}

export default ColorBall;
