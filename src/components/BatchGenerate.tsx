import { useState } from 'react';
import {
  Card, Upload, Button, Typography, Alert, Progress, Space, Table, Descriptions, Tag, Divider, Tabs,
} from 'antd';
import {
  UploadOutlined, DownloadOutlined, RocketOutlined, WarningOutlined, EditOutlined,
} from '@ant-design/icons';
import {
  readExcelFile, validateExcelData, generateExcelTemplate, generateExampleExcel,
} from '../utils/excelHandler';
import { generateBatchDocx } from '../utils/docxGenerator';
import { saveAs } from 'file-saver';
import ManualBatchGenerate from './ManualBatchGenerate';
import type { TemplateData, BatchRow } from '../types';
import type { ValidationResult } from '../utils/excelHandler';

const { Text } = Typography;

interface Props {
  template: TemplateData;
}

type UploadState = 'idle' | 'validated' | 'generating' | 'done' | 'error';

function ExcelImport({ template }: { template: TemplateData }) {
  const [excelRows, setExcelRows] = useState<BatchRow[] | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  const reset = () => {
    setExcelRows(null);
    setValidation(null);
    setParseErrors([]);
    setUploadState('idle');
    setProgress(0);
    setProgressText('');
    setGenError(null);
  };

  const handleDownloadTemplate = () => {
    const blob = generateExcelTemplate(template.variables);
    saveAs(blob, `${template.name}_数据模板.xlsx`);
  };

  const handleDownloadExample = () => {
    const blob = generateExampleExcel();
    saveAs(blob, '示例数据.xlsx');
  };

  const handleExcelUpload = async (file: File) => {
    reset();
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setParseErrors(['只支持 .xlsx 格式，请选择 .xlsx 文件。']);
      setUploadState('error');
      return false;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = readExcelFile(buffer);
      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setUploadState('error');
        return false;
      }
      const vr = validateExcelData(result.headers, result.rows, template.variables);
      setExcelRows(result.rows);
      setValidation({ ...vr, summary: { ...vr.summary, emptySkipped: result.emptyRows } });
      setUploadState('validated');
    } catch {
      setParseErrors(['读取 Excel 文件失败，请重试。']);
      setUploadState('error');
    }
    return false;
  };

  const handleBatchGenerate = async () => {
    if (!excelRows || !validation) return;
    setUploadState('generating');
    setProgress(0);
    setProgressText('正在生成...');
    setGenError(null);
    try {
      await generateBatchDocx(
        template.rawArrayBuffer,
        template.variables,
        excelRows,
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setProgressText(`正在生成 ${current} / ${total}`);
          if (current === total) setProgressText('正在打包 zip...');
        }
      );
      setProgressText('生成完成');
      setUploadState('done');
    } catch (err) {
      setGenError(`批量生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setUploadState('error');
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          第一步：下载 Excel 数据模板
        </Text>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载数据模板</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadExample}>下载示例 Excel</Button>
        </Space>
      </div>

      <div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          第二步：上传填写好的 Excel 文件
        </Text>
        <Upload accept=".xlsx" showUploadList={false} beforeUpload={handleExcelUpload} disabled={uploadState === 'generating'}>
          <Button icon={<UploadOutlined />} disabled={uploadState === 'generating'}>选择 Excel 文件</Button>
        </Upload>
      </div>

      {parseErrors.length > 0 && parseErrors.map((e, i) => (
        <Alert key={`parse-${i}`} type="error" message={e} showIcon closable onClose={() => setParseErrors((prev) => prev.filter((_, idx) => idx !== i))} />
      ))}

      {validation && uploadState === 'validated' && (
        <div>
          <Divider plain style={{ margin: '8px 0' }}>数据校验结果</Divider>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="有效数据行">{validation.summary.total}</Descriptions.Item>
            <Descriptions.Item label="空行（已跳过）">{validation.summary.emptySkipped}</Descriptions.Item>
            <Descriptions.Item label="缺少变量列">
              {validation.missingColumns.length === 0 ? <Tag color="success">无</Tag> : <Tag color="error">{validation.missingColumns.join(', ')}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="多余列">
              {validation.extraColumns.length === 0 ? <Tag>无</Tag> : <Tag>{validation.extraColumns.join(', ')}</Tag>}
            </Descriptions.Item>
          </Descriptions>

          {validation.missingColumns.length > 0 && (
            <Alert type="error" showIcon message={`Excel 缺少模板必需的变量列: ${validation.missingColumns.join(', ')}`} description="请在 Excel 中补充这些列后重新上传。" style={{ marginBottom: 12 }} />
          )}

          {validation.rowErrors.length > 0 && validation.missingColumns.length === 0 && (
            <Alert type="warning" showIcon icon={<WarningOutlined />} message={`以下 ${validation.rowErrors.length} 行存在空值`}
              description={<div style={{ maxHeight: 160, overflow: 'auto' }}>{validation.rowErrors.map((re) => (
                <div key={re.rowIndex} style={{ fontSize: 12, lineHeight: '20px' }}>第 {re.rowIndex} 行（数据行 {re.rowIndex}）缺少: {re.missingFields.join(', ')}</div>
              ))}</div>}
              style={{ marginBottom: 12 }}
            />
          )}

          {validation.missingColumns.length === 0 && (
            <>
              <Text style={{ display: 'block', marginBottom: 8 }}>
                已读取 {validation.summary.total} 行有效数据
                {validation.summary.withErrors > 0 && `，其中 ${validation.summary.withErrors} 行有空值`}
              </Text>
              <Table size="small" bordered pagination={false} scroll={{ x: true, y: 200 }}
                dataSource={excelRows!.slice(0, 5).map((row, i) => ({ key: i, ...row }))}
                columns={template.variables.map((v) => ({ title: v, dataIndex: v, key: v, width: 120 }))}
                footer={() => excelRows!.length > 5 ? `... 共 ${excelRows!.length} 行` : null}
              />
            </>
          )}

          {validation.missingColumns.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <Button type="primary" icon={<RocketOutlined />} onClick={handleBatchGenerate} disabled={validation.summary.total === 0}>
                开始批量生成（{validation.summary.total} 份）
              </Button>
            </div>
          )}
        </div>
      )}

      {(uploadState === 'generating' || uploadState === 'done') && (
        <div>
          <Progress percent={progress} status={uploadState === 'done' ? 'success' : 'active'} />
          <Text type={uploadState === 'done' ? 'success' : 'secondary'} style={{ display: 'block', marginTop: 4 }}>{progressText}</Text>
        </div>
      )}

      {genError && <Alert type="error" message={genError} showIcon closable onClose={() => setGenError(null)} />}

      {uploadState === 'done' && (
        <Alert type="success" message={`已生成 ${excelRows?.length || 0} 份文书，zip 文件已开始下载。`} showIcon />
      )}
    </Space>
  );
}

export default function BatchGenerate({ template }: Props) {
  return (
    <Card
      title={
        <Space>
          <RocketOutlined />
          <span>批量生成</span>
        </Space>
      }
    >
      <Tabs
        items={[
          {
            key: 'manual',
            label: <span><EditOutlined /> 网页录入</span>,
            children: <ManualBatchGenerate template={template} />,
          },
          {
            key: 'excel',
            label: <span><UploadOutlined /> Excel 导入</span>,
            children: <ExcelImport template={template} />,
          },
        ]}
      />
    </Card>
  );
}
