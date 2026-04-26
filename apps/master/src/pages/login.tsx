import { useEffect } from 'react';
import { history } from 'umi';
import { isLoggedIn } from '@/utils/auth';
import { getAuthorizeUrl } from '@/services/auth';

export default function LoginPage() {
  useEffect(() => {
    if (isLoggedIn()) {
      history.push('/');
      return;
    }

    const redirectUri = `${window.location.origin}/callback`;
    const authorizeUrl = getAuthorizeUrl(redirectUri);
    window.location.href = authorizeUrl;
  }, []);

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
        <h1 style={{ marginTop: 0, color: '#333' }}>正在跳转到 OAuth2 登录...</h1>
        <p style={{ color: '#666' }}>如果未自动跳转，请使用测试账号 admin / 123456</p>
      </div>
    </div>
  );
}
