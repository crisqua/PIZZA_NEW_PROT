import { Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { AuditLogRetentionService } from './audit-log-retention.service';

// Maquina-pra-maquina, nunca JWT de usuario -- so' o GitHub Actions agendado chama isso
// (ver .github/workflows/audit-log-retention.yml). Segredo compartilhado via header,
// comparado contra uma env var -- mesmo principio de "nao e' sessao de usuario" que
// justificaria JwtAuthGuard/RolesGuard aqui, que nunca se aplicam a este endpoint.
@Controller('internal/audit-log-retention')
export class AuditLogRetentionController {
  constructor(private readonly retention: AuditLogRetentionService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Headers('x-retention-job-secret') secret: string | undefined) {
    const expected = process.env.AUDIT_LOG_RETENTION_SECRET;
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException();
    }
    return this.retention.runDailyRetention();
  }
}
