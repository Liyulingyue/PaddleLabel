import React from 'react';
import PPProgress from '@/components/PPLabelPage/PPProgress';

interface TaskNavigatorProps {
  task: any;
  project: any;
  tbIntl: (key: string) => string;
  onPrev: () => void;
  onNext: () => void;
}

const TaskNavigator: React.FC<TaskNavigatorProps> = ({ task, project, tbIntl, onPrev, onNext }) => (
  <div className="pblock" style={{ display: 'flex' }}>
    <div
      className="preButton"
      style={{
        background: 'blue',
        color: 'white',
        width: '100px',
        textAlign: 'center',
        lineHeight: '2.55rem',
      }}
      onClick={onPrev}
    >
      {tbIntl('prevTask')}
    </div>
    <PPProgress task={task} project={project} />
    <div
      className="nextButton"
      style={{
        background: 'blue',
        color: 'white',
        width: '100px',
        textAlign: 'center',
        lineHeight: '2.55rem',
      }}
      onClick={onNext}
    >
      {tbIntl('nextTask')}
    </div>
  </div>
);

export default TaskNavigator;
