# 命运之战外层壳页部署说明

## 当前结构
- 根入口 `/`：外层网页壳页，负责手机适配、首屏加载、`iframe` 承载
- 内层入口 `/game/`：现有游戏本体，保持原有业务逻辑与视觉实现
- 构建产物：
  - `dist/index.html`
  - `dist/game/index.html`

## 本地验证
1. 执行 `npm run check`
2. 执行 `npm run test`
3. 执行 `npm run build`
4. 执行 `npm run preview -- --host 0.0.0.0 --port 4178 --strictPort`

验证地址：
- 外层壳页：`http://localhost:4178/`
- 游戏本体：`http://localhost:4178/game/`

## Vercel 配置
- 当前仓库已包含 `vercel.json`
- 构建命令：`npm run build`
- 输出目录：`dist`
- `rewrites` 已补充 `/game` 与 `/game/` 到 `/game/index.html`

## 线上更新方式
1. 本地修改完成后推送到 `main`
2. Vercel 自动拉取并重新构建
3. 访问根域名即可进入外层壳页

## 设计原则
- 不改现有游戏玩法、界面、样式、功能
- 仅新增外层壳页、嵌入入口、部署配置与移动端兼容层
- 全站保持相对路径，避免绝对盘符路径泄露
