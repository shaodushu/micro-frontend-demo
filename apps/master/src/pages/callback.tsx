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

    exchangeToken(code, redirectUri)
      .then(async (data) => {
        setToken(data.access_token);

        try {
          const userInfo = await fetchUserInfo(data.access_token);
          setUserInfo(userInfo);
        } catch {
          // 如果获取用户信息失败，使用默认信息
          setUserInfo({
            sub: '10001',
            name: '管理员',
            username: 'admin',
            email: 'admin@example.com',
          });
        }

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
