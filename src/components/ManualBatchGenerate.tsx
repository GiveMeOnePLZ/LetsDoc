import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button, Typography, Alert, Progress, Space, Table, Divider, Input,
} from 'antd';
import {
  PlusOutlined, CopyOutlined, DeleteOutlined, RocketOutlined, WarningOutlined,
} from '@ant-design/icons';
import { generateBatchDocx } from '../utils/docxGenerator';
import { getManualDraft, saveManualDraft, variablesMatch } from '../utils/storage';
import { MAX_BATCH_ROWS } from '../utils/constants';
import type { TemplateData, BatchRow } from '../types';

const { Text } = Typography;

interface Props {
  template: TemplateData;
}

type GenState = 'idle' | 'generating' | 'done' | 'error';

function createEmptyRow(variables: string[]): BatchRow {
  const row: BatchRow = {};
  for (const v of variables) row[v] = '';
  return row;
}

function validateRows(rows: BatchRow[], variables: string[]): {
  total: number;
  empty: number;
  valid: number;
  rowErrors: Array<{ rowIndex: number; missingFields: string[] }>;
} {
  let empty = 0;
  const rowErrors: Array<{ rowIndex: number; missingFields: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const allEmpty = variables.every((v) => !row[v] || row[v].trim() === '');
    if (allEmpty) {
      empty++;
      continue;
    }
    const missing = variables.filter((v) => !row[v] || row[v].trim() === '');
    if (missing.length > 0) {
      rowErrors.push({ rowIndex: i + 1, missingFields: missing });
    }
  }

  return {
    total: rows.length,
    empty,
    valid: rows.length - empty - rowErrors.length,
    rowErrors,
  };
}

function loadDraft(variables: string[]): { rows: BatchRow[]; restored: boolean } {
  const draft = getManualDraft();
  if (!draft || !variablesMatch(draft.variables, variables)) {
    return { rows: Array.from({ length: 1 }, () => createEmptyRow(variables)), restored: false };
  }
  const rows = draft.rows.length > 0
    ? draft.rows.slice(0, MAX_BATCH_ROWS)
    : Array.from({ length: 1 }, () => createEmptyRow(variables));
  return { rows, restored: true };
}

