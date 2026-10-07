import type { StoredEnvelope } from './sync.ts';

const AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'User.Read Files.ReadWrite.AppFolder offline_access';

const GRAPH_FILE_URL =
  'https://graph.microsoft.com/v1.0/me/drive/special/approot:/financas-pessoais/dados.json:/content';

const LS_CLIENT_ID = 'fp.onedrive.clientId';
const LS_TOKENS = 'fp.onedrive.tokens';
const LS_ACCOUNT = 'fp.onedrive.account';
const SS_STATE = 'fp.onedrive.state';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class OneDriveError extends Error {}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function redirectUri(): string {
  return window.location.origin + window.location.pathname;
}

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export class OneDriveClient {
  isConfigured(): boolean {
    return (localStorage.getItem(LS_CLIENT_ID) ?? '').trim().length > 0;
  }

  getClientId(): string {
    return localStorage.getItem(LS_CLIENT_ID) ?? '';
  }

  setClientId(clientId: string): void {
    const trimmed = clientId.trim();
    if (trimmed === '') {
      localStorage.removeItem(LS_CLIENT_ID);
    } else {
      localStorage.setItem(LS_CLIENT_ID, trimmed);
    }
  }

  getAccountName(): string {
    return localStorage.getItem(LS_ACCOUNT) ?? '';
  }

  isAuthenticated(): boolean {
    const tokens = readJson<StoredTokens>(LS_TOKENS);
    return tokens !== null && tokens.refreshToken.length > 0;
  }

  async login(): Promise<void> {
    const clientId = this.getClientId().trim();
    if (clientId === '') {
      throw new OneDriveError('Configura primeiro o Client ID da aplicação.');
    }
    const verifier = randomString(48);
    const challenge = await codeChallenge(verifier);
    const state = randomString(16);
    sessionStorage.setItem(SS_STATE, state);
    sessionStorage.setItem(`${SS_STATE}.verifier`, verifier);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri(),
      response_mode: 'query',
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      prompt: 'select_account',
    });
    window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);
  }

  async handleRedirect(): Promise<boolean> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    if (error !== null) {
      const description = url.searchParams.get('error_description') ?? error;
      this.cleanUrl();
      throw new OneDriveError(`Autenticação falhou: ${description}`);
    }
    if (code === null || state === null) {
      return false;
    }
    this.cleanUrl();
    const expectedState = sessionStorage.getItem(SS_STATE);
    if (expectedState === null || expectedState !== state) {
      throw new OneDriveError('Resposta de autenticação inválida (estado não corresponde).');
    }
    sessionStorage.removeItem(SS_STATE);
    const verifier = sessionStorage.getItem(`${SS_STATE}.verifier`);
    if (verifier === null) {
      throw new OneDriveError('Sessão de autenticação expirada. Tenta novamente.');
    }
    sessionStorage.removeItem(`${SS_STATE}.verifier`);
    const body = new URLSearchParams({
      client_id: this.getClientId().trim(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
      scope: SCOPES,
    });
    await this.tokenRequest(body);
    return true;
  }

  logout(): void {
    localStorage.removeItem(LS_TOKENS);
    localStorage.removeItem(LS_ACCOUNT);
  }

  async pull(): Promise<StoredEnvelope | null> {
    const token = await this.getAccessToken();
    const response = await fetch(GRAPH_FILE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new OneDriveError(`Falha ao ler do OneDrive (HTTP ${response.status}).`);
    }
    const body = (await response.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('data' in body) || !('savedAt' in body)) {
      throw new OneDriveError('Ficheiro no OneDrive com formato inesperado.');
    }
    const envelope = body as StoredEnvelope;
    if (typeof envelope.savedAt !== 'string') {
      throw new OneDriveError('Ficheiro no OneDrive sem data de modificação válida.');
    }
    return envelope;
  }

  async push(envelope: StoredEnvelope): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(GRAPH_FILE_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelope),
    });
    if (!response.ok) {
      throw new OneDriveError(`Falha ao escrever no OneDrive (HTTP ${response.status}).`);
    }
  }

  private async getAccessToken(): Promise<string> {
    const tokens = readJson<StoredTokens>(LS_TOKENS);
    if (tokens === null) {
      throw new OneDriveError('Sem sessão iniciada no OneDrive.');
    }
    if (Date.now() < tokens.expiresAt - 60_000) {
      return tokens.accessToken;
    }
    const body = new URLSearchParams({
      client_id: this.getClientId().trim(),
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      scope: SCOPES,
    });
    return (await this.tokenRequest(body)).accessToken;
  }

  private async tokenRequest(body: URLSearchParams): Promise<{ accessToken: string }> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new OneDriveError(`Falha na autenticação Microsoft (HTTP ${response.status}): ${text.slice(0, 200)}`);
    }
    const json = (await response.json()) as TokenResponse;
    if (typeof json.access_token !== 'string' || json.access_token === '') {
      throw new OneDriveError('Resposta de autenticação sem token válido.');
    }
    const previous = readJson<StoredTokens>(LS_TOKENS);
    const tokens: StoredTokens = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? previous?.refreshToken ?? '',
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    if (tokens.refreshToken === '') {
      throw new OneDriveError('Sessão sem refresh token. Garante o âmbito offline_access na app Azure.');
    }
    localStorage.setItem(LS_TOKENS, JSON.stringify(tokens));
    return { accessToken: tokens.accessToken };
  }

  async fetchAccountName(): Promise<void> {
    if (this.getAccountName() !== '') return;
    const token = await this.getAccessToken();
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const me = (await response.json()) as { displayName?: string; userPrincipalName?: string };
    const name = me.displayName ?? me.userPrincipalName ?? '';
    if (name !== '') localStorage.setItem(LS_ACCOUNT, name);
  }

  private cleanUrl(): void {
    window.history.replaceState(null, '', window.location.pathname);
  }
}
