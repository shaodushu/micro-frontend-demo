import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'umi';
import { getUserInfo, logout, getAppConfig } from '@/utils/auth';

const menuItems = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'slave', label: '子应用', path: '/slave' },
];

const slaveSubItems = [
  { label: '子应用首页', path: '/' },
  { label: '列表页', path: '/list' },
  { label: '详情页', path: '/detail?id=1' },
];

export default function Layout() {
  const location = useLocation();
  const [activeKey, setActiveKey] = useState('home');
  const userInfo = getUserInfo();
  const { tenantName: initialTenant, projectSpace: initialProject } = getAppConfig();
  const [tenantName, setTenantName] = useState(initialTenant);
  const [projectSpace, setProjectSpace] = useState(initialProject);

  useEffect(() => {
    const current = menuItems.find((item) =>
      location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
    );
    if (current) {
      setActiveKey(current.key);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onConfigUpdate = () => {
      const cfg = getAppConfig();
      setTenantName(cfg.tenantName);
      setProjectSpace(cfg.projectSpace);
    };
    window.addEventListener('app-config-update', onConfigUpdate);
    return () => window.removeEventListener('app-config-update', onConfigUpdate);
  }, []);

  const navigateSlave = (path: string) => {
    window.dispatchEvent(new CustomEvent('master-nav-to', { detail: { path } }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* 左侧菜单 */}
      <aside
        style={{
          width: 200,
          background: '#001529',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 16px 4px', fontSize: 18, fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          主应用菜单
        </div>
        <div style={{ padding: '8px 16px 16px', fontSize: 12, color: 'rgba(255,255,255,0.45)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {tenantName} / {projectSpace}
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {menuItems.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              style={{
                display: 'block',
                padding: '14px 24px',
                color: activeKey === item.key ? '#1890ff' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                background: activeKey === item.key ? '#1890ff15' : 'transparent',
                borderRight: activeKey === item.key ? '3px solid #1890ff' : '3px solid transparent',
                transition: 'all 0.3s',
              }}
            >
              {item.label}
            </Link>
          ))}
          {/* 子应用内部页面子菜单 */}
          {activeKey === 'slave' && (
            <div style={{ paddingLeft: 12 }}>
              {slaveSubItems.map((sub) => (
                <div
                  key={sub.path}
                  onClick={() => navigateSlave(sub.path)}
                  style={{
                    padding: '10px 24px',
                    color: 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {sub.label}
                </div>
              ))}
            </div>
          )}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {userInfo && (
            <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              <div style={{ color: 'white', fontWeight: 'bold' }}>{userInfo.name}</div>
              <div>{userInfo.email}</div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              color: '#ff4d4f',
              border: '1px solid #ff4d4f',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}
