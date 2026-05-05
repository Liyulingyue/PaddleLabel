import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Select, Input, Form, message, Row, Col } from 'antd';
import {
  RocketOutlined,
  ExperimentOutlined,
  ExportOutlined,
  ProjectOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { ProjectApi, ManageApi } from '@/services/api';
import { ModelApi } from '@/services/mlApi';
import type { Project, Model } from '@/services/types';
import ExportModal from '@/components/Modals/ExportModal';
import TrainModal from '@/components/Modals/TrainModal';
import { useTranslation } from 'react-i18next';
import './ML.css';

export default function ML() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectIdParam = searchParams.get('projectId');
  const [projectId, setProjectId] = useState<string | undefined>(projectIdParam || undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [mlBackendUrl, setMlBackendUrl] = useState('http://localhost:1234');
  const [form] = Form.useForm();

  useEffect(() => {
    ManageApi.getVersion().catch(() => message.error(t('pages.ml.backendUnavailable')));
    ProjectApi.getAll().then(setProjects);
  }, [t]);

  useEffect(() => {
    if (!projectId) return;
    ProjectApi.get(Number(projectId)).then(p => {
      setProject(p);
      const settings = p.otherSettings || {};
      const mod = settings.models?.[settings.perviousModel] || {};
      form.setFieldsValue({
        mlBackendUrl: settings.mlBackendUrl || 'http://localhost:1234',
        modelName: settings.perviousModel,
        trainBatchSize: mod.trainBatchSize,
      });
      if (settings.mlBackendUrl) setMlBackendUrl(settings.mlBackendUrl);
    });
  }, [projectId, form]);

  useEffect(() => {
    if (!mlBackendUrl) return;
    const api = ModelApi.create(mlBackendUrl);
    api.getAll().then(setModels).catch(() => setModels([]));
  }, [mlBackendUrl]);

  const setMlBackendUrlFn = () => {
    if (!project) { message.error(t('pages.ml.pleaseChooseProject')); return; }
    const url = form.getFieldValue('mlBackendUrl');
    setMlBackendUrl(url);
    const otherSettings = { ...project.otherSettings, mlBackendUrl: url };
    ProjectApi.update(project.projectId!, { otherSettings });
  };

  const saveMlsettings = async (values: any) => {
    if (!project) { message.error(t('pages.ml.pleaseSelectModel')); return; }
    const otherSettings = project.otherSettings ? { ...project.otherSettings } : {};
    if (!otherSettings.models) otherSettings.models = {};
    otherSettings.models[values.modelName] = { trainBatchSize: values.trainBatchSize };
    otherSettings.mlBackendUrl = values.mlBackendUrl;
    otherSettings.perviousModel = values.modelName;
    await ProjectApi.update(project.projectId!, { otherSettings });
    setProject(prev => prev ? { ...prev, otherSettings } : null);
    message.info(t('pages.ml.mlSettingSaved'));
  };

  const trainModel = (dataDir: string) => {
    if (!project?.otherSettings?.perviousModel) return;
    const s = project.otherSettings;
    const api = ModelApi.create(s.mlBackendUrl || mlBackendUrl);
    const mod = s.models?.[s.perviousModel] || {};
    api.train(s.perviousModel, { dataDir, configs: mod });
  };

  const runInference = async () => {
    const s = project?.otherSettings;
    if (!s || !s.mlBackendUrl || !s.perviousModel) { message.error(t('pages.ml.pleaseSetBackendUrl')); return; }
    message.info(t('pages.ml.runningInference'));
    try {
      await ProjectApi.predict(project.projectId!, {
        mlBackendUrl: s.mlBackendUrl, model: s.perviousModel, sameServer: false, createLabel: true,
      });
      message.info(t('pages.ml.predictionComplete'));
    } catch { message.error(t('pages.ml.predictionFailed')); }
  };

  const taskCategoryName = project?.taskCategory?.name || 'classification';

  return (
    <div className="ml-page">
      <div className="ml-page__header">
        <div className="ml-page__header-icon">
          <RocketOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <h1 className="ml-page__title">{t('pages.ml.mlSettings')}</h1>
          <p className="ml-page__subtitle">Configure model training and inference for your annotation project</p>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={14}>
          <div className="ml-card">
            <div className="ml-card__section-title">
              <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {t('pages.ml.project')}
            </div>
            <Select
              className="ml-select"
              placeholder={t('pages.ml.selectProject')}
              style={{ width: '100%' }}
              size="large"
              value={projectId ? Number(projectId) : undefined}
              onChange={(pid) => setProjectId(String(pid))}
              options={projects.map(p => ({ value: p.projectId!, label: p.name }))}
            />
          </div>

          {project && (
            <>
              <div className="ml-card" style={{ marginTop: 16 }}>
                <div className="ml-card__section-title">
                  <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  Quick Actions
                </div>
                <div className="ml-quick-actions">
                  <TrainModal project={project} trainModel={trainModel} />
                  <ExportModal project={project} visible />
                  <Button
                    size="large"
                    icon={<DashboardOutlined />}
                    onClick={() => {
                      if (!project?.otherSettings?.mlBackendUrl) { message.error(t('pages.ml.setBackendUrlFirst')); return; }
                      window.open(`${project.otherSettings.mlBackendUrl.replace('model', 'visualdl')}`, '_blank');
                    }}
                  >
                    {t('pages.ml.progress')}
                  </Button>
                  <Button
                    size="large"
                    icon={<ExperimentOutlined />}
                    type="primary"
                    onClick={runInference}
                  >
                    {t('pages.ml.runInference')}
                  </Button>
                </div>
                <div className="ml-quick-actions" style={{ marginTop: 10 }}>
                  <Button
                    size="large"
                    icon={<ProjectOutlined />}
                    onClick={() => navigate(`/${taskCategoryName}?projectId=${projectId}`)}
                  >
                    {t('pages.ml.label')}
                  </Button>
                  <Button
                    size="large"
                    icon={<DashboardOutlined />}
                    onClick={() => navigate(`/project_overview?projectId=${projectId}`)}
                  >
                    {t('pages.ml.projectOverview')}
                  </Button>
                </div>
              </div>

              <div className="ml-card" style={{ marginTop: 16 }}>
                <div className="ml-card__section-title">
                  <ExperimentOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  {t('pages.ml.modelConfiguration')}
                </div>
                <Form form={form} layout="vertical" onFinish={saveMlsettings} requiredMark="optional" className="ml-form">
                  <Form.Item
                    name="mlBackendUrl"
                    label={t('pages.projectAi.mlBackendUrl')}
                    rules={[{ required: true, message: t('pages.projectAi.mlBackendUrl') + ' is required' }]}
                  >
                    <Input
                      size="large"
                      placeholder="http://localhost:1234"
                      prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                      suffix={
                        <Button size="small" type="primary" onClick={setMlBackendUrlFn} style={{ fontSize: 12 }}>
                          {t('pages.ml.set')}
                        </Button>
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    name="modelName"
                    label={t('pages.ml.model')}
                    rules={[{ required: true, message: t('pages.ml.selectModel') }]}
                  >
                    <Select
                      size="large"
                      placeholder={t('pages.ml.selectModel')}
                      options={models.map(m => ({ value: m.name, label: m.name }))}
                    />
                  </Form.Item>

                  <Form.Item name="trainBatchSize" label={t('pages.ml.trainingBatchSize')}>
                    <Input size="large" placeholder={t('pages.ml.trainBatchSizePlaceholder')} type="number" />
                  </Form.Item>

                  <Button htmlType="submit" type="primary" size="large" className="ml-save-btn" loading={false}>
                    {t('pages.ml.save')}
                  </Button>
                </Form>
              </div>
            </>
          )}
        </Col>

        <Col span={10}>
          <div className="ml-card">
            <div className="ml-card__section-title">
              <RocketOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              Quick Start Guide
            </div>
            <div className="ml-guide">
              {[
                { step: 1, title: 'Select Project', desc: 'Choose your annotation project from the dropdown above' },
                { step: 2, title: 'Set Backend URL', desc: 'Configure your ML training server URL (default: localhost:1234)' },
                { step: 3, title: 'Choose Model', desc: 'Select a pre-trained model from the available options' },
                { step: 4, title: 'Train & Predict', desc: 'Start training or run auto-inference on your dataset' },
              ].map(item => (
                <div key={item.step} className="ml-guide__item">
                  <div className="ml-guide__num">{item.step}</div>
                  <div>
                    <div className="ml-guide__title">{item.title}</div>
                    <div className="ml-guide__desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
