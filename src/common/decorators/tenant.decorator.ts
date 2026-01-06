import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  email: string;
  category: string;
  status: string;
}

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.user;

    if (!tenant) {
      return null;
    }

    return data ? tenant[data] : tenant;
  },
);
