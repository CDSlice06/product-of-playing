# 手机访问与部署说明

## 两种访问方式

### 1. 同一 Wi-Fi 或手机热点下访问
- 电脑执行 `npm.cmd run dev`
- 保证电脑和手机在同一个局域网，或手机开热点让电脑连接
- 在手机浏览器打开 `http://电脑内网IP:5173/#/`
- 如果打不开，检查 Windows 防火墙是否放行 `5173` 端口

### 2. 任意网络访问
- 必须把项目部署到公网，单靠本地开发服务器无法做到任意 Wi-Fi 都能访问
- 当前项目已补好 `vercel.json`，可直接部署到 Vercel

## Vercel 部署步骤
- 将项目推送到 GitHub
- 在 Vercel 导入该仓库
- 构建命令填 `npm run build`
- 输出目录填 `dist`
- 在环境变量中配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Supabase 必配项
- 在 Supabase 控制台中补充站点 URL 为你的 Vercel 域名
- 将生产域名加入允许的重定向/认证域名列表

## 手机画面说明
- 项目已加入手机竖屏提示层
- 建议玩家横屏游玩，避免棋盘和手牌区被压缩
