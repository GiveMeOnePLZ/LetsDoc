import { useState } from 'react';
import { Button, Tooltip, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getSavedTemplate } from '../utils/templateStore';
import { saveBlob } from '../utils/downloadFile';
import type { TemplateData } from '../types';

interface Props {
  templateId?: string;
  template?: TemplateData;
  iconOnly?: boolean;
}

export default function TemplateDownloadButton({ templateId, template, iconOnly = false }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const saved = !template && templateId ? await getSavedTemplate(templateId) : null;
      if (!template && !saved) throw new Error('模板数据不存在，请刷新列表');
      const blob = template
        ? new Blob([template.rawArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        : saved!.templateBlob;
      const fileName = template ? template.fileName : saved!.originalFileName;
      if (await saveBlob(blob, fileName)) messageApi.success('模板已保存');
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '下载模板失败');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Tooltip title="下载原始 Word 模板">
        <Button size="small" icon={<DownloadOutlined />} aria-label="下载模板" loading={downloading} onClick={handleDownload}>
          {iconOnly ? null : '下载模板'}
        </Button>
      </Tooltip>
    </>
  );
}
