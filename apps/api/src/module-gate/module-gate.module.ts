import { Module } from '@nestjs/common';
import { ModuleGuard } from './guards/module.guard';

// TenantContextService/CacheService sao @Global(), nao precisam de import explicito aqui.
@Module({
  providers: [ModuleGuard],
  exports: [ModuleGuard],
})
export class ModuleGateModule {}
