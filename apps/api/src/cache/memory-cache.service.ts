import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

interface Entry {
  value: unknown;
  expiresAt: number;
}

// Fallback usado quando REDIS_URL nao esta setada (dev local sem infra externa, ver
// cache.module.ts). Map nao tem TTL nativo — expira sob demanda na leitura, sem timer de
// fundo (mais simples e nao complica enableShutdownHooks()).
@Injectable()
export class MemoryCacheService extends CacheService {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}
