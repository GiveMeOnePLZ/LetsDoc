import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Layout, Typography, Button, Space, Card, Alert, Progress, Table, Input, Select,
  Divider, Upload, message, Popover, Modal, Tag,
} from 'antd';
import {
  PlusOutlined, CopyOutlined, DeleteOutlined, RocketOutlined, WarningOutlined,
  AimOutlined, InboxOutlined, DownloadOutlined, UploadOutlined,
  SaveOutlined, CalendarOutlined, CloseOutlined, FolderOpenOutlined, FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import TemplateUpload from '../components/TemplateUpload';
import TemplateDiagnostics from '../components/TemplateDiagnostics';
import TemplateLibrary from '../components/TemplateLibrary';
import { generateSingleDocx, generateBatchDocx, sanitizeFileName } from '../utils/docxGenerator';
import { getManualDraft, saveManualDraft, variablesMatch, isDateVariable, getTodayFormatted, getFieldPresets, addFieldPreset, removeFieldPreset } from '../utils/storage';
import { readExcelFile, validateExcelData, generateExcelTemplate } from '../utils/excelHandler';
import { saveTemplateToLibrary } from '../utils/templateStore';
import { MAX_BATCH_ROWS } from '../utils/constants';
import { saveBlob } from '../utils/downloadFile';
import type { TemplateData, BatchRow } from '../types';

const { Content } = Layout;
const { Text, Title } = Typography;

interface Props {
  template: TemplateData | null;
  onTemplateLoaded: (template: TemplateData) => void;
  onTemplateCleared: () => void;
  onTemplateSaved?: () => void;
}

function createEmptyRow(variables: string[]): BatchRow {
  const row: BatchRow = {};
  for (const v of variables) row[v] = '';
  return row;
}

function validateRows(rows: BatchRow[], variables: string[]) {
  let empty = 0;
  const rowErrors: Array<{ rowIndex: number; missingFields: string[] }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const allEmpty = variables.every((v) => !row[v] || row[v].trim() === '');
    if (allEmpty) { empty++; continue; }
    const missing = variables.filter((v) => !row[v] || row[v].trim() === '');
    if (missing.length > 0) rowErrors.push({ rowIndex: i + 1, missingFields: missing });
  }
  return { total: rows.length, empty, valid: rows.length - empty - rowErrors.length, rowErrors };
}

function loadDraft(variables: string[]) {
  const draft = getManualDraft();
  if (!draft || !variablesMatch(draft.variables, variables)) {
    return { rows: Array.from({ length: 1 }, () => createEmptyRow(variables)), restored: false };
  }
  const rows = draft.rows.length > 0
    ? draft.rows.slice(0, MAX_BATCH_ROWS)
    : Array.from({ length: 1 }, () => createEmptyRow(variables));
  return { rows, restored: true };
}

type GenState = 'idle' | 'generating' | 'done' | 'error';

