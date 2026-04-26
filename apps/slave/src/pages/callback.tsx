import { useEffect, useState } from 'react';
import { setToken, setUserInfo } from '@/utils/auth';

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

    // 调自己后端换 token（同域 ✅）
    fetch('/api/slave/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'token_exchange_failed');
        }
        return res.json();
      })
      .then((data) => {
        setToken(data.access_token);
        setUserInfo(data.userInfo);

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
