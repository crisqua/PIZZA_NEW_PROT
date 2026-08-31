// Cliente HTTP minimo (Sprint 7) -- sem lib nenhuma (package.json nao tem axios/
// react-query), fetch puro basta pro escopo desta API. `credentials:'include'` sempre
// ligado: e' o que manda o cookie httpOnly de refresh (Sprint 2) junto de toda
// requisicao, mesmo as que nao usam Authorization.
//
// Access token guardado em memoria (variavel de modulo), NUNCA localStorage -- o cookie
// de refresh e' `SameSite=Strict` (decisao deliberada da Sprint 2), o que so' funciona
// com front e back no mesmo dominio registravel: em dev local isso significa
// apps/cliente (Vite, localhost:5173) chamando uma apps/api rodando LOCALMENTE
// (localhost:3000), nao a API ja publicada no Render (dominio registravel diferente).
const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/v1`;

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  // false pras rotas publicas/auth (login, register, refresh, catalogo publico) -- nao
  // faz sentido mandar um Authorization de uma sessao antiga nelas.
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(res.status, errorBody.message ?? `Erro ${res.status} ao chamar ${path}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
