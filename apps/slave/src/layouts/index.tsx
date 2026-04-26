import { useEffect } from 'react';
import { Link, Outlet, useLocation, history } from 'umi';
import { isEmbedded } from '@/utils/auth';

const navItems = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'list', label: '列表页', path: '/list' },
  { key: 'detail', label: '详情页', path: '/detail?id=1' },
];

const MASTER_ORIGIN = 'http://localhost:8002';

export default function SlaveLayout() {
  const location = useLocation();
  const embedded = isEmbedded();

  const activeKey = navItems.find((item) => {
    const itemBase = item.path.split('?')[0];
    return location.pathname === itemBase;
  })?.key || 'home';

  // 路由变更时通知主应用
  useEffect(() => {
    if (embedded && window.parent) {
      window.parent.postMessage(
        { type: 'SLAVE_NAV', source: 'slave-app', path: location.pathname + location.search },
        MASTER_ORIGIN,
      );
    }
  }, [embedded, location.pathname, location.search]);

  // 接收主应用发来的导航指令
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== MASTER_ORIGIN) return;
      if (event.data?.type === 'MASTER_NAV_TO' && event.data?.path) {
        history.push(event.data.path);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (embedded) {
    return <Outlet />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e8e8e8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 'bold', marginRight: 32, color: '#001529' }}>子应用</span>
        <nav style={{ display: 'flex', height: '100%', gap: 0 }}>
          {navItems.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  color: isActive ? '#1890ff' : '#666',
                  textDecoration: 'none',
                  borderBottom: isActive ? '2px solid #1890ff' : '2px solid transparent',
                  fontSize: 14,
                  transition: 'all 0.3s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}
