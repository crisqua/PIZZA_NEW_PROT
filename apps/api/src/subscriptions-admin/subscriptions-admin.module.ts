import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsAdminController } from './subscriptions-admin.controller';
import { SubscriptionsAdminService } from './subscriptions-admin.service';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsAdminController],
  providers: [SubscriptionsAdminService],
})
export class SubscriptionsAdminModule {}
