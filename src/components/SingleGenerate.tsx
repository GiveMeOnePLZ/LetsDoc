import { useState, useRef } from 'react';
import { Card, Form, Input, Button, Alert, Space, Select, Tag, Typography } from 'antd';
import { FileWordOutlined, FormOutlined, SearchOutlined, SaveOutlined, CalendarOutlined } from '@ant-design/icons';
import { generateSingleDocx } from '../utils/docxGenerator';
import { getFieldPresets, addFieldPreset, removeFieldPreset, isDateVariable, getTodayFormatted } from '../utils/storage';
import type { TemplateData, VariableValuePair } from '../types';

const { Text } = Typography;

interface Props {
  template: TemplateData;
}

export default function SingleGenerate({ template }: Props) {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [, setPresetsVersion] = useState(0);
  const firstErrorRef = useRef<string | null>(null);

  const filteredVariables = template.variables.filter((v) =>
    searchText === '' || v.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleGenerate = async () => {
    setError(null);
    setSuccess(false);
    firstErrorRef.current = null;

    try {
      const values = await form.validateFields();
      setGenerating(true);

      const variables: VariableValuePair[] = template.variables.map((name) => ({
        name,
        value: values[name] || '',
      }));

      const outName = `${template.name}.docx`;
      const saved = await generateSingleDocx(template.rawArrayBuffer, variables, outName);
      setSuccess(saved);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        const fields = (err as { errorFields: { name: string[] }[] }).errorFields;
        if (fields.length > 0 && fields[0].name.length > 0) {
          firstErrorRef.current = fields[0].name[0];
        }
        setError('请填写所有变量。');
      } else {
        const msg = err instanceof Error ? err.message : '未知错误';
        setError(msg.includes('模板渲染失败') ? msg : `生成失败: ${msg}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePreset = (fieldName: string) => {
    const value = form.getFieldValue(fieldName);
    if (value && value.trim()) {
      addFieldPreset(fieldName, value.trim());
      setPresetsVersion((v) => v + 1);
    }
  };

  const handleSelectPreset = (fieldName: string, value: string) => {
    form.setFieldsValue({ [fieldName]: value });
  };

  const handleRemovePreset = (fieldName: string, value: string) => {
    removeFieldPreset(fieldName, value);
    setPresetsVersion((v) => v + 1);
  };

  const handleFillToday = (fieldName: string) => {
    form.setFieldsValue({ [fieldName]: getTodayFormatted() });
  };

  return (
    <Card
      title={
        <Space>
          <FormOutlined />
          <span>单份生成</span>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索变量..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        style={{ maxWidth: 480 }}
      >
        {filteredVariables.length === 0 && (
          <div style={{ padding: '12px 0', color: '#999' }}>
            未找到匹配变量
          </div>
        )}

        {filteredVariables.map((v) => {
          const presets = getFieldPresets(v);
          const isDate = isDateVariable(v);
          return (
            <Form.Item
              key={v}
              label={
                <Space>
                  <span>{v}</span>
                  {isDate && (
                    <Button
                      type="link"
                      size="small"
                      icon={<CalendarOutlined />}
                      onClick={() => handleFillToday(v)}
                      style={{ padding: 0, fontSize: 12 }}
                    >
                      今天
                    </Button>
                  )}
                </Space>
              }
              name={v}
              rules={[{ required: true, message: `请填写「${v}」` }]}
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder={`请输入 ${v}`} style={{ flex: 1 }} />
                {presets.length > 0 && (
                  <Select
                    placeholder="常用值"
                    style={{ width: 120 }}
                    options={presets.map((p) => ({ label: p, value: p }))}
                    onChange={(val) => handleSelectPreset(v, val)}
                    allowClear
                    onClear={() => {}}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                          {presets.map((p) => (
                            <Tag
                              key={p}
                              closable
                              onClose={(e) => {
                                e.preventDefault();
                                handleRemovePreset(v, p);
                              }}
                              style={{ marginBottom: 4 }}
                            >
                              {p.length > 10 ? `${p.slice(0, 10)}...` : p}
                            </Tag>
                          ))}
                        </div>
                      </>
                    )}
                  />
                )}
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => handleSavePreset(v)}
                  title="保存为常用值"
                />
              </Space.Compact>
            </Form.Item>
          );
        })}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={generating}
            icon={<FileWordOutlined />}
          >
            生成文书
          </Button>
        </Form.Item>
      </Form>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginTop: 8 }}
        />
      )}
      {success && (
        <Alert
          type="success"
          message="文书已生成并开始下载。"
          showIcon
          closable
          onClose={() => setSuccess(false)}
          style={{ marginTop: 8 }}
        />
      )}

      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          常用变量值仅保存在当前浏览器本地，不会上传服务器。清理浏览器数据后会丢失。
        </Text>
      </div>
    </Card>
  );
}
