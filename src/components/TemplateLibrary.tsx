import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, message, Space, Tag, Typography } from 'antd';
import { FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { getSavedTemplates, getSavedTemplate } from '../utils/templateStore';
import type { SavedTemplateSummary } from '../utils/templateStore';
import type { TemplateData } from '../types';

const { Text } = Typography;

interface Props {
  onTemplateSelected: (template: TemplateData) => void;
  onTemplateDeleted?: (templateId: string) => void;
  currentTemplateId?: string;
}

export default function TemplateLibrary({ onTemplateSelected, currentTemplateId }: Props) {
  const [templates, setTemplates] = useState<SavedTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    getSavedTemplates()
      .then((list) => setTemplates(list.sort((a, b) => b.updatedAt - a.updatedAt)))
      .catch((err) => messageApi.error(err instanceof Error ? err.message : '读取本地模板库失败'))
      .finally(() => setLoading(false));
  }, [messageApi]);

  const filtered = templates.filter((template) =>
    searchText === '' || template.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = async (template: SavedTemplateSummary) => {
    try {
      const fullTemplate = await getSavedTemplate(template.id);
      if (!fullTemplate) {
        messageApi.error('模板数据不存在，请刷新列表');
        return;
      }

      const arrayBuffer = await fullTemplate.templateBlob.arrayBuffer();
      onTemplateSelected({
        id: fullTemplate.id,
        name: fullTemplate.name,
        fileName: fullTemplate.originalFileName,
        variables: fullTemplate.variables,
        rawArrayBuffer: arrayBuffer,
        createdAt: fullTemplate.createdAt,
      });
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '加载模板失败');
    }
  };

  return (
    <>
      {contextHolder}
      <Card className="soft-card modal-library-card" title="从本地模板库选择">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="模板库保存在当前浏览器本地，不会上传服务器。"
            style={{ fontSize: 12 }}
          />
          <Input
            placeholder="搜索模板"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          {filtered.length === 0 && !loading ? (
            <Empty description="暂无模板" />
          ) : (
            <List
              loading={loading}
              dataSource={filtered}
              grid={{ gutter: 12, column: 2 }}
              renderItem={(item) => (
                <List.Item>
                  <button
                    type="button"
                    className={`template-card-button modal-template-card ${currentTemplateId === item.id ? 'is-current' : ''}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div>
                      <FileTextOutlined />
                      <strong>{item.name}</strong>
                      <span>{item.variables.length} 个变量</span>
                      <div className="template-mini-tags">
                        {item.variables.slice(0, 3).map((v) => (
                          <Tag key={v} color="blue">{`{{${v}}}`}</Tag>
                        ))}
                      </div>
                    </div>
                    <Button type={currentTemplateId === item.id ? 'primary' : 'default'} size="small">
                      {currentTemplateId === item.id ? '当前' : '使用'}
                    </Button>
                  </button>
                </List.Item>
              )}
            />
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            需要管理、重命名或导入导出模板，请前往「模板库」页面。
          </Text>
        </Space>
      </Card>
    </>
  );
}
