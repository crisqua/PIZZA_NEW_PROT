import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminUsersController],
  providers: [AdminDashboardService, AdminUsersService],
})
export class AdminModule {}
