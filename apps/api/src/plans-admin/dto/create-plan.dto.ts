import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MODULE_CODES, ModuleCode } from '../../module-gate/types/module-code';

export class CreatePlanDto {
  @IsIn(['trial', 'pro', 'enterprise'])
  code!: 'trial' | 'pro' | 'enterprise';

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  // null = "negociado". Reais (nao centavos) — mesma convencao de Tenant.deliveryFee.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  limitLabel?: string;

  @IsOptional()
  @IsArray()
  @IsIn(MODULE_CODES, { each: true })
  modules?: ModuleCode[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
