import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // Usado como chave publica de lookup (GET /public/tenants/:slug) — mesmas regras de
  // formato de URL/subdominio que o padrao ja validado no Barberaria.
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  slug!: string;

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
