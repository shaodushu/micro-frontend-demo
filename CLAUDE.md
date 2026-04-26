# CLAUDE.md

该文件为 Claude Code (claude.ai/code) 操作此仓库时提供指引。

## 常用命令

```bash
# 一键启动所有服务（需先在根目录 pnpm install）
pnpm dev

# 分别启动单个服务（各应用也可在各自目录下 cd apps/<name> && pnpm dev）
pnpm dev:server    # OAuth2 服务端 :9000
pnpm dev:slave     # 子应用 :8001
pnpm dev:master    # 主应用 :8002

# 构建
pnpm build
```

## 架构概览

Umi 4 pnpm monorepo，包含三个应用。跨域微前端采用 **iframe + postMessage** 方案（非 qiankun），主子应用独立部署在不同端口/域名，各自拥有独立的 OAuth2 token。

```
┌─ localhost:8002 ────────────────────────────────────────┐
│  主应用 (Umi 4)                                           │
│  侧边栏: 首页 / 子应用                                     │
│  ┌─ iframe ──────────────────────────────────────────┐   │
│  │  localhost:8001/slave/?embedded=true                │   │
│  │  子应用 (Umi 4) — 嵌入时隐藏导航                     │   │
│  │  postMessage 双向通信                                │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

                     localhost:9000
                 ┌─────────────────────┐
                 │  OAuth2 服务端       │
                 │  SSO session cookie  │
                 │  跨域自动放行         │
                 └─────────────────────┘
```

## 核心数据流（SSO + postMessage）

```
1. 用户访问 localhost:8002
2. 未登录 → 跳转 :9000/oauth/authorize?client_id=master-app
3. 有 SSO session → 自动 302 回调，带 code
4. 无 session → 显示登录表单 → POST → 设 cookie → 回调带 code
5. 主应用 callback.tsx: code → 换 token → 存 localStorage → 跳转 /
6. 用户点击"子应用" → 导航到 /slave
7. slave.tsx 嵌入 iframe(localhost:8001/slave/?embedded=true)
8. iframe 加载 → slave 检测 ?embedded=true → 监听 postMessage
9. iframe onLoad → master 发 MASTER_AUTH(tenantName, projectSpace)
10. slave 无 token → 跳转 :9000/oauth/authorize?client_id=slave-client
11. 有 SSO session → 自动 302 回调 → slave 拿到自己的 token
12. slave 就绪 → 发 SLAVE_READY + SLAVE_REQUEST_CONFIG 给 master
13. master 收到 → 再次发 MASTER_AUTH 同步租户/项目空间
```

## postMessage 通信协议

所有消息带 `source` 字段校验来源。

### 主应用 → 子应用 (targetOrigin: http://localhost:8001)

| 类型 | 触发时机 | 数据 |
|------|----------|------|
| `MASTER_AUTH` | iframe onLoad + 收到 SLAVE_REQUEST_CONFIG | `{ tenantName, projectSpace }` |
| `MASTER_CONFIG_UPDATE` | 租户/项目空间变更（依赖 slaveReady） | `{ tenantName, projectSpace }` |
| `MASTER_NAV_TO` | 主应用侧边栏点击子应用子菜单 | `{ path: '/list' }` |

### 子应用 → 主应用 (targetOrigin: http://localhost:8002)

| 类型 | 触发时机 | 数据 |
|------|----------|------|
| `SLAVE_READY` | 子应用 token 就绪 | 无 |
| `SLAVE_REQUEST_CONFIG` | 子应用就绪后请求配置 | 无 |
| `SLAVE_NAV` | 子应用路由变化 | `{ path: '/list' }` |

## 子应用独立访问场景

```
1. 用户直接访问 localhost:8001/slave/
2. 无 token → 跳转 :9000/oauth/authorize?client_id=slave-client
3. 无 session → 登录表单 → 输入密码
4. SSO 设 session → 回调到 slave/callback → 换 token → 存 localStorage
5. 跳转回 slave/ → 显示完整 Layout（含顶部导航菜单）
```

## 应用详解

### apps/master — 主应用 (端口 8002)

Umi 4 应用，微前端容器 + OAuth2 登录管理。

