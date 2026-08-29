import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TenantTx = Prisma.TransactionClient;

/**
 * Mecanismo central de isolamento multi-tenant (ver docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md
 * secao 3.1). `set_config(..., true)` == SET LOCAL: escopo de transacao, descartado no
 * COMMIT/ROLLBACK — nunca vaza para a proxima requisicao que reaproveitar a conexao do pool.
 * Toda query de negocio da requisicao DEVE usar o `tx` recebido aqui, nunca o PrismaService
 * global diretamente, ou ela escapa do contexto de tenant e do RLS.
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async runInTenantContext<T>(
    tenantId: string,
    fn: (tx: TenantTx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
