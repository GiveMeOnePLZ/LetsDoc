import {
  DashboardOutlined,
  FormOutlined,
  FolderOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';

export const navigationItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'generate', icon: <FormOutlined />, label: '文书生成' },
  { key: 'templates', icon: <FolderOutlined />, label: '模板管理' },
  { key: 'backup', icon: <CloudDownloadOutlined />, label: '模板库备份' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];
