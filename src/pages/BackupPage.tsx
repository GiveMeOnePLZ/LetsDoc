import { useState, useRef } from 'react';
import {
  Typography, Card, Button, Space, Alert, Descriptions, Divider, Modal, message,
} from 'antd';
import {
  ExportOutlined, UploadOutlined,
} from '@ant-design/icons';
import { exportTemplateLibrary, parseTemplateBackup, importTemplateBackup } from '../utils/templateBackup';
import { saveTemplateToLibrary } from '../utils/templateStore';
import { APP_VERSION } from '../utils/constants';
import type { LetsDocBackupManifest } from '../utils/templateBackup';

const { Title, Text } = Typography;

interface Props {
  onTemplateSaved?: () => void;
}

export default function BackupPage({ onTemplateSaved }: Props) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    manifest: LetsDocBackupManifest;
    conflictCount: number;
    newCount: number;
  } | null>(null);
  const [importParsed, setImportParsed] = useState<Awaited<ReturnType<typeof parseTemplateBackup>> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTemplateLibrary(APP_VERSION);
      messageApi.success('模板库导出成功');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseTemplateBackup(file);
      setImportPreview({
        manifest: parsed.manifest,
        conflictCount: 0,
        newCount: parsed.manifest.templates.length,
      });
      setImportParsed(parsed);
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importParsed) return;
    setImporting(true);
    try {
      const result = await importTemplateBackup(importParsed, saveTemplateToLibrary);
      messageApi.success(`导入完成：成功 ${result.imported} 个，跳过 ${result.skipped} 个`);
      setImportPreview(null);
      setImportParsed(null);
      onTemplateSaved?.();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minWidth: 0 }}>
      {contextHolder}
      <Title level={4} style={{ marginBottom: 24 }}>模板库备份</Title>

      <Card title="导出模板库" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text type="secondary" style={{ overflowWrap: 'anywhere' }}>
            将本地模板库导出为备份文件，可在其他浏览器或电脑中导入恢复。
          </Text>
          <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
            导出为 .letsdoc
          </Button>
          <Alert 
            type="info" 
            showIcon 
            message="备份文件使用 .letsdoc 格式。" 
            style={{ fontSize: 12 }} 
          />
        </Space>
      </Card>

      <Card title="导入模板库" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text type="secondary" style={{ overflowWrap: 'anywhere' }}>
            从备份文件恢复模板库。支持 .letsdoc 格式。
          </Text>
      <input
        ref={fileInputRef}
        type="file"
        accept=".letsdoc"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} loading={importing}>
            选择备份文件
          </Button>
        </Space>
      </Card>

      <Card size="small" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={8}>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            从备份文件恢复模板库。支持 .letsdoc 格式。
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            请仅导入你信任来源的备份文件。
          </Text>
        </Space>
      </Card>

      <Modal
        title="导入预览"
        open={!!importPreview}
        onOk={handleImportConfirm}
        onCancel={() => { setImportPreview(null); setImportParsed(null); }}
        okText="确认导入"
        cancelText="取消"
        confirmLoading={importing}
        width={600}
      >
        {importPreview && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert 
              type="warning" 
              showIcon 
              message="同名模板将覆盖当前本地模板库中的已有模板。" 
              style={{ marginBottom: 12 }} 
            />
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="应用">{importPreview.manifest.app}</Descriptions.Item>
              <Descriptions.Item label="版本">{importPreview.manifest.version}</Descriptions.Item>
              <Descriptions.Item label="导出时间">
                {new Date(importPreview.manifest.exportedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="模板总数">{importPreview.manifest.templates.length} 个</Descriptions.Item>
            </Descriptions>
            <Divider plain style={{ margin: '8px 0' }}>模板列表</Divider>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {importPreview.manifest.templates.map((t) => (
                <div key={t.id} style={{ fontSize: 12, lineHeight: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name} <Text type="secondary">({t.variables.length} 个变量)</Text>
                </div>
              ))}
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
