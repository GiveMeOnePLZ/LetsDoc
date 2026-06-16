import { useState, useEffect } from 'react';
import { Typography, Card, Space, Button, Statistic, Row, Col } from 'antd';
import {
  FormOutlined, FolderOutlined, CloudDownloadOutlined, SettingOutlined,
  FileTextOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import { setHash } from '../utils/router';
import { getLastTemplate } from '../utils/storage';
import { getSavedTemplates } from '../utils/templateStore';
import { APP_VERSION } from '../utils/constants';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const lastTemplate = getLastTemplate();
  const [templateCount, setTemplateCount] = useState(0);

  useEffect(() => {
    getSavedTemplates().then((list) => setTemplateCount(list.length)).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', minWidth: 0 }}>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          欢迎使用 LetsDoc
        </Title>
        <Text type="secondary" style={{ overflowWrap: 'anywhere' }}>
          轻量、本地化的 Word 文书模板生成工具
        </Text>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="本地模板"
              value={templateCount}
              prefix={<DatabaseOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ borderRadius: 12 }}>
            <Statistic
              title="当前版本"
              value={APP_VERSION}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {lastTemplate && (
        <Card title="最近使用模板" size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
          <Space direction="vertical">
            <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastTemplate.templateName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lastTemplate.variables.length} 个变量
            </Text>
            <Button size="small" type="link" onClick={() => setHash('generate')} style={{ padding: 0 }}>
              进入文书生成 →
            </Button>
          </Space>
        </Card>
      )}

      <Card title="快捷入口" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space wrap size={12}>
          <Button icon={<FormOutlined />} onClick={() => setHash('generate')}>进入文书生成</Button>
          <Button icon={<FolderOutlined />} onClick={() => setHash('templates')}>模板管理</Button>
          <Button icon={<CloudDownloadOutlined />} onClick={() => setHash('backup')}>模板库备份</Button>
          <Button icon={<SettingOutlined />} onClick={() => setHash('settings')}>设置</Button>
        </Space>
      </Card>

      <Card size="small" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={4}>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            本工具所有文件处理在浏览器本地完成，不会上传任何数据到服务器。
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            草稿数据仅保存在浏览器 localStorage 中，模板保存在 IndexedDB 中。
          </Text>
        </Space>
      </Card>
    </div>
  );
}
