import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Tree, Spin, message, Select } from 'antd';
import type { TreeDataNode } from 'antd';
import { FolderOpenOutlined, FileTextOutlined, FolderOutlined, CheckCircleFilled, AimOutlined, SearchOutlined } from '@ant-design/icons';
import { ProjectApi } from '@/services/api';
import type { Project } from '@/services/types';
import { useTranslation } from 'react-i18next';
import DirectoryBrowser from '@/components/DirectoryBrowser';
import './ProjectCreator.css';

interface ImportOption {
  label: string;
  type: 'choice';
  choices: [string, string][];
  required: boolean;
  showAfter: [string, string][];
}

const createInfo: Record<string, { labelKey: string; avatar: string; id: number; labelFormats?: Record<string, string>; desc?: string }> = {
  classification: {
    labelKey: 'global.classification',
    avatar: '/pics/classification.jpg',
    id: 1,
    labelFormats: { single_class: 'Single Class', multi_class: 'Multi Class' },
    desc: 'Categorize images into classes',
  },
  detection: {
    labelKey: 'global.detection',
    avatar: '/pics/object_detection.jpg',
    id: 2,
    labelFormats: { coco: 'COCO', voc: 'VOC', yolo: 'YOLO' },
    desc: 'Locate and identify objects in images',
  },
  semanticSegmentation: {
    labelKey: 'global.semanticSegmentation',
    avatar: '/pics/semantic_segmentation.jpg',
    id: 3,
    labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: 'EISeg' },
    desc: 'Pixel-level semantic segmentation',
  },
  instanceSegmentation: {
    labelKey: 'global.instanceSegmentation',
    avatar: '/pics/instance_segmentation.jpg',
    id: 4,
    labelFormats: { mask: 'Mask', coco: 'Polygon', eiseg: 'EISeg' },
    desc: 'Instance-level segmentation',
  },
  opticalCharacterRecognition: {
    labelKey: 'global.opticalCharacterRecognition',
    avatar: '/pics/ocr.png',
    id: 7,
    labelFormats: { txt: 'txt' },
    desc: 'Extract text from images',
  },
};

const snake2camel = (name: string) => {
  if (!name) return name;
  return name.toLowerCase().replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
};

