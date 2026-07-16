# LetsDoc 文书模板生成器

LetsDoc 1.0.0 是一个纯前端、本地处理的 Word 模板生成工具。通过 `{{变量名}}` 占位符填写数据，可生成单份文书，也可将多行数据批量打包为 ZIP。

文件解析和文书生成均在浏览器本地完成，不会上传服务器。

## 主要功能

- 工作台首页、最近模板和本地模板库
- 网页表格填写，支持新增、复制、删除和整列填充
- 导入 `.xlsx` 数据，最多批量生成 500 份文书
- 模板体检、数据校验和错误定位
- 常用变量值、本地草稿自动恢复
- 模板库导入、导出和跨浏览器备份
- 浏览器网页和 Windows Tauri 桌面版

## 文件格式

| 用途 | 支持 | 不支持 |
|---|---|---|
| Word 模板 | `.docx` | `.doc`、PDF |
| 批量数据 | `.xlsx` | `.xls` |
| 模板库备份 | `.letsdoc` | 其他压缩文件 |

> 模板只能上传 `.docx` 文件。旧版 `.doc` 请先使用 Word、WPS 或 LibreOffice 另存为 `.docx`。

## 使用方法

1. 在 Word 中制作 `.docx` 模板并添加变量。
2. 上传模板，或从本地模板库选择模板。
3. 在网页表格中填写数据，也可以导入 `.xlsx`。
4. 校验数据后点击“生成文书”。
5. 单行数据下载 `.docx`，多行数据下载 `.zip`。

首页提供可直接测试的示例：[付款通知示例模板](public/examples/letsdoc-example-template.docx)。

## 模板变量

变量使用双花括号包裹：

```text
{{姓名}}
{{合同编号}}
{{付款日期}}
{{金额_大写}}
```

制作模板时请注意：

- 占位符必须完整写成 `{{变量名}}`，变量名不能为空。
- 变量名不能包含 `{`、`}`、换行或控制字符。
- 中文、英文、数字、空格和常见可见符号均可使用。
- 为方便 Excel 表头匹配，建议使用简短名称，少用空格和复杂符号。
- 同一变量可以在模板中重复出现，生成时会替换为同一个值。
- 请在 Word 中一次完整输入占位符，避免复制、分段编辑导致 XML run 拆分。
- Excel 第一行表头必须与模板变量名完全一致，一行数据生成一份文书。

正确示例：`{{姓名}}`、`{{单位名称}}`、`{{doc_no}}`、`{{金额（元）}}`。

错误示例：`{{}}`、`{姓名}`、`{{姓名`、`{{姓{名}}}`。

## 模板体检

选择模板后，LetsDoc 会检查：

- 是否存在可识别变量
- 占位符是否闭合
- 变量名是否包含不支持的字符
- 占位符是否可能被 Word 拆分
- 是否存在相似变量、重复变量或过多变量

体检正常时不占用工作区；发现警告或错误时才显示详细信息。

## 数据与隐私

- Word、Excel 和生成文件只在当前设备处理。
- 模板库保存在浏览器 IndexedDB。
- 草稿、最近模板和常用值保存在 localStorage。
- 清理浏览器数据、切换浏览器或更换电脑后，本地数据不会自动同步。
- 可将模板库导出为 `.letsdoc` 文件备份；该文件包含模板原文，请妥善保存。
- 网站当前不嵌入第三方流量跟踪脚本；可在腾讯云 EdgeOne 控制台查看聚合访问指标。

## 本地开发

环境要求：Node.js `20.19+` 或 `22.12+`。

```bash
npm install
npm run dev
```

开发地址：`http://localhost:5173`

常用命令：

```bash
npm test          # 运行测试
npm run lint      # ESLint 检查
npm run build     # 类型检查并构建网页
npm run preview   # 预览生产构建
```

构建产物位于 `dist/`。

## Windows 桌面版

```bash
npm run tauri:dev
npm run tauri:build:portable
npm run tauri:package:portable
```

便携包输出为 `release/LetsDoc-portable-1.0.0-windows-x64.zip`。目标电脑需要 Microsoft Edge WebView2 Runtime，常规 Windows 10/11 通常已安装。

未签名程序可能触发 Windows SmartScreen 提示。

## 网站部署

LetsDoc 不需要后端或数据库。执行 `npm run build` 后，将 `dist/` 部署到任意静态网站服务即可，例如 Nginx、IIS、GitHub Pages、Cloudflare Pages、Netlify 或 Vercel。

不建议直接双击 `dist/index.html`，应通过 HTTP 服务访问。详细步骤见 [部署指南](docs/deploy.md)。

### 腾讯云 EdgeOne Makers

本项目已适配 EdgeOne Makers 的 Git 自动部署。在项目设置中使用以下构建配置：

```text
安装命令：npm ci
构建命令：npm run build
输出目录：dist
生产分支：main
```

代码合并或推送到 `main` 后，EdgeOne 会自动构建并发布；也可以在部署记录中手动重新部署。

网站页脚备案号为冀ICP备2026025713号。若使用其他域名或部署主体，请按实际备案信息调整。

## 开源协作

欢迎提交 Issue 或 Pull Request。请勿将真实文书、Excel 数据、个人信息或其他敏感文件提交到仓库。

## 技术栈

- Vite、React 19、TypeScript 6
- Ant Design 6
- docxtemplater、PizZip
- SheetJS、JSZip、FileSaver
- IndexedDB、localStorage
- Tauri 2

## 项目结构

```text
src/
├── components/       UI 与业务组件
├── layouts/          应用布局
├── pages/            工作台、生成、模板、备份和设置页面
├── types/            TypeScript 类型
└── utils/            DOCX、Excel、存储和生成逻辑
public/examples/      示例模板
src-tauri/            Tauri 桌面壳
docs/                 部署与发布文档
```

## 当前限制

- 仅支持 `.docx` 模板和 `.xlsx` 数据文件。
- 单次批量生成最多 500 份。
- 被 Word 拆分为多个 XML run 的占位符可能无法识别。
- 不支持 PDF 导出、在线编辑模板或云端同步。
- 当前主要适配桌面宽屏和笔记本浏览器。
