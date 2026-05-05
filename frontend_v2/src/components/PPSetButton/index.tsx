import { Popover, Slider, InputNumber, Row, Col } from 'antd';
import type { TooltipPlacement } from 'antd/lib/tooltip';
import PPToolBarButton from '../PPToolBarButton';

type Props = {
  size?: number;
  minSize?: number;
  maxSize?: number;
  step?: number;
  onClick?: () => void;
  onChange?: (size: number) => void;
  imgSrc?: string;
  disLoc?: TooltipPlacement;
  active?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export default function PPSetButton({
  size,
  minSize = 0,
  maxSize = 100,
  step = 10,
  onClick,
  onChange,
  imgSrc,
  disLoc,
  active,
  disabled,
  children,
}: Props) {
  const current = size ?? 10;

  return (
    <Popover
      placement={disLoc || 'right'}
      content={
        <Row align="middle" style={{ minWidth: 160 }}>
          <Col span={14}>
            <Slider
              value={current}
              max={maxSize}
              min={minSize}
              onChange={onChange}
              step={0.01}
              tooltip={{ formatter: (v) => v }}
            />
          </Col>
          <Col span={10}>
            <InputNumber
              style={{ width: '100%' }}
              min={minSize}
              max={maxSize}
              value={current}
              onChange={(v) => v !== null && onChange?.(v)}
              step={step}
            />
          </Col>
        </Row>
      }
      trigger="hover"
    >
      <div style={{ display: 'inline-block' }}>
        <PPToolBarButton
          imgSrc={imgSrc}
          onClick={!disabled ? onClick : undefined}
          active={active}
          disabled={disabled}
        >
          {children}
        </PPToolBarButton>
      </div>
    </Popover>
  );
}
