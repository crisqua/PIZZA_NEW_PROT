import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;

  // Ausente = login de platform_superadmin (sem tenant). Presente = resolve o Tenant por
  // slug antes de buscar o usuario dentro daquele contexto de tenant.
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  tenantSlug?: string;

  // Sprint 38 -- opcional de proposito (ver docs/pizzaria_sprints.md, trade-off aceito):
  // cada frontend real manda o seu ('cliente'->'customer', 'pizzaria'->'staff'); ausente =
  // sem checagem de audiencia (comportamento antigo, usado pela suite e2e).
  @IsOptional()
  @IsIn(['customer', 'staff'])
  audience?: 'customer' | 'staff';
}
