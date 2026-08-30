import request from 'supertest';

// superagent tipa headers['set-cookie'] como string, mas em runtime (Node http) vem como
// string[] quando ha' mais de um Set-Cookie na resposta — normaliza pros dois casos.
function getSetCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'] as unknown as string | string[] | undefined;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function hasCookie(res: request.Response, name: string): boolean {
  return getSetCookies(res).some((c) => c.startsWith(`${name}=`));
}

export function extractCookieValue(res: request.Response, name: string): string {
  const cookie = getSetCookies(res).find((c) => c.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Cookie "${name}" nao encontrado na resposta.`);
  }
  return cookie.split(';')[0].split('=').slice(1).join('=');
}
