# 文书模板生成器 V0.5.0 发布说明

发布日期：2026-06-14

## V0.5 新增功能

### Electron 桌面应用

支持将应用打包为桌面程序，双击即可使用，无需安装浏览器或启动命令行。

### 桌面开发模式

```bash
npm run electron:dev
```

自动构建网页并打开桌面窗口，用于开发调试。

### 桌面打包

```bash
npm run electron:build
```

打包产物在 `release/` 目录，可直接拷贝到目标机器运行。

## 使用方式

### 网页版（不变）

```bash
npm run dev        # 开发模式
npm run build      # 生产构建
npm run preview    # 预览生产版本
```

### 桌面版

```bash
npm run electron:dev     # 开发模式（自动构建+打开窗口）
npm run electron:build   # 打包为桌面应用
```

## 技术实现

- Electron 主进程仅负责创建窗口和加载页面
- 不参与文档处理逻辑
- 安全配置：`nodeIntegration: false`、`contextIsolation: true`
- 生产模式加载 `dist/index.html`
- 开发模式加载 `vite preview` 本地服务器

## 注意事项

- 未签名应用可能被系统拦截
- macOS 需在「系统设置 → 隐私与安全性」中允许运行
- 桌面版功能与网页版完全一致
- 用户文件仍通过上传/选择文件处理，不自动读取本地路径

## 当前限制

- 未签名应用需手动允许运行
- 不支持自动更新
- 不支持 Windows 安装包（需在 Windows 环境打包）
- 不支持 macOS 签名 dmg（需 Apple 开发者证书）

## V0.5 人工验收清单

| # | 场景 | 预期结果 |
|---|------|----------|
| 1 | `npm run dev` 网页版 | 正常运行 |
| 2 | `npm run build` 构建 | 通过 |
| 3 | `npm run preview` 预览 | 正常访问 |
| 4 | `npm run electron:dev` | 打开桌面窗口 |
| 5 | 桌面窗口上传 .docx | 正常识别变量 |
| 6 | 桌面窗口单份生成 | 下载 .docx |
| 7 | 桌面窗口网页录入批量 | 下载 zip |
| 8 | 桌面窗口 Excel 导入批量 | 下载 zip |
| 9 | 桌面版 localStorage | 草稿保存/恢复正常 |
| 10 | `npm run electron:build` | 生成 release/ 目录 |
