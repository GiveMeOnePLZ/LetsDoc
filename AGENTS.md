# Agent 指南

## 项目概览
文书模板生成器 - 纯前端 Electron 应用，通过 `{{变量名}}` 占位符处理 Word 模板，生成公文/文书。

## 快速命令
```bash
npm run dev          # 网页开发 (localhost:5173)
npm run electron:dev # 桌面开发
npm run build        # 生产构建 → dist/
npm run lint         # ESLint 检查
```

## 关键约束
- **纯前端架构**：所有文件处理在浏览器完成，无后端服务器
- **格式限制**：仅支持 `.docx` 模板和 `.xlsx` 数据文件
- **批量上限**：最多 500 行 Excel 数据
- **变量命名**：仅允许中文、英文、数字、下划线

## 技术栈
- Vite + React 19 + TypeScript 6
- Ant Design 6 (UI 组件库)
- docxtemplater (Word 模板渲染)
- SheetJS (Excel 读写)
- Electron (桌面打包)

## 项目结构
```
src/
├── components/     # React 组件
├── utils/          # 核心工具函数
│   ├── docxGenerator.ts  # Word 文档生成
│   ├── excelHandler.ts   # Excel 读写
│   └── templateParser.ts # 模板解析
└── types/          # TypeScript 类型定义
electron/           # Electron 主进程
```

## 开发注意事项
- 变量占位符必须完整输入，不能分多次输入（会拆分 XML run）
- `npm run build` 会先执行 `tsc -b` 类型检查
- Electron 构建产物在 `release/` 目录
- 未签名桌面应用可能被系统拦截，需手动允许运行

## 常见陷阱
1. 模板中无 `{{}}` 占位符 → 提示"模板中未发现占位符变量"
2. 变量名含空格/连字符 → 提示非法字符
3. Excel 列头与模板变量不匹配 → 提示缺少列
4. 占位符被 Word 拆分 → 渲染失败，需重新输入