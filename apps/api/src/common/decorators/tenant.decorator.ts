import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { TenantTx } from '../../prisma/tenant-context.service';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantTx => {
    const request = context.switchToHttp().getRequest();
    if (!request.tenantTx) {
      throw new InternalServerErrorException(
        '@CurrentTenant() usado em uma rota sem TenantContextInterceptor.',
      );
    }
    return request.tenantTx;
  },
);
