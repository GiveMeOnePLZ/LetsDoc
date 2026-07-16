import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Typography, Card, Button, Space, Input, Tag, Popconfirm, Empty, message, Dropdown, Row, Col, Modal,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  MoreOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  getSavedTemplates, getSavedTemplate, deleteSavedTemplate, renameSavedTemplate,
} from '../utils/templateStore';
import { setHash } from '../utils/router';
import { exportTemplateLibrary, importTemplateBackup, parseTemplateBackup } from '../utils/templateBackup';
import { saveTemplateToLibrary } from '../utils/templateStore';
import { APP_VERSION } from '../utils/constants';
import type { SavedTemplateSummary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Title, Text, Paragraph } = Typography;

interface Props {
  template: TemplateData | null;
  onTemplateLoaded: (template: TemplateData) => void;
}

export default function TemplateManagePage({ template: currentTemplate, onTemplateLoaded }: Props) {
  const [templates, setTemplates] = useState<SavedTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    void Promise.resolve().then(loadTemplates);
  }, [loadTemplates]);

  const filtered = templates.filter((t) =>
    searchText === '' || t.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleLoadTemplate = async (id: string) => {
    const full = await getSavedTemplate(id);
    if (!full) {
      messageApi.error('模板数据不存在');
      return;
    }

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
    if (!editName.trim()) {
      messageApi.warning('名称不能为空');
      return;
    }
    try {
      await renameSavedTemplate(id, editName.trim());
      setEditingId(null);
      await loadTemplates();
      messageApi.success('重命名成功');
    } catch {
      messageApi.error('重命名失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedTemplate(id);
      await loadTemplates();
      messageApi.success('删除成功');
    } catch {
      messageApi.error('删除失败');
    }
  };

  const handleExport = async () => {
    try {
      await exportTemplateLibrary(APP_VERSION);
      messageApi.success('模板库导出成功');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导出失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseTemplateBackup(file);
      const result = await importTemplateBackup(parsed, saveTemplateToLibrary);
      messageApi.success(`导入完成：成功 ${result.imported} 个，跳过 ${result.skipped} 个`);
      await loadTemplates();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="templates-page page-fade-in">
      {contextHolder}
      <input ref={fileInputRef} type="file" accept=".letsdoc" style={{ display: 'none' }} onChange={handleImport} />

      <section className="page-heading">
        <div>
          <Title level={3}>模板库</Title>
          <Paragraph>管理常用 Word 模板。模板保存在当前浏览器 IndexedDB 中，不会上传服务器。</Paragraph>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadTemplates} loading={loading}>刷新</Button>
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>导入</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={templates.length === 0}>导出</Button>
        </Space>
      </section>

      <Card className="soft-card template-toolbar-card">
        <div className="template-toolbar">
          <Input
            placeholder="搜索模板"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Text type="secondary">共 {templates.length} 个模板</Text>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="soft-card empty-template-card">
          <Empty description="暂无模板" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((item) => (
            <Col key={item.id} xs={24} md={12} xl={8}>
              <Card className={`template-tile soft-card ${currentTemplate?.id === item.id ? 'is-current' : ''}`}>
                <div className="template-tile-head">
                  <div className="template-tile-icon">
                    <FileTextOutlined />
                  </div>
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'rename', label: '重命名', icon: <EditOutlined /> },
                        { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'rename') {
                          setEditingId(item.id);
                          setEditName(item.name);
                        } else if (key === 'delete') {
                          Modal.confirm({
                            title: '确认删除此模板？',
                            content: item.name,
                            okText: '确认',
                            cancelText: '取消',
                            okType: 'danger',
                            onOk: () => handleDelete(item.id),
                          });
                        }
                      },
                    }}
                  >
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>

                {editingId === item.id ? (
                  <Space.Compact block>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} onPressEnter={() => handleRename(item.id)} autoFocus />
                    <Button type="primary" onClick={() => handleRename(item.id)}>保存</Button>
                    <Button onClick={() => setEditingId(null)}>取消</Button>
                  </Space.Compact>
                ) : (
                  <Title level={5} className="template-tile-title">{item.name}</Title>
                )}

                <Text type="secondary" className="template-tile-file">{item.originalFileName}</Text>
                <div className="template-tile-meta">
                  <span>{item.variables.length} 个变量</span>
                  <span>{formatSize(item.size)}</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </div>
                <div className="template-library-tags">
                  {item.variables.slice(0, 5).map((v) => (
                    <Tag key={v} color="blue">{`{{${v}}}`}</Tag>
                  ))}
                  {item.variables.length > 5 && <Tag>+{item.variables.length - 5}</Tag>}
                </div>
                <div className="template-tile-actions">
                  <Button type="primary" block onClick={() => handleLoadTemplate(item.id)}>
                    {currentTemplate?.id === item.id ? '继续使用' : '使用模板'}
                  </Button>
                  <Popconfirm title="确认删除此模板？" onConfirm={() => handleDelete(item.id)} okText="确认" cancelText="取消">
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
