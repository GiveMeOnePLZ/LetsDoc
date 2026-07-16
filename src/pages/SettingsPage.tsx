import { Typography, Card, Button, Space, Divider, Modal, Descriptions, message } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { clearAllStorage } from '../utils/storage';
import { clearTemplateLibrary } from '../utils/templateStore';
import { APP_VERSION } from '../utils/constants';

const { Title, Text } = Typography;

interface Props {
  onTemplateCleared?: () => void;
}

export default function SettingsPage({ onTemplateCleared }: Props) {
  const [messageApi, contextHolder] = message.useMessage();

  const handleClearDrafts = () => {
    clearAllStorage();
    messageApi.success('已清空本地草稿');
  };

  const handleClearPresets = () => {
    localStorage.removeItem('docxgen:fieldPresets');
    messageApi.success('已清空常用值');
  };

  const handleClearLibrary = () => {
    Modal.confirm({
      title: '确认清空模板库',
      icon: <ExclamationCircleOutlined />,
      content: '此操作将删除浏览器中所有已保存的模板，不可恢复。确定要继续吗？',
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await clearTemplateLibrary();
          messageApi.success('模板库已清空');
          onTemplateCleared?.();
        } catch {
          messageApi.error('清空失败');
        }
      },
    });
  };

  return (
    <div className="page-fade-in" style={{ maxWidth: 640, margin: '0 auto', minWidth: 0 }}>
      {contextHolder}
      <Title level={4} style={{ marginBottom: 24 }}>设置</Title>

      <Card title="产品信息" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="产品名称">
            <span style={{ overflowWrap: 'anywhere' }}>LetsDoc 文书模板生成器</span>
          </Descriptions.Item>
          <Descriptions.Item label="当前版本">{APP_VERSION}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据说明" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space orientation="vertical" size={8}>
          <Text style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
            本工具所有文件处理在浏览器本地完成，不会上传任何数据到服务器。
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            草稿数据保存在浏览器 localStorage 中（key: <code>docxgen:lastTemplate</code>、<code>docxgen:manualDraft</code>）。
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            常用值保存在浏览器 localStorage 中（key: <code>docxgen:fieldPresets</code>）。
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            模板文件保存在浏览器 IndexedDB 中（数据库名: <code>docxgen-db</code>）。
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            清理浏览器数据、换电脑或换浏览器后，以上数据可能丢失。
          </Text>
        </Space>
      </Card>

      <Card title="历史兼容" style={{ marginBottom: 16, borderRadius: 12 }}>
        <Space orientation="vertical" size={8}>
          <Text style={{ fontSize: 13 }}>
            为兼容旧版本数据，以下存储 key 保留原有前缀：
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            - localStorage key 保留 <code>docxgen:</code> 前缀
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            - IndexedDB 数据库名保留 <code>docxgen-db</code>
          </Text>
          <Text type="secondary" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
            - 备份文件使用 <code>.letsdoc</code> 格式
          </Text>
        </Space>
      </Card>

      <Card title="数据管理" style={{ borderRadius: 12 }}>
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Button icon={<DeleteOutlined />} onClick={handleClearDrafts}>清空本地草稿</Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, overflowWrap: 'anywhere' }}>
              清空录入草稿和上次模板记录，不影响模板库和常用值。
            </Text>
          </div>
          <Divider style={{ margin: '4px 0' }} />
          <div>
            <Button icon={<DeleteOutlined />} onClick={handleClearPresets}>清空常用值</Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, overflowWrap: 'anywhere' }}>
              清空所有变量的常用值记录，不影响草稿和模板库。
            </Text>
          </div>
          <Divider style={{ margin: '4px 0' }} />
          <div>
            <Button icon={<DeleteOutlined />} danger onClick={handleClearLibrary}>清空模板库</Button>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, overflowWrap: 'anywhere' }}>
              删除浏览器中所有已保存的模板文件，此操作不可恢复。
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
