import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

// Mesmo padrao de list-tenants-query.dto.ts (tenants-admin) -- page/pageSize com
// @Type(() => Number). "role" e "tenantId" sao os 2 filtros da Sprint 26 (diretorio
// cross-tenant de usuarios, so-leitura).
export class ListAdminUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['platform_superadmin', 'tenant_owner', 'tenant_staff', 'customer'])
  role?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
