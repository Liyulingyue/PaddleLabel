import React from 'react';
import InferenceConfig from '../components/InferenceConfig';

interface InferenceConfigPanelProps {
  inferenceEnabled: boolean;
  setInferenceEnabled: (v: boolean) => void;
  selectedService: string;
  setSelectedService: (v: string) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  mlBackendUrl: string;
  setMlBackendUrl: (v: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  uploadedModelFile: File | null;
  setUploadedModelFile: (f: File | null) => void;
  showInferConfig: boolean;
  setShowInferConfig: (v: boolean) => void;
}

const InferenceConfigPanel: React.FC<InferenceConfigPanelProps> = (props) => {
  return <InferenceConfig {...props} />;
};

export default InferenceConfigPanel;
