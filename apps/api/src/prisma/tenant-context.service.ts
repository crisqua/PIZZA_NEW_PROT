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

  /**
   * Mesma garantia de isolamento do `runInTenantContext` (SET LOCAL escopado a transacao),
   * mas pra 1 SELECT raw que nao precisa do `TransactionClient` do Prisma -- o `set_config`
   * e o SELECT de negocio viram um UNICO statement, cortando o round-trip extra que
   * `runInTenantContext` sempre paga (1 exec pro set_config + 1 query pro SELECT, minimo 2
   * idas ao banco dentro da mesma transacao). No Render Free, onde o piso de qualquer
   * transacao ja e' alto (pool pequeno, handshake TLS frequente -- ver
   * docs/pizzaria_sprints.md, frente "Desempenho Sistema"), 1 round trip a menos e' ganho
   * real.
   *
   * O `query` recebido deve fazer `CROSS JOIN LATERAL (SELECT app_tenant_ctx()) AS _ctx`
   * (ou equivalente) contra a tabela de negocio -- NAO um `WITH ctx AS (...)` nao
   * referenciado: desde o PG12 uma CTE nao-referenciada em lugar nenhum da query pode ser
   * descartada pelo planner sem executar, o que faria o `set_config` simplesmente nao
   * rodar (silencioso, sem erro) e a query cair fora de qualquer contexto de tenant. O
   * cross join forca a avaliacao porque o resultado dele entra no produto cartesiano.
   *
   * Use SO' quando o SELECT e' simples o bastante pra escrever a mao com seguranca (sem
   * risco de SQL injection -- sempre via `Prisma.sql`/placeholders parametrizados, nunca
   * concatenacao de string). O `tenantId` NAO e' recebido aqui -- ele ja faz parte do
   * `query` montado pelo chamador (via `Prisma.sql` com placeholder), porque e' o
   * `set_config(...)` dentro do proprio SELECT que precisa dele, nao este metodo.
   */
  async queryInTenantContext<T = unknown>(query: Prisma.Sql): Promise<T[]> {
    return this.prisma.$transaction((tx) => tx.$queryRaw<T[]>(query));
  }
}
