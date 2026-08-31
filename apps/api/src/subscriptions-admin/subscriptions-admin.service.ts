import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { subscriptionCacheKey } from '../common/subscription-cache-key';
import { toSubscriptionResponse } from '../common/subscription-response.util';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly cache: CacheService,
  ) {}

  private async assertTenantExists(tenantId: string): Promise<void> {
    // "tenants" nao tem RLS -- PrismaService direto. Checado ANTES de abrir a transacao
    // de tenant context, pra um :tenantId invalido nunca chegar a abrir transacao nenhuma.
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant nao encontrado.');
    }
  }

  async findForTenant(tenantId: string) {
    await this.assertTenantExists(tenantId);
    const subscription = await this.tenantContext.runInTenantContext(tenantId, (tx) =>
      tx.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
    );
    if (!subscription) {
      throw new NotFoundException('Esse tenant ainda nao tem assinatura.');
    }
    return toSubscriptionResponse(subscription);
  }

  // Upsert manual, NUNCA prisma.subscription.upsert() -- reproduz um bug real ja
  // documentado no Barberaria: upsert() quebrava com campo undefined dentro do branch de
  // update. find-then-branch evita isso porque tx.update() trata undefined como "nao
  // mexe", diferente do que o upsert() interno faz.
  async upsertForTenant(tenantId: string, dto: UpdateSubscriptionDto) {
    await this.assertTenantExists(tenantId);

    if (dto.planId) {
      // Plano validado ANTES de abrir a transacao de tenant, mesma disciplina do
      // assertTenantExists.
      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) {
        throw new NotFoundException('Plano nao encontrado.');
      }
    }

    const result = await this.tenantContext.runInTenantContext(tenantId, async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { tenantId } });

      if (!existing) {
        if (!dto.planId) {
          throw new BadRequestException('Informe planId para criar a assinatura.');
        }
        return tx.subscription.create({
          data: { tenantId, planId: dto.planId, status: dto.status ?? 'active' },
          include: { plan: true },
        });
      }

      return tx.subscription.update({
        where: { tenantId },
        data: { planId: dto.planId, status: dto.status },
        include: { plan: true },
      });
    });

    await this.cache.del(subscriptionCacheKey(tenantId));
    return toSubscriptionResponse(result);
  }
}
