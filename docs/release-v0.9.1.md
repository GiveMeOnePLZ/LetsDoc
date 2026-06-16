# Release v0.9.1

发布日期：2026-06-16

## 品牌更名

项目品牌名由 **Doclet** 更名为 **LetsDoc**。

### 变更内容

- 中文产品名统一为"LetsDoc 文书模板生成器"
- package.json name 字段改为 letsdoc
- package.json productName 改为"LetsDoc 文书模板生成器"
- 网页标题改为"LetsDoc 文书模板生成器"
- Header 标题同步更新
- Electron 桌面版窗口标题同步更新
- README 项目名称和简介更新
- CHANGELOG 添加 v0.9.1 改名记录

### 模板库备份格式

- 新导出的备份文件扩展名由 `.doclet` 改为 `.letsdoc`
- 导出文件名格式改为 `letsdoc-template-library-YYYYMMDD-HHmm.letsdoc`
- manifest.json 中 app 字段由 `"Doclet"` 改为 `"LetsDoc"`

### 兼容性处理

- 导入功能同时支持 `.letsdoc` 和旧版 `.doclet` 文件
- 导入时兼容 manifest.app 为 `"Doclet"` 或 `"LetsDoc"` 的备份文件
- 页面文案说明：新版备份文件使用 `.letsdoc` 格式，仍兼容导入旧版 `.doclet` 文件

### 保留不变

- localStorage key（`docxgen:` 前缀）保持不变，兼容旧版数据
- IndexedDB 数据库名（`docxgen-db`）保持不变，兼容旧版数据
- Electron appId（`com.docxgen.app`）保持不变
- 历史存储 key 保留 docxgen 前缀，用于兼容旧版本本地数据
- 不做数据迁移
- 不清空用户已有模板库

## 修改文件

- `package.json`：name、productName、version
- `index.html`：title
- `src/components/Header.tsx`：标题
- `src/utils/constants.ts`：APP_VERSION
- `src/utils/templateBackup.ts`：APP_NAME、类型名、导出文件名、导入兼容逻辑
- `src/components/TemplateLibrary.tsx`：类型导入、accept 属性、UI 文案
- `src/utils/storage.ts`：添加兼容性注释
- `src/utils/templateStore.ts`：添加兼容性注释
- `electron/main.cjs`：窗口标题
- `README.md`：品牌名和备份格式说明
- `CHANGELOG.md`：添加 v0.9.1 记录
- `docs/release-v0.9.1.md`：本发布说明

## 验收清单

1. 页面中不再显示 Doclet，统一显示 LetsDoc
2. 浏览器标题显示 LetsDoc 文书模板生成器
3. package.json name 为 letsdoc
4. package.json productName 为 LetsDoc 文书模板生成器
5. Electron 窗口标题显示 LetsDoc
6. README 当前说明统一为 LetsDoc
7. CHANGELOG 增加 v0.9.1 改名记录
8. 新导出的备份文件扩展名为 `.letsdoc`
9. 可以导入新版 `.letsdoc`
10. 可以兼容导入旧版 `.doclet`
11. 旧 localStorage 草稿不丢
12. 旧 IndexedDB 模板库不丢
13. 单份生成正常
14. 网页录入生成正常
15. Excel 导入生成正常
16. 本地模板库正常
17. npm run lint 通过
18. npm run build 通过
