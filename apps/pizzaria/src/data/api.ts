// Cliente HTTP minimo (Sprint 9) -- mesmo padrao exato de apps/cliente/src/data/api.ts
// (Sprint 7). Sem lib nenhuma (package.json nao tem axios/react-query), fetch puro basta.
// `credentials:'include'` sempre ligado: manda o cookie httpOnly de refresh (Sprint 2)
// junto de toda requisicao. Access token guardado em memoria (variavel de modulo), NUNCA
// localStorage -- o cookie de refresh e' `SameSite=Strict`, so' funciona com front e back
// no mesmo dominio registravel (apps/pizzaria local + apps/api local, mesmo raciocinio
// ja documentado no repository.ts do apps/cliente).
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
