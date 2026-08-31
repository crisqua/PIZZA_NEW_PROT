import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [
    {
      provide: CacheService,
      useFactory: (): CacheService =>
        process.env.REDIS_URL ? new RedisCacheService() : new MemoryCacheService(),
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