- **`config/config.ts`** — 路由配置（/ → index, /slave → slave, /login, /callback），无 qiankun 插件
- **`src/layouts/index.tsx`** — 全局布局：左侧深色侧边栏（首页、子应用），子应用激活时显示子菜单，退出登录按钮
- **`src/pages/slave.tsx`** — iframe 嵌入页：使用 `useIframeSync` 管理通信，顶栏显示状态和当前子应用路径，转发 `master-nav-to` 事件到 iframe
- **`src/hooks/useIframeSync.ts`** — postMessage 通信封装：管理 iframeRef / slaveReady / slaveToken / slavePath，处理 SLAVE_READY/SLAVE_TOKEN/SLAVE_REQUEST_CONFIG/SLAVE_NAV
- **`src/pages/index.tsx`** — 首页：租户名/项目空间编辑表单，支持实时修改
- **`src/pages/login.tsx`** — 自动跳转 OAuth2（无按钮），已登录则跳转 /
- **`src/pages/callback.tsx`** — OAuth2 回调：支持 master 和 slave 两种 client 的回调处理（通过 state.from 区分），分别存不同 localStorage key
- **`src/utils/auth.ts`** — 登录态管理：`getToken/setToken/getUserInfo/setUserInfo/isLoggedIn/logout`，`getAppConfig/setAppConfig` 带 `app-config-update` 自定义事件
- **`src/services/auth.ts`** — OAuth2 客户端：`getAuthorizeUrl(redirectUri, clientKey?)`，`exchangeToken(code, redirectUri, clientKey?)`，支持多 client

### apps/slave — 子应用 (端口 8001)

Umi 4 应用，独立部署，可被主应用 iframe 嵌入或独立访问。

- **`config/config.ts`** — `base: '/slave'`, `mfsu: false`，路由（/, /list, /detail, /callback），无 qiankun
- **`src/layouts/index.tsx`** — 布局：`isEmbedded()` 时只渲染 `<Outlet />`（无导航）；独立访问时显示顶部水平导航（首页/列表页/详情页）；监听 `MASTER_NAV_TO` 消息；路由变化时发 `SLAVE_NAV`
- **`src/pages/index.tsx`** — 子应用首页：展示 token/userInfo 登录态（独立 token），租户/项目空间信息，嵌入态来源标识
- **`src/pages/list.tsx`** — 模拟数据列表页（表格展示）
- **`src/pages/detail.tsx`** — 模拟详情页（通过 `?id=` 参数）
- **`src/pages/callback.tsx`** — OAuth2 回调：用 slave-client 换 token，存 localStorage
- **`src/utils/auth.ts`** — `getToken/setToken/getUserInfo/setUserInfo/clearAuth/isLoggedIn`（localStorage），`isEmbedded/setEmbeddedProps/getEmbeddedProps/getTenantName/getProjectSpace`（iframe 嵌入态）

### apps/server — OAuth2 模拟服务端 (端口 9000)

Express 实现的 OAuth2 Authorization Code + SSO session 模拟器。

- 两个注册 client：`master-app`（主应用）和 `slave-client`（子应用）
- `GET /oauth/authorize` — 有 `sso_session` cookie 时自动 302 回调，无则渲染登录表单
- `POST /oauth/authorize` — 校验凭据（admin/123456），设 `sso_session` cookie，重定向到 redirect_uri
- `POST /oauth/token` — 用 code + client_secret 换 token（`mock-access-token-${client_id}`），支持 CORS
- SSO session 实现：内存存储，cookie `sso_session`，跨域自动放行

## OAuth2 双客户端设计

| 应用 | client_id | client_secret | token 存储 key |
|------|-----------|---------------|----------------|
| 主应用 | `master-app` | `master-secret` | `master_token` |
| 子应用 | `slave-client` | `slave-secret` | `slave_token` |

两个应用各自走完整 OAuth2 流程换取独立 token，SSO 通过服务端 session 实现免密。

## 已知注意点

- **必须禁用 MFSU** — master 和 slave 都设置了 `mfsu: false`
- **login 和 callback 路由使用 `layout: false`** — 不显示侧边栏布局
- **主子应用端口不同** — master 8002，slave 8001，server 9000，所有 postMessage 做了 origin 校验
- **子应用 base 路径** — `base: '/slave'`，独立访问用 `http://localhost:8001/slave/`，iframe src 也是 `/slave/?embedded=true`
- **嵌入态识别** — slave 通过 URL 参数 `?embedded=true` 判断是否在 iframe 中
- **iframe 首次加载的时序** — slave 加载后立即 OAuth2 跳转（导致第一次 MASTER_AUTH 丢失），需靠 slave 就绪后发 SLAVE_REQUEST_CONFIG 重新获取
