import { useEffect, useState } from 'react';
import {
  getToken, getUserInfo, setToken, setUserInfo,
  getTenantName, getProjectSpace, setEmbeddedProps,
  isEmbedded, type UserInfo,
} from '@/utils/auth';

const OAUTH2_SERVER = 'http://localhost:9000';
const CLIENT_ID = 'slave-client';
const CALLBACK_URL = 'http://localhost:8001/slave/callback';

export default function SlaveIndexPage() {
  const [token, setTokenState] = useState<string | undefined>(getToken());
  const [userInfo, setUserInfoState] = useState<UserInfo | undefined>(getUserInfo());
  const [tenantName, setTenantName] = useState<string | undefined>(getTenantName());
  const [projectSpace, setProjectSpace] = useState<string | undefined>(getProjectSpace());
  const [embedded] = useState(isEmbedded());

  // 监听主应用 postMessage
  useEffect(() => {
    if (!embedded) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'http://localhost:8002') return;
      const { source, type, tenantName: tn, projectSpace: ps } = event.data;

      if (source !== 'master-app') return;

      if (type === 'MASTER_AUTH' || type === 'MASTER_CONFIG_UPDATE') {
        setEmbeddedProps({ tenantName: tn, projectSpace: ps });
        setTenantName(tn);
        setProjectSpace(ps);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embedded]);

  // 初始化：处理 URL token 或触发 OAuth2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const userInfoRaw = params.get('userInfo');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      if (userInfoRaw) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userInfoRaw));
          setUserInfo(parsed);
          setUserInfoState(parsed);
        } catch {}
      }
      setTokenState(tokenFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (!token) {
      const authUrl = new URL(`${OAUTH2_SERVER}/oauth/authorize`);
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', JSON.stringify({ from: 'slave', redirect: window.location.href }));
      window.location.href = authUrl.toString();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // token 就绪后通知主应用并请求租户配置
  useEffect(() => {
    if (embedded && token && window.parent) {
      window.parent.postMessage(
        { type: 'SLAVE_READY', source: 'slave-app' },
        'http://localhost:8002',
      );
      // 请求主应用发送租户/项目空间配置
      window.parent.postMessage(
        { type: 'SLAVE_REQUEST_CONFIG', source: 'slave-app' },
        'http://localhost:8002',
      );
    }
  }, [embedded, token]);

  if (!token) return null;

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      {embedded && (
        <div style={{ marginBottom: 16, fontSize: 12, color: '#999' }}>
          📦 通过 iframe 嵌入主应用
        </div>
      )}

      <h1 style={{ marginTop: 0 }}>子应用 - 首页</h1>

      {!embedded && <p style={{ color: '#666' }}>我是被独立访问的微应用</p>}

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h2>登录态（子应用独立 token）</h2>
        {token ? (
          <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: 16, borderRadius: 4 }}>
            <p><strong>Token:</strong> <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 3 }}>{token}</code></p>
            {userInfo && (
              <>
                <p><strong>用户ID:</strong> {userInfo.sub}</p>
                <p><strong>用户名:</strong> {userInfo.username}</p>
                <p><strong>姓名:</strong> {userInfo.name}</p>
                <p><strong>邮箱:</strong> {userInfo.email}</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: 16, borderRadius: 4, color: '#cf1322' }}>
            <p>未获取到登录态</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>租户与项目空间</h2>
        {tenantName || projectSpace ? (
          <div style={{ background: '#fff7e6', border: '1px solid #ffd591', padding: 16, borderRadius: 4 }}>
            <p><strong>租户名:</strong> {tenantName || '-'}</p>
            <p><strong>项目空间:</strong> {projectSpace || '-'}</p>
          </div>
        ) : (
          <div style={{ background: '#f0f0f0', border: '1px solid #d9d9d9', padding: 16, borderRadius: 4, color: '#999' }}>
            <p>未获取到租户信息</p>
          </div>
        )}
      </div>

      <div>
        <h2>postMessage 接收的数据</h2>
        <pre style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 16, borderRadius: 4, overflow: 'auto' }}>
          {JSON.stringify({ embedded, tenantName, projectSpace, token }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
