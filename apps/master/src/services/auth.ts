const OAUTH2_SERVER = 'http://localhost:9000';
const CLIENT_IDS: Record<string, string> = {
  master: 'master-app',
  slave: 'slave-client',
};

export function getAuthorizeUrl(redirectUri: string, clientKey?: string, state?: string): string {
  const clientId = CLIENT_IDS[clientKey || 'master'];
  const url = new URL(`${OAUTH2_SERVER}/oauth/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}

export async function fetchUserInfo(token: string) {
  const res = await fetch('/api/auth/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('fetch_userinfo_failed');
  }

  return res.json();
}
