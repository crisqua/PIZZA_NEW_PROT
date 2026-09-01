import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
