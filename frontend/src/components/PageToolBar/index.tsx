import React from 'react';
import PPToolBarButton from '@/components/PPToolBarButton';

const BTN = '/pics/buttons/';

interface Tool {
  key: string;
  imgSrc: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface Props {
  position: 'left' | 'right';
  tools?: Tool[];
}

export default function ToolBar({ position, tools = [] }: Props) {
  return (
    <div className={position === 'left' ? 'toolbarLeft' : 'toolbarRight'}>
      {tools.map(tool => (
        <PPToolBarButton
          key={tool.key}
          imgSrc={`${BTN}${tool.imgSrc}`}
          active={tool.active}
          disabled={tool.disabled}
          onClick={tool.onClick}
        >
          {tool.label}
        </PPToolBarButton>
      ))}
    </div>
  );
}
