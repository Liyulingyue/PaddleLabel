import React from 'react';
import { Input, Tooltip, Switch, Select, Upload } from 'antd';
import PPToolBarButton from '@/components/PPLabelPage/PPToolBarButton';

interface InferenceConfigProps {
  inferenceEnabled: boolean;
  setInferenceEnabled: (enabled: boolean) => void;
  selectedService: string;
  setSelectedService: (service: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  mlBackendUrl: string;
  setMlBackendUrl: (url: string) => void;
  threshold: number;
  setThreshold: (threshold: number) => void;
  uploadedModelFile: File | null;
  setUploadedModelFile: (file: File | null) => void;
  showInferConfig: boolean;
  setShowInferConfig: (show: boolean) => void;
}

const InferenceConfig: React.FC<InferenceConfigProps> = ({
  inferenceEnabled,
  setInferenceEnabled,
  selectedService,
  setSelectedService,
  selectedModel,
  setSelectedModel,
  mlBackendUrl,
  setMlBackendUrl,
  threshold,
  setThreshold,
  uploadedModelFile,
  setUploadedModelFile,
  showInferConfig,
  setShowInferConfig,
}) => {
  // 服务选项
  const serviceOptions = [
    { value: 'custom', label: '自定义服务' },
    { value: 'preset', label: '预设模型服务' },
  ];

  // 预设模型选项
  const presetModelOptions = [
    { value: 'picodet', label: 'PicoDet' },
    { value: 'yolov3', label: 'YOLOv3' },
    { value: 'ssd', label: 'SSD' },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
      <Tooltip
        title={
          <div style={{ minWidth: 220, backgroundColor: 'white', padding: '8px', color: 'black' }}>
            <div style={{ marginBottom: 8 }}>
              <span>开启推理：</span>
              <Switch
                checked={inferenceEnabled}
                onChange={setInferenceEnabled}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span>选择服务：</span>
              <Select
                size="small"
                value={selectedService}
                onChange={(value) => {
                  setSelectedService(value);
                  // 切换服务类型时重置相关状态
                  setSelectedModel('');
                  setUploadedModelFile(null);
                  if (value === 'custom') {
                    setMlBackendUrl('');
                  }
                }}
                placeholder="请选择服务"
                disabled={!inferenceEnabled}
                style={{ width: '100%' }}
                dropdownStyle={{ zIndex: 9999 }}
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
              >
                {serviceOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </div>
            {selectedService === 'custom' && (
              <div style={{ marginBottom: 8 }}>
                <span>推理服务地址：</span>
                <Input
                  size="small"
                  value={mlBackendUrl}
                  onChange={e => setMlBackendUrl(e.target.value)}
                  placeholder="http://127.0.0.1:1234"
                  disabled={!inferenceEnabled}
                />
              </div>
            )}
            {selectedService === 'preset' && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <span>选择模型：</span>
                  <Select
                    size="small"
                    value={selectedModel}
                    onChange={setSelectedModel}
                    placeholder="请选择模型"
                    disabled={!inferenceEnabled}
                    style={{ width: '100%' }}
                    dropdownStyle={{ zIndex: 9999 }}
                    getPopupContainer={(triggerNode) => triggerNode.parentNode}
                  >
                    {presetModelOptions.map(option => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span>上传模型文件：</span>
                  <Upload
                    accept=".pdmodel,.onnx,.pb,.pt"
                    maxCount={1}
                    beforeUpload={(file) => {
                      setUploadedModelFile(file);
                      return false; // 阻止自动上传
                    }}
                    onRemove={() => setUploadedModelFile(null)}
                    disabled={!inferenceEnabled}
                  >
                    <div style={{
                      border: '1px dashed #d9d9d9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}>
                      {uploadedModelFile ? uploadedModelFile.name : '点击上传模型文件'}
                    </div>
                  </Upload>
                </div>
              </>
            )}
            <div>
              <span>推理阈值：</span>
              <Input
                size="small"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                disabled={!inferenceEnabled}
              />
            </div>
          </div>
        }
        placement="left"
        trigger="hover"
        open={showInferConfig}
        onOpenChange={setShowInferConfig}
        overlayStyle={{ zIndex: 9999 }}
      >
        <PPToolBarButton
          imgSrc="./pics/buttons/threshold.png"
          onClick={() => setShowInferConfig(!showInferConfig)}
          active={showInferConfig}
        >
          推理配置
        </PPToolBarButton>
      </Tooltip>
    </div>
  );
};

export default InferenceConfig;