export default function GeneratePage({ template, onTemplateLoaded, onTemplateCleared, onTemplateSaved }: Props) {
  const variables = useMemo(() => template?.variables || [], [template?.variables]);
  const [initData] = useState(() => template ? loadDraft(variables) : { rows: [] as BatchRow[], restored: false });
  const [rows, setRows] = useState<BatchRow[]>(initData.rows);
  const [genState, setGenState] = useState<GenState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [draftRestored, setDraftRestored] = useState(initData.restored);
  const [fillColumn, setFillColumn] = useState<string | undefined>(undefined);
  const [fillValue, setFillValue] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const tableRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [presetsVersion, setPresetsVersion] = useState(0);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  useEffect(() => {
    if (!template) return;
    const handleBeforeUnload = () => { saveManualDraft(variables, rows); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [variables, rows, template]);

  const debouncedSave = useCallback((currentRows: BatchRow[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveManualDraft(variables, currentRows); }, 2000);
  }, [variables]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const addRow = useCallback(() => { setRows((prev) => [...prev, createEmptyRow(variables)]); }, [variables]);
  const copyLastRow = useCallback(() => { setRows((prev) => prev.length === 0 ? prev : [...prev, { ...prev[prev.length - 1] }]); }, []);
  const deleteRow = useCallback((index: number) => { setRows((prev) => prev.filter((_, i) => i !== index)); }, []);
  const clearAll = useCallback(() => {
    const fresh = Array.from({ length: 1 }, () => createEmptyRow(variables));
    setRows(fresh); setShowValidation(false); setGenState('idle'); setGenError(null);
    saveManualDraft(variables, fresh);
  }, [variables]);

  const updateCell = useCallback((rowIndex: number, varName: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [varName]: value };
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const handlePaste = useCallback((e: React.ClipboardEvent, startRow: number, startCol: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    const clipRows = text.split('\n').filter((line) => line.trim() !== '');
    if (clipRows.length === 0) return;
    e.preventDefault();
    const parsedRows = clipRows.map((line) => line.split('\t'));
    setRows((prev) => {
      const next = [...prev];
      for (let ci = 0; ci < parsedRows.length; ci++) {
        const targetRowIdx = startRow + ci;
        if (targetRowIdx >= MAX_BATCH_ROWS) break;
        while (next.length <= targetRowIdx) next.push(createEmptyRow(variables));
        const cells = parsedRows[ci];
        for (let cj = 0; cj < cells.length; cj++) {
          const targetColIdx = startCol + cj;
          if (targetColIdx >= variables.length) break;
          next[targetRowIdx] = { ...next[targetRowIdx], [variables[targetColIdx]]: cells[cj].trim() };
        }
      }
      debouncedSave(next);
      return next;
    });
  }, [variables, debouncedSave]);

  const handleFillColumn = () => {
    if (!fillColumn || !fillValue.trim()) { messageApi.warning('请选择变量列并输入要填充的值'); return; }
    setRows((prev) => { const next = prev.map((row) => ({ ...row, [fillColumn]: fillValue.trim() })); debouncedSave(next); return next; });
    messageApi.success(`已将「${fillColumn}」列填充为「${fillValue.trim()}」`);
    setFillValue('');
  };

  const handleFillToday = () => {
    if (fillColumn && isDateVariable(fillColumn)) setFillValue(getTodayFormatted());
  };

  const handleLocateFirstError = () => {
    if (validation.rowErrors.length === 0) return;
    const firstError = validation.rowErrors[0];
    const tableElement = tableRef.current?.querySelector('.ant-table-body');
    if (tableElement) {
      const trs = tableElement.querySelectorAll('tr');
      if (trs[firstError.rowIndex - 1]) trs[firstError.rowIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    messageApi.info(`定位到第 ${firstError.rowIndex} 行，缺少: ${firstError.missingFields[0]}`);
  };

  const validation = validateRows(rows, variables);
  const canGenerate = validation.rowErrors.length === 0 && validation.valid > 0;
  const validRowCount = rows.filter((row) => variables.some((v) => row[v] && row[v].trim() !== '')).length;
  const handleValidate = () => setShowValidation(true);

  const handleGenerate = async () => {
    if (!template) return;
    const validRows = rows.filter((row) => variables.some((v) => row[v] && row[v].trim() !== ''));
    if (validRows.length === 0) { setGenError('没有可生成的数据，请先填写至少一行完整数据。'); return; }
    setGenState('generating'); setProgress(0); setProgressText('正在生成...'); setGenError(null);
    try {
      if (validRows.length === 1) {
        const row = validRows[0];
        const firstVar = variables[0];
        const firstVal = firstVar ? (row[firstVar] || '').trim() : '';
        const safeTemplateName = sanitizeFileName(template.name);
        const safeFirstVal = firstVal ? sanitizeFileName(firstVal) : '';
        const outName = safeFirstVal ? `${safeTemplateName}_${safeFirstVal}.docx` : `${safeTemplateName}.docx`;
        const variablesPairs = variables.map((name) => ({ name, value: row[name] || '' }));
        const saved = await generateSingleDocx(template.rawArrayBuffer, variablesPairs, outName);
        setProgressText(saved ? '生成完成' : ''); setGenState(saved ? 'done' : 'idle');
      } else {
        const saved = await generateBatchDocx(template.rawArrayBuffer, variables, validRows, (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setProgressText(`正在生成 ${current} / ${total}`);
          if (current === total) setProgressText('正在打包 zip...');
        });
        setProgressText(saved ? '生成完成' : ''); setGenState(saved ? 'done' : 'idle');
      }
    } catch (err) {
      setGenError(`生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setGenState('error');
    }
  };

  const handleExcelImport = async (file: File) => {
    if (!template) return false;
    if (!file.name.toLowerCase().endsWith('.xlsx')) { messageApi.error('只支持 .xlsx 格式'); return false; }
    try {
      const buffer = await file.arrayBuffer();
      const result = readExcelFile(buffer);
      if (result.errors.length > 0) { messageApi.error(result.errors[0]); return false; }
      const vr = validateExcelData(result.headers, result.rows, template.variables);
      if (vr.missingColumns.length > 0) { messageApi.error(`Excel 缺少必需列: ${vr.missingColumns.join(', ')}`); return false; }
      setRows(result.rows.map((r) => {
        const row: BatchRow = {};
        for (const v of variables) row[v] = (r as Record<string, string>)[v] || '';
        return row;
      }));
      setShowValidation(false); setGenState('idle');
      messageApi.success(`已导入 ${result.rows.length} 行数据`);
    } catch { messageApi.error('读取 Excel 失败'); }
    return false;
  };

  const handleDownloadExcelTemplate = async () => {
    if (!template) return;
    const blob = generateExcelTemplate(template.variables);
    await saveBlob(blob, `${template.name}_数据模板.xlsx`);
  };

  const presets = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const v of variables) map[v] = getFieldPresets(v);
    return map;
  // presetsVersion forces re-render when presets change
  }, [variables, presetsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPreset = (varName: string, value: string, rowIndex: number) => {
    updateCell(rowIndex, varName, value);
  };

  const handleDeletePreset = (varName: string, value: string) => {
    removeFieldPreset(varName, value);
    setPresetsVersion((v) => v + 1);
  };

  const handleSavePreset = (varName: string, value: string) => {
    if (value && value.trim()) {
      addFieldPreset(varName, value.trim());
      setPresetsVersion((v) => v + 1);
    }
  };

  const columns = [
    { title: '#', width: 50, fixed: 'left' as const, render: (_: unknown, __: unknown, index: number) => index + 1 },
    ...variables.map((v) => ({
      title: v, dataIndex: v, key: v, width: 180,
      render: (_: unknown, record: Record<string, unknown>, index: number) => {
        const cellValue = String(record[v] || '');
        const fieldPresets = presets[v] || [];
        const cellHasValue = cellValue.trim() !== '';
        const cellIsPreset = fieldPresets.includes(cellValue.trim());
        const showPresetButton = cellHasValue && !cellIsPreset;
        const showPresetPopover = fieldPresets.length > 0;
        return (
          <Space size={2} style={{ width: '100%' }}>
            <Input
              size="small"
              value={cellValue}
              onChange={(e) => updateCell(index, v, e.target.value)}
              onPaste={(e) => handlePaste(e, index, variables.indexOf(v))}
              placeholder={v}
              style={{ border: 'none', padding: 0, flex: 1 }}
            />
            {(showPresetButton || showPresetPopover) && (
              <Popover
                trigger="click"
                placement="bottomLeft"
                content={
                  <div style={{ maxWidth: 240 }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>常用值</div>
                    {fieldPresets.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#d9d9d9' }}>暂无常用值</div>
                    ) : (
                      fieldPresets.map((p) => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onClick={() => handleSelectPreset(v, p, index)}
                          >
                            {p}
                          </Button>
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            style={{ padding: 0, minWidth: 16, color: '#999' }}
                            onClick={() => handleDeletePreset(v, p)}
                          />
                        </div>
                      ))
                    )}
                    {showPresetButton && (
                      <>
                        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4 }}>
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, color: '#1677ff' }}
                            onClick={() => { handleSavePreset(v, cellValue); }}
                          >
                            保存当前值为常用值
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                }
              >
                <Button
                  type="text"
                  size="small"
                  style={{ padding: 0, minWidth: 16, fontSize: 12 }}
                  title="常用值"
                >
                  常用值
                </Button>
              </Popover>
            )}
          </Space>
        );
      },
    })),
    { title: '', width: 40, fixed: 'right' as const, render: (_: unknown, __: unknown, index: number) => (
      <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={() => deleteRow(index)} />
    )},
  ];

  const dataSource = rows.map((row, i) => ({ key: i, ...row })) as Array<Record<string, unknown> & { key: number }>;

  return (
    <Layout className="generate-page page-fade-in" style={{ background: 'transparent', minWidth: 0 }}>
      {contextHolder}
      <Modal
        title="选择模板"
        open={templatePickerOpen}
        onCancel={() => setTemplatePickerOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <div className="template-picker-modal">
          <TemplateUpload
            template={null}
            onTemplateLoaded={(t) => {
              onTemplateLoaded(t);
              setTemplatePickerOpen(false);
            }}
            onTemplateCleared={() => {
              onTemplateCleared();
              setTemplatePickerOpen(false);
            }}
            onTemplateSaved={onTemplateSaved}
          />
          <TemplateLibrary
            key={libraryRefreshKey}
            onTemplateSelected={(t) => {
              onTemplateLoaded(t);
              setLibraryRefreshKey((k) => k + 1);
              setTemplatePickerOpen(false);
            }}
            onTemplateDeleted={() => {}}
            currentTemplateId={template?.id}
          />
        </div>
      </Modal>

      <Content style={{ minWidth: 0 }}>
        <section className="generate-page-header">
          <Title level={3}>文书生成</Title>
          <Tag color="blue" className="trust-tag">
            <SafetyCertificateOutlined /> 本地处理
          </Tag>
        </section>

        {template && (
          <section className="template-context-bar">
            <div className="template-context-title">
              <FileTextOutlined />
              <Text strong ellipsis>{template.name}</Text>
              <Text type="secondary">{template.variables.length} 个变量</Text>
            </div>
            <Button icon={<FolderOpenOutlined />} onClick={() => setTemplatePickerOpen(true)}>更换模板</Button>
          </section>
        )}

        {template && (
          <TemplateDiagnostics template={template} />
        )}

        {draftRestored && (
          <Alert 
            type="info" 
            showIcon 
            message="已自动恢复上次草稿数据" 
            closable 
            onClose={() => setDraftRestored(false)} 
            style={{ marginBottom: 16 }} 
          />
        )}

        {template ? (
          <Card
            styles={{ body: { padding: 16 } }}
            className="soft-card generate-workbench"
          >
            <div className="generate-toolbar" style={{ marginBottom: 16 }}>
              <div className="generate-toolbar-left">
                <Button icon={<PlusOutlined />} onClick={addRow}>新增一行</Button>
                <Button icon={<CopyOutlined />} onClick={copyLastRow}>复制上一行</Button>
                <Upload accept=".xlsx" showUploadList={false} beforeUpload={handleExcelImport}>
                  <Button icon={<UploadOutlined />}>导入 Excel</Button>
                </Upload>
                <Button icon={<DeleteOutlined />} onClick={clearAll}>清空数据</Button>
                <Button onClick={handleValidate}>校验数据</Button>
                {showValidation && validation.rowErrors.length > 0 && (
                  <Button icon={<AimOutlined />} onClick={handleLocateFirstError}>定位第一个错误</Button>
                )}
              </div>
              <div className="generate-toolbar-right">
                <Text type="secondary">{validRowCount} 行有效</Text>
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  loading={genState === 'generating'}
                  disabled={!canGenerate || genState === 'generating'}
                  onClick={handleGenerate}
                >
                  {validRowCount <= 1 ? '生成文书' : `批量生成 ${validRowCount} 份`}
                </Button>
              </div>
            </div>

            <div className="generate-secondary-toolbar">
              <div className="generate-side-actions">
                <Text type="secondary">列填充</Text>
                <Select
                  placeholder="选择变量列"
                  style={{ width: 150 }}
                  value={fillColumn}
                  onChange={setFillColumn}
                  options={variables.map((v) => ({ label: v, value: v }))}
                  allowClear
                />
                <Input
                  placeholder="输入要填充的值"
                  value={fillValue}
                  onChange={(e) => setFillValue(e.target.value)}
                  style={{ width: 200 }}
                  onPressEnter={handleFillColumn}
                />
                {fillColumn && isDateVariable(fillColumn) && (
                  <Button icon={<CalendarOutlined />} onClick={handleFillToday}>填入今天</Button>
                )}
                <Button onClick={handleFillColumn}>填充到全部行</Button>
              </div>
              <Space size={4} wrap>
                <Button
                  type="text"
                  icon={<SaveOutlined />}
                  onClick={async () => {
                    const blob = new Blob([template.rawArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                    await saveTemplateToLibrary({ name: template.name, originalFileName: template.fileName, variables: template.variables, templateBlob: blob });
                    messageApi.success('模板已保存到本地模板库');
                    onTemplateSaved?.();
                  }}
                >
                  保存模板
                </Button>
                <Button type="text" icon={<DownloadOutlined />} onClick={handleDownloadExcelTemplate}>Excel 模板</Button>
                <Button type="text" danger onClick={onTemplateCleared}>移除模板</Button>
              </Space>
            </div>

            <div ref={tableRef} className="generate-table-shell">
              <Table
                size="small"
                bordered
                pagination={false}
                scroll={{ x: true }}
                dataSource={dataSource}
                columns={columns}
                rowClassName={(_, index) => {
                  if (!showValidation || index === undefined) return '';
                  const row = rows[index];
                  const allEmpty = variables.every((v) => !row[v] || (row[v] as string).trim() === '');
                  if (allEmpty) return 'row-empty';
                  const hasMissing = variables.some((v) => !row[v] || (row[v] as string).trim() === '');
                  if (hasMissing) return 'row-error';
                  return '';
                }}
              />
            </div>

            {showValidation && (
              <div style={{ marginTop: 12 }}>
                <Divider plain style={{ margin: '8px 0' }}>校验结果</Divider>
                <Space size="large">
                  <Text>总行数: <strong>{validation.total}</strong></Text>
                  <Text>空行: <strong>{validation.empty}</strong></Text>
                  <Text>有效行: <strong>{validation.valid}</strong></Text>
                  <Text>有空值: <strong style={{ color: validation.rowErrors.length > 0 ? '#ff4d4f' : undefined }}>{validation.rowErrors.length}</strong></Text>
                </Space>
                {validation.rowErrors.length > 0 && (
                  <Alert type="warning" showIcon icon={<WarningOutlined />}
                    message={`以下 ${validation.rowErrors.length} 行存在空值`}
                    description={<div style={{ maxHeight: 160, overflow: 'auto' }}>{validation.rowErrors.map((re) => (
                      <div key={re.rowIndex} style={{ fontSize: 12, lineHeight: '20px' }}>第 {re.rowIndex} 行缺少: {re.missingFields.join(', ')}</div>
                    ))}</div>}
                    style={{ marginTop: 8 }}
                  />
                )}
                {validation.rowErrors.length === 0 && validation.valid > 0 && (
                  <Alert type="success" message="数据校验通过，可以生成。" showIcon style={{ marginTop: 8 }} />
                )}
              </div>
            )}

            {(genState === 'generating' || genState === 'done') && (
              <div style={{ marginTop: 12 }}>
                <Progress percent={progress} status={genState === 'done' ? 'success' : 'active'} />
                <Text type={genState === 'done' ? 'success' : 'secondary'} style={{ display: 'block', marginTop: 4 }}>{progressText}</Text>
              </div>
            )}

            {genError && (
              <Alert type="error" message={genError} showIcon closable onClose={() => setGenError(null)} style={{ marginTop: 8 }} />
            )}

            {genState === 'done' && (
              <Alert
                type="success"
                message={validRowCount <= 1 ? '文书已生成并开始下载。' : `已生成 ${validRowCount} 份文书，zip 文件已开始下载。`}
                showIcon style={{ marginTop: 8 }}
              />
            )}
          </Card>
        ) : (
          <Card className="soft-card empty-template-card">
            <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Typography.Title level={5} style={{ marginBottom: 8 }}>请先选择模板</Typography.Title>
            <div>
              <Text type="secondary">上传 .docx 模板或从本地模板库选择模板后，即可在这里填写变量并生成文书。</Text>
            </div>
            <Button type="primary" icon={<FolderOpenOutlined />} style={{ marginTop: 18 }} onClick={() => setTemplatePickerOpen(true)}>
              选择模板
            </Button>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
