import { createHash } from 'crypto';

// O "refresh token" e o proprio JWT assinado (payload {sub, tenantId, role, type, familyId}).
// SHA-256, nao Argon2: a assinatura do JWT ja garante alta entropia (nao e uma senha
// adivinhavel — quem nao souber o token nao consegue forjar o hash), entao um
// hash rapido e colisao-resistente e o primitivo correto — Argon2 e deliberadamente lento,
// pagaria esse custo em todo /auth/refresh sem ganho de seguranca real aqui.
export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
