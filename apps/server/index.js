const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 9000;
const CLIENTS = {
  'master-app': { secret: 'master-secret' },
  'slave-client': { secret: 'slave-secret' },
};
const VALID_CODE = 'mock-auth-code-123';
const VALID_TOKENS = {
  'master-app': 'mock-access-token-abc123',
  'slave-client': 'mock-slave-token-xyz789',
};

// 内存 session
const sessions = {};
// Token Exchange 生成的临时 code
const exchangeCodes = {};

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((c) => {
      const idx = c.indexOf('=');
      if (idx > 0) {
        cookies[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
      }
    });
  }
  return cookies;
}

function getUserInfo(token) {
  if (token === VALID_TOKENS['master-app']) {
    return {
      sub: '10001',
      name: '管理员',
      username: 'admin',
      email: 'admin@example.com',
    };
  }
  if (token === VALID_TOKENS['slave-client']) {
    return {
      sub: '10001',
      name: '管理员',
      username: 'admin',
      email: 'admin@example.com',
    };
  }
  return null;
}

function findClientByToken(token) {
  for (const [id, info] of Object.entries(VALID_TOKENS)) {
    if (token === info) return id;
  }
  return null;
}

// ===== OAuth2 Authorization Endpoints =====

app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.query;

  if (response_type !== 'code') {
    return res.status(400).send('unsupported_response_type');
  }

  if (!CLIENTS[client_id]) {
    return res.status(400).send('invalid_client');
  }

  const cookies = parseCookies(req.headers.cookie || '');

  if (cookies.sso_session && sessions[cookies.sso_session]) {
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', VALID_CODE);
    if (state) redirectUrl.searchParams.set('state', state);
    return res.redirect(redirectUrl.toString());
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth2 登录</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .login-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); width: 320px; }
    h2 { margin-top: 0; text-align: center; color: #333; }
    input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #1890ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    button:hover { background: #40a9ff; }
    .hint { color: #999; font-size: 12px; text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h2>OAuth2 登录</h2>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${client_id}">
      <input type="hidden" name="redirect_uri" value="${redirect_uri}">
      <input type="hidden" name="state" value="${state || ''}">
      <input type="text" name="username" placeholder="用户名" value="admin">
      <input type="password" name="password" placeholder="密码" value="123456">
      <button type="submit">授权登录</button>
    </form>
    <div class="hint">测试账号: admin / 123456</div>
  </div>
</body>
</html>
  `);
});

app.post('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, username, password } = req.body;

  if (username !== 'admin' || password !== '123456') {
    return res.status(401).send('用户名或密码错误');
  }

  const sessionId = crypto.randomUUID();
  sessions[sessionId] = { username, loggedInAt: Date.now() };

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', VALID_CODE);
  if (state) redirectUrl.searchParams.set('state', state);

  res.cookie('sso_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.redirect(redirectUrl.toString());
});

// ===== OAuth2 Token Endpoint =====

app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri,
          subject_token, requested_token_audience } = req.body;

  // Token Exchange: 用已有 token 换取子应用域的临时 code
  if (grant_type === 'urn:ietf:params:oauth:grant-type:token-exchange') {
    const clientId = findClientByToken(subject_token);
    if (!clientId) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    if (!requested_token_audience || !CLIENTS[requested_token_audience]) {
      return res.status(400).json({ error: 'invalid_audience' });
    }

    // 生成短期 code，只能被目标 client 使用
    const exchangeCode = 'exchange-code-' + crypto.randomUUID();
    exchangeCodes[exchangeCode] = {
      client_id: requested_token_audience,
      created_at: Date.now(),
      ttl: 300000, // 5 分钟
    };

    return res.json({
      code: exchangeCode,
      expires_in: 300,
    });
  }

  // 标准 Authorization Code 换 Token
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  const client = CLIENTS[client_id];
  if (!client) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  if (client_secret !== client.secret) {
    return res.status(400).json({ error: 'invalid_client_secret' });
  }

  // 支持两种 code：标准 OAuth2 code 和 Token Exchange code
  if (code !== VALID_CODE && !exchangeCodes[code]) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // 如果是 exchange code，验证目标 client
  if (exchangeCodes[code]) {
    const exchange = exchangeCodes[code];
    if (exchange.client_id !== client_id) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (Date.now() - exchange.created_at > exchange.ttl) {
      delete exchangeCodes[code];
      return res.status(400).json({ error: 'code_expired' });
    }
    delete exchangeCodes[code];
  }

  res.json({
    access_token: VALID_TOKENS[client_id],
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: `refresh-${client_id}-xyz789`,
  });
});

// ===== OAuth2 UserInfo =====

app.get('/oauth/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.slice(7);
  const userInfo = getUserInfo(token);
  if (!userInfo) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  res.json(userInfo);
});

app.post('/oauth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies.sso_session) {
    delete sessions[cookies.sso_session];
  }
  res.clearCookie('sso_session');
  res.json({ ok: true });
});

// ===== Master 后端 API =====

app.post('/api/auth/callback', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'missing_code' });

  // Master 后端用 master_secret 换 token（模拟内部调用 SSO）
  const client = CLIENTS['master-app'];
  if (code !== VALID_CODE) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  res.json({
    access_token: VALID_TOKENS['master-app'],
    token_type: 'Bearer',
    expires_in: 3600,
    userInfo: getUserInfo(VALID_TOKENS['master-app']),
  });
});

// Master 后端：用 master_token 换取子应用的临时 code
app.post('/api/auth/slave-code', (req, res) => {
  const { master_token } = req.body;
  if (!master_token) return res.status(400).json({ error: 'missing_token' });

  const clientId = findClientByToken(master_token);
  if (!clientId || clientId !== 'master-app') {
    return res.status(400).json({ error: 'invalid_token' });
  }

  // 生成 slave-client 域下的临时 code
  const exchangeCode = 'exchange-code-' + crypto.randomUUID();
  exchangeCodes[exchangeCode] = {
    client_id: 'slave-client',
    created_at: Date.now(),
    ttl: 300000,
  };

  res.json({ code: exchangeCode, expires_in: 300 });
});

// Master 后端：获取用户信息（同域）
app.get('/api/auth/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.slice(7);
  const userInfo = getUserInfo(token);
  if (!userInfo) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  res.json(userInfo);
});

// ===== Slave 后端 API =====

app.post('/api/slave/auth/callback', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'missing_code' });

  const client = CLIENTS['slave-client'];

  // 支持两种 code：标准 OAuth2 code 和 Token Exchange code
  if (code !== VALID_CODE && !exchangeCodes[code]) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  if (exchangeCodes[code]) {
    const exchange = exchangeCodes[code];
    if (exchange.client_id !== 'slave-client') {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (Date.now() - exchange.created_at > exchange.ttl) {
      delete exchangeCodes[code];
      return res.status(400).json({ error: 'code_expired' });
    }
    delete exchangeCodes[code];
  }

  res.json({
    access_token: VALID_TOKENS['slave-client'],
    token_type: 'Bearer',
    expires_in: 3600,
    userInfo: getUserInfo(VALID_TOKENS['slave-client']),
  });
});

app.listen(PORT, () => {
  console.log(`OAuth2 模拟服务端已启动: http://localhost:${PORT}`);
  console.log(`授权端点: http://localhost:${PORT}/oauth/authorize`);
  console.log(`Token 端点: http://localhost:${PORT}/oauth/token`);
  console.log(`Token Exchange: http://localhost:${PORT}/oauth/token (grant_type=token_exchange)`);
  console.log(`Master API: http://localhost:${PORT}/api/auth/*`);
  console.log(`Slave API: http://localhost:${PORT}/api/slave/auth/*`);
  console.log(`支持的客户端: ${Object.keys(CLIENTS).join(', ')}`);
});
