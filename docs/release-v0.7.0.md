# Release v0.7.0

发布日期：2026-06-15

## 新增功能

### 模板库备份与恢复

- 导出本地模板库为 `.doclet` 备份文件
- 从 `.doclet` 文件导入模板库
- 导入前预校验（文件格式、manifest.json、模板文件完整性）
- 导入预览（备份版本、导出时间、模板总数、新增数量、同名覆盖数量）
- 同名模板自动覆盖更新

## `.doclet` 备份格式

`.doclet` 是 Doclet 专用备份格式，本质是 zip 文件。

### 文件结构

```
.doclet
├── manifest.json
└── templates/
    ├── {templateId}.docx
    └── ...
```

### manifest.json 结构

```json
{
  "app": "Doclet",
  "version": "v0.7.0",
  "exportedAt": 1718467200000,
  "templates": [
    {
      "id": "abc123",
      "name": "通知书模板",
      "originalFileName": "通知书.docx",
      "variables": ["姓名", "日期", "单位"],
      "size": 12345,
      "createdAt": 1718467200000,
      "updatedAt": 1718467200000,
      "fileName": "abc123.docx"
    }
  ]
}
```

## 导出功能

### 操作步骤

1. 在「本地模板库」区域点击「导出模板库」按钮
2. 系统读取 IndexedDB 中所有模板
3. 生成 `.doclet` 备份文件
4. 浏览器自动下载文件

### 文件名格式

```
doclet-template-library-YYYYMMDD-HHmm.doclet
```

### 空模板库处理

如果模板库为空，点击导出时会提示：「当前没有可导出的模板」。

## 导入功能

### 操作步骤

1. 在「本地模板库」区域点击「导入模板库」按钮
2. 选择 `.doclet` 文件
3. 系统解析并校验文件
4. 显示导入预览
5. 点击「确认导入」完成导入

### 导入预览信息

- 备份文件版本
- 导出时间
- 模板总数
- 新增模板数量
- 同名覆盖数量
- 模板列表（名称、变量数量、文件大小）

### 冲突处理

同名模板会覆盖当前本地模板库中的已有模板。导入预览中会明确提示：

> 同名模板将覆盖当前本地模板库中的已有模板。

### 错误处理

| 错误场景 | 提示信息 |
|----------|----------|
| 非 `.doclet` 文件 | 备份文件格式不正确，请选择由 Doclet 导出的 .doclet 文件。 |
| zip 文件损坏 | 备份文件已损坏，无法读取，请重新选择由 Doclet 导出的 .doclet 文件。 |
| 缺少 manifest.json | 备份文件格式不正确，缺少 manifest.json，请选择由 Doclet 导出的 .doclet 文件。 |
| manifest.json 格式错误 | 备份文件格式不正确，manifest.json 解析失败。 |
| app 不是 Doclet | 备份文件格式不正确，请选择由 Doclet 导出的 .doclet 文件。 |
| 模板文件缺失 | 备份文件中缺少模板文件：{fileName} |
| 模板文件非 .docx | 模板文件格式异常：{fileName}，不是 .docx 文件。 |
| 变量清单格式异常 | 模板「{name}」的变量清单格式异常。 |
| IndexedDB 保存失败 | 模板导入失败，可能是浏览器存储空间不足。 |

## 隐私说明

### 导出区域提示

> 导出的 .doclet 文件包含你的 Word 模板文件，请妥善保存，不要随意发送给他人。

### 导入区域提示

> 请仅导入你信任来源的 .doclet 文件。

## 技术实现

### 新增文件

- `src/utils/templateBackup.ts`：备份/恢复核心逻辑
- `docs/release-v0.7.0.md`：本发布说明

### 修改文件

- `src/components/TemplateLibrary.tsx`：添加导出/导入按钮和交互逻辑
- `src/utils/constants.ts`：版本号更新为 v0.7.0
- `package.json`：版本号更新为 0.7.0
- `CHANGELOG.md`：添加 v0.7.0 变更记录
- `README.md`：添加模板库备份与恢复说明
- `docs/deploy.md`：更新验收清单

### 依赖说明

- JSZip：用于生成和解析 `.doclet` 备份文件（已有依赖）
- file-saver：用于下载备份文件（已有依赖）

## 验收清单

1. 空模板库导出时有提示
2. 有模板时可以导出 `.doclet`
3. `.doclet` 文件可以被重新导入
4. 导入后模板库列表更新
5. 导入后选择模板可以单份生成
6. 导入后选择模板可以网页录入批量生成
7. 导入后选择模板可以 Excel 导入批量生成
8. 同名模板导入时覆盖更新
9. 非 `.doclet` 文件拒绝
10. 损坏 zip 拒绝
11. 缺少 manifest.json 拒绝
12. 缺少模板文件拒绝
13. lint 通过
14. build 通过

## 限制说明

- `.doclet` 文件包含模板文件本体，请妥善保存
- 同名模板导入时会覆盖，不支持保留两份
- 不支持逐个选择导入的模板
- 不支持导入后预览模板内容
