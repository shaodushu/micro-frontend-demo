import { useEffect, useRef, useState } from 'react';
import { history } from 'umi';
import { isLoggedIn, getToken, getAppConfig } from '@/utils/auth';
import { useIframeSync } from '@/hooks/useIframeSync';

export default function SlavePage() {
  useEffect(() => {
    if (!isLoggedIn()) {
      history.push('/login');
    }
  }, []);

  const { tenantName: initialTenant, projectSpace: initialProject } = getAppConfig();
  const [tenantName, setTenantName] = useState(initialTenant);
  const [projectSpace, setProjectSpace] = useState(initialProject);
  const {
    iframeRef, slaveReady, slavePath, slaveNeedAuth, resetNeedAuth,
    onIframeLoad, sendToSlave,
  } = useIframeSync(tenantName, projectSpace);

  const processingRef = useRef(false);

  // 处理 SLAVE_NEED_AUTH：调后端换 code → 发给 iframe
  useEffect(() => {
    if (!slaveNeedAuth || processingRef.current) return;
    processingRef.current = true;

    const masterToken = getToken();
    if (!masterToken) return;

    fetch('/api/auth/slave-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_token: masterToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code) {
          sendToSlave({ type: 'MASTER_SLAVE_CODE', code: data.code });
        }
      })
      .catch(console.error)
      .finally(() => {
        processingRef.current = false;
        resetNeedAuth();
      });
  }, [slaveNeedAuth, resetNeedAuth, sendToSlave]);

  useEffect(() => {
    const onConfigUpdate = () => {
      const cfg = getAppConfig();
      setTenantName(cfg.tenantName);
      setProjectSpace(cfg.projectSpace);
    };
    window.addEventListener('app-config-update', onConfigUpdate);
    return () => window.removeEventListener('app-config-update', onConfigUpdate);
  }, []);

  // 接收主应用 layout 的子菜单点击事件 → 转发 postMessage 给 iframe
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { source: 'master-app', type: 'MASTER_NAV_TO', path: e.detail.path },
          'http://localhost:8001',
        );
      }
    };
    window.addEventListener('master-nav-to', handler as EventListener);
    return () => window.removeEventListener('master-nav-to', handler as EventListener);
  }, []);

  if (!isLoggedIn()) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px', background: '#f0f5ff', borderBottom: '1px solid #d6e4ff', fontSize: 13, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
        <span>{slaveReady ? '子应用已就绪 ✓' : '正在加载子应用...'}</span>
        {slaveReady && <span>当前页面: {slavePath}</span>}
      </div>
      <iframe
        ref={iframeRef}
        src="http://localhost:8001/slave/?embedded=true"
        onLoad={onIframeLoad}
        style={{ flex: 1, width: '100%', border: 'none' }}
        title="子应用"
      />
    </div>
  );
}
