export abstract class CacheService {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  abstract del(key: string): Promise<void>;
}
