import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { TenantOnboardingService } from './tenant-onboarding.service';
import { TenantsAdminController } from './tenants-admin.controller';
import { TenantsAdminService } from './tenants-admin.service';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [TenantsAdminController],
  providers: [TenantsAdminService, TenantOnboardingService],
})
export class TenantsAdminModule {}
