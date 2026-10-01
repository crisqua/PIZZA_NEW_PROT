import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

const RETENTION_SECRET = process.env.AUDIT_LOG_RETENTION_SECRET!;
const DAY_MS = 24 * 60 * 60 * 1000;

// Sprint 15, parte 3 -- prova que POST /internal/audit-log-retention/run (1) exige o
// segredo certo (maquina-pra-maquina, nunca JWT de usuario) e (2) move/apaga as linhas
// certas: >30 dias sai de audit_logs pra audit_logs_archive, >2 anos em audit_logs_archive
// some em definitivo, e nada recente e' tocado.
describe('POST /v1/internal/audit-log-retention/run', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenant: SeededTenantUser;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'retention', role: 'tenant_owner' });
  });

  afterAll(async () => {
    await tenantContext.runInTenantContext(tenant.tenantId, (tx) => tx.auditLogArchive.deleteMany({ where: { tenantId: tenant.tenantId } }));
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await app.close();
  });

  it('sem segredo ou com segredo errado retorna 401', async () => {
    await request(app.getHttpServer()).post('/v1/internal/audit-log-retention/run').expect(401);
    await request(app.getHttpServer())
      .post('/v1/internal/audit-log-retention/run')
      .set('X-Retention-Job-Secret', 'segredo-errado')
      .expect(401);
  });

  // Timeout alto de proposito: o job roda contra TODOS os tenants reais do homolog (nao
  // so' o de teste, ver try/catch por tenant em AuditLogRetentionService) -- ja' passou
  // de 160 tenants nesta sessao, e o default de 5s do Jest nao basta.
  it('com o segredo certo, move registros com mais de 30 dias pra archive, apaga os de archive com mais de 2 anos, e nao toca nada recente', async () => {
    const recentId = randomUUID();
    const oldId = randomUUID();
    const veryOldArchivedId = randomUUID();

    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      // Recente (hoje) -- deve continuar em audit_logs depois do job.
      await tx.auditLog.create({
        data: { id: recentId, tenantId: tenant.tenantId, actorId: tenant.userId, actorEmail: tenant.email, actorRole: 'tenant_owner', action: 'auth.login' },
      });
      // 31 dias atras -- deve sair de audit_logs e aparecer em audit_logs_archive.
      await tx.auditLog.create({
        data: {
          id: oldId,
          tenantId: tenant.tenantId,
          actorId: tenant.userId,
          actorEmail: tenant.email,
          actorRole: 'tenant_owner',
          action: 'auth.login',
          createdAt: new Date(Date.now() - 31 * DAY_MS),
        },
      });
      // Ja em archive, com mais de 2 anos -- deve ser apagado em definitivo pelo job.
      await tx.auditLogArchive.create({
        data: {
          id: veryOldArchivedId,
          tenantId: tenant.tenantId,
          actorId: tenant.userId,
          actorEmail: tenant.email,
          actorRole: 'tenant_owner',
          action: 'auth.login',
          createdAt: new Date(Date.now() - 800 * DAY_MS),
        },
      });
    });

    await request(app.getHttpServer()).post('/v1/internal/audit-log-retention/run').set('X-Retention-Job-Secret', RETENTION_SECRET).expect(200);

    const [recentStillHot, oldMovedOut, oldNowArchived, veryOldGone] = await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      return Promise.all([
        tx.auditLog.findUnique({ where: { id: recentId } }),
        tx.auditLog.findUnique({ where: { id: oldId } }),
        tx.auditLogArchive.findUnique({ where: { id: oldId } }),
        tx.auditLogArchive.findUnique({ where: { id: veryOldArchivedId } }),
      ]);
    });

    expect(recentStillHot).not.toBeNull();
    expect(oldMovedOut).toBeNull();
    expect(oldNowArchived).not.toBeNull();
    expect(veryOldGone).toBeNull();

    // Limpeza do que sobrou (recentId continua em audit_logs, oldId agora em archive).
    await tenantContext.runInTenantContext(tenant.tenantId, async (tx) => {
      await tx.auditLog.deleteMany({ where: { id: recentId } });
      await tx.auditLogArchive.deleteMany({ where: { id: oldId } });
    });
  }, 30_000);

  it(
    'rodar 2x seguidas e seguro (idempotente) -- nao quebra nem duplica nada',
    async () => {
      await request(app.getHttpServer()).post('/v1/internal/audit-log-retention/run').set('X-Retention-Job-Secret', RETENTION_SECRET).expect(200);
      await request(app.getHttpServer()).post('/v1/internal/audit-log-retention/run').set('X-Retention-Job-Secret', RETENTION_SECRET).expect(200);
    },
    30_000,
  );
});
