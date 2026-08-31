import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleGateModule } from '../module-gate/module-gate.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';

@Module({
  imports: [AuthModule, ModuleGateModule],
  controllers: [ExpensesController, RevenueController],
  providers: [ExpensesService, RevenueService],
})
export class FinancialModule {}
