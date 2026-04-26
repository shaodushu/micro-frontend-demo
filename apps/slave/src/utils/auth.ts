const SLAVE_TOKEN_KEY = 'slave_token';
const SLAVE_USER_KEY = 'slave_user';

// postMessage 接收的主应用数据
let embeddedProps: { tenantName?: string; projectSpace?: string } = {};

export interface UserInfo {
  sub: string;
  name: string;
  username: string;
  email: string;
}

export function isEmbedded(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('embedded') === 'true';
  } catch {
    return false;
  }
}

export function setEmbeddedProps(props: { tenantName?: string; projectSpace?: string }) {
  embeddedProps = { ...embeddedProps, ...props };
}

export function getEmbeddedProps() {
  return embeddedProps;
}

export function getTenantName(): string | undefined {
  if (isEmbedded()) return embeddedProps.tenantName;
  return undefined;
}

export function getProjectSpace(): string | undefined {
  if (isEmbedded()) return embeddedProps.projectSpace;
  return undefined;
}

export function getToken(): string | undefined {
  return localStorage.getItem(SLAVE_TOKEN_KEY) || undefined;
}

export function getUserInfo(): UserInfo | undefined {
  try {
    const data = localStorage.getItem(SLAVE_USER_KEY);
    if (data) return JSON.parse(data) as UserInfo;
  } catch {}
  return undefined;
}

export function setToken(token: string): void {
  localStorage.setItem(SLAVE_TOKEN_KEY, token);
}

export function setUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(SLAVE_USER_KEY, JSON.stringify(userInfo));
}

export function clearAuth(): void {
  localStorage.removeItem(SLAVE_TOKEN_KEY);
  localStorage.removeItem(SLAVE_USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(SLAVE_TOKEN_KEY);
}
