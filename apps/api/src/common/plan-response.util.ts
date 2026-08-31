import { Plan } from '@prisma/client';

// Mesmo gotcha do Sprint 3 (Tenant.deliveryFee/minOrder): Prisma.Decimal serializa via
// .toJSON() como STRING, nao number — todo response precisa mapear .toNumber() antes de
// devolver ao cliente.
export interface PlanResponse {
  id: string;
  code: string;
  name: string;
  price: number | null;
  limitLabel: string | null;
  modules: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toPlanResponse(plan: Plan): PlanResponse {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    price: plan.price ? plan.price.toNumber() : null,
    limitLabel: plan.limitLabel,
    modules: plan.modules as string[],
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
