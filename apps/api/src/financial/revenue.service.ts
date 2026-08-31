import { Injectable } from '@nestjs/common';
import { TenantTx } from '../prisma/tenant-context.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';

const DEFAULT_WINDOW_DAYS = 7;

export interface DailyRevenue {
  date: string;
  revenue: number;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Confirmado com o usuario (Sprint 8): so' pedidos 'completed' contam como receita --
// pagamento e' na entrega, um pedido pending/preparing/delivery ainda nao e' dinheiro que
// entrou de verdade, e cancelled obviamente nao conta.
@Injectable()
export class RevenueService {
  async getDailyRevenue(tx: TenantTx, query: RevenueQueryDto): Promise<DailyRevenue[]> {
    const to = query.to ? startOfDayUtc(new Date(query.to)) : startOfDayUtc(new Date());
    const from = query.from
      ? startOfDayUtc(new Date(query.from))
      : new Date(to.getTime() - (DEFAULT_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);

    // Fim do dia "to" (exclusivo no dia seguinte) -- createdAt e' TIMESTAMP, nao DATE.
    const toExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000);

    const orders = await tx.order.findMany({
      where: { status: 'completed', createdAt: { gte: from, lt: toExclusive } },
      select: { total: true, createdAt: true },
    });

    // Agrupado em JS, nao via $queryRaw/groupBy com DATE_TRUNC: volume de pedidos por
    // pizzaria individual no MVP e' pequeno, e este seria o primeiro lugar do projeto
    // com SQL bruto em codigo de runtime (so' migrations usam ate agora) -- revisar so'
    // se performance virar problema real.
    const totalsByDay = new Map<string, number>();
    for (const order of orders) {
      const key = toDateKey(order.createdAt);
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + order.total.toNumber());
    }

    // Preenche o intervalo inteiro, inclusive dias sem pedido nenhum (revenue: 0) -- o
    // grafico do prototipo (Financial.tsx) espera um ponto por dia, nao so' os com dado.
    const result: DailyRevenue[] = [];
    for (let cursor = from; cursor <= to; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
      const key = toDateKey(cursor);
      result.push({ date: key, revenue: Math.round((totalsByDay.get(key) ?? 0) * 100) / 100 });
    }
    return result;
  }
}
