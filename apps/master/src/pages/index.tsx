import { useEffect } from 'react';
import { history } from 'umi';
import { isLoggedIn, getToken, getUserInfo } from '@/utils/auth';

export default function IndexPage() {
  useEffect(() => {
    if (!isLoggedIn()) {
      history.push('/login');
    }
  }, []);

  const token = getToken();
  const userInfo = getUserInfo();

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginTop: 0 }}>主应用 - 首页</h1>

      <div style={{ marginBottom: 20 }}>
        <h2>当前登录状态</h2>
        {userInfo ? (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 16, borderRadius: 4 }}>
            <p><strong>用户名:</strong> {userInfo.username}</p>
            <p><strong>姓名:</strong> {userInfo.name}</p>
            <p><strong>邮箱:</strong> {userInfo.email}</p>
            <p><strong>Token:</strong> <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 3 }}>{token}</code></p>
          </div>
        ) : (
          <p>未登录</p>
        )}
      </div>

      <div>
        <h2>微前端架构说明</h2>
        <ul>
          <li>主应用端口: 8002</li>
          <li>子应用端口: 8001</li>
          <li>OAuth2 服务端端口: 9000</li>
          <li>登录态通过 qiankun props 共享给子应用</li>
        </ul>
      </div>
    </div>
  );
}
