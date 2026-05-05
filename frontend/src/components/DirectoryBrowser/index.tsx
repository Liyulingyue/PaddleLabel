import { useState, useEffect } from 'react';
import { Modal, List, Spin, message, Input } from 'antd';
import { FolderOutlined, FileOutlined, HomeOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProjectApi } from '@/services/api';
import { useTranslation } from 'react-i18next';
import './DirectoryBrowser.css';

interface DirectoryBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

interface DirItem {
  name: string;
  path: string;
  isDir: boolean;
}

export default function DirectoryBrowser({ open, onClose, onSelect, initialPath }: DirectoryBrowserProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<DirItem[]>([]);
  const [searchText, setSearchText] = useState('');

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const result = await ProjectApi.browseDirectory(path);
      setCurrentPath(result.currentPath);
      setParentPath(result.parentPath);
      setItems(result.items);
      setSearchText(result.currentPath);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDirectory(currentPath || '');
    }
  }, [open]);

  const handleItemClick = (item: DirItem) => {
    if (item.isDir) {
      loadDirectory(item.path);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onClose();
  };

  const handleGoToPath = () => {
    if (searchText.trim()) {
      loadDirectory(searchText.trim());
    }
  };

  return (
    <Modal
      title={t('component.PPCreator.selectDatasetPath') || 'Select Dataset Path'}
      open={open}
      onCancel={onClose}
      onOk={handleSelect}
      okText={t('global.ok')}
      cancelText={t('global.cancel')}
      width={650}
      styles={{ body: { padding: 0 } }}
      className="dir-browser-modal"
    >
      <div className="dir-browser">
        <div className="dir-browser__path-bar">
          {parentPath && (
            <button
              className="dir-browser__back-btn"
              onClick={() => loadDirectory(parentPath)}
              title="Parent directory"
            >
              <ArrowLeftOutlined />
            </button>
          )}
          <Input
            className="dir-browser__path-input"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={handleGoToPath}
            placeholder={t('component.PPCreator.enterPath') || 'Enter path...'}
            prefix={<HomeOutlined style={{ color: '#bfbfbf' }} />}
            suffix={
              <button
                className="dir-browser__refresh-btn"
                onClick={() => loadDirectory(currentPath)}
                title="Refresh"
              >
                <ReloadOutlined />
              </button>
            }
          />
        </div>

        <div className="dir-browser__list-wrap">
          <Spin spinning={loading}>
            {items.length > 0 ? (
              <List
                className="dir-browser__list"
                dataSource={items}
                renderItem={item => (
                  <List.Item
                    className={`dir-browser__item ${item.isDir ? 'dir-browser__item--folder' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="dir-browser__item-content">
                      {item.isDir ? (
                        <FolderOutlined className="dir-browser__icon dir-browser__icon--folder" />
                      ) : (
                        <FileOutlined className="dir-browser__icon" />
                      )}
                      <span className="dir-browser__name">{item.name}</span>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div className="dir-browser__empty">Empty directory</div>
            )}
          </Spin>
        </div>
      </div>
    </Modal>
  );
}
