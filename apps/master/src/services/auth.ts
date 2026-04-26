export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

const OAUTH2_SERVER = 'http://localhost:9000';
const CLIENTS: Record<string, { clientId: string; clientSecret: string }> = {
  master: { clientId: 'master-app', clientSecret: 'master-secret' },
  slave: { clientId: 'slave-client', clientSecret: 'slave-secret' },
};

export function getAuthorizeUrl(redirectUri: string, clientKey?: string, state?: string): string {
  const client = CLIENTS[clientKey || 'master'];
  const url = new URL(`${OAUTH2_SERVER}/oauth/authorize`);
  url.searchParams.set('client_id', client.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}

export async function exchangeToken(code: string, redirectUri: string, clientKey?: string): Promise<TokenResponse> {
  const client = CLIENTS[clientKey || 'master'];
  const res = await fetch(`${OAUTH2_SERVER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'token_exchange_failed');
  }

  return res.json();
}

export async function fetchUserInfo(token: string) {
  const res = await fetch(`${OAUTH2_SERVER}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('fetch_userinfo_failed');
  }

  return res.json();
}
