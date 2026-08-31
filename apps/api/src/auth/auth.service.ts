import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { verifyPassword } from '../common/password.util';
import { hashRefreshToken } from '../common/refresh-token.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, UserRole } from './types/authenticated-user';

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
  ) {}

  // Slug desconhecido e senha errada retornam o MESMO erro — nunca dar sinal de que um
  // tenant existe ou nao (evita enumeracao de tenant).
  async validateCredentials(dto: LoginDto): Promise<AuthenticatedUser> {
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
      if (!tenant) {
        throw new UnauthorizedException('Credenciais invalidas.');
      }

      // Checado ANTES da senha, de proposito: mais simples e evita pagar o custo de um
      // Argon2 verify (caro por design) numa tentativa que vai ser rejeitada de qualquer
      // jeito. 403 (nao 401) e' distinguivel aqui SEM reabrir a enumeracao que o 401
      // generico acima evita -- aquele esconde se um SLUG existe; este so' dispara depois
      // do slug ja confirmado existente, e nao revela nada sobre email/senha (Sprint 3,
      // ver docs/MVP_SPRINTS.md).
      if (!tenant.active) {
        throw new ForbiddenException('Tenant desativado.');
      }

      const user = await this.tenantContext.runInTenantContext(tenant.id, (tx) =>
        tx.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email: dto.email } },
        }),
      );

      if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
        throw new UnauthorizedException('Credenciais invalidas.');
      }

      return { id: user.id, tenantId: user.tenantId, role: user.role as UserRole };
    }

    // Sem tenantSlug -> login de platform_superadmin, sem contexto de tenant.
    const user = await this.prisma.user.findFirst({
      where: { role: 'platform_superadmin', email: dto.email, tenantId: null },
    });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return { id: user.id, tenantId: null, role: 'platform_superadmin' };
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
