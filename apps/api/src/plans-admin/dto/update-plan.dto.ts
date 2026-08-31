import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MODULE_CODES, ModuleCode } from '../../module-gate/types/module-code';

// Deliberadamente SEM "code" -- imutavel apos criado. O whitelist global (bootstrap.ts)
// rejeita com 400 qualquer tentativa de mandar "code" aqui, mesmo padrao de "active" em
// UpdateTenantDto.
export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

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
