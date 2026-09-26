import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

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

  // Formato so' (14 digitos, com ou sem mascara) -- o digito verificador de verdade e'
  // calculado no service (isValidCnpj), nao da pra fazer so' com @Matches.
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)
  cnpj?: string;

  // Loja aberta/fechada (Sprint 27) -- interruptor manual, controlado pelo Dashboard/
  // Pedidos. Horario/tempo de entrega abaixo sao so' informativos (nao fecham a loja
  // sozinhos fora do horario), ver schema.prisma pra contexto completo.
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  openingTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closingTime?: string;

  @IsOptional()
  @IsBoolean()
  openWeekends?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  estimatedDeliveryMinutes?: number;
}
