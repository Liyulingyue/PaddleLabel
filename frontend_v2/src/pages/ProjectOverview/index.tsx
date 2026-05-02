import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Card, Row, Col, Button, Progress, Modal, message, InputNumber, Input } from 'antd';
import { ArrowLeftOutlined, ImportOutlined, ExportOutlined, NodeExpandOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useProjectStore } from '@/stores/projectStore';
import { getProjectTasks, importProjectData, exportProject, splitProject } from '@/api/project';
import { getProjectProgress } from '@/api/project';
import { getTaskDatas } from '@/api/task';
import type { Task, Data } from '@/types';

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject } = useProjectStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [datas, setDatas] = useState<Data[]>([]);
  const [progress, setProgress] = useState({ finished: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [importVisible, setImportVisible] = useState(false);
  const [importDir, setImportDir] = useState('');
  const [exportVisible, setExportVisible] = useState(false);
  const [exportDir, setExportDir] = useState('');
  const [splitVisible, setSplitVisible] = useState(false);
  const [splitRatio, setSplitRatio] = useState({ train: 70, val: 20, test: 10 });

  useEffect(() => {
    if (id) {
      fetchProject(Number(id));
      loadTasks();
    }
  }, [id, fetchProject]);

  const loadTasks = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const taskList = await getProjectTasks(Number(id));
      setTasks(taskList);

      const allDatas: Data[] = [];
      for (const task of taskList) {
        try {
          const taskDatas = await getTaskDatas(task.task_id);
          allDatas.push(...taskDatas);
        } catch {}
      }
      setDatas(allDatas);

      const prog = await getProjectProgress(Number(id));
      setProgress(prog);
    } catch {}
    setLoading(false);
  };

  const handleImport = async () => {
    if (!id || !importDir) return;
    try {
      await importProjectData(Number(id), { import_dir: importDir });
      message.success('Import successful');
      loadTasks();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Import failed');
    }
    setImportVisible(false);
    setImportDir('');
  };

  const handleExport = async () => {
    if (!id || !exportDir) return;
    try {
      await exportProject(Number(id), { export_dir: exportDir });
      message.success('Export completed');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Export failed');
    }
    setExportVisible(false);
    setExportDir('');
  };

  const handleSplit = async () => {
    if (!id) return;
    try {
      await splitProject(Number(id), { train: splitRatio.train, val: splitRatio.val, test: splitRatio.test });
      message.success('Split successful');
      loadTasks();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Split failed');
    }
    setSplitVisible(false);
  };

  const getLabelingPath = () => {
    if (!currentProject) return '/';
    const typeMap: Record<number, string> = {
      1: 'classification',
      2: 'detection',
      3: 'semantic_segmentation',
      4: 'instance_segmentation',
      5: 'ocr',
      8: 'point',
    };
    return `/project/${id}/label/${typeMap[currentProject.task_category_id] || 'detection'}`;
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        Back
      </Button>

      <Card
        title={currentProject?.name}
        extra={
          <Button type="primary" onClick={() => navigate(getLabelingPath())}>
            <FormattedMessage id="project.startLabeling" />
          </Button>
        }
      >
        <p>{currentProject?.description || 'No description'}</p>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{tasks.length}</div>
              <div>Tasks</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{datas.length}</div>
              <div>Images</div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={<FormattedMessage id="project.progress" />}>
              <Progress percent={progress.total > 0 ? Math.round((progress.finished / progress.total) * 100) : 0} />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginTop: 16 }} title="Actions">
        <Button icon={<ImportOutlined />} onClick={() => setImportVisible(true)} style={{ marginRight: 8 }}>
          <FormattedMessage id="project.import" />
        </Button>
        <Button icon={<ExportOutlined />} onClick={() => setExportVisible(true)} style={{ marginRight: 8 }}>
          <FormattedMessage id="project.export" />
        </Button>
        <Button icon={<NodeExpandOutlined />} onClick={() => setSplitVisible(true)}>
          <FormattedMessage id="project.split" />
        </Button>
      </Card>

      <Card style={{ marginTop: 16 }} title={<FormattedMessage id="project.tasks" />}>
        {datas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            No images. Import data to get started.
          </div>
        ) : (
          <Row gutter={[8, 8]}>
            {datas.slice(0, 20).map((data) => (
              <Col xs={12} sm={8} md={6} lg={4} key={data.data_id}>
                <Card
                  size="small"
                  cover={
                    <img
                      src={`/api/datas/${data.data_id}/image${data.sault ? `?sault=${data.sault}` : ''}`}
                      alt=""
                      style={{ height: 100, objectFit: 'cover' }}
                    />
                  }
                  bodyStyle={{ padding: 8 }}
                >
                  <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
                    ID: {data.data_id}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={<FormattedMessage id="project.import" />}
        open={importVisible}
        onCancel={() => setImportVisible(false)}
        onOk={handleImport}
        okText="Import"
      >
        <p>Enter the absolute path of the folder containing images to import:</p>
        <Input
          placeholder="/absolute/path/to/images"
          value={importDir}
          onChange={(e) => setImportDir(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>

      <Modal
        title={<FormattedMessage id="project.export" />}
        open={exportVisible}
        onCancel={() => setExportVisible(false)}
        onOk={handleExport}
        okText="Export"
      >
        <p>Enter the absolute path for export:</p>
        <Input
          placeholder="/absolute/path/for/export"
          value={exportDir}
          onChange={(e) => setExportDir(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>

      <Modal
        title={<FormattedMessage id="project.split" />}
        open={splitVisible}
        onCancel={() => setSplitVisible(false)}
        onOk={handleSplit}
        okText="Split"
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <label>Train %</label>
            <InputNumber value={splitRatio.train} onChange={(v) => setSplitRatio({ ...splitRatio, train: v || 0 })} min={0} max={100} />
          </div>
          <div>
            <label>Val %</label>
            <InputNumber value={splitRatio.val} onChange={(v) => setSplitRatio({ ...splitRatio, val: v || 0 })} min={0} max={100} />
          </div>
          <div>
            <label>Test %</label>
            <InputNumber value={splitRatio.test} onChange={(v) => setSplitRatio({ ...splitRatio, test: v || 0 })} min={0} max={100} />
          </div>
        </div>
      </Modal>

      <Modal
        title={<FormattedMessage id="project.split" />}
        open={splitVisible}
        onCancel={() => setSplitVisible(false)}
        onOk={handleSplit}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <label>Train %</label>
            <InputNumber value={splitRatio.train} onChange={(v) => setSplitRatio({ ...splitRatio, train: v || 0 })} min={0} max={100} />
          </div>
          <div>
            <label>Val %</label>
            <InputNumber value={splitRatio.val} onChange={(v) => setSplitRatio({ ...splitRatio, val: v || 0 })} min={0} max={100} />
          </div>
          <div>
            <label>Test %</label>
            <InputNumber value={splitRatio.test} onChange={(v) => setSplitRatio({ ...splitRatio, test: v || 0 })} min={0} max={100} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
