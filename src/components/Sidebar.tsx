import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  FormOutlined,
  FolderOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { APP_VERSION } from '../utils/constants';
import type { PageKey } from '../utils/router';

const { Sider } = Layout;
const { Text } = Typography;

interface Props {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'generate', icon: <FormOutlined />, label: '文书生成' },
  { key: 'templates', icon: <FolderOutlined />, label: '模板管理' },
  { key: 'backup', icon: <CloudDownloadOutlined />, label: '模板库备份' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export default function Sidebar({ currentPage, onNavigate }: Props) {
  return (
    <Sider
      width={220}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ fontSize: 18, color: '#1677ff', display: 'block', lineHeight: 1.2 }}>
          LetsDoc
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          文书模板生成器
        </Text>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[currentPage]}
        onClick={({ key }) => onNavigate(key as PageKey)}
        items={menuItems}
        style={{
          borderInlineEnd: 'none',
          flex: 1,
          padding: '8px 0',
        }}
      />

      <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {APP_VERSION}
        </Text>
      </div>
    </Sider>
  );
}
