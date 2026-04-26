# CLAUDE.md

该文件为 Claude Code (claude.ai/code) 操作此仓库时提供指引。

## 常用命令

```bash
# 一键启动所有服务（需先在根目录 pnpm install）
pnpm dev

# 分别启动单个服务
pnpm dev:server    # OAuth2 + 后端 API :9000
pnpm dev:slave     # 子应用前端 :8001
pnpm dev:master    # 主应用前端 :8002

# 构建
pnpm build
```

## 架构概览

Umi 4 pnpm monorepo，三个应用。跨域微前端采用 **iframe + postMessage + OAuth2 Token Exchange**。

```
┌─ localhost:8002 ──────────────────────────────────────────────┐
│  主应用前端 (Umi 4)                    后端 API (9000 proxy)  │
│  callback → POST /api/auth/callback  ←─ proxy ── :9000       │
│  SLAVE_NEED_AUTH → /api/auth/slave-code                      │
│                                                               │
│  ┌─ iframe ────────────────────────────────────────────────┐  │
│  │  localhost:8001/slave/?embedded=true                     │  │
│  │  子应用前端 (Umi 4)        后端 API (9000 proxy)         │  │
│  │  code → POST /api/slave/auth/callback  ← proxy ── :9000 │  │
│  │  postMessage 双向通信                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

                     localhost:9000
            ┌─────────────────────────────────────┐
            │  Express 服务端                       │
            │  OAuth2 Authorization Code 端点      │
            │  Token Exchange 端点（RFC 8693）     │
            │  后端 API 端点（模拟各应用后端）       │
            └─────────────────────────────────────┘
```

## 核心设计：OAuth2 Token Exchange

生产环境下 iframe 内不能跳转 SSO（第三方 cookie 被拦截）。采用 **Token Exchange** 模式：

1. 主应用用自己的 token 向 SSO 换取子应用的临时 code（不需要子应用的 client_secret）
2. 子应用用自己的 client_secret 将 code 换成自己的 token
3. **各后端持各自的 secret，互不共享**
4. **前端只调同域后端 API**（通过 proxy 转发到模拟后端）
5. **iframe 内不跳转 OAuth2**

## 核心数据流

### 主应用登录

```
1. 访问 localhost:8002 → 无 token → 顶层跳转 :9000/oauth/authorize
2. 有 SSO session → 自动 302 带 code → 回调 /callback?code=xxx
3. 无 session → 显示登录表单 → POST → 设 cookie → 回调带 code
4. callback 页调自己后端: POST /api/auth/callback { code }  ← 同域 proxy
5. 后端用 master-secret 换 token → 返回 { access_token, userInfo }
6. 存 localStorage → 跳转 /
```

### 子应用 iframe 嵌入（Token Exchange）

```
1. 点击"子应用" → /slave 页 → iframe(localhost:8001/?embedded=true)
2. slave 无 token → postMessage { type: 'SLAVE_NEED_AUTH' }
   ↑ 不跳转，无第三方 cookie 问题

3. master 前端调后端: POST /api/auth/slave-code { master_token }
4. 后端用 master_token 调 SSO Token Exchange → 返回短期 code
5. master 前端通过 postMessage → iframe: { type: 'MASTER_SLAVE_CODE', code }

6. slave 前端调自己后端: POST /api/slave/auth/callback { code }
7. slave 后端用 slave-secret 换 token → 返回 { access_token, userInfo }
8. slave 存 localStorage → 渲染 → 发 SLAVE_READY
```

### 子应用独立访问

```
1. 访问 localhost:8001/slave/ → 无 token → 顶层跳转 :9000/oauth/authorize
2. SSO 认证 → 回调 localhost:8001/slave/callback?code=xxx
3. callback 页调自己后端: POST /api/slave/auth/callback { code }  ← 同域 proxy
4. 存 localStorage → 跳转 /
```

### 切换页面不重新认证

离开 /slave 再回来 → iframe 销毁重建 → slave 检查 localStorage → 有 token → 不发 SLAVE_NEED_AUTH → 直接渲染。

## postMessage 通信协议

所有消息带 `source` 字段校验来源（`source: 'master-app'` / `source: 'slave-app'`）。

### 主应用 → 子应用 (targetOrigin: http://localhost:8001)

| 类型 | 触发时机 | 数据 |
|------|----------|------|
| `MASTER_AUTH` | iframe onLoad + 收到 SLAVE_REQUEST_CONFIG | `{ tenantName, projectSpace }` |
| `MASTER_CONFIG_UPDATE` | 租户/项目空间变更 | `{ tenantName, projectSpace }` |
| `MASTER_NAV_TO` | 侧边栏点击子应用子菜单 | `{ path: '/list' }` |
| `MASTER_SLAVE_CODE` | 后端换取 code 成功 | `{ code }` |

### 子应用 → 主应用 (targetOrigin: http://localhost:8002)

