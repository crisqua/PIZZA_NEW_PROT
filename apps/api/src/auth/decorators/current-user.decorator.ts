import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../../common/types/request-with-tenant';
import { AuthenticatedUser } from '../types/authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    return request.user;
  },
);
