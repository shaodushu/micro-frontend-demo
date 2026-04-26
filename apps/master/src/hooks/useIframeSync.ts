import { useCallback, useEffect, useRef, useState } from 'react';

export interface SlaveMessage {
  type: 'SLAVE_READY' | 'SLAVE_TOKEN' | 'SLAVE_REQUEST_CONFIG' | 'SLAVE_NAV' | 'SLAVE_NEED_AUTH';
  slaveToken?: string;
  slaveUserInfo?: Record<string, string>;
  path?: string;
}

const SLAVE_ORIGIN = 'http://localhost:8001';

export function useIframeSync(tenantName: string, projectSpace: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [slaveReady, setSlaveReady] = useState(false);
  const [slaveToken, setSlaveToken] = useState<string | null>(null);
  const [slavePath, setSlavePath] = useState<string>('/');
  const [slaveNeedAuth, setSlaveNeedAuth] = useState(false);

  const sendToSlave = useCallback((data: Record<string, unknown>) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'master-app', ...data },
        SLAVE_ORIGIN,
      );
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent<SlaveMessage>) => {
    if (event.origin !== SLAVE_ORIGIN) return;
    const { type, slaveToken: token, slaveUserInfo, path } = event.data;

    if (type === 'SLAVE_READY') {
      setSlaveReady(true);
    }
    if (type === 'SLAVE_TOKEN' && token) {
      setSlaveToken(token);
      if (slaveUserInfo) {
        localStorage.setItem('slave_app_user', JSON.stringify(slaveUserInfo));
      }
    }
    if (type === 'SLAVE_REQUEST_CONFIG') {
      sendToSlave({ type: 'MASTER_AUTH', tenantName, projectSpace });
    }
    if (type === 'SLAVE_NAV' && path) {
      setSlavePath(path);
    }
    if (type === 'SLAVE_NEED_AUTH') {
      setSlaveNeedAuth(true);
    }
  }, [sendToSlave, tenantName, projectSpace]);

  const onIframeLoad = useCallback(() => {
    sendToSlave({ type: 'MASTER_AUTH', tenantName, projectSpace });
  }, [sendToSlave, tenantName, projectSpace]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (slaveReady) {
      sendToSlave({ type: 'MASTER_CONFIG_UPDATE', tenantName, projectSpace });
    }
  }, [tenantName, projectSpace, slaveReady, sendToSlave]);

  const resetNeedAuth = useCallback(() => setSlaveNeedAuth(false), []);

  return { iframeRef, slaveReady, slaveToken, slavePath, slaveNeedAuth, resetNeedAuth, onIframeLoad, sendToSlave };
}
