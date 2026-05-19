# 手机访问与部署说明

## 本地调试
- 电脑执行 `npm.cmd run dev`
- 电脑和手机在同一局域网时，手机打开 `http://电脑内网IP:5173/#/`
- 如果手机访问失败，先检查 Windows 防火墙是否放行 `5173` 端口

## Cloudflare Pages 静态交付
- 执行 `npm.cmd run build:cloudflare`
- 生成目录为 `cloudflare-pages-dist`
- 目录根部是纯静态外层壳页，游戏本体原样位于 `cloudflare-pages-dist/game/`
- 所有页面、脚本、样式和图标均使用相对路径，可直接上传到 Cloudflare Pages

## Cloudflare Pages 配置
- Framework preset 选 `None`
- Build command 留空，或按需填写 `npm run build:cloudflare`
- Build output directory 填 `cloudflare-pages-dist`
- 如果你是直接上传静态目录，上传 `cloudflare-pages-dist` 全部内容即可

## 必配环境
- 生产环境变量仍需在 Cloudflare Pages 中配置：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- 同时在 Supabase 控制台把 Cloudflare Pages 域名加入站点 URL 和允许重定向列表

## 访问说明
- 推荐分享根地址 `/`，外层壳页会自动加载 `./game/index.html#/auth`
- 手机和电脑都可直接通过浏览器打开，无需下载任何文件
- 建议手机横屏游玩，棋盘与手牌区域更完整
