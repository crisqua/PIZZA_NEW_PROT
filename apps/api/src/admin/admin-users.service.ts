import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mapWithConcurrency } from '../common/concurrency.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';

const TENANT_CONCURRENCY = 5;

const USER_SELECT = { id: true, name: true, email: true, role: true, tenantId: true, createdAt: true } as const;

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: Date;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Diretorio cross-tenant de usuarios pro superadmin (Sprint 26) -- so-leitura, sem
// nenhuma acao de escrita (criar/editar/excluir), mesmo escopo ja validado no sistema
// irmao da Barbearia. "users" tem RLS forcada e a role do banco e' NOBYPASSRLS -- nao
// da pra ignorar RLS nem numa rota de plataforma, entao a leitura cross-tenant segue o
// mesmo padrao ja usado desde a Sprint 22 (AdminDashboardService): percorrer os tenants
// com mapWithConcurrency, abrindo runInTenantContext por tenant. Usuarios de
// plataforma (platform_superadmin, tenant_id IS NULL) sao a unica excecao -- lidos
// direto via PrismaService, fora de qualquer contexto de tenant, aproveitando o
// carve-out da propria policy RLS (tenant_id IS NULL so' e' visivel quando nenhum
// contexto de tenant esta setado).
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: ListAdminUsersQueryDto): Promise<Paginated<AdminUserItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { role, tenantId } = query;

    const results: AdminUserItem[] = [];

    // Usuarios de plataforma -- so' entram na busca se o filtro de papel nao excluir
    // "platform_superadmin" explicitamente, e nunca quando um tenantId foi filtrado
    // (superadmin nunca pertence a nenhum tenant, filtrar por tenant ja os exclui).
    if (!tenantId && (!role || role === 'platform_superadmin')) {
      const platformUsers = await this.prisma.user.findMany({
        where: { role: 'platform_superadmin' },
        select: USER_SELECT,
      });
      results.push(...platformUsers.map((u) => ({ ...u, tenantName: null })));
    }

    // Usuarios tenant-scoped -- percorre os tenants (todos, ou so' o filtrado).
    if (!role || role !== 'platform_superadmin') {
      const roleWhere: Prisma.UserWhereInput['role'] = role
        ? role
        : { in: ['tenant_owner', 'tenant_staff', 'customer'] };

      if (tenantId) {
        // Caminho comum (unico chamado por TenantSales.tsx desde que "Usuarios" deixou
        // de ser tela cross-tenant, 2026-09-27): 1 tenant ja conhecido pelo chamador --
        // sem sentido descobrir "quais tenants existem" primeiro so' pra descobrir que e'
        // esse 1 mesmo.
        //
        // "tenantName" fica null neste caminho, de proposito -- medido em producao que
        // rodar a busca do nome em paralelo com a transacao (Promise.all) NAO cortava o
        // tempo pela metade como esperado (~1,5-1,9s, nao ~1,1-1,5s): o pool de conexoes
        // do Prisma no Render Free e' pequeno demais pra rodar as duas de verdade ao
        // mesmo tempo, entao "paralelo" no codigo ainda virava serializado na pratica.
        // A correcao real e' nao fazer a segunda consulta -- o unico chamador
        // (TenantSales.tsx) ja sabe o nome da pizzaria selecionada e nunca leu esse
        // campo da resposta.
        //
        // Round trip a mais cortado (2026-09-28, frente "Desempenho Sistema"): em vez de
        // `runInTenantContext` (SET LOCAL numa query + SELECT noutra, 2 idas ao banco
        // dentro da mesma transacao), 1 unico SELECT raw que injeta o `set_config` via
        // CROSS JOIN contra "users" -- ver o aviso em `queryInTenantContext` sobre por que
        // NAO usar `WITH ctx AS (...)` nao-referenciado aqui (risco real de silenciosamente
        // rodar fora de contexto de tenant nenhum).
        const roles = role ? [role] : ['tenant_owner', 'tenant_staff', 'customer'];
        const users = await this.tenantContext.queryInTenantContext<{
          id: string;
          name: string;
          email: string;
          role: string;
          tenantId: string;
          createdAt: Date;
        }>(Prisma.sql`
          SELECT u.id, u.name, u.email, u.role, u.tenant_id AS "tenantId", u.created_at AS "createdAt"
          FROM (SELECT set_config('app.current_tenant_id', ${tenantId}, true)) AS _tenant_ctx
          CROSS JOIN "users" u
          WHERE u.role = ANY(${roles}::text[])
        `);
        results.push(...users.map((u) => ({ ...u, tenantName: null })));
      } else {
        const tenants = await this.prisma.tenant.findMany({ select: { id: true, name: true } });
        const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));

        const perTenant = await mapWithConcurrency(tenants, TENANT_CONCURRENCY, (tenant) =>
          this.tenantContext.runInTenantContext(tenant.id, (tx) =>
            tx.user.findMany({ where: { role: roleWhere }, select: USER_SELECT }),
          ),
        );

        for (const rows of perTenant) {
          for (const u of rows) {
            results.push({ ...u, tenantName: tenantNameById.get(u.tenantId ?? '') ?? null });
          }
        }
      }
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const start = (page - 1) * pageSize;
    const items = results.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }
}
