import { randomUUID } from 'crypto';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';

export interface SeededTenant {
  tenantId: string;
  userId: string;
}

export async function seedTenant(
  prisma: PrismaService,
  tenantContext: TenantContextService,
  slugPrefix: string,
): Promise<SeededTenant> {
  const slug = `${slugPrefix}-${randomUUID().slice(0, 8)}`;

  // tenants nao tem RLS — insert direto pelo client global e o esperado aqui.
  const tenant = await prisma.tenant.create({ data: { name: slug, slug } });

  // passwordHash e' obrigatorio desde a Sprint 2 — este helper testa isolamento/RLS, nao
  // login, entao um hash descartavel (nunca usado pra autenticar) e' suficiente aqui.
  const passwordHash = await hashPassword(randomUUID());

  // users tem FORCE RLS — ate este insert de seed precisa rodar dentro de uma
  // transacao com app.current_tenant_id setado, igual uma requisicao real faria.
  const user = await tenantContext.runInTenantContext(tenant.id, (tx) =>
    tx.user.create({
      data: {
        tenantId: tenant.id,
        email: `${slug}@example.com`,
        name: slug,
        role: 'tenant_owner',
        passwordHash,
      },
    }),
  );

  return { tenantId: tenant.id, userId: user.id };
}
