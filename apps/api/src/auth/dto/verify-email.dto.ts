import { IsString, MaxLength, MinLength } from 'class-validator';

// tenantSlug obrigatorio (Sprint 14) pelo mesmo motivo de RegisterDto: o link de
// confirmacao nao carrega o tenant, o app cliente ja sabe o proprio slug (getTenantSlug())
// e manda junto -- e' isso que permite abrir o runInTenantContext certo sem bypassar RLS.
export class VerifyEmailDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  tenantSlug!: string;

  // crypto.randomBytes(32).toString('hex') sempre tem 64 caracteres.
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  token!: string;
}
