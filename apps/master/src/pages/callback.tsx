import { useEffect, useState } from 'react';
import { history } from 'umi';
import { exchangeToken, fetchUserInfo } from '@/services/auth';
import { setToken, setUserInfo } from '@/utils/auth';

export default function CallbackPage() {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setError('授权失败：未获取到授权码');
      return;
    }

    const redirectUri = `${window.location.origin}/callback`;

    // 解析 state，判断是否是子应用 token 流程
    let isSlaveFlow = false;
    let redirectAfterAuth: string | null = null;

    try {
      const parsed = JSON.parse(state || '{}');
      isSlaveFlow = parsed.from === 'slave';
      if (parsed.redirect) redirectAfterAuth = parsed.redirect;
    } catch {
      // state 不是 JSON，可能是旧格式的 URL（子项目独立运行的跳回地址）
      if (state && /^https?:\/\/.+/.test(state)) {
        redirectAfterAuth = state;
      }
    }

    const clientKey = isSlaveFlow ? 'slave' : 'master';

    exchangeToken(code, redirectUri, clientKey)
      .then(async (data) => {
        if (isSlaveFlow) {
          // 子应用 token → 存入 localStorage
          localStorage.setItem('slave_app_token', data.access_token);
          try {
            const userInfo = await fetchUserInfo(data.access_token);
            localStorage.setItem('slave_app_user', JSON.stringify(userInfo));
          } catch {
            localStorage.setItem('slave_app_user', JSON.stringify({
              sub: '10001', name: '管理员', username: 'admin', email: 'admin@example.com',
            }));
          }

          if (redirectAfterAuth) {
            // 子应用独立运行 → 回跳子项目并携带 token
            const redirectUrl = new URL(redirectAfterAuth);
            redirectUrl.searchParams.set('token', data.access_token);
            window.location.href = redirectUrl.toString();
          } else {
            // 嵌入主应用内 → 回到主应用的子页面
            window.location.href = '/slave/';
          }
          return;
        }

        // 主应用 token
        setToken(data.access_token);

        let userInfo;
        try {
          userInfo = await fetchUserInfo(data.access_token);
          setUserInfo(userInfo);
        } catch {
          userInfo = { sub: '10001', name: '管理员', username: 'admin', email: 'admin@example.com' };
          setUserInfo(userInfo);
        }

        if (redirectAfterAuth) {
          const redirectUrl = new URL(redirectAfterAuth);
          redirectUrl.searchParams.set('token', data.access_token);
          redirectUrl.searchParams.set('userInfo', encodeURIComponent(JSON.stringify(userInfo)));
          window.location.href = redirectUrl.toString();
        } else {
          history.push('/');
        }
      })
      .catch((err) => {
        setError(`登录失败: ${err.message}`);
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#ff4d4f' }}>{error}</h2>
        <button
          onClick={() => history.push('/login')}
          style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          返回登录页
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>正在处理登录回调...</h2>
      <p>正在用授权码换取 Token，请稍候</p>
    </div>
  );
}
