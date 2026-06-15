import { useState, useEffect } from 'react';
import {
  Card, List, Button, Space, Typography, Alert, Modal, Input, Tag, Popconfirm, message,
} from 'antd';
import {
  FolderOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  getSavedTemplates, getSavedTemplate, deleteSavedTemplate, renameSavedTemplate, clearTemplateLibrary,
} from '../utils/templateStore';
import type { SavedTemplateSummary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Text } = Typography;

interface Props {
  onTemplateSelected: (template: TemplateData) => void;
  onTemplateDeleted?: (templateId: string) => void;
  currentTemplateId?: string;
}

export default function TemplateLibrary({ onTemplateSelected, onTemplateDeleted, currentTemplateId }: Props) {
  const [templates, setTemplates] = useState<SavedTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSavedTemplates();
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取本地模板库失败');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const templates = await loadTemplates();
      if (!cancelled) {
        setTemplates(templates);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = async (template: SavedTemplateSummary) => {
    try {
      const fullTemplate = await getSavedTemplate(template.id);
      if (!fullTemplate) {
        messageApi.error('模板数据不存在，请刷新列表');
        return;
      }

      const arrayBuffer = await fullTemplate.templateBlob.arrayBuffer();
      const templateData: TemplateData = {
        id: fullTemplate.id,
        name: fullTemplate.name,
        fileName: fullTemplate.originalFileName,
        variables: fullTemplate.variables,
        rawArrayBuffer: arrayBuffer,
        createdAt: fullTemplate.createdAt,
      };

      onTemplateSelected(templateData);
      messageApi.success(`已加载模板：${fullTemplate.name}`);
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '加载模板失败');
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      messageApi.warning('模板名称不能为空');
      return;
    }
    
    try {
      await renameSavedTemplate(id, editName.trim());
      setEditingId(null);
      await loadTemplates();
      messageApi.success('重命名成功');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '重命名失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedTemplate(id);
      const templates = await loadTemplates();
      setTemplates(templates);
      
      // Notify parent if deleting current template
      if (currentTemplateId === id && onTemplateDeleted) {
        onTemplateDeleted(id);
        messageApi.info('已删除当前使用的模板，模板仍可继续使用直到刷新页面');
      } else {
        messageApi.success('删除成功');
      }
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空模板库',
      icon: <ExclamationCircleOutlined />,
      content: '确定要清空本地模板库吗？此操作不可恢复。',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await clearTemplateLibrary();
          const templates = await loadTemplates();
          setTemplates(templates);
          
          // Notify parent if there was a current template
          if (currentTemplateId && onTemplateDeleted) {
            onTemplateDeleted(currentTemplateId);
            messageApi.info('模板库已清空，当前使用的模板仍可继续使用直到刷新页面');
          } else {
            messageApi.success('模板库已清空');
          }
        } catch (err) {
          messageApi.error(err instanceof Error ? err.message : '清空失败');
        }
      },
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {contextHolder}
      <Card
        title={
          <Space>
            <FolderOutlined />
            <span>本地模板库</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                const templates = await loadTemplates();
                setTemplates(templates);
              }}
              loading={loading}
              size="small"
            >
              刷新
            </Button>
            {templates.length > 0 && (
              <Popconfirm
                title="确认清空模板库"
                description="此操作不可恢复，确定要继续吗？"
                onConfirm={handleClearAll}
                okText="确认"
                cancelText="取消"
                okType="danger"
              >
                <Button icon={<DeleteOutlined />} size="small" danger>
                  清空
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Alert
          type="info"
          showIcon
          message="本地模板库仅保存在当前浏览器 IndexedDB 中，不会上传服务器。清理浏览器数据、换电脑或换浏览器后，模板库可能丢失。请不要把唯一的重要模板只保存在浏览器中，建议保留原始 .docx 文件备份。"
          style={{ marginBottom: 16, fontSize: 12 }}
        />

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
            {loading ? '加载中...' : '本地模板库为空，请上传模板后保存'}
          </div>
        ) : (
          <List
            loading={loading}
            dataSource={templates}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="select"
                    type={currentTemplateId === item.id ? 'primary' : 'default'}
                    size="small"
                    onClick={() => handleSelect(item)}
                  >
                    {currentTemplateId === item.id ? '使用中' : '选择'}
                  </Button>,
                  <Button
                    key="rename"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确认删除此模板？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    editingId === item.id ? (
                      <Space>
                        <Input
                          size="small"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onPressEnter={() => handleRename(item.id)}
                          style={{ width: 200 }}
                          autoFocus
                        />
                        <Button size="small" type="primary" onClick={() => handleRename(item.id)}>
                          保存
                        </Button>
                        <Button size="small" onClick={() => setEditingId(null)}>
                          取消
                        </Button>
                      </Space>
                    ) : (
                      <Text strong>{item.name}</Text>
                    )
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        原文件：{item.originalFileName}
                      </Text>
                      <Space size={16}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          变量：{item.variables.length} 个
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          大小：{formatSize(item.size)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新：{formatDate(item.updatedAt)}
                        </Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        {item.variables.slice(0, 5).map((v) => (
                          <Tag key={v} color="blue" style={{ marginBottom: 2, fontSize: 11 }}>
                            {`{{${v}}}`}
                          </Tag>
                        ))}
                        {item.variables.length > 5 && (
                          <Tag style={{ marginBottom: 2, fontSize: 11 }}>
                            +{item.variables.length - 5}
                          </Tag>
                        )}
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
}