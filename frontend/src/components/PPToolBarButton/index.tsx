import './index.css';

export interface PPToolBarButtonProps {
  imgSrc?: string;
  img?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function PPToolBarButton({
  imgSrc,
  img,
  active,
  disabled,
  onClick,
  children,
}: PPToolBarButtonProps) {
  return (
    <div
      className={`toolbarButton ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={!disabled ? onClick : undefined}
    >
      {imgSrc && <img src={imgSrc} alt="" className="toolbarButtonImg" />}
      {img}
      {children && <span className="toolbarButtonText">{children}</span>}
    </div>
  );
}
