import * as argon2 from 'argon2';

// argon2.hash() usa argon2id por padrao nesta lib — nao precisa configurar variant.
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

// Atencao: argon2.verify(hash, plain) — ordem invertida em relacao a bcrypt.compare(plain, hash).
export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