const camel2snake = (name: string) => {
  if (!name) return name;
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const formatKey = (key: string) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function arrayToTree(items: { name: string; type: string }[], parentPath = ''): TreeDataNode[] {
  return items.map(item => {
    const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
    const icon = item.type === 'file'
      ? <FileTextOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
      : <FolderOutlined style={{ color: '#f5a623', fontSize: 13 }} />;
    return {
      key: fullPath,
      title: item.name,
      icon,
      isLeaf: item.type === 'file',
      children: item.type === 'dir' ? [] : undefined,
    };
  });
}

export default function ProjectCreator() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskCategory = searchParams.get('taskCategory') || 'classification';
  const projectIdParam = searchParams.get('projectId');
  const [projectId, setProjectId] = useState<number | undefined>(projectIdParam ? Number(projectIdParam) : undefined);
  const [loading, setLoading] = useState(false);
  const [sampleFiles, setSampleFiles] = useState<TreeDataNode[]>([]);
  const [importOptions, setImportOptions] = useState<ImportOption[]>([]);
  const [existingProject, setExistingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [dirBrowserOpen, setDirBrowserOpen] = useState(false);

  useEffect(() => {
    if (taskCategory) {
      ProjectApi.getOptions(taskCategory, 'import').then(setImportOptions).catch(() => {});
    }
  }, [taskCategory]);

  useEffect(() => {
    if (!projectId) return;
    ProjectApi.get(projectId).then(proj => {
      setExistingProject(proj);
      form.setFieldsValue({
        name: proj.name,
        description: proj.description,
        dataDir: proj.dataDir,
      });
    });
  }, [projectId]);

  const handleLabelFormatChange = (format: string) => {
    const samplePath = `bear/${taskCategory}/${snake2camel(format)}/`;
    fetch(`/api/samples/structure?path=${encodeURIComponent(samplePath)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSampleFiles(arrayToTree(data, samplePath.replace(/\/$/, '')));
        }
      })
      .catch(() => setSampleFiles([]));
  };

  const handleSelectDirectory = (path: string) => {
    form.setFieldValue('dataDir', path);
  };

  const onTreeSelect = (keys: React.Key[]) => {
    if (keys.length > 0) {
      const key = keys[0] as string;
      window.open(`/api/samples/file?path=${encodeURIComponent(key)}`);
    }
  };

  const saveProject = async (values: any) => {
    setLoading(true);
    try {
      const allOptions: Record<string, string> = {};
      if (taskCategory === 'classification' && values.labelFormat) {
        allOptions.clasSubCatg = values.labelFormat === 'single_class' ? 'singleClass' : 'multiClass';
        allOptions.labelFormat = values.labelFormat === 'single_class' ? 'singleClassFolder' : 'multiClassList';
      } else if (values.labelFormat) {
        allOptions.labelFormat = values.labelFormat;
      }
      const projectData: Partial<Project> = {
        name: values.name,
        dataDir: values.dataDir,
        description: values.description,
        taskCategoryId: createInfo[taskCategory]?.id,
        otherSettings: { ...values },
        allOptions,
      };
      if (!projectId) {
        const newProject = await ProjectApi.create(projectData);
        navigate(`/${camel2snake(taskCategory)}?projectId=${newProject.projectId}`);
      } else {
        await ProjectApi.update(projectId, projectData);
        navigate(`/project_overview?projectId=${projectId}`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      message.error(`${t('component.PPCreator.creationFail')}: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const info = createInfo[taskCategory] || { labelKey: `global.${taskCategory}`, id: 0, desc: '' };
  const labelFormats = info.labelFormats || {};

  return (
    <div className="project-creator">
      <Spin tip={t('component.PPCreator.importInProgress')} spinning={loading} wrapperClassName="project-creator__spin">
        <div className="pc-layout">
          <div className="pc-form-col">
            <div className="pc-card pc-card--form">
              <div className="pc-card__header">
                {info.avatar && (
                  <img className="pc-card__avatar" src={info.avatar} alt={t(info.labelKey)} />
                )}
                <div>
                  <h1 className="pc-card__title-text">
                    {projectId ? `${t('component.PPCreator.update')} ` : ''}
                    {t(info.labelKey)} {t('component.PPCreator.project')}
                  </h1>
                  <p className="pc-card__subtitle">{info.desc}</p>
                </div>
              </div>

              <div className="pc-form-wrap">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={saveProject}
                  requiredMark="optional"
                  className="pc-form"
                >
                  <div className="pc-form-fields">
                    <Form.Item
                      name="name"
                      label={t('component.PPCreator.projectName')}
                      rules={[{ required: true, message: t('component.PPCreator.requireProjectName') }]}
                    >
                      <Input
                        size="large"
                        placeholder={t('component.PPCreator.anyString')}
                        prefix={<AimOutlined style={{ color: '#bfbfbf', marginRight: 4 }} />}
                      />
                    </Form.Item>

                    <Form.Item
                      name="dataDir"
                      label={t('component.PPCreator.datasetPath')}
                      rules={[{ required: true, message: t('component.PPCreator.requireDatasetPath') }]}
                    >
                      <Input.Search
                        size="large"
                        placeholder={t('component.PPCreator.absolutePath')}
                        prefix={<FolderOpenOutlined style={{ color: '#bfbfbf', marginRight: 4 }} />}
                        disabled={!!projectId}
                        enterButton={<SearchOutlined />}
                        onSearch={() => setDirBrowserOpen(true)}
                        readOnly
                        style={{ cursor: projectId ? 'not-allowed' : 'pointer' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label={t('component.PPCreator.description')}
                    >
                      <Input
                        size="large"
                        placeholder={t('component.PPCreator.anyString')}
                      />
                    </Form.Item>

                    {Object.keys(labelFormats).length > 0 && !projectId && (
                      <Form.Item
                        name="labelFormat"
                        label={
                          taskCategory === 'classification'
                            ? t('component.PPCreator.classificationSubcategory')
                            : t('component.PPCreator.labelFormat_')
                        }
                        rules={[{ required: taskCategory === 'classification', message: t('component.PPCreator.chooseClasSubcatg') }]}
                      >
                        <Select
                          size="large"
                          placeholder="Select a label format"
                          onChange={handleLabelFormatChange}
                          options={Object.entries(labelFormats).map(([k, v]) => ({
                            value: k,
                            label: (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircleFilled style={{ color: '#1890ff', fontSize: 13 }} />
                                <span style={{ fontWeight: 500 }}>{t('global.labelFormat.' + formatKey(k)) || k}</span>
                                {v && <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 4 }}>{v}</span>}
                              </span>
                            ),
                          }))}
                        />
                      </Form.Item>
                    )}
                  </div>

                  <div className="pc-actions">
                    <Button
                      htmlType="submit"
                      type="primary"
                      size="large"
                      className="pc-btn-submit"
                      loading={loading}
                    >
                      {projectId ? t('component.PPCreator.update') : t('component.PPCreator.create')}
                    </Button>
                    <Button
                      size="large"
                      className="pc-btn-cancel"
                      onClick={() => navigate(-1)}
                    >
                      {t('component.PPCreator.cancel')}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>

          <div className="pc-preview-col">
            <div className="pc-card pc-card--preview">
              <div className="pc-card__title">
                {t('component.PPCreator.sampleFolderStructure')}
              </div>
              <div className="pc-tree-wrap">
                {sampleFiles.length > 0 ? (
                  <Tree
                    className="pc-tree"
                    showLine={{ showLeafIcon: false }}
                    onSelect={onTreeSelect}
                    treeData={sampleFiles}
                    blockNode
                  />
                ) : (
                  <div className="pc-tree-empty">
                    <FolderOpenOutlined style={{ fontSize: 36, color: '#d0d7de', marginBottom: 8 }} />
                    <p>{t('component.PPCreator.selectLabelFormatView')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DirectoryBrowser
          open={dirBrowserOpen}
          onClose={() => setDirBrowserOpen(false)}
          onSelect={handleSelectDirectory}
          initialPath={form.getFieldValue('dataDir')}
        />
      </Spin>
    </div>
  );
}
