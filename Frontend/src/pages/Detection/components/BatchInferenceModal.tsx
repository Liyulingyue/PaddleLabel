import React from 'react';
import { Modal, Progress } from 'antd';

interface BatchInferenceModalProps {
  visible: boolean;
  progress: number;
  total: number;
  current: string;
}

const BatchInferenceModal: React.FC<BatchInferenceModalProps> = ({ visible, progress, total, current }) => (
  <Modal
    title="批量推理进度"
    open={visible}
    footer={null}
    closable={false}
    maskClosable={false}
  >
    <div style={{ padding: '20px 0' }}>
      <Progress percent={progress} status="active" />
      <div style={{ marginTop: '10px', textAlign: 'center' }}>{current}</div>
      <div style={{ marginTop: '10px', textAlign: 'center', color: '#666' }}>
        已处理 {Math.floor((progress / 100) * total)} / {total} 个图像
      </div>
    </div>
  </Modal>
);

export default BatchInferenceModal;
