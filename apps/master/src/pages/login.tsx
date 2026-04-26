import { useEffect } from 'react';
import { history } from 'umi';
import { isLoggedIn } from '@/utils/auth';
import { getAuthorizeUrl } from '@/services/auth';

export default function LoginPage() {
  useEffect(() => {
    if (isLoggedIn()) {
      history.push('/');
    }
  }, []);

  const handleLogin = () => {
    const redirectUri = `${window.location.origin}/callback`;
    const authorizeUrl = getAuthorizeUrl(redirectUri);
    window.location.href = authorizeUrl;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: 'white',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        width: 360,
        textAlign: 'center',
      }}>
        <h1 style={{ marginTop: 0, color: '#333' }}>主应用登录</h1>
        <p style={{ color: '#666' }}>点击按钮通过 OAuth2 授权登录</p>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: 14,
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
            marginTop: 20,
          }}
        >
          OAuth2 登录
        </button>

        <p style={{ color: '#999', fontSize: 12, marginTop: 20 }}>
          测试账号: admin / 123456
        </p>
      </div>
    </div>
  );
}
