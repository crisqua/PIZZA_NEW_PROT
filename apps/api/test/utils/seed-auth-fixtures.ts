import { randomUUID } from 'crypto';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';

// Separado de test/utils/seed-tenant.ts (Sprint 1) porque aquele nao cria senha — os specs
// de auth precisam de um hash real (round-trip completo via Argon2), nao um atalho.

export interface SeededTenantUser {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  email: string;
  password: string;
}

export async function seedTenantWithUser(
  prisma: PrismaService,
  tenantContext: TenantContextService,
  options: { slugPrefix: string; role: 'tenant_owner' | 'tenant_staff' | 'customer'; password?: string },
): Promise<SeededTenantUser> {
  const slug = `${options.slugPrefix}-${randomUUID().slice(0, 8)}`;
  const password = options.password ?? randomUUID();
  const passwordHash = await hashPassword(password);

  // isOpen:true explicito -- desde que o default do schema virou "false" (pizzaria
  // nasce fechada), a maioria dos specs que usam este fixture (pedidos/checkout)
  // precisa da loja aberta por padrao; quem quiser testar loja fechada muda depois.
  const tenant = await prisma.tenant.create({ data: { name: slug, slug, isOpen: true } });

  const email = `${options.role}@${slug}.test`;
  const user = await tenantContext.runInTenantContext(tenant.id, (tx) =>
    tx.user.create({
      data: { tenantId: tenant.id, email, name: options.role, role: options.role, passwordHash },
    }),
  );

  return { tenantId: tenant.id, tenantSlug: slug, userId: user.id, email, password };
}

export async function cleanupTenantWithUser(
  prisma: PrismaService,
  tenantContext: TenantContextService,
  seeded: SeededTenantUser,
): Promise<void> {
  // refresh_tokens/users/audit_logs tem FORCE RLS — apagar via o client global (sem
  // contexto de tenant) nao teria efeito nenhum (current_setting fica NULL, nao bate com
  // nenhum branch da policy). Precisa rodar dentro do proprio contexto de tenant, igual
  // qualquer query de negocio real. "tenants" fica de fora (sem RLS por design), apaga
  // direto. audit_logs entrou aqui na Sprint 15 -- todo login de teste (praticamente
  // todo arquivo e2e do projeto) agora grava uma linha "auth.login", sem isso o tenant
  // descartavel deixaria residuo pra sempre no homolog (sem FK pra tenants, entao nao
  // bloquearia o delete do tenant, mas acumularia lixo silenciosamente).
  await tenantContext.runInTenantContext(seeded.tenantId, async (tx) => {
    await tx.auditLog.deleteMany({ where: { tenantId: seeded.tenantId } });
    await tx.refreshToken.deleteMany({ where: { tenantId: seeded.tenantId } });
    await tx.user.deleteMany({ where: { tenantId: seeded.tenantId } });
  });
  await prisma.tenant.delete({ where: { id: seeded.tenantId } });
}

export interface SeededSuperAdmin {
  userId: string;
  email: string;
  password: string;
}

export async function seedSuperAdmin(prisma: PrismaService, password?: string): Promise<SeededSuperAdmin> {
  const resolvedPassword = password ?? randomUUID();
  const passwordHash = await hashPassword(resolvedPassword);
  const email = `superadmin-${randomUUID().slice(0, 8)}@platform.test`;

  const user = await prisma.user.create({
    data: { tenantId: null, email, name: 'superadmin', role: 'platform_superadmin', passwordHash },
  });

  return { userId: user.id, email, password: resolvedPassword };
}

export async function cleanupSuperAdmin(prisma: PrismaService, seeded: SeededSuperAdmin): Promise<void> {
  // audit_logs de eventos de plataforma (tenantId null) sao visiveis/apagaveis direto
  // pelo client global, sem contexto de tenant (mesmo carve-out de RLS que "users" ja
  // usa) -- login de superadmin grava aqui desde a Sprint 15.
  await prisma.auditLog.deleteMany({ where: { actorId: seeded.userId } });
  await prisma.refreshToken.deleteMany({ where: { userId: seeded.userId } });
  await prisma.user.delete({ where: { id: seeded.userId } });
}
