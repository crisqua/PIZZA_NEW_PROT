import { randomBytes } from 'crypto';
import { hashPassword } from '../src/common/password.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { TenantContextService } from '../src/prisma/tenant-context.service';

// Seed manual pra QA dos 4 papeis da Sprint 2 (login funcional para os 4 papeis — DoD nao
// pede endpoint de registro publico, ver docs/MVP_SPRINTS.md Sprint 2). Idempotente via
// upsert por email/slug fixos; senha e' sempre regenerada e impressa uma vez no stdout —
// NUNCA commitar senha em .env.example/git, mesmo de teste, ja que este script roda contra
// o homolog real.

const TENANT_SLUG = 'pizzaria-seed-qa';
const TENANT_NAME = 'Pizzaria Seed QA';

function randomPassword(): string {
  return randomBytes(12).toString('base64url');
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const tenantContext = new TenantContextService(prisma);

  try {
    const tenant = await prisma.tenant.upsert({
      where: { slug: TENANT_SLUG },
      update: {},
      create: { name: TENANT_NAME, slug: TENANT_SLUG },
    });

    const credentials: Array<{ role: string; email: string; password: string; tenantSlug?: string }> = [];

    for (const role of ['tenant_owner', 'tenant_staff', 'customer'] as const) {
      const email = `${role}@${TENANT_SLUG}.test`;
      const password = randomPassword();
      const passwordHash = await hashPassword(password);

      await tenantContext.runInTenantContext(tenant.id, (tx) =>
        tx.user.upsert({
          where: { tenantId_email: { tenantId: tenant.id, email } },
          update: { passwordHash },
          create: { tenantId: tenant.id, email, name: role, role, passwordHash },
        }),
      );

      credentials.push({ role, email, password, tenantSlug: TENANT_SLUG });
    }

    const superAdminEmail = 'platform_superadmin@pizzaria.test';
    const superAdminPassword = randomPassword();
    const superAdminHash = await hashPassword(superAdminPassword);

    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'platform_superadmin', email: superAdminEmail, tenantId: null },
    });
    if (existingSuperAdmin) {
      await prisma.user.update({ where: { id: existingSuperAdmin.id }, data: { passwordHash: superAdminHash } });
    } else {
      await prisma.user.create({
        data: {
          tenantId: null,
          email: superAdminEmail,
          name: 'platform_superadmin',
          role: 'platform_superadmin',
          passwordHash: superAdminHash,
        },
      });
    }
    credentials.push({ role: 'platform_superadmin', email: superAdminEmail, password: superAdminPassword });

    console.log('\nCredenciais de QA (nao commitar, validas so no ambiente deste DATABASE_URL):\n');
    for (const c of credentials) {
      console.log(
        `  ${c.role.padEnd(20)} email=${c.email}  password=${c.password}` +
          (c.tenantSlug ? `  tenantSlug=${c.tenantSlug}` : ''),
      );
    }
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Falha ao rodar o seed de auth:', err);
  process.exit(1);
});
