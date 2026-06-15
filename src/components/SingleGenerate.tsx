import { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space } from 'antd';
import { FileWordOutlined, FormOutlined } from '@ant-design/icons';
import { generateSingleDocx } from '../utils/docxGenerator';
import type { TemplateData, VariableValuePair } from '../types';

interface Props {
  template: TemplateData;
}

export default function SingleGenerate({ template }: Props) {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setSuccess(false);

    try {
      const values = await form.validateFields();
      setGenerating(true);

      const variables: VariableValuePair[] = template.variables.map((name) => ({
        name,
        value: values[name] || '',
      }));

      const outName = `${template.name}.docx`;
      generateSingleDocx(template.rawArrayBuffer, variables, outName);
      setSuccess(true);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        setError('请填写所有变量。');
      } else {
        const msg = err instanceof Error ? err.message : '未知错误';
        setError(msg.includes('模板渲染失败') ? msg : `生成失败: ${msg}`);
      }
    } finally {
      setGenerating(false);
    }
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        style={{ maxWidth: 480 }}
      >
        {template.variables.map((v) => (
          <Form.Item
            key={v}
            label={v}
            name={v}
            rules={[{ required: true, message: `请填写「${v}」` }]}
          >
            <Input placeholder={`请输入 ${v}`} />
          </Form.Item>
        ))}

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
    </Card>
  );
}
