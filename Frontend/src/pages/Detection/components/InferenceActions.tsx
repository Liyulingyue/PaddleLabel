import React from 'react';
import PPToolBarButton from '@/components/PPLabelPage/PPToolBarButton';

interface InferenceActionsProps {
  inferenceEnabled: boolean;
  selectedService: string;
  mlBackendUrl: string;
  selectedModel: string;
  uploadedModelFile: File | null;
  onImportLabels: () => void;
  onLoadModel: () => void;
  onUnloadModel: () => void;
  onRunInference: () => void;
  onRunBatchInference: () => void;
  onProjectOverview: () => void;
  tbIntl: (key: string) => string;
}

const InferenceActions: React.FC<InferenceActionsProps> = ({
  inferenceEnabled,
  selectedService,
  mlBackendUrl,
  selectedModel,
  uploadedModelFile,
  onImportLabels,
  onLoadModel,
  onUnloadModel,
  onRunInference,
  onRunBatchInference,
  onProjectOverview,
  tbIntl,
}) => (
  <>
    <PPToolBarButton
      imgSrc="./pics/buttons/export.png"
      disabled={
        !inferenceEnabled ||
        !selectedService ||
        (selectedService === 'custom' && !mlBackendUrl)
      }
      onClick={onImportLabels}
    >
      导入标签
    </PPToolBarButton>
    <PPToolBarButton
      imgSrc="./pics/buttons/save.png"
      disabled={
        !inferenceEnabled ||
        !selectedService ||
        (selectedService === 'custom' && !mlBackendUrl)
      }
      onClick={onLoadModel}
    >
      加载模型
    </PPToolBarButton>
    <PPToolBarButton
      imgSrc="./pics/buttons/clear_mark.png"
      disabled={
        !inferenceEnabled ||
        !selectedService ||
        (selectedService === 'custom' && !mlBackendUrl)
      }
      onClick={onUnloadModel}
    >
      卸载模型
    </PPToolBarButton>
    <PPToolBarButton
      imgSrc="./pics/buttons/intelligent_interaction.png"
      disabled={
        !inferenceEnabled ||
        !selectedService ||
        (selectedService === 'custom' && !mlBackendUrl) ||
        (selectedService === 'preset' && (!selectedModel || !uploadedModelFile))
      }
      onClick={onRunInference}
    >
      执行推理
    </PPToolBarButton>
    <PPToolBarButton
      imgSrc="./pics/buttons/intelligent_interaction.png"
      disabled={
        !inferenceEnabled ||
        !selectedService ||
        (selectedService === 'custom' && !mlBackendUrl) ||
        (selectedService === 'preset' && (!selectedModel || !uploadedModelFile))
      }
      onClick={onRunBatchInference}
    >
      推理全部
    </PPToolBarButton>
    <PPToolBarButton
      imgSrc="./pics/buttons/data_division.png"
      onClick={onProjectOverview}
    >
      {tbIntl('projectOverview')}
    </PPToolBarButton>
  </>
);

export default InferenceActions;
