import { Layout } from 'antd';
import Sidebar from '../components/Sidebar';
import { useCurrentPage } from '../utils/router';
import DashboardPage from '../pages/DashboardPage';
import GeneratePage from '../pages/GeneratePage';
import TemplateManagePage from '../pages/TemplateManagePage';
import BackupPage from '../pages/BackupPage';
import SettingsPage from '../pages/SettingsPage';
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
        return <DashboardPage />;
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
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar currentPage={currentPage} onNavigate={navigate} />
      <Layout style={{ marginLeft: 220, background: '#f5f5f5', height: '100vh' }}>
        <Content style={{ padding: '24px 32px', height: '100%', overflow: 'auto' }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  );
}
