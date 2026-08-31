import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

// Deliberadamente SEM "active" nem "slug" -- active e' so' via toggle superadmin;
// mudar o proprio slug fica superadmin-mediado (maior risco de quebrar link externo).
// whitelist global (bootstrap.ts) rejeita 400 se qualquer um dos dois vier no body.
export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrder?: number;
}
