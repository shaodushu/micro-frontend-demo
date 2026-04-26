# CLAUDE.md

该文件为 Claude Code (claude.ai/code) 操作此仓库时提供指引。

## 常用命令

```bash
# 一键启动所有服务（需先在根目录 pnpm install）
pnpm dev

# 分别启动单个服务
pnpm dev:server    # OAuth2 服务端 :9000
pnpm dev:slave     # 子应用 :8001
pnpm dev:master    # 主应用 :8002

# 构建
pnpm build
```

各应用也可在各自目录下独立启动：`cd apps/<name> && pnpm dev`。

## 架构概览

Umi 4 pnpm monorepo，包含三个子应用：

### apps/master — 主应用 (端口 8002)
Umi 4 + qiankun master，微前端容器和 OAuth2 登录状态管理。
- **`config/config.ts`** — Umi 配置：在 qiankun `apps` 中注册 `slave-app`；路由（/, /slave/*, /login, /callback）
- **`src/layouts/index.tsx`** — 全局布局，左侧菜单（首页/子应用）、用户信息、退出登录，通过 `<Outlet />` 渲染子路由
- **`src/pages/slave.tsx`** — 子应用挂载入口。从 `localStorage` 读取 token/userInfo，作为 props 传给 `<MicroApp name="slave-app">`
- **`src/pages/login.tsx`** — 登录页，跳转 OAuth2 授权端点
- **`src/pages/callback.tsx`** — OAuth2 回调处理：用 code 换 token、获取用户信息、存入 `localStorage`
- **`src/utils/auth.ts`** — `getToken()`, `setToken()`, `getUserInfo()`, `setUserInfo()`, `isLoggedIn()`, `logout()` — 均基于 `localStorage`
- **`src/services/auth.ts`** — `getAuthorizeUrl()` 构建 OAuth2 授权 URL，`exchangeToken()` 调用 token 端点，`fetchUserInfo()` 获取用户信息

### apps/slave — 子应用 (端口 8001)
Umi 4 + qiankun slave，作为微应用被主应用加载。
- **`config/config.ts`** — `base: '/slave'`, `mfsu: false`, `qiankun.slave: {}`
- **`src/app.ts`** — qiankun 生命周期：`mount` 和 `update` 时将 props 保存到 `window.__QIANKUN_SLAVE_PROPS__`，并派发 `qiankun-props-update` 自定义事件
- **`src/pages/index.tsx`** — 通过 `getSlaveProps()` 读取 token/userInfo，监听 `qiankun-props-update` 事件实现响应式更新
- **`src/utils/auth.ts`** — `getSlaveProps()` 从 `window.__QIANKUN_SLAVE_PROPS__` 读取，`getToken()`/`getUserInfo()` 从 props 中提取

### apps/server — OAuth2 模拟服务端 (端口 9000)
Express 实现的 OAuth2 Authorization Code 模式模拟器。
- `GET /oauth/authorize` — 渲染登录表单，接收 `client_id`, `redirect_uri`, `response_type`, `state`
- `POST /oauth/authorize` — 校验凭据（admin/123456），重定向到 `redirect_uri`，携带 `code=mock-auth-code-123`
- `POST /oauth/token` — 用 code 换取 `access_token=mock-access-token-abc123`
- `GET /oauth/userinfo` — Bearer 认证后返回模拟用户信息

## 核心数据流

```
用户点击"OAuth2 登录"
  → 跳转 :9000/oauth/authorize
  → 填写登录表单 → POST 提交
  → 重定向回 :8002/callback?code=xxx
  → callback.tsx 用 code 换 token、获取用户信息
  → token + userInfo 存入 localStorage
  → 跳转 /
  → 用户点击"子应用" → 导航到 /slave/*
  → slave.tsx 从 localStorage 读取 → 作为 <MicroApp> 的 props 传入
  → qiankun 从 :8001/slave/ 加载子应用
  → 子应用 mount() 将 props 保存到 __QIANKUN_SLAVE_PROPS__
  → 子应用页面通过 getSlaveProps() 读取并渲染
```

## Props 共享策略

采用直接传 `<MicroApp>` props 的方式。`slave.tsx` 在渲染时直接从 `localStorage` 读取 token/userInfo 并作为组件 props 传入。子应用的 `update` 生命周期负责动态处理 props 变更。

**不采用 `useQiankunStateForSlave` 模型插件的原因**：MFSU 缓存导致 `@umijs/plugin-model` 无法正确加载，浏览器一直报 `useModel = null` 警告。

## 已知约束

- **必须禁用 MFSU** — master 和 slave 都设置了 `mfsu: false`，MFSU + qiankun 会导致 chunk 加载异常
- **子应用 entry URL 必须包含 base 路径** — 使用 `//localhost:8001/slave/` 而非 `//localhost:8001`，否则 `__INJECTED_PUBLIC_PATH_BY_QIANKUN__` 指向错误路径导致 404
- **qiankun props 含循环引用** — qiankun 传入的 props 包含 React context 等循环引用对象，不要对整个 props 对象调 `JSON.stringify()`
- **login 和 callback 路由使用 `layout: false`** — 这两个页面不显示侧边栏布局
