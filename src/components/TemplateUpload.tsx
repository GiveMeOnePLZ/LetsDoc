import { useState } from 'react';
import { Upload, Card, Tag, Typography, Alert, Space, Button, message } from 'antd';
import { InboxOutlined, FileTextOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { parseTemplate } from '../utils/templateParser';
import { saveLastTemplate } from '../utils/storage';
import { saveTemplateToLibrary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Dragger } = Upload;
const { Text } = Typography;

interface Props {
  template: TemplateData | null;
  onTemplateLoaded: (template: TemplateData) => void;
  onTemplateCleared: () => void;
  onTemplateSaved?: () => void;
}

export default function TemplateUpload({
  template,
  onTemplateLoaded,
  onTemplateCleared,
  onTemplateSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleUpload = async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith('.docx')) {
      if (file.name.toLowerCase().endsWith('.doc')) {
        setError('当前版本暂不支持 .doc 模板。请先使用 Word/WPS/LibreOffice 将文件另存为 .docx 后再上传。为保证格式稳定，系统仅处理 .docx 模板。');
      } else {
        setError('只支持 .docx 格式的模板文件，请选择 .docx 文件。');
      }
      return false;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseTemplate(buffer);

      if (result.errors.length > 0) {
        setError(result.errors.join('；'));
        setLoading(false);
        return false;
      }

      const templateData: TemplateData = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.docx$/i, ''),
        fileName: file.name,
        variables: result.variables,
        rawArrayBuffer: buffer,
        createdAt: Date.now(),
      };

      saveLastTemplate({
        templateName: templateData.name,
        variables: templateData.variables,
        updatedAt: Date.now(),
        lastMode: 'manual',
      });

      onTemplateLoaded(templateData);
    } catch {
      setError('读取文件失败，请重试。');
    } finally {
      setLoading(false);
    }

    return false;
  };

  const handleSaveToLibrary = async () => {
    if (!template) return;
    
    setSaving(true);
    try {
      const blob = new Blob([template.rawArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      await saveTemplateToLibrary({
        name: template.name,
        originalFileName: template.fileName,
        variables: template.variables,
        templateBlob: blob,
      });
      messageApi.success('模板已保存到本地模板库');
      onTemplateSaved?.();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (template) {
    return (
      <>
        {contextHolder}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>当前模板</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveToLibrary}
                loading={saving}
                size="small"
              >
                保存到本地模板库
              </Button>
              <a
                onClick={() => {
                  onTemplateCleared();
                  setError(null);
                }}
                style={{ color: '#ff4d4f' }}
              >
                <DeleteOutlined /> 移除模板
              </a>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>{template.fileName}</Text>
            <div>
              <Text type="secondary" style={{ marginRight: 8 }}>
                变量 ({template.variables.length}):
              </Text>
              {template.variables.map((v) => (
                <Tag key={v} color="blue" style={{ marginBottom: 4 }}>
                  {`{{${v}}}`}
                </Tag>
              ))}
            </div>
          </Space>
        </Card>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <div>
        <Dragger
          accept=".docx"
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 .docx 模板文件到此处</p>
          <p className="ant-upload-hint">
            支持标准 Word 模板，使用 {'{{变量名}}'} 格式定义可替换内容
          </p>
        </Dragger>
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 12 }}
          />
        )}
      </div>
    </>
  );
}
