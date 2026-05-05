import { useTranslation } from 'react-i18next';

interface Props {
  finished: number;
  total: number;
  current: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function BottomNav({ finished, total, current, onPrev, onNext }: Props) {
  const { t } = useTranslation();
  return (
    <div className="pblock">
      <div className="preButton" onClick={onPrev}>
        {t('pages.toolBar.prevTask')}
      </div>
      <div className="progress">
        <div className="progressBar" style={{ width: '15rem' }}>
          <div
            style={{
              width: `${total > 0 ? (finished / total) * 100 : 0}%`,
              height: 8,
              background: '#1890ff',
              borderRadius: 4,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <span className="progressDesc">
          {finished || 0}/{total} | {current}/{total}
        </span>
      </div>
      <div className="nextButton" onClick={onNext}>
        {t('pages.toolBar.nextTask')}
      </div>
    </div>
  );
}
