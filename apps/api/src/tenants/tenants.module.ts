import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [TenantsController, StaffController],
  providers: [StaffService],
})
export class TenantsModule {}
