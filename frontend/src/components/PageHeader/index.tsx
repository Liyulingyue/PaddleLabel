import { useEffect, useState, ReactNode } from 'react';
import { Tag, Button, Space } from 'antd';
import { HomeOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ProjectApi } from '@/services/api';
import type { Project } from '@/services/types';

const TASK_CATEGORY_CONFIG: Record<string, { color: string }> = {
  classification: { color: '#722ed1' },
  detection: { color: '#fa8c16' },
  semantic_segmentation: { color: '#1890ff' },
  instance_segmentation: { color: '#52c41a' },
  optical_character_recognition: { color: '#eb2f96' },
  point: { color: '#fa541c' },
};

interface Props {
  projectId: string;
  categoryLabel?: string;
  actions?: ReactNode;
  showBack?: boolean;
}

export default function PageHeader({ projectId, categoryLabel, actions, showBack = true }: Props) {
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);

  const catName = project?.taskCategory?.name || '';
  const config = TASK_CATEGORY_CONFIG[catName] || TASK_CATEGORY_CONFIG.classification;

  useEffect(() => {
    if (!projectId) return;
    ProjectApi.get(Number(projectId)).then(setProject);
  }, [projectId]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
      padding: '12px 16px',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      flexShrink: 0,
    }}>
      {showBack && (
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate('/')}
          style={{ color: '#595959' }}
        />
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <HomeOutlined 
          onClick={() => navigate('/')} 
          style={{ fontSize: 18, color: '#8c8c8c', cursor: 'pointer' }} 
        />
        <span style={{ color: '#d9d9d9' }}>/</span>
        <span 
          onClick={() => navigate(`/project_overview?projectId=${projectId}`)}
          style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: '#262626',
            cursor: 'pointer',
          }}
        >
          {project?.name || '...'}
        </span>
        {categoryLabel && (
          <>
            <span style={{ color: '#d9d9d9' }}>/</span>
            <Tag 
              color={config.color} 
              style={{ 
                fontSize: 14, 
                padding: '2px 10px',
                borderRadius: 4,
                margin: 0,
              }}
            >
              {categoryLabel}
            </Tag>
          </>
        )}
      </div>

      {actions && (
        <Space size="small">
          {actions}
        </Space>
      )}
    </div>
  );
}
