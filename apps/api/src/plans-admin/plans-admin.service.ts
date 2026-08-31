import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toPlanResponse } from '../common/plan-response.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

// "plans" nao tem RLS -- PrismaService direto, mesmo padrao de TenantsAdminService.
@Injectable()
export class PlansAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    try {
      const plan = await this.prisma.plan.create({
        data: { ...dto, modules: dto.modules ?? [] },
      });
      return toPlanResponse(plan);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Codigo ja esta em uso.');
      }
      throw err;
    }
  }

  // Catalogo pequeno, curado por admin -- sem paginacao, diferente de tenants.
  async list() {
    const plans = await this.prisma.plan.findMany({ orderBy: { createdAt: 'asc' } });
    return plans.map(toPlanResponse);
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException();
    }
    return toPlanResponse(plan);
  }

  // Editar modules/active aqui afeta TODO assinante deste plano. Nao tenta invalidar em
  // cascata o cache de assinatura de cada tenant (varreria Subscription cross-tenant sob
  // RLS por uma acao administrativa rara) -- aceita a janela de ate 60s de staleness do
  // TTL do ModuleGuard (src/module-gate/guards/module.guard.ts).
  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException();
    }
    const updated = await this.prisma.plan.update({ where: { id }, data: { ...dto } });
    return toPlanResponse(updated);
  }
}
