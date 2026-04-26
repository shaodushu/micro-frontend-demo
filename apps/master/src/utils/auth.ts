import { defaultAppConfig } from '@/config/app';

const TOKEN_KEY = 'master_token';
const USER_KEY = 'master_user';
const APP_CONFIG_KEY = 'master_app_config';

export interface UserInfo {
  sub: string;
  name: string;
  username: string;
  email: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserInfo(): UserInfo | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserInfo;
  } catch {
    return null;
  }
}

export function setUserInfo(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUserInfo(): void {
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  removeUserInfo();
  window.location.href = '/login';
}

export function getAppConfig(): { tenantName: string; projectSpace: string } {
  try {
    const data = localStorage.getItem(APP_CONFIG_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        tenantName: parsed.tenantName || defaultAppConfig.tenantName,
        projectSpace: parsed.projectSpace || defaultAppConfig.projectSpace,
      };
    }
  } catch {}
  return { ...defaultAppConfig };
}

export function setAppConfig(config: { tenantName: string; projectSpace: string }): void {
  localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('app-config-update'));
}
