import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [TenantsController],
})
export class TenantsModule {}
