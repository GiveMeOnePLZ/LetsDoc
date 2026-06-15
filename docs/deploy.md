# 部署指南

## 部署前检查

```bash
npm run lint      # 代码检查
npm run build     # 生产构建
npm run preview   # 本地预览验证
```

确认以下功能正常：

- [ ] 上传 .docx 模板
- [ ] 单份生成
- [ ] 网页录入批量生成
- [ ] Excel 导入批量生成
- [ ] localStorage 草稿恢复

## 浏览器兼容

- Chrome（推荐）
- Edge
- Safari（最新版）

不支持 IE。

## 部署方式

### 方式一：静态文件服务器

将 `dist/` 目录复制到服务器：

```bash
# Nginx 配置示例
server {
    listen 80;
    server_name docgen.example.com;
    root /var/www/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 方式二：GitHub Pages

1. 将项目推送到 GitHub
2. 在 Settings → Pages 中选择分支和目录
3. 构建命令设为 `npm run build`，输出目录设为 `dist`

### 方式三：Cloudflare Pages / Netlify / Vercel

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`

### 方式四：EdgeOne Pages（腾讯云）

EdgeOne Pages（Makers）是腾讯云提供的静态网站托管平台，支持直接上传构建产物。

#### 操作步骤：

1. **登录控制台**
   - 访问 [边缘安全加速平台 EO 控制台](https://console.cloud.tencent.com/edgeone)
   - 使用腾讯云账号登录

2. **创建项目**
   - 首次登录会进入场景选择大厅
   - 将鼠标移动至「创建项目」
   - 选择「直接上传」方式

3. **配置项目**
   - 填写「项目名称」（如：docforge）
   - 选择「加速区域」：
     - 中国大陆：适合国内用户访问（需域名备案）
     - 全球加速：适合全球用户访问
   - 将本地 `dist/` 目录的所有文件拖拽到上传区域

4. **部署上线**
   - 点击「开始部署」
   - 等待资产上传和项目创建
   - 部署成功后通过预览链接访问

5. **域名设置**
   - 默认提供 `.edgeone.app` 域名
   - 可绑定自定义域名（需完成域名备案）
   - 详细域名配置请参考 [域名管理文档](https://edgeone.cloud.tencent.com/pages/document/175191809682923520)

#### 注意事项：
- 直接上传方式无法切换到 Git 集成
- 如需自动部署，需创建新的 Git 集成项目
- 确保上传的文件夹根目录下有 `index.html` 文件
- 部署成功后如遇 404 错误，检查文件结构是否正确

### 方式五：本地预览

```bash
npm run preview
```

浏览器打开 `http://localhost:4173`

## 隐私说明

- 页面代码从部署服务器加载
- 用户上传的 .docx / .xlsx 文件在浏览器本地处理
- 不会上传到服务器
- 不应加入统计、埋点、远程日志
- 草稿数据仅保存在用户浏览器 localStorage 中
- 本地模板库保存在浏览器 IndexedDB 中，不会上传服务器
- 清理浏览器数据、换电脑或换浏览器后，模板库可能丢失

## 内网部署建议

- 如果涉及敏感办公文档，优先部署到内网或可信服务器
- 不建议把业务模板和生成结果上传到任何云端
- 可将 `dist/` 目录拷贝到内网服务器，通过 Nginx 或 IIS 部署
- 部署后用户通过浏览器访问内网地址即可使用

## 版本更新

更新版本时需要修改：

1. `package.json` 中的 `version` 字段
2. `src/utils/constants.ts` 中的 `APP_VERSION` 常量
3. 重新执行 `npm run build`

## 桌面版分发

### 构建桌面应用

```bash
npm run electron:build
```

产物在 `release/` 目录。

### 分发方式

- 将 `release/` 目录中的应用拷贝到目标机器
- macOS：将 `.app` 拖入「应用程序」文件夹
- 未签名应用需手动允许运行：
  - macOS：系统设置 → 隐私与安全性 → 仍要打开
  - Windows：Windows Defender SmartScreen → 仍要运行

### 桌面版与网页版的区别

| 功能 | 网页版 | 桌面版 |
|------|--------|--------|
| 运行方式 | 浏览器访问 | 双击打开 |
| 文件处理 | 浏览器本地 | 浏览器本地（Electron 内置） |
| 数据存储 | localStorage | localStorage |
| 安装 | 无需安装 | 需拷贝应用 |
| 更新 | 刷新页面 | 重新下载应用 |
