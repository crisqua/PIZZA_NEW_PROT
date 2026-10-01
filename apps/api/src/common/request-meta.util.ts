import { Request } from 'express';

// IP/user-agent da requisicao, usados pelo audit log (Sprint 15) -- opcionais em todo
// evento exceto login (onde o design pede captura-los sempre). req.ip ja respeita
// "trust proxy" se configurado em bootstrap.ts; sem isso cai pro IP do proxy/LB, mas
// nunca quebra a requisicao.
export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}
