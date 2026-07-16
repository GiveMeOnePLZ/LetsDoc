import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  FormOutlined,
  FolderOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { APP_VERSION } from '../utils/constants';
import logoUrl from '../assets/letsdoc-logo.png';
import type { PageKey } from '../utils/router';

const { Sider } = Layout;
const { Text } = Typography;

interface Props {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'generate', icon: <FormOutlined />, label: '文书生成' },
  { key: 'templates', icon: <FolderOutlined />, label: '模板管理' },
  { key: 'backup', icon: <CloudDownloadOutlined />, label: '模板库备份' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onCollapsedChange }: Props) {
  return (
    <Sider
      width={220}
      collapsedWidth={76}
      collapsed={collapsed}
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
      <div className="app-sidebar-brand">
        <div className="app-logo-mark">
          <img src={logoUrl} alt="LetsDoc" />
        </div>
        {!collapsed && (
          <div className="app-brand-copy">
            <Text strong className="app-brand-name">LetsDoc</Text>
            <Text type="secondary" className="app-brand-subtitle">文书模板生成器</Text>
          </div>
        )}
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

      <div className="app-sidebar-footer">
        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          {!collapsed && <span aria-hidden="true">{APP_VERSION}</span>}
        </button>
      </div>
    </Sider>
  );
}
