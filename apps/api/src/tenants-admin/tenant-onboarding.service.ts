import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../common/password.util';
import { toSubscriptionResponse } from '../common/subscription-response.util';
import { toTenantResponse } from '../common/tenant-response.util';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

// Onboarding atomico de pizzaria nova (Sprint 10) -- separado de TenantsAdminService de
// proposito (mesmo espirito de ExpensesService/RevenueService na Sprint 8: CRUD simples
// fica num service, a logica de transacao cross-entidade mais complexa fica em outro).
//
// Ate esta sprint, NENHUM lugar do codigo criava tenant+dono+assinatura atomicamente --
// so' existia o precedente de teste (test/utils/seed-tenant.ts), que faz isso em DUAS
// transacoes separadas (um crash no meio deixaria tenant orfao sem dono). Aqui e' uma
// unica prisma.$transaction, nao TenantContextService.runInTenantContext (que abre a
// PROPRIA transacao e por isso nao serve pra compor com um tenant.create() que precisa
// rodar ANTES do set_config, na MESMA transacao) -- mesmo mecanismo interno
// (SELECT set_config('app.current_tenant_id', ..., true)), so' que apos criar o proprio
// tenant. Funciona porque MVCC garante leitura-da-propria-escrita dentro de uma
// transacao: a policy RLS de users/subscriptions e a FK composta enxergam o tenant
// recem-criado mesmo ele ainda nao tendo commitado pra fora. Qualquer erro no meio
// desfaz tudo -- nunca fica tenant orfao.
@Injectable()
export class TenantOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(dto: OnboardTenantDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plano nao encontrado.');
    }

    const passwordHash = await hashPassword(dto.ownerPassword);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            primaryColor: dto.primaryColor,
            logo: dto.logo,
            phone: dto.phone,
            address: dto.address,
            deliveryFee: dto.deliveryFee,
            minOrder: dto.minOrder,
          },
        });

        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.ownerEmail,
            name: dto.ownerName,
            role: 'tenant_owner',
            passwordHash,
          },
        });

        const subscription = await tx.subscription.create({
          data: { tenantId: tenant.id, planId: dto.planId, status: 'active' },
          include: { plan: true },
        });

        return {
          tenant: toTenantResponse(tenant),
          owner: { id: owner.id, email: owner.email, name: owner.name },
          subscription: toSubscriptionResponse(subscription),
        };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Slug ou email ja em uso.');
      }
      throw err;
    }
  }
}
