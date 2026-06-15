import { useState } from 'react';
import { Layout, Steps, Typography, Collapse, Alert, Button, Space } from 'antd';
import { InboxOutlined, FormOutlined, DeleteOutlined } from '@ant-design/icons';
import AppHeader from './components/Header';
import TemplateUpload from './components/TemplateUpload';
import TemplateLibrary from './components/TemplateLibrary';
import BatchGenerate from './components/BatchGenerate';
import { getLastTemplate, clearAllStorage } from './utils/storage';
import type { TemplateData } from './types';
import './App.css';

const { Content, Footer } = Layout;
const { Text } = Typography;

const guideItems = [
  {
    key: 'guide',
    label: '模板制作说明',
    children: (
      <div style={{ fontSize: 13, lineHeight: '22px', color: '#595959' }}>
        <p><strong>支持的文件格式</strong></p>
        <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>
          <li>模板文件：仅 <code>.docx</code>（不支持 <code>.doc</code>）</li>
          <li>数据文件：仅 <code>.xlsx</code>（不支持 <code>.xls</code>）</li>
        </ul>

        <p><strong>变量格式</strong></p>
        <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>
          <li>使用 <code>{'{{变量名}}'}</code> 格式定义可替换内容</li>
          <li>变量名只允许：中文、英文、数字、下划线</li>
          <li>变量按首次出现顺序去重</li>
        </ul>

        <p><strong>正确示例</strong></p>
        <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>
          <li><code>{'{{姓名}}'}</code> <code>{'{{单位名称}}'}</code> <code>{'{{日期}}'}</code> <code>{'{{doc_no}}'}</code></li>
        </ul>

        <p><strong>错误示例（不支持）</strong></p>
        <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>
          <li><code>{'{{单位 名称}}'}</code>（变量名含空格）</li>
          <li><code>{'{{单位-名称}}'}</code>（变量名含连字符）</li>
          <li><code>{'{{}}'}</code>（空变量名）</li>
        </ul>

        <p><strong>注意事项</strong></p>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          <li>建议在 Word 中一次性输入完整占位符，不要分多次输入</li>
          <li>如果生成失败，请删除原占位符后重新一次性输入</li>
          <li>替换后文字过长导致自然换行或分页变化属于正常现象</li>
          <li>模板中的字体、字号、行距、表格、页眉页脚格式会被保留</li>
        </ul>
      </div>
    ),
  },
];

function App() {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [lastTemplateInfo, setLastTemplateInfo] = useState(() => getLastTemplate());
  const [cleared, setCleared] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const currentStep = template ? 1 : 0;
  const defaultTab = lastTemplateInfo?.lastMode === 'excel' ? 'excel' : 'manual';

  const handleClearAll = () => {
    clearAllStorage();
    setLastTemplateInfo(null);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const handleTemplateLoaded = (t: TemplateData) => {
    setTemplate(t);
    setLastTemplateInfo(getLastTemplate());
  };

  const handleTemplateSelectedFromLibrary = (t: TemplateData) => {
    setTemplate(t);
    setLastTemplateInfo(getLastTemplate());
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <AppHeader />
      <Content style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Steps
          current={currentStep}
          items={[
            { title: '上传模板', icon: <InboxOutlined /> },
            { title: '生成文书', icon: <FormOutlined /> },
          ]}
          style={{ marginBottom: 24 }}
        />

        {!template && lastTemplateInfo && (
          <Alert
            type="info"
            showIcon
            message={`检测到上次使用的模板：${lastTemplateInfo.templateName}`}
            description="由于浏览器安全限制，请重新上传该 .docx 模板后继续生成。系统仅保存模板名称和变量清单，不保存文件本体。"
            style={{ marginBottom: 16 }}
          />
        )}

        <section className="section-card">
          <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 12 }}>
            1 / 2 — 上传模板
          </Text>
          <TemplateUpload
            template={template}
            onTemplateLoaded={handleTemplateLoaded}
            onTemplateCleared={() => setTemplate(null)}
            onTemplateSaved={() => setLibraryRefreshKey((k) => k + 1)}
          />
          {!template && (
            <Space style={{ marginTop: 12 }}>
              <Button size="small" icon={<DeleteOutlined />} onClick={handleClearAll}>
                清空本地记录
              </Button>
              {cleared && <Text type="success" style={{ fontSize: 12 }}>已清空</Text>}
            </Space>
          )}
        </section>

        {!template && (
          <section className="section-card">
            <TemplateLibrary
              key={libraryRefreshKey}
              onTemplateSelected={handleTemplateSelectedFromLibrary}
              onTemplateDeleted={() => {
                // Template deleted from library but still in memory
                // User can continue using it until page refresh
              }}
              currentTemplateId={undefined}
            />
          </section>
        )}

        {template && (
          <>
            <section className="section-card">
              <Text strong style={{ fontSize: 14, color: '#666', display: 'block', marginBottom: 12 }}>
                2 — 生成文书
              </Text>
              <BatchGenerate template={template} defaultActiveTab={defaultTab} />
            </section>
          </>
        )}

        <section className="section-card" style={{ marginTop: template ? 0 : 16 }}>
          <Collapse
            items={guideItems}
            defaultActiveKey={template ? [] : ['guide']}
            expandIconPosition="start"
          />
        </section>
      </Content>
      <Footer style={{ textAlign: 'center', background: 'transparent', padding: '12px 24px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          本工具不会上传任何文件。模板文件不会被保存；草稿数据仅保存在当前浏览器 localStorage 中，可随时清空。
        </Text>
      </Footer>
    </Layout>
  );
}

export default App;
