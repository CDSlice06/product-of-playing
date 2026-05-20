## 1. 架构设计
```mermaid
flowchart TD
    A["浏览器访问 /"] --> B["外层静态壳页"]
    B --> C["移动端适配层"]
    B --> D["加载状态与失败回退层"]
    B --> E["iframe 容器层"]
    E --> F["内层游戏路由 /game/#/..."]
    F --> G["现有游戏静态产物"]
    G --> H["Supabase 与静态资源"]
    B --> I["Cloudflare Pages 静态目录"]
    I --> J["相对路径与静态回退文件"]
```

## 2. 技术说明
- 前端：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- 初始化工具：vite-init（沿用现有项目）
- 路由策略：外层为纯静态 HTML，内层保留现有 HashRouter 游戏路由
- 部署方式：Cloudflare Pages 纯静态目录上传
- 资源策略：全部改为标准相对路径，避免绝对盘符与开发机路径泄露
- 验证方式：`npm run check` + 本地预览 + 浏览器端 iframe 实测

## 3. 路由定义
| 路由 | 用途 |
|-------|---------|
| / | 外层壳页唯一公开入口，负责首屏加载、移动端适配、iframe 承载 |
| /game/ | 原游戏静态承载入口，供 `iframe` 使用 |
| /game/#/auth | 内层登录页 |
| /game/#/lobby | 内层大厅页 |
| /game/#/play-local | 内层本地对战入口 |
| /game/#/battle | 内层战斗页 |

## 4. API 定义
当前方案不新增后端 API，也不改动原游戏现有 API 使用方式。
- 外层壳页只负责页面容器、加载状态、视口适配和 iframe 管理。
- 现有 Supabase、登录、房间、排行、对战逻辑全部继续由内层游戏原有代码负责。

## 5. 关键实现策略
### 5.1 双层结构拆分
- 新增独立静态壳页目录作为公开入口，负责标题、图标、meta、loading、失败重试、iframe 容器。
- 原游戏保持原样构建，构建产物整体复制到静态目录的 `/game/` 下运行。
- 通过相对路径 `./game/index.html#/auth` 等方式加载内层游戏，保证本地、预览、Cloudflare 一致。

### 5.2 移动端适配
- 外层静态页在 `index.html` 中补全 `viewport`、`theme-color`、`apple-mobile-web-app-capable`、`format-detection` 等 meta。
- 使用 CSS 变量结合 `env(safe-area-inset-top/right/bottom/left)` 处理安全区。
- 通过 `ResizeObserver` 或窗口尺寸监听计算 iframe 容器尺寸，保持内容完整显示。
- 针对 iOS Safari 地址栏折叠、安卓浏览器视口抖动，优先使用 `100dvh` 与回退值组合。

### 5.3 公网访问稳定性
- 外层静态目录的所有资源使用相对路径，避免 `C:\`、`file:///` 和开发机绝对路径泄露。
- 外层静态页去除默认模板脚本、调试脚本和平台标识，避免生产页面注入多余元素。
- 使用 `404.html`、`_headers`、`_redirects` 等静态文件增强 Cloudflare Pages 兼容性。
- 为 `iframe` 设置清晰的 `loading`、`referrerPolicy`、`allow` 和错误超时处理。

### 5.4 标题、图标与品牌信息
- 更新外层静态页标题、描述和 favicon。
- 新增标准 favicon 与移动端图标资源，统一品牌名。
- 不保留 `My Trae Project`、Trae badge、Trae 水印、默认模板信息。

### 5.5 性能优化
- 外层壳页首屏只加载最小必要 CSS/JS，避免外层过重影响打开速度。
- 利用 `iframe` 延后游戏主体启动，确保用户先看到可用加载界面。
- 静态资源使用 Cloudflare Pages 默认 CDN 分发，并通过合理缓存头提升二次访问速度。
- 保持内层游戏资源不被壳层重复请求，避免双重渲染或重复初始化。

## 6. 数据模型
### 6.1 页面状态模型
```ts
interface ShellState {
  status: 'booting' | 'loading-frame' | 'ready' | 'timeout' | 'error'
  iframeUrl: string
  isMobile: boolean
  isLandscape: boolean
  frameLoaded: boolean
  lastErrorMessage: string | null
}
```

### 6.2 状态说明
- `booting`：壳页初始化阶段，准备 meta、尺寸、路径。
- `loading-frame`：已开始加载 `iframe`，等待内层游戏 ready。
- `ready`：`iframe` 成功载入，壳页仅保留最小外层结构。
- `timeout`：超过阈值仍未完成加载，提示用户重试。
- `error`：`iframe` 或资源加载失败，提示备用处理方式。

## 7. 模块设计
### 7.1 新增模块
- `cloudflare-pages/index.html`：外层壳页主入口。
- `cloudflare-pages/assets/shell.css`：外层静态样式。
- `cloudflare-pages/assets/shell.js`：iframe 地址控制、超时控制、移动端判断。
- `cloudflare-pages/_headers`：缓存与安全头。
- `cloudflare-pages/404.html`：静态回退页。

### 7.2 现有模块处理原则
- 现有游戏组件、页面、样式、资源、逻辑文件全部保持原样。
- 不允许因外层壳页方案而改写原游戏页面结构或样式类名。
- 原游戏只通过现有构建产物形式被复制进静态目录。

## 8. Cloudflare Pages 部署设计
### 8.1 部署规则
- 先执行原游戏构建，再执行静态壳页打包脚本
- 最终输出目录为可直接上传的 `cloudflare-pages-dist`
- 保证根入口为外层壳页，`/game/` 为原游戏静态产物
- 保证所有静态资源和 favicon 均为相对引用，不出现 `C:\` 等绝对路径

### 8.2 预期目录形态
| 路径 | 说明 |
|------|------|
| cloudflare-pages-dist/index.html | 外层壳页入口 |
| cloudflare-pages-dist/game/index.html | 原游戏静态入口 |
| cloudflare-pages-dist/assets/* | 外层壳页资源 |
| cloudflare-pages-dist/game/assets/* | 原游戏构建资源 |

## 9. 测试策略
- 路由验证：确认 `/` 与 `/game/` 均可本地静态访问
- 响应式验证：覆盖安卓常见宽度、iPhone Safari、安全区和横竖屏切换
- 加载验证：确认 `iframe` 成功加载时外层 loading 自动隐藏，失败时出现重试
- 构建验证：执行原游戏构建脚本与静态壳页打包脚本
- 部署验证：Cloudflare Pages 域名下根入口与 `/game/` 均可直接访问