| 类型 | 触发时机 | 数据 |
|------|----------|------|
| `SLAVE_NEED_AUTH` | iframe 内无 token（替代 OAuth2 跳转） | 无 |
| `SLAVE_READY` | 子应用 token 就绪 | 无 |
| `SLAVE_REQUEST_CONFIG` | 就绪后请求租户配置 | 无 |
| `SLAVE_NAV` | 子应用路由变化 | `{ path: '/list' }` |

## 应用详解

### apps/server — OAuth2 + 后端 API (端口 9000)

Express 实现的 OAuth2 模拟器，同时模拟各应用的后端 API。

**OAuth2 端点：**
- `GET/POST /oauth/authorize` — 授权码端点，SSO session 支持
- `POST /oauth/token` — 标准 code→token 交换 + Token Exchange (RFC 8693)
- `GET /oauth/userinfo` — Bearer token 获取用户信息
- `POST /oauth/logout` — 登出清除 session

**模拟后端 API（同域代理目标）：**
- `POST /api/auth/callback` — master 后端：用 code 换 master token
- `POST /api/auth/slave-code` — master 后端：用 master_token 换 slave 临时 code
- `GET /api/auth/userinfo` — master 后端：获取用户信息
- `POST /api/slave/auth/callback` — slave 后端：用 code 换 slave token

**客户端注册：** `master-app` (secret: `master-secret`)、`slave-client` (secret: `slave-secret`)

### apps/master — 主应用前端 (端口 8002)

- **`config/config.ts`** — 路由 + proxy 转发 `/api/` → `localhost:9000`
- **`src/layouts/index.tsx`** — 侧边栏（首页/子应用 + 子菜单），退出登录
- **`src/pages/slave.tsx`** — iframe 嵌入页：接收 `SLAVE_NEED_AUTH`，调后端换 code，通过 postMessage 传给 iframe
- **`src/hooks/useIframeSync.ts`** — postMessage 通信封装，新增 `SLAVE_NEED_AUTH` 处理
- **`src/pages/callback.tsx`** — OAuth2 回调：`POST /api/auth/callback` 换 token（同域 ✅）
- **`src/pages/index.tsx`** — 首页：租户名/项目空间编辑
- **`src/pages/login.tsx`** — 自动跳转 SSO
- **`src/utils/auth.ts`** — 登录态管理（localStorage: `master_token` / `master_user` / `master_app_config`）
- **`src/services/auth.ts`** — `getAuthorizeUrl()` 构建 SSO URL（不再持有 client_secret）

### apps/slave — 子应用前端 (端口 8001)

- **`config/config.ts`** — `base: '/slave'`, 路由 + proxy 转发 `/api/slave/` → `localhost:9000`
- **`src/layouts/index.tsx`** — `isEmbedded()` 时只渲染内容（无导航）；独立访问显示顶部导航；监听 `MASTER_NAV_TO`
- **`src/pages/index.tsx`** — 嵌入态：发送 `SLAVE_NEED_AUTH` + 监听 `MASTER_SLAVE_CODE` → 调自己后端换 token；独立态：正常 OAuth2 跳转
- **`src/pages/callback.tsx`** — OAuth2 回调：`POST /api/slave/auth/callback` 换 token（同域 ✅）
- **`src/pages/list.tsx`** — 模拟数据列表页
- **`src/pages/detail.tsx`** — 模拟详情页（`?id=` 参数）
- **`src/utils/auth.ts`** — 登录态管理（`slave_token` localStorage），嵌入态属性（`isEmbedded/setEmbeddedProps`）

## OAuth2 双客户端

| 应用 | client_id | client_secret | 凭证位置 | token 存储 |
|------|-----------|---------------|----------|-----------|
| 主应用 | `master-app` | `master-secret` | 后端 (server) | `master_token` |
| 子应用 | `slave-client` | `slave-secret` | 后端 (server) | `slave_token` |

**credential 永不暴露在前端代码中。**

## 代理机制

开发环境通过 Umi proxy 实现「同域 API 调用」：

| 前端 | 前端 URL | 代理转发 |
|------|----------|----------|
| Master | `http://localhost:8002/api/*` | → `http://localhost:9000/api/*` |
| Slave | `http://localhost:8001/api/slave/*` | → `http://localhost:9000/api/slave/*` |

生产环境通过反向代理（Nginx/gateway）实现同样的效果。

## 已知注意点

- **必须禁用 MFSU** — master 和 slave 都设置了 `mfsu: false`
- **login 和 callback 路由使用 `layout: false`** — 不显示侧边栏布局
- **Master 必须在 PORT=8002 启动** — `PORT=8002 pnpm dev`（Umi 有时忽略 `--port` 参数）
- **子应用 base 路径** — `base: '/slave'`，独立访问用 `http://localhost:8001/slave/`
- **嵌入态识别** — 通过 URL 参数 `?embedded=true` 判断
- **Token Exchange code 有效期** — 5 分钟，一次性使用
