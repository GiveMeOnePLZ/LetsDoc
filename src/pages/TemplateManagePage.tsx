import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout, Typography, Card, List, Button, Space, Input, Tag, Popconfirm, Empty, message,
} from 'antd';
import {
  SearchOutlined, EditOutlined, DeleteOutlined, FileTextOutlined,
} from '@ant-design/icons';
import {
  getSavedTemplates, getSavedTemplate, deleteSavedTemplate, renameSavedTemplate,
} from '../utils/templateStore';
import { setHash } from '../utils/router';
import type { SavedTemplateSummary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Content, Sider } = Layout;
const { Text } = Typography;

interface Props {
  template: TemplateData | null;
  onTemplateLoaded: (template: TemplateData) => void;
}

export default function TemplateManagePage({ template: currentTemplate, onTemplateLoaded }: Props) {
  const [templates, setTemplates] = useState<SavedTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const didLoadRef = useRef(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSavedTemplates();
      setTemplates(list.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch {
      messageApi.error('读取模板库失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = templates.filter((t) =>
    searchText === '' || t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const selected = templates.find((t) => t.id === selectedId) || null;

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setEditingId(null);
  };

  const handleLoadTemplate = async (id: string) => {
    const full = await getSavedTemplate(id);
    if (!full) { messageApi.error('模板数据不存在'); return; }
    const arrayBuffer = await full.templateBlob.arrayBuffer();
    onTemplateLoaded({
      id: full.id,
      name: full.name,
      fileName: full.originalFileName,
      variables: full.variables,
      rawArrayBuffer: arrayBuffer,
      createdAt: full.createdAt,
    });
    setHash('generate');
    messageApi.success(`已加载模板：${full.name}`);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) { messageApi.warning('名称不能为空'); return; }
    try {
      await renameSavedTemplate(id, editName.trim());
      setEditingId(null);
      await loadTemplates();
      messageApi.success('重命名成功');
    } catch { messageApi.error('重命名失败'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedTemplate(id);
      if (selectedId === id) setSelectedId(null);
      await loadTemplates();
      messageApi.success('删除成功');
    } catch { messageApi.error('删除失败'); }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Layout style={{ background: 'transparent', height: '100%', minWidth: 0 }}>
      {contextHolder}
      <Sider
        width={340}
        style={{
          background: 'transparent',
          borderRight: '1px solid #f0f0f0',
          paddingRight: 16,
          overflow: 'auto',
          flexShrink: 0
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索模板..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>共 {templates.length} 个模板</Text>
          <Button size="small" onClick={loadTemplates} loading={loading}>刷新</Button>
        </div>
        {filtered.length === 0 ? (
          <Empty description="暂无模板" style={{ marginTop: 40 }} />
        ) : (
          <List
            loading={loading}
            dataSource={filtered}
            renderItem={(item) => (
              <List.Item
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: selectedId === item.id ? '#e6f4ff' : 'transparent',
                  border: selectedId === item.id ? '1px solid #91caff' : '1px solid transparent',
                  marginBottom: 8,
                }}
                onClick={() => handleSelect(item.id)}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 4 }} />}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {item.name}
                      </Text>
                      {currentTemplate?.id === item.id && <Tag color="blue" style={{ fontSize: 11, flexShrink: 0 }}>当前</Tag>}
                    </div>
                  }
                  description={
                    <div style={{ overflow: 'hidden' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.originalFileName}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11, marginRight: 12 }}>{item.variables.length} 个变量</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(item.updatedAt)}</Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Sider>

      <Content style={{ overflow: 'auto', padding: '24px 32px', minWidth: 0 }}>
        {selected ? (
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span className="text-ellipsis" style={{ maxWidth: 300 }}>{selected.name}</span>
              </Space>
            }
            extra={
              <Space>
                <Button type="primary" size="small" onClick={() => handleLoadTemplate(selected.id)}>
                  设为当前模板
                </Button>
                <Button size="small" onClick={() => setHash('generate')}>
                  进入文书生成
                </Button>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>模板名称</Text>
                {editingId === selected.id ? (
                  <Space>
                    <Input
                      size="small"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onPressEnter={() => handleRename(selected.id)}
                      style={{ width: 200 }}
                      autoFocus
                    />
                    <Button size="small" type="primary" onClick={() => handleRename(selected.id)}>保存</Button>
                    <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
                  </Space>
                ) : (
                  <Space>
                    <Text strong className="text-ellipsis" style={{ maxWidth: '70%' }}>{selected.name}</Text>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingId(selected.id); setEditName(selected.name); }} />
                  </Space>
                )}
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>原文件名</Text>
                <Text className="text-ellipsis" style={{ display: 'block' }}>{selected.originalFileName}</Text>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>变量清单（{selected.variables.length} 个）</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selected.variables.map((v) => (
                    <Tag
                      key={v}
                      color="blue"
                      style={{
                        maxWidth: 150,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {`{{${v}}}`}
                    </Tag>
                  ))}
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>更新时间</Text>
                <Text>{formatDate(selected.updatedAt)}</Text>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>文件大小</Text>
                <Text>{selected.size < 1024 ? `${selected.size} B` : selected.size < 1048576 ? `${(selected.size / 1024).toFixed(1)} KB` : `${(selected.size / 1048576).toFixed(1)} MB`}</Text>
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
                <Popconfirm
                  title="确认删除此模板？"
                  onConfirm={() => handleDelete(selected.id)}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button icon={<DeleteOutlined />} danger>删除模板</Button>
                </Popconfirm>
              </div>
            </Space>
          </Card>
        ) : (
          <Card style={{ borderRadius: 12, textAlign: 'center', padding: '60px 0' }}>
            <Empty description="请选择左侧模板查看详情" />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
