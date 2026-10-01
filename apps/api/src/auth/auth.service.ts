import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { hashPassword, verifyPassword } from '../common/password.util';
import { hashRefreshToken } from '../common/refresh-token.util';
import { RequestMeta } from '../common/request-meta.util';
import { EmailVerificationService } from '../email/email-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, UserRole } from './types/authenticated-user';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

interface RefreshTokenPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  type: 'refresh';
  familyId: string;
  // jti garante que cada emissao produza um JWT diferente mesmo quando sub/tenantId/role/
  // familyId/iat coincidem (ex.: login seguido de refresh no mesmo segundo) — sem isso, a
  // assinatura e' deterministica e duas emissoes identicas colidem no unique de tokenHash.
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

// process.env é sempre `string` — @nestjs/jwt tipa expiresIn como um template-literal
// ("15m"/"7d"/...) via a lib `ms`, entao precisa desse cast explicito no limite do config.
function expiresIn(raw: string | undefined, fallback: string): JwtSignOptions['expiresIn'] {
  return (raw ?? fallback) as JwtSignOptions['expiresIn'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly jwtService: JwtService,
    private readonly emailVerification: EmailVerificationService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Slug desconhecido e senha errada retornam o MESMO erro — nunca dar sinal de que um
  // tenant existe ou nao (evita enumeracao de tenant). "meta" (Sprint 15) e' opcional de
  // proposito -- callers internos (nenhum hoje) podem nao ter uma requisicao HTTP por
  // tras; AuthController.login sempre passa.
  async validateCredentials(dto: LoginDto, meta: RequestMeta = { ipAddress: null, userAgent: null }): Promise<AuthenticatedUser> {
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
      if (!tenant) {
        await this.logLoginFailed(null, dto.email, dto.tenantSlug, meta);
        throw new UnauthorizedException('Credenciais invalidas.');
      }

      // Checado ANTES da senha, de proposito: mais simples e evita pagar o custo de um
      // Argon2 verify (caro por design) numa tentativa que vai ser rejeitada de qualquer
      // jeito. 403 (nao 401) e' distinguivel aqui SEM reabrir a enumeracao que o 401
      // generico acima evita -- aquele esconde se um SLUG existe; este so' dispara depois
      // do slug ja confirmado existente, e nao revela nada sobre email/senha (Sprint 3,
      // ver docs/pizzaria_sprints.md).
      if (!tenant.active) {
        await this.logLoginFailed(tenant.id, dto.email, dto.tenantSlug, meta);
        throw new ForbiddenException('Tenant desativado.');
      }

      const user = await this.tenantContext.runInTenantContext(tenant.id, (tx) =>
        tx.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
        }),
      );

      if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
        await this.logLoginFailed(tenant.id, dto.email, dto.tenantSlug, meta);
        throw new UnauthorizedException('Credenciais invalidas.');
      }

      await this.logLoginSuccess(tenant.id, user, meta);
      return { id: user.id, tenantId: user.tenantId, role: user.role as UserRole };
    }

    // Sem tenantSlug -> login de platform_superadmin, sem contexto de tenant.
    const user = await this.prisma.user.findFirst({
      where: { role: 'platform_superadmin', email: dto.email, tenantId: null },
    });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      await this.logLoginFailed(null, dto.email, null, meta);
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    await this.logLoginSuccess(null, user, meta);
    return { id: user.id, tenantId: null, role: 'platform_superadmin' };
  }

  // "actorRole: 'unknown'" de proposito -- uma tentativa de login que falhou nao tem
  // papel conhecido (o usuario pode nem existir). Senha NUNCA entra aqui, nem em
  // metadata -- so' o email/slug tentados, que ja sao uteis pra investigar abuso sem
  // expor credencial nenhuma.
  private async logLoginFailed(tenantId: string | null, attemptedEmail: string, attemptedSlug: string | null, meta: RequestMeta): Promise<void> {
    const entry = {
      tenantId,
      actorId: null,
      actorEmail: attemptedEmail,
      actorRole: 'unknown',
      action: 'auth.login_failed',
      metadata: { tenantSlug: attemptedSlug },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    };
    if (tenantId) {
      await this.tenantContext.runInTenantContext(tenantId, (tx) => this.auditLog.record(tx, entry));
    } else {
      await this.auditLog.record(this.prisma, entry);
    }
  }

  private async logLoginSuccess(tenantId: string | null, user: { id: string; email: string; role: string }, meta: RequestMeta): Promise<void> {
    const entry = {
      tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'auth.login',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    };
    if (tenantId) {
      await this.tenantContext.runInTenantContext(tenantId, (tx) => this.auditLog.record(tx, entry));
    } else {
      await this.auditLog.record(this.prisma, entry);
    }
  }

  // Cadastro publico do cliente final (Sprint 7) -- sempre role:'customer', sempre
  // tenant-scoped (nao existe cadastro publico de superadmin/staff, esses continuam
  // seedados via scripts/seed-auth-users.ts). Slug inativo/inexistente e email duplicado
  // usam mensagens/erros diferentes de proposito (diferente de validateCredentials): aqui
  // nao ha' risco de enumeracao de credenciais, so' de tenant, e o formulario de cadastro
  // publico ja precisa saber "esse slug nao existe" pra dar feedback util.
  async register(dto: RegisterDto): Promise<AuthenticatedUser> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (!tenant || !tenant.active) {
      throw new NotFoundException('Pizzaria nao encontrada.');
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.tenantContext.runInTenantContext(tenant.id, async (tx) => {
        const created = await tx.user.create({
          data: { tenantId: tenant.id, email: dto.email, name: dto.name, phone: dto.phone, role: 'customer', passwordHash },
        });
        // Mesma transacao (Sprint 15) -- se o cadastro inteiro der rollback (ex. o
        // proprio insert falhando mais abaixo por algum motivo), a entrada de auditoria
        // some junto, nunca sobra um log de um cadastro que nao aconteceu de verdade.
        await this.auditLog.record(tx, {
          tenantId: tenant.id,
          actorId: created.id,
          actorEmail: created.email,
          actorRole: created.role,
          action: 'user.create',
          targetType: 'user',
          targetId: created.id,
        });
        // Mesma transacao (Sprint 14) -- so' grava o token no banco aqui dentro; o envio
        // de verdade e' fire-and-forget (ver EmailVerificationService), nunca segura a
        // transacao esperando rede.
        await this.emailVerification.generateAndSend(tx, tenant.id, created.id, created.email);
        return created;
      });
      return { id: user.id, tenantId: user.tenantId, role: user.role as UserRole };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Ja existe uma conta com este email nesta pizzaria.');
      }
      throw err;
    }
  }

  // familyId ausente = login novo (nova cadeia de rotacao); presente = proximo token da
  // mesma cadeia (chamado de dentro de refresh()).
  async issueTokens(user: AuthenticatedUser, familyId?: string): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, tenantId: user.tenantId, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: expiresIn(process.env.JWT_EXPIRES_IN, '15m') },
    );

    const resolvedFamilyId = familyId ?? randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      type: 'refresh',
      familyId: resolvedFamilyId,
      jti: randomUUID(),
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: expiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
    });

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = hashRefreshToken(refreshToken);

    const persist = (tx: TenantTx | PrismaService) =>
      tx.refreshToken.create({
        data: {
          tokenHash,
          userId: user.id,
          tenantId: user.tenantId,
          familyId: resolvedFamilyId,
          expiresAt,
        },
      });

    if (user.tenantId) {
      await this.tenantContext.runInTenantContext(user.tenantId, (tx) => persist(tx));
    } else {
      await persist(this.prisma);
    }

    return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshPayload(rawRefreshToken);
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const stored = payload.tenantId
      ? await this.tenantContext.runInTenantContext(payload.tenantId, (tx) =>
          tx.refreshToken.findUnique({ where: { tokenHash } }),
        )
      : await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    if (stored.revokedAt) {
      // Reuso de um token ja consumido: sinal de roubo. Revoga a familia inteira, nao so
      // o token reutilizado.
      await this.revokeFamily(payload.tenantId, payload.familyId);
      throw new UnauthorizedException('Refresh token ja utilizado — sessao revogada por seguranca.');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      // Expirado, nao roubado — nao revoga a familia, so nega este refresh.
      throw new UnauthorizedException('Refresh token expirado.');
    }

    await this.revokeOne(payload.tenantId, stored.id);

    const user: AuthenticatedUser = { id: payload.sub, tenantId: payload.tenantId, role: payload.role };
    return this.issueTokens(user, payload.familyId);
  }

  // Logout nunca pode ser bloqueado por um token quebrado/expirado — melhor esforco.
  async logout(rawRefreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.verifyRefreshPayload(rawRefreshToken);
    } catch {
      return;
    }
    await this.revokeFamily(payload.tenantId, payload.familyId);
  }

  private async verifyRefreshPayload(rawRefreshToken: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido ou expirado.');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token invalido.');
    }
    return payload;
  }

  private async revokeOne(tenantId: string | null, refreshTokenId: string): Promise<void> {
    const data = { revokedAt: new Date() };
    if (tenantId) {
      await this.tenantContext.runInTenantContext(tenantId, (tx) =>
        tx.refreshToken.update({ where: { id: refreshTokenId }, data }),
      );
    } else {
      await this.prisma.refreshToken.update({ where: { id: refreshTokenId }, data });
    }
  }

  private async revokeFamily(tenantId: string | null, familyId: string): Promise<void> {
    const where = { familyId, revokedAt: null };
    const data = { revokedAt: new Date() };
    if (tenantId) {
      await this.tenantContext.runInTenantContext(tenantId, (tx) => tx.refreshToken.updateMany({ where, data }));
    } else {
      await this.prisma.refreshToken.updateMany({ where, data });
    }
  }
}
