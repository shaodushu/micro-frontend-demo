import { useEffect, useState } from 'react';
import { history } from 'umi';
import { isLoggedIn, getToken, getUserInfo, getAppConfig, setAppConfig } from '@/utils/auth';

export default function IndexPage() {
  useEffect(() => {
    if (!isLoggedIn()) {
      history.push('/login');
    }
  }, []);

  const token = getToken();
  const userInfo = getUserInfo();
  const appConfig = getAppConfig();

  const [editTenantName, setEditTenantName] = useState(appConfig.tenantName);
  const [editProjectSpace, setEditProjectSpace] = useState(appConfig.projectSpace);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setAppConfig({ tenantName: editTenantName, projectSpace: editProjectSpace });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const containerStyle: React.CSSProperties = {
    padding: 16, border: '1px solid #d9d9d9', borderRadius: 4,
    display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
  };

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

      <div style={{ marginBottom: 20 }}>
        <h2>租户与项目空间</h2>
        <div style={containerStyle}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>租户名</label>
            <input
              value={editTenantName}
              onChange={(e) => setEditTenantName(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#666' }}>项目空间</label>
            <input
              value={editProjectSpace}
              onChange={(e) => setEditProjectSpace(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}
            />
          </div>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 20px', background: '#1890ff', color: 'white',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            }}
          >
            保存
          </button>
          {saved && <span style={{ color: '#52c41a', fontSize: 13 }}>已保存 ✓</span>}
        </div>
      </div>

      <div>
        <h2>微前端架构说明</h2>
        <ul>
          <li>主应用端口: 8002</li>
          <li>子应用端口: 8001</li>
          <li>OAuth2 服务端端口: 9000</li>
          <li>登录态通过 iframe postMessage 传递给子应用</li>
          <li>租户与项目空间在首页修改保存后，子应用自动同步</li>
        </ul>
      </div>
    </div>
  );
}
