import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantOnboardingService } from './tenant-onboarding.service';
import { TenantsAdminController } from './tenants-admin.controller';
import { TenantsAdminService } from './tenants-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantsAdminController],
  providers: [TenantsAdminService, TenantOnboardingService],
})
export class TenantsAdminModule {}
