import { useEffect, useState } from 'react';
import { setToken, setUserInfo } from '@/utils/auth';

const OAUTH2_SERVER = 'http://localhost:9000';
const CLIENT_ID = 'slave-client';
const CLIENT_SECRET = 'slave-secret';
const CALLBACK_URL = 'http://localhost:8001/slave/callback';

export default function CallbackPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      setError('授权失败：未获取到授权码');
      return;
    }

    let redirectAfter: string | null = null;
    try {
      const parsed = JSON.parse(state || '{}');
      if (parsed.redirect) redirectAfter = parsed.redirect;
    } catch {}

    fetch(`${OAUTH2_SERVER}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: CALLBACK_URL,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('token_exchange_failed');
        const data = await res.json();
        setToken(data.access_token);

        // 获取用户信息
        try {
          const userRes = await fetch(`${OAUTH2_SERVER}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setUserInfo(userData);
          }
        } catch {}

        if (redirectAfter) {
          window.location.href = redirectAfter;
        } else {
          window.location.href = '/slave/';
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
        <button onClick={() => window.location.href = '/slave/'} style={{ padding: '10px 20px', marginTop: 12, cursor: 'pointer' }}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>正在处理登录回调...</h2>
    </div>
  );
}
