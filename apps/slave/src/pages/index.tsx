import { useEffect, useState } from 'react';
import { getToken, getUserInfo, getSlaveProps, type UserInfo } from '@/utils/auth';

export default function SlaveIndexPage() {
  const [token, setToken] = useState<string | undefined>(getToken());
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(getUserInfo());
  const [propsData, setPropsData] = useState<any>(getSlaveProps());

  useEffect(() => {
    // 监听主应用传来的 props 更新
    const onPropsUpdate = () => {
      setPropsData(getSlaveProps());
      setToken(getToken());
      setUserInfo(getUserInfo());
    };
    window.addEventListener('qiankun-props-update', onPropsUpdate);
    return () => window.removeEventListener('qiankun-props-update', onPropsUpdate);
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      <h1>子应用 - 首页</h1>
      <p style={{ color: '#666' }}>我是被 qiankun 加载的微应用</p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h2>从主应用共享的登录态</h2>
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
            <p>未获取到登录态，请先在主应用登录</p>
          </div>
        )}
      </div>

      <div>
        <h2>qiankun 传入的 props 关键字段</h2>
        <pre style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 16, borderRadius: 4, overflow: 'auto' }}>
          {JSON.stringify(
            {
              name: propsData?.name,
              base: propsData?.base,
              token: propsData?.token,
              userInfo: propsData?.userInfo,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}
