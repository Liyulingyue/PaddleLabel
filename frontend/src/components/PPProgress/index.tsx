import { Progress } from 'antd';

interface Props {
  project: { finished?: number };
  task: { all?: any[]; currIdx?: number };
}

export default function PPProgress({ project, task }: Props) {
  const percent = task.all?.length ? Math.ceil((project.finished || 0) / task.all.length * 100) : 0;
  return (
    <div className="progress">
      <Progress percent={percent} status="active" showInfo={false} />
      <span className="progressDesc">
        {`Progress: ${project.finished || 0}/${task.all?.length} Current: ${task.currIdx == undefined ? 1 : task.currIdx + 1}`}
      </span>
    </div>
  );
}
