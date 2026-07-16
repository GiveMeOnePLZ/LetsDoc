import { useState } from 'react';
import { Layout } from 'antd';
import { SafetyCertificateOutlined, DatabaseOutlined } from '@ant-design/icons';
import Sidebar from '../components/Sidebar';
import { useCurrentPage } from '../utils/router';
import DashboardPage from '../pages/DashboardPage';
import GeneratePage from '../pages/GeneratePage';
import TemplateManagePage from '../pages/TemplateManagePage';
import BackupPage from '../pages/BackupPage';
import SettingsPage from '../pages/SettingsPage';
import { APP_VERSION } from '../utils/constants';
import type { TemplateData } from '../types';

const { Content } = Layout;

interface Props {
  template: TemplateData | null;
  onTemplateLoaded: (template: TemplateData) => void;
  onTemplateCleared: () => void;
  onTemplateSaved?: () => void;
}

export default function AppLayout({ template, onTemplateLoaded, onTemplateCleared, onTemplateSaved }: Props) {
  const [currentPage, navigate] = useCurrentPage();
  const [collapsed, setCollapsed] = useState(false);
  const siderWidth = collapsed ? 76 : 220;

  const renderPage = () => {
    switch (currentPage) {
      case 'generate':
        return (
          <GeneratePage
            key={template ? `${template.id}:${template.variables.join('\u0000')}` : 'no-template'}
            template={template}
            onTemplateLoaded={onTemplateLoaded}
            onTemplateCleared={onTemplateCleared}
            onTemplateSaved={onTemplateSaved}
          />
        );
      case 'dashboard':
        return <DashboardPage onTemplateLoaded={onTemplateLoaded} />;
      case 'templates':
        return (
          <TemplateManagePage
            template={template}
            onTemplateLoaded={onTemplateLoaded}
          />
        );
      case 'backup':
        return <BackupPage onTemplateSaved={onTemplateSaved} />;
      case 'settings':
        return <SettingsPage onTemplateCleared={onTemplateCleared} />;
      default:
        return (
          <GeneratePage
            key={template ? `${template.id}:${template.variables.join('\u0000')}` : 'no-template'}
            template={template}
            onTemplateLoaded={onTemplateLoaded}
            onTemplateCleared={onTemplateCleared}
            onTemplateSaved={onTemplateSaved}
          />
        );
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }} className="app-shell">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <Layout
        className="app-main-shell"
        style={{ marginLeft: siderWidth }}
      >
        <Content className="app-main-content">
          <div className="app-page-container">
            {renderPage()}
          </div>
          <footer className="site-footer">
            <div className="site-footer-trust">
              <span className="site-footer-icon"><SafetyCertificateOutlined /></span>
              <div>
                <strong>隐私保护</strong>
                <span><DatabaseOutlined /> 文件仅在浏览器本地处理，不上传服务器</span>
              </div>
            </div>
            <div className="site-footer-meta">
              <span>LetsDoc {APP_VERSION}</span>
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">冀ICP备2026025713号</a>
              <a href="https://github.com/GiveMeOnePLZ/LetsDoc" target="_blank" rel="noreferrer">GitHub</a>
              <span>作者 liuyuxuan</span>
            </div>
          </footer>
        </Content>
      </Layout>
    </Layout>
  );
}
