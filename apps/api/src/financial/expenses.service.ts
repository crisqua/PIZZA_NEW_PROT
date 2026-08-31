import { Injectable, NotFoundException } from '@nestjs/common';
import { toExpenseResponse } from '../common/expense-response.util';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

// Sempre recebe o "tx" ja aberto pelo TenantContextInterceptor -- nunca abre a propria
// transacao (diferente do ModuleGuard, que precisa por rodar antes do interceptor).
@Injectable()
export class ExpensesService {
  async create(tx: TenantTx, tenantId: string, dto: CreateExpenseDto) {
    const expense = await tx.expense.create({
      data: { tenantId, description: dto.description, category: dto.category, amount: dto.amount, date: new Date(dto.date) },
    });
    return toExpenseResponse(expense);
  }

  async list(tx: TenantTx) {
    const expenses = await tx.expense.findMany({ orderBy: { date: 'desc' } });
    return expenses.map(toExpenseResponse);
  }

  async findOne(tx: TenantTx, id: string) {
    const expense = await tx.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException();
    }
    return toExpenseResponse(expense);
  }

  async update(tx: TenantTx, id: string, dto: UpdateExpenseDto) {
    const existing = await tx.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    const updated = await tx.expense.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    return toExpenseResponse(updated);
  }

  async remove(tx: TenantTx, id: string): Promise<void> {
    const existing = await tx.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    await tx.expense.delete({ where: { id } });
  }
}
