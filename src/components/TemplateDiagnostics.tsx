import { useState, useMemo, useEffect } from 'react';
import { Card, Typography, Alert, Space, Button, Tag, Collapse } from 'antd';
import {
  CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
  CloseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { runDiagnostics } from '../utils/templateDiagnostics';
import type { TemplateData, TemplateDiagnostics as DiagnosticsResult, TemplateCheckItem } from '../types';

const { Text } = Typography;

interface Props {
  template: TemplateData;
  onErrorStateChange?: (hasError: boolean) => void;
}

const levelConfig = {
  error: {
    icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    color: 'error' as const,
    tagColor: 'error',
    label: '错误',
  },
  warning: {
    icon: <WarningOutlined style={{ color: '#faad14' }} />,
    color: 'warning' as const,
    tagColor: 'warning',
    label: '警告',
  },
  info: {
    icon: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
    color: 'info' as const,
    tagColor: 'blue',
    label: '提示',
  },
};

function CheckItemCard({ item }: { item: TemplateCheckItem }) {
  const config = levelConfig[item.level];
  return (
    <Alert
      type={config.color}
      icon={config.icon}
      message={
        <Space>
          <Tag color={config.tagColor} style={{ fontSize: 11 }}>{config.label}</Tag>
          <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
        </Space>
      }
      description={
        <div style={{ fontSize: 12, lineHeight: '20px' }}>
          <div style={{ marginBottom: 4 }}>{item.message}</div>
          {item.suggestion && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              建议：{item.suggestion}
            </Text>
          )}
        </div>
      }
      style={{ marginBottom: 8 }}
    />
  );
}

export default function TemplateDiagnostics({ template, onErrorStateChange }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);

  const diagnostics = useMemo<DiagnosticsResult | null>(() => {
    try {
      return runDiagnostics(template.rawArrayBuffer, template.variables);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.rawArrayBuffer, template.variables, refreshKey]);

  useEffect(() => {
    if (diagnostics) {
      onErrorStateChange?.(diagnostics.hasError);
    } else {
      onErrorStateChange?.(true);
    }
  }, [diagnostics, onErrorStateChange]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (diagnostics === null) {
    return (
      <Card
        title="模板体检"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} size="small">
            重新体检
          </Button>
        }
      >
        <Alert type="error" message="模板体检失败，请确认文件是有效的 .docx 文档。" showIcon />
      </Card>
    );
  }

  if (!diagnostics) {
    return null;
  }

  if (!diagnostics.hasError && !diagnostics.hasWarning) {
    return null;
  }

  const overallLevel = diagnostics.hasError ? 'error' : diagnostics.hasWarning ? 'warning' : 'success';
  const overallMessage = diagnostics.hasError
    ? '模板存在错误，可能无法正常生成'
    : diagnostics.hasWarning
    ? '模板存在警告，建议检查'
    : '体检通过，模板未发现明显问题';

  const collapseItems = diagnostics.checks
    .filter((c) => c.code !== 'ALL_CLEAR')
    .map((item) => ({
      key: item.code,
      label: (
        <Space>
          {levelConfig[item.level].icon}
          <span>{item.title}</span>
        </Space>
      ),
      children: <CheckItemCard item={item} />,
    }));

  return (
    <Card
      title="模板体检"
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} size="small">
          重新体检
        </Button>
      }
    >
      <Alert
        type={overallLevel}
        icon={
          overallLevel === 'error' ? (
            <CloseCircleOutlined />
          ) : overallLevel === 'warning' ? (
            <WarningOutlined />
          ) : (
            <CheckCircleOutlined />
          )
        }
        message={overallMessage}
        style={{ marginBottom: 12 }}
      />

      <Space size="large" style={{ marginBottom: 12 }}>
        {diagnostics.errorCount > 0 && (
          <Text>
            <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
            错误: <strong style={{ color: '#ff4d4f' }}>{diagnostics.errorCount}</strong>
          </Text>
        )}
        {diagnostics.warningCount > 0 && (
          <Text>
            <WarningOutlined style={{ color: '#faad14', marginRight: 4 }} />
            警告: <strong style={{ color: '#faad14' }}>{diagnostics.warningCount}</strong>
          </Text>
        )}
        {diagnostics.infoCount > 0 && (
          <Text>
            <InfoCircleOutlined style={{ color: '#1677ff', marginRight: 4 }} />
            提示: <strong style={{ color: '#1677ff' }}>{diagnostics.infoCount}</strong>
          </Text>
        )}
      </Space>

      {diagnostics.hasError && (
        <Alert
          type="warning"
          message="当前模板体检存在错误，可能无法正常生成，请先修复模板。"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {collapseItems.length > 0 && (
        <Collapse
          items={collapseItems}
          defaultActiveKey={diagnostics.hasError ? diagnostics.checks.filter((c) => c.level === 'error').map((c) => c.code) : []}
          size="small"
        />
      )}

    </Card>
  );
}
