import { IsDateString, IsOptional } from 'class-validator';

// from/to opcionais -- default de 7 dias (hoje-6 a hoje) resolvido em RevenueService,
// espelhando o "ultimos 7 dias" ja fixo no prototipo (Financial.tsx).
export class RevenueQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
