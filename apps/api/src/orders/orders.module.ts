import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CepLookupService } from '../common/cep-lookup.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, CepLookupService],
})
export class OrdersModule {}
