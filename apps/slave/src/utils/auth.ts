export interface UserInfo {
  sub: string;
  name: string;
  username: string;
  email: string;
}

export function getSlaveProps(): { token?: string; userInfo?: UserInfo } | null {
  if (typeof window !== 'undefined') {
    return (window as any).__QIANKUN_SLAVE_PROPS__ || null;
  }
  return null;
}

export function getToken(): string | undefined {
  return getSlaveProps()?.token;
}

export function getUserInfo(): UserInfo | undefined {
  return getSlaveProps()?.userInfo;
}
