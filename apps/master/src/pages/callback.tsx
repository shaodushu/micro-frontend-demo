import { useEffect, useState } from 'react';
import { history } from 'umi';
import { setToken, setUserInfo } from '@/utils/auth';

export default function CallbackPage() {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setError('授权失败：未获取到授权码');
      return;
    }

    // 调自己后端换 token（同域 ✅）
    fetch('/api/auth/callback', {
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
        history.push('/');
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
