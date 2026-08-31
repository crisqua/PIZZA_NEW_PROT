import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleGateModule } from '../module-gate/module-gate.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule, ModuleGateModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
