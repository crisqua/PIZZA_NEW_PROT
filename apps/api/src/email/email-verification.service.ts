import { randomBytes } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hashVerificationToken } from '../common/refresh-token.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { EMAIL_SENDER, EmailSender } from './email-sender.interface';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// "email_verification_tokens" tem RLS forcada (tenant_id) igual "refresh_tokens" -- o
// PrismaService de runtime usa a role restrita "pizza_app", que so' enxerga linhas
// dentro de um contexto de tenant ja aberto (SET LOCAL app.current_tenant_id). Por isso
// verify() PRECISA saber o tenantSlug (o link inclui, o app cliente ja' sabe o proprio
// slug igual login()/register() ja fazem) -- nunca tenta bypassar RLS direto via
// PrismaService, que nao teria efeito nenhum numa tabela com FORCE ROW LEVEL SECURITY.
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  // Chamado de dentro da MESMA transacao que ja cria o usuario (AuthService.register)
  // ou de dentro de uma transacao propria (resend, abaixo) -- nunca abre uma nova. O
  // envio de verdade (chamada de rede/console.log) e' fire-and-forget: nao pode falhar
  // a criacao do usuario nem segurar a transacao aberta esperando ele terminar (mesmo
  // bug ja corrigido na Sprint 12 com CepLookupService).
  async generateAndSend(tx: TenantTx, tenantId: string, userId: string, email: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await tx.emailVerificationToken.create({ data: { tenantId, userId, tokenHash, expiresAt } });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const link = `${frontendUrl}/?token=${rawToken}`;
    this.emailSender
      .send(email, 'Confirme seu e-mail', `<p>Clique para confirmar seu cadastro: <a href="${link}">${link}</a></p>`)
      .catch((err) => console.warn(`[EmailVerificationService] falha ao enviar e-mail de verificacao: ${String(err)}`));
  }

  async verify(tenantSlug: string, rawToken: string): Promise<void> {
    // "tenants" nao tem RLS (excecao documentada em scripts/check-rls.sql) -- leitura
    // direta via PrismaService normal, sem contexto nenhum, funciona sem problema.
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw new BadRequestException('Link invalido ou expirado.');
    }

    const tokenHash = hashVerificationToken(rawToken);
    await this.tenantContext.runInTenantContext(tenant.id, async (tx) => {
      const record = await tx.emailVerificationToken.findUnique({ where: { tokenHash } });
      if (!record || record.expiresAt < new Date()) {
        throw new BadRequestException('Link invalido ou expirado.');
      }
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
      // Uso unico -- apaga logo apos confirmar, reabrir o mesmo link depois falha
      // (record nao existe mais).
      await tx.emailVerificationToken.delete({ where: { id: record.id } });
    });
  }

  async resend(tenantId: string, userId: string): Promise<void> {
    await this.tenantContext.runInTenantContext(tenantId, async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException();
      }
      if (user.emailVerifiedAt) {
        throw new BadRequestException('E-mail ja confirmado.');
      }
      // Invalida qualquer token anterior antes de gerar um novo -- so' o mais recente
      // deve funcionar.
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await this.generateAndSend(tx, tenantId, userId, user.email);
    });
  }
}
