import { useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import {
  ArrowLeftOutlined,
  FolderOpenOutlined,
  CameraOutlined,
  AimOutlined,
  ScanOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './SampleProjects.css';

const SAMPLE_PROJECTS = [
  {
    id: 'bear_detection',
    name: 'Bear Detection Sample',
    description: 'Sample object detection project with bear images for COCO format annotation',
    type: 'Object Detection',
    task_category_id: 2,
    icon: <AimOutlined />,
    color: '#fa8c16',
    img: '/pics/object_detection.jpg',
  },
  {
    id: 'flower_classification',
    name: 'Flower Classification Sample',
    description: 'Sample image classification project with flower categories',
    type: 'Classification',
    task_category_id: 1,
    icon: <CameraOutlined />,
    color: '#722ed1',
    img: '/pics/classification.jpg',
  },
  {
    id: 'city_segmentation',
    name: 'City Segmentation Sample',
    description: 'Sample semantic segmentation with city street images',
    type: 'Semantic Segmentation',
    task_category_id: 3,
    icon: <ScanOutlined />,
    color: '#1890ff',
    img: '/pics/semantic_segmentation.jpg',
  },
];

const CLASSIFICATION_FORMAT = `dataset/
├── cat/
│   ├── img1.jpg
│   └── img2.jpg
├── dog/
│   ├── img3.jpg
│   └── img4.jpg
└── bird/
    ├── img5.jpg
    └── img6.jpg`;

const DETECTION_FORMAT = `dataset/
├── JPEGImages/
│   ├── img1.jpg
│   └── img2.jpg
├── Annotations/
│   ├── img1.xml
│   └── img2.xml
└── (or .png masks for segmentation)`;

export default function SampleProjects() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLoadSample = async (sample: typeof SAMPLE_PROJECTS[0]) => {
    navigate('/project/create?taskCategory=' + sample.name.toLowerCase().replace(/\s+/g, '_').replace('detection', 'detection').replace('classification', 'classification').replace('segmentation', 'semanticSegmentation'));
  };

  return (
    <div className="sp-page">
      <div className="sp-page__header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          className="sp-back-btn"
        >
          {t('pages.welcome.backToProjects')}
        </Button>
        <div>
          <h1 className="sp-page__title">{t('pages.welcome.sampleProjects')}</h1>
          <p className="sp-page__subtitle">{t('pages.welcome.sampleProjectsTip')}</p>
        </div>
      </div>

      <div className="sp-card">
        <Row gutter={[20, 20]}>
          {SAMPLE_PROJECTS.map((sample) => (
            <Col xs={24} sm={12} md={8} key={sample.id}>
              <div className="sp-sample-card">
                <div className="sp-sample-card__img-wrap">
                  <img className="sp-sample-card__img" src={sample.img} alt={sample.name} />
                  <div className="sp-sample-card__badge" style={{ background: sample.color }}>
                    <span className="sp-sample-card__badge-icon">{sample.icon}</span>
                    <span>{sample.type}</span>
                  </div>
                </div>
                <div className="sp-sample-card__body">
                  <h3 className="sp-sample-card__name">{sample.name}</h3>
                  <p className="sp-sample-card__desc">{sample.description}</p>
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    className="sp-use-btn"
                    onClick={() => handleLoadSample(sample)}
                    block
                  >
                    {t('pages.welcome.useThisFormat')}
                  </Button>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <div className="sp-card" style={{ marginTop: 24 }}>
        <h2 className="sp-card__title">{t('pages.welcome.dataFormatReference')}</h2>
        <Row gutter={[20, 20]}>
          <Col xs={24} md={12}>
            <div className="sp-format-block">
              <div className="sp-format-block__header">
                <CameraOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                {t('pages.welcome.classificationFormat')}
              </div>
              <pre className="sp-format-block__code">{CLASSIFICATION_FORMAT}</pre>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="sp-format-block">
              <div className="sp-format-block__header">
                <AimOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                {t('pages.welcome.detectionSegmentationFormat')}
              </div>
              <pre className="sp-format-block__code">{DETECTION_FORMAT}</pre>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