export default function ManualBatchGenerate({ template }: Props) {
  const variables = template.variables;
  const [initData] = useState(() => loadDraft(variables));
  const [rows, setRows] = useState<BatchRow[]>(initData.rows);
  const [genState, setGenState] = useState<GenState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [draftRestored, setDraftRestored] = useState(initData.restored);
  const tableRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveManualDraft(variables, rows);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [variables, rows]);

  const debouncedSave = useCallback((currentRows: BatchRow[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveManualDraft(variables, currentRows);
    }, 2000);
  }, [variables]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow(variables)]);
  }, [variables]);

  const copyLastRow = useCallback(() => {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      return [...prev, { ...prev[prev.length - 1] }];
    });
  }, []);

  const deleteRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    const fresh = Array.from({ length: 1 }, () => createEmptyRow(variables));
    setRows(fresh);
    setShowValidation(false);
    setGenState('idle');
    setGenError(null);
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

        while (next.length <= targetRowIdx) {
          next.push(createEmptyRow(variables));
        }

        const cells = parsedRows[ci];
        for (let cj = 0; cj < cells.length; cj++) {
          const targetColIdx = startCol + cj;
          if (targetColIdx >= variables.length) break;
          next[targetRowIdx] = {
            ...next[targetRowIdx],
            [variables[targetColIdx]]: cells[cj].trim(),
          };
        }
      }

      debouncedSave(next);
      return next;
    });
  }, [variables, debouncedSave]);

  const validation = validateRows(rows, variables);
  const canGenerate = validation.rowErrors.length === 0 && validation.valid > 0;
  const validRowCount = rows.filter((row) =>
    variables.some((v) => row[v] && row[v].trim() !== '')
  ).length;

  const handleValidate = () => {
    setShowValidation(true);
  };

  const handleGenerate = async () => {
    const validRows = rows.filter((row) =>
      variables.some((v) => row[v] && row[v].trim() !== '')
    );

    if (validRows.length === 0) {
      setGenError('没有可生成的数据，请先填写至少一行完整数据。');
      return;
    }

    setGenState('generating');
    setProgress(0);
    setProgressText('正在生成...');
    setGenError(null);

    try {
      await generateBatchDocx(
        template.rawArrayBuffer,
        variables,
        validRows,
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setProgressText(`正在生成 ${current} / ${total}`);
          if (current === total) setProgressText('正在打包 zip...');
        }
      );
      setProgressText('生成完成');
      setGenState('done');
    } catch (err) {
      setGenError(
        `批量生成失败: ${err instanceof Error ? err.message : '未知错误'}`
      );
      setGenState('error');
    }
  };

  const columns = [
    {
      title: '#',
      width: 50,
      fixed: 'left' as const,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    ...variables.map((v) => ({
      title: v,
      dataIndex: v,
      key: v,
      width: 150,
      render: (_: unknown, record: Record<string, unknown>, index: number) => (
        <Input
          size="small"
          value={String(record[v] || '')}
          onChange={(e) => updateCell(index, v, e.target.value)}
          onPaste={(e) => handlePaste(e, index, variables.indexOf(v))}
          placeholder={v}
          style={{ border: 'none', padding: 0 }}
        />
      ),
    })),
    {
      title: '',
      width: 40,
      fixed: 'right' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <DeleteOutlined
          style={{ color: '#ff4d4f', cursor: 'pointer' }}
          onClick={() => deleteRow(index)}
        />
      ),
    },
  ];

  const dataSource = rows.map((row, i) => ({ key: i, ...row })) as Array<Record<string, unknown> & { key: number }>;

  return (
    <div>
      {draftRestored && (
        <Alert
          type="info"
          showIcon
          message="已自动恢复上次草稿数据"
          closable
          onClose={() => setDraftRestored(false)}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space style={{ marginBottom: 12 }} wrap>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          新增一行
        </Button>
        <Button icon={<CopyOutlined />} onClick={copyLastRow}>
          复制上一行
        </Button>
        <Button icon={<DeleteOutlined />} onClick={clearAll}>
          清空数据
        </Button>
        <Button onClick={handleValidate}>
          校验数据
        </Button>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          loading={genState === 'generating'}
          disabled={!canGenerate || genState === 'generating'}
          onClick={handleGenerate}
        >
          批量生成（{validRowCount} 份）
        </Button>
      </Space>

      <div ref={tableRef} style={{ marginBottom: 12 }}>
        <Table
          size="small"
          bordered
          pagination={false}
          scroll={{ x: true, y: 400 }}
          dataSource={dataSource}
          columns={columns}
          rowClassName={(_, index) => {
            if (!showValidation || index === undefined) return '';
            const row = rows[index];
            const allEmpty = variables.every((v) => !row[v] || row[v].trim() === '');
            if (allEmpty) return 'row-empty';
            const hasMissing = variables.some((v) => !row[v] || row[v].trim() === '');
            if (hasMissing) return 'row-error';
            return '';
          }}
        />
      </div>

      {showValidation && (
        <div style={{ marginBottom: 12 }}>
          <Divider plain style={{ margin: '8px 0' }}>校验结果</Divider>
          <Space size="large">
            <Text>总行数: <strong>{validation.total}</strong></Text>
            <Text>空行: <strong>{validation.empty}</strong></Text>
            <Text>有效行: <strong>{validation.valid}</strong></Text>
            <Text>有空值: <strong style={{ color: validation.rowErrors.length > 0 ? '#ff4d4f' : undefined }}>
              {validation.rowErrors.length}
            </strong></Text>
          </Space>

          {validation.rowErrors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`以下 ${validation.rowErrors.length} 行存在空值`}
              description={
                <div style={{ maxHeight: 160, overflow: 'auto' }}>
                  {validation.rowErrors.map((re) => (
                    <div key={re.rowIndex} style={{ fontSize: 12, lineHeight: '20px' }}>
                      第 {re.rowIndex} 行缺少: {re.missingFields.join(', ')}
                    </div>
                  ))}
                </div>
              }
              style={{ marginTop: 8 }}
            />
          )}

          {validation.rowErrors.length === 0 && validation.valid > 0 && (
            <Alert type="success" message="数据校验通过，可以生成。" showIcon style={{ marginTop: 8 }} />
          )}
        </div>
      )}

      {(genState === 'generating' || genState === 'done') && (
        <div>
          <Progress percent={progress} status={genState === 'done' ? 'success' : 'active'} />
          <Text type={genState === 'done' ? 'success' : 'secondary'} style={{ display: 'block', marginTop: 4 }}>
            {progressText}
          </Text>
        </div>
      )}

      {genError && (
        <Alert type="error" message={genError} showIcon closable onClose={() => setGenError(null)} style={{ marginTop: 8 }} />
      )}

      {genState === 'done' && (
        <Alert
          type="success"
          message={`已生成 ${validRowCount} 份文书，zip 文件已开始下载。`}
          showIcon
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}
