import { Plan, Subscription } from '@prisma/client';
import { toPlanResponse } from './plan-response.util';

export interface SubscriptionResponse {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  plan: ReturnType<typeof toPlanResponse>;
}

export function toSubscriptionResponse(subscription: Subscription & { plan: Plan }): SubscriptionResponse {
  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    planId: subscription.planId,
    status: subscription.status,
    startedAt: subscription.startedAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    plan: toPlanResponse(subscription.plan),
  };
}
