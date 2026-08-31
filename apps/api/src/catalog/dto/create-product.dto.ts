import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price!: number;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  // Texto livre -- diferente de Plan.modules, sem @IsIn contra lista fechada.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  // 'pizza' | 'drink' (Sprint 7) -- so' order_items le' isso pra saber como calcular
  // preco (media-de-sabores*multiplicador vs. direto). Default 'pizza' no schema.
  @IsOptional()
  @IsIn(['pizza', 'drink'])
  type?: string;
}
