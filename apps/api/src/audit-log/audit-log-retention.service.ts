import { Injectable, Logger } from '@nestjs/common';
import { mapWithConcurrency } from '../common/concurrency.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const TENANT_CONCURRENCY = 5;

export interface RetentionResult {
  tenantCount: number;
  failed: number;
}

// Expurgo diario (Sprint 15, parte 3) -- 30 dias quente em audit_logs, depois move pra
// audit_logs_archive, apaga em definitivo com 2 anos de vida total (contados da data
// ORIGINAL do evento, nao da data de arquivamento). Disparado via endpoint interno
// (AuditLogRetentionController), nunca via @Cron: o Render Free hiberna sem trafego, um
// timer interno nao acorda o processo sozinho pra disparar contra um processo dormindo
// -- o gatilho de verdade e' o GitHub Actions agendado batendo no endpoint (ver
// .github/workflows/audit-log-retention.yml), cuja propria requisicao ja acorda o
// Render Free antes do job rodar.
//
// Seguro rodar 2x/concorrente: as condicoes sao sempre relativas a now(), entao rodar de
// novo no mesmo dia so' nao encontra nada novo pra mover/apagar -- nao precisa de trava
// distribuida.
@Injectable()
export class AuditLogRetentionService {
  private readonly logger = new Logger(AuditLogRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async runDailyRetention(): Promise<RetentionResult> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    let failed = 0;

    await mapWithConcurrency(tenants, TENANT_CONCURRENCY, async (tenant) => {
      try {
        await this.tenantContext.runInTenantContext(tenant.id, (tx) => this.purgeAndArchive(tx));
      } catch (err) {
        failed++;
        this.logger.error(`Expurgo falhou pro tenant ${tenant.id}`, err as Error);
        // Nao rejoga -- 1 tenant com problema nao pode travar os outros (mapWithConcurrency
        // usa Promise.all por lote; deixar propagar abortaria os lotes seguintes inteiros).
      }
    });

    // Eventos de plataforma (tenant_id IS NULL, ex. login de superadmin) -- fora de
    // qualquer runInTenantContext, mesmo carve-out da policy RLS que "users" ja usa.
    try {
      await this.purgeAndArchive(this.prisma);
    } catch (err) {
      failed++;
      this.logger.error('Expurgo de eventos de plataforma falhou', err as Error);
    }

    this.logger.log(`Expurgo diario concluido -- ${tenants.length} tenant(s), ${failed} falha(s)`);
    return { tenantCount: tenants.length, failed };
  }

  // RLS ja restringe as duas queries ao tenant atual quando chamado dentro de
  // runInTenantContext -- sem precisar (nem dever) filtrar tenant_id explicitamente no
  // SQL. "SELECT *" exige que AuditLog/AuditLogArchive tenham o MESMO shape posicional
  // (ver comentario em schema.prisma) -- nunca editar um sem editar o outro junto.
  private async purgeAndArchive(client: { $executeRaw: PrismaService['$executeRaw'] }): Promise<void> {
    await client.$executeRaw`
      WITH movidos AS (
        DELETE FROM audit_logs
        WHERE created_at < now() - interval '30 days'
        RETURNING *
      )
      INSERT INTO audit_logs_archive SELECT * FROM movidos;
    `;
    await client.$executeRaw`
      DELETE FROM audit_logs_archive
      WHERE created_at < now() - interval '2 years';
    `;
  }
}
