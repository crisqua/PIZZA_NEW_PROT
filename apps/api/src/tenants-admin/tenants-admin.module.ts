import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantsAdminController } from './tenants-admin.controller';
import { TenantsAdminService } from './tenants-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantsAdminController],
  providers: [TenantsAdminService],
})
export class TenantsAdminModule {}
