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

### 方式四：本地预览

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
