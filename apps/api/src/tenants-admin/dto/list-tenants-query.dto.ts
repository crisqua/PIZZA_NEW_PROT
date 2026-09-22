import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListTenantsQueryDto {
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

  // Busca server-side por nome/slug -- o painel admin buscava client-side sobre TODOS os
  // tenants (forcava pageSize=100 pra isso funcionar), o que nao escala. Com busca no
  // backend, o frontend pode paginar de verdade (ex. 20 por vez) sem perder a busca.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
