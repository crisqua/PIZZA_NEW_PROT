import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // So' bebida usa este campo -- pizza usa os 3 precos por tamanho abaixo.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number;

  // Nullable de proposito -- ver create-product.dto.ts: PATCH com priceBrotinho: null
  // e' o jeito de o dono desmarcar um tamanho que ja tinha preco (deixar de vender
  // brotinho, por exemplo). Regra "pelo menos 1 dos 3" e' checada em
  // ProductsService.update sobre o estado final apos o merge, nao aqui no DTO.
  // Min(0.01), nao Min(0) -- mesmo raciocinio de create-product.dto.ts: R$0,00 nao e'
  // um preco de verdade, PATCH pra 0 seria so' outro jeito de recriar o mesmo bug.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceBrotinho?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceOitoPedacos?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceDozePedacos?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

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

  @IsOptional()
  @IsIn(['pizza', 'drink', 'sobremesa'])
  type?: string;
}
