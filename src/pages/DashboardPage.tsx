import { useEffect, useState } from 'react';
import { Typography, Card, Space, Button, Statistic, Row, Col, Upload, message, Tag, Collapse } from 'antd';
import {
  UploadOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { parseTemplate } from '../utils/templateParser';
import { saveLastTemplate, getLastTemplate } from '../utils/storage';
import { getSavedTemplates, getSavedTemplate } from '../utils/templateStore';
import { setHash } from '../utils/router';
import { APP_VERSION } from '../utils/constants';
import type { SavedTemplateSummary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Title, Text, Paragraph } = Typography;

interface Props {
  onTemplateLoaded: (template: TemplateData) => void;
}

export default function DashboardPage({ onTemplateLoaded }: Props) {
  const [templates, setTemplates] = useState<SavedTemplateSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const lastTemplate = getLastTemplate();

  useEffect(() => {
    getSavedTemplates()
      .then((list) => setTemplates(list.sort((a, b) => b.updatedAt - a.updatedAt)))
      .catch(() => {});
  }, []);

  const handleTemplateUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      messageApi.error('只支持 .docx 模板文件');
      return false;
    }

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseTemplate(buffer);
      if (result.errors.length > 0) {
        messageApi.error(result.errors.join('；'));
        return false;
      }

      const template: TemplateData = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.docx$/i, ''),
        fileName: file.name,
        variables: result.variables,
        rawArrayBuffer: buffer,
        createdAt: Date.now(),
      };

      saveLastTemplate({
        templateName: template.name,
        variables: template.variables,
        updatedAt: Date.now(),
        lastMode: 'manual',
      });

      onTemplateLoaded(template);
      setHash('generate');
      messageApi.success(`已载入模板：${template.name}`);
    } catch {
      messageApi.error('读取模板失败，请重试');
    } finally {
      setUploading(false);
    }

    return false;
  };

  const handleUseSavedTemplate = async (template: SavedTemplateSummary) => {
    try {
      const full = await getSavedTemplate(template.id);
      if (!full) {
        messageApi.error('模板数据不存在，请刷新模板库');
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
    } catch {
      messageApi.error('加载模板失败');
    }
  };

  const recentTemplates = templates.slice(0, 3);

  return (
    <div className="dashboard-page page-fade-in">
      {contextHolder}
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <Tag color="blue" className="trust-tag">
            <SafetyCertificateOutlined /> 本地处理，不上传文件
          </Tag>
          <Title level={2}>选择模板，填写数据，生成文书</Title>
          <Paragraph>
            LetsDoc 是面向日常公文和文书场景的本地化模板生成工具。上传 Word 模板，或从本地模板库选择常用模板，即可开始生成。
          </Paragraph>
          <Space wrap size={12}>
            <Upload accept=".docx" showUploadList={false} beforeUpload={handleTemplateUpload}>
              <Button type="primary" size="large" icon={<UploadOutlined />} loading={uploading}>
                上传 .docx 模板
              </Button>
            </Upload>
            <Button size="large" icon={<FolderOpenOutlined />} onClick={() => setHash('templates')}>
              打开模板库
            </Button>
          </Space>
        </div>
        <div className="workspace-hero-panel">
          <div className="hero-step is-active">
            <span>1</span>
            <div>
              <strong>选择模板</strong>
              <p>上传新模板，或复用本地模板库。</p>
            </div>
          </div>
          <div className="hero-step">
            <span>2</span>
            <div>
              <strong>填写数据</strong>
              <p>支持网页录入和 Excel 导入。</p>
            </div>
          </div>
          <div className="hero-step">
            <span>3</span>
            <div>
              <strong>生成文书</strong>
              <p>单份下载或批量打包为 zip。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-guide" aria-labelledby="home-guide-title">
        <div className="home-guide-heading">
          <div>
            <Title level={4} id="home-guide-title">使用说明</Title>
            <Text type="secondary">准备模板时，请先在 Word 中设置好变量。</Text>
          </div>
          <Tag color="error">仅支持 .docx 模板</Tag>
        </div>
        <div className="home-guide-grid">
          <div className="home-guide-step">
            <span>1</span>
            <div>
              <strong>在 Word 中添加变量</strong>
              <p>用双花括号包住变量名，并一次完整输入。</p>
            </div>
          </div>
          <div className="home-guide-step">
            <span>2</span>
            <div>
              <strong>上传并填写数据</strong>
              <p>网页直接填写，或导入表头与变量名一致的 Excel。</p>
            </div>
          </div>
          <div className="home-guide-step">
            <span>3</span>
            <div>
              <strong>生成文书</strong>
              <p>一行数据生成一份文书，多行数据自动批量生成。</p>
            </div>
          </div>
        </div>
        <div className="variable-guide">
          <div>
            <Text type="secondary">推荐写法</Text>
            <code>{'{{姓名}}'}</code>
            <code>{'{{合同编号}}'}</code>
            <code>{'{{金额_大写}}'}</code>
          </div>
          <div>
            <Text type="secondary">不要这样写</Text>
            <code className="is-invalid">{'{姓名}'}</code>
            <code className="is-invalid">{'{{姓名'}</code>
            <code className="is-invalid">{'{{姓{名}}}'}</code>
          </div>
          <Text type="secondary" className="variable-guide-note">
            同一变量可重复使用；为方便 Excel 匹配，建议变量名保持简短，不加空格和复杂符号。
          </Text>
        </div>
        <Collapse
          className="home-example-collapse"
          ghost
          items={[
            {
              key: 'example-template',
              label: '示例文件：付款通知模板',
              children: (
                <div className="example-template-detail">
                  <div>
                    <Text strong>模板内容</Text>
                    <p>根据合同 <code>{'{{合同编号}}'}</code>，通知 <code>{'{{姓名}}'}</code> 在指定日期前完成付款。</p>
                    <Text type="secondary">包含变量：姓名、合同编号、付款日期、金额、收款单位</Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href="/examples/letsdoc-example-template.docx"
                    download="LetsDoc-付款通知示例模板.docx"
                  >
                    下载示例模板
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} md={8}>
          <Card className="soft-card">
            <Statistic title="本地模板" value={templates.length} prefix={<DatabaseOutlined />} suffix="个" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="soft-card">
            <Statistic title="最近模板" value={lastTemplate ? lastTemplate.variables.length : 0} prefix={<FileTextOutlined />} suffix="个变量" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="soft-card">
            <Statistic title="当前版本" value={APP_VERSION} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        className="soft-card"
        title="最近模板"
        extra={<Button type="link" onClick={() => setHash('templates')}>查看全部</Button>}
      >
        {recentTemplates.length === 0 ? (
          <div className="empty-inline">
            <Text type="secondary">还没有保存模板。上传模板后，可以保存到本地模板库反复使用。</Text>
          </div>
        ) : (
          <div className="recent-template-grid">
            {recentTemplates.map((template) => (
              <button
                type="button"
                className="template-card-button"
                key={template.id}
                onClick={() => handleUseSavedTemplate(template)}
              >
                <div>
                  <FileTextOutlined />
                  <strong>{template.name}</strong>
                  <span>{template.variables.length} 个变量</span>
                </div>
                <ArrowRightOutlined />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
