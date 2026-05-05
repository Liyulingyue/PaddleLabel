interface Props {
  disLoc?: string;
}

export default function Toolbar({ disLoc = 'left' }: Props) {
  const style = disLoc === 'right'
    ? { position: 'absolute' as const, right: 0, top: 0, bottom: 0, width: 60, background: '#fff', borderLeft: '1px solid #e8e8e8', zIndex: 10 }
    : { position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: 60, background: '#fff', borderRight: '1px solid #e8e8e8', zIndex: 10 };
  return <div style={style}>{/* toolbar */}</div>;
}
