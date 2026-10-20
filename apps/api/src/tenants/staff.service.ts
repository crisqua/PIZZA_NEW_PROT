import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { hashPassword } from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { STAFF_PERMISSION_MODULE } from './staff-permissions';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

// Nunca selecionar passwordHash pra fora do banco -- mesma disciplina de
// users.controller.ts (PUBLIC_USER_SELECT).
const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  position: true,
  contractType: true,
  admissionDate: true,
  permissions: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(tx: TenantTx) {
    return tx.user.findMany({
      where: { role: 'tenant_staff' },
      select: STAFF_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(tx: TenantTx, tenantId: string, actor: AuthenticatedUser, dto: CreateStaffDto) {
    await this.assertPermissionsAllowed(tenantId, dto.permissions);
    const passwordHash = await hashPassword(dto.password);

    try {
      const created = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          role: 'tenant_staff',
          passwordHash,
          position: dto.position,
          contractType: dto.contractType,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
          permissions: dto.permissions ?? [],
        },
        select: STAFF_SELECT,
      });
      // Mesma transacao (padrao ja estabelecido em auth.service.ts/register) -- se o
      // cadastro der rollback, a entrada de auditoria some junto.
      await this.auditLog.record(tx, {
        tenantId,
        actorId: actor.id,
        actorEmail: actor.email ?? 'desconhecido',
        actorRole: actor.role,
        action: 'user.create',
        targetType: 'user',
        targetId: created.id,
      });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Ja existe uma conta com este email nesta pizzaria.');
      }
      throw err;
    }
  }

  async update(tx: TenantTx, tenantId: string, actor: AuthenticatedUser, id: string, dto: UpdateStaffDto) {
    // RLS + role:'tenant_staff' juntos garantem que isso nunca enxerga um dono/cliente
    // nem um funcionario de outro tenant -- 404 "limpo", nunca confirma se o id existe
    // em outro tenant ou pertence a outro papel (mesmo padrao de UsersController).
    const existing = await tx.user.findFirst({ where: { id, role: 'tenant_staff' } });
    if (!existing) {
      throw new NotFoundException();
    }

    if (dto.permissions !== undefined) {
      await this.assertPermissionsAllowed(tenantId, dto.permissions);
    }

    try {
      const updated = await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          position: dto.position,
          contractType: dto.contractType,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
          permissions: dto.permissions,
          active: dto.active,
        },
        select: STAFF_SELECT,
      });

      // Decisao 7: ativar/desativar grava auditoria so' quando "active" veio no body E
      // mudou de verdade (mesmo raciocinio ja usado por tenant.store_status_change).
      if (dto.active !== undefined && dto.active !== existing.active) {
        await this.auditLog.record(tx, {
          tenantId,
          actorId: actor.id,
          actorEmail: actor.email ?? 'desconhecido',
          actorRole: actor.role,
          action: 'user.status_change',
          targetType: 'user',
          targetId: id,
          metadata: { from: existing.active, to: dto.active },
        });
        // Decisao 4: desativar revoga TODAS as sessoes do funcionario na hora (nao so'
        // uma familia) -- login/refresh bloqueados imediatamente; o access token de
        // ate 15min ja emitido continua valendo ate expirar sozinho (mesmo limite ja
        // aceito/documentado pro caso de tenant desativado).
        if (dto.active === false) {
          await this.authService.revokeAllSessionsForUser(tx, id);
        }
      }

      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Ja existe uma conta com este email nesta pizzaria.');
      }
      throw err;
    }
  }

  async getContractTypes(tx: TenantTx): Promise<string[]> {
    const rows = await tx.user.findMany({
      where: { role: 'tenant_staff', contractType: { not: null } },
      select: { contractType: true },
      distinct: ['contractType'],
    });
    const used = rows.map((r) => r.contractType).filter((v): v is string => !!v);
    return [...new Set(['CLT', 'Freelancer', ...used])];
  }

  async getPositions(tx: TenantTx): Promise<string[]> {
    const rows = await tx.user.findMany({
      where: { role: 'tenant_staff', position: { not: null } },
      select: { position: true },
      distinct: ['position'],
    });
    const used = rows.map((r) => r.position).filter((v): v is string => !!v);
    return [...new Set(['Atendente', 'Pizzaiolo', 'Motoboy', ...used])];
  }

  // "tenants" nao tem RLS -- le direto do PrismaService global (mesmo padrao ja usado
  // por TenantsController/toSubscriptionSummary). Rejeita (400) permissao de
  // estoque/financeiro se o tenant nao tiver aquele modulo contratado -- senao o dono
  // conseguiria marcar um modulo que a pizzaria nao tem, so' pra aquele funcionario
  // nunca conseguir usar (dado inconsistente, StaffPermissionGuard bloquearia de
  // qualquer forma, mas o erro fica mais claro aqui, na escrita).
  private async assertPermissionsAllowed(tenantId: string, permissions: string[] | undefined): Promise<void> {
    if (!permissions || permissions.length === 0) {
      return;
    }
    const gated = permissions.filter((p) => STAFF_PERMISSION_MODULE[p as keyof typeof STAFF_PERMISSION_MODULE]);
    if (gated.length === 0) {
      return;
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { planModules: true } });
    const modules = Array.isArray(tenant?.planModules) ? (tenant.planModules as string[]) : [];
    for (const permission of gated) {
      const requiredModule = STAFF_PERMISSION_MODULE[permission as keyof typeof STAFF_PERMISSION_MODULE];
      if (requiredModule && !modules.includes(requiredModule)) {
        throw new BadRequestException(`Modulo "${requiredModule}" nao esta incluso no plano desta pizzaria.`);
      }
    }
  }
}
