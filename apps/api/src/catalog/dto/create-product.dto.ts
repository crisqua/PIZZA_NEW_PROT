import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

// type default e' 'pizza' (schema.prisma) -- undefined conta como pizza pra decidir qual
// bloco de preco e' obrigatorio aqui. Bebida e sobremesa usam o mesmo bloco (preco unico
// + tamanho em texto livre), so' pizza usa os 3 precos por tamanho.
function isPizza(dto: { type?: string }): boolean {
  return dto.type === undefined || dto.type === 'pizza';
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Bebida e sobremesa usam este campo -- pizza usa os 3 precos por tamanho abaixo. Preco
  // explicito por tamanho (revertido de preco-base x multiplicador nesta sprint): o
  // dono digita o preco real de cada tamanho, nunca uma conta escondida.
  @ValidateIf((dto: CreateProductDto) => !isPizza(dto))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number;

  // Nullable de proposito: o dono pode deixar um tamanho sem preco pra nao vender a
  // pizza naquele tamanho (ex.: nao faz brotinho dessa) -- so' precisa ter pelo menos
  // 1 dos 3 preenchido, checado em ProductsService.create (regra de negocio, nao de
  // formato de campo, mesmo padrao ja' documentado no CNPJ pra esse tipo de validacao).
  // Min(0.01), nao Min(0): R$0,00 nao e' um preco de verdade, ninguem vende pizza de
  // graca -- bug real encontrado em producao onde um tamanho zerado (dado de antes desta
  // sprint) ficava selecionavel pro cliente igual a um tamanho com preco de verdade.
  @ValidateIf(isPizza)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceBrotinho?: number | null;

  @ValidateIf(isPizza)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceOitoPedacos?: number | null;

  @ValidateIf(isPizza)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  priceDozePedacos?: number | null;

  // Variante em texto livre pra bebida/sobremesa (ex. "2L"/"Fatia") -- opcional mesmo
  // pros tipos que usam, pizza ignora.
  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

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

  // 'pizza' | 'drink' | 'sobremesa' -- so' order_items le' isso pra saber como calcular
  // preco (media dos precos-por-tamanho dos sabores vs. direto). Default 'pizza' no
  // schema, e' tambem o que decide qual bloco de preco acima e' obrigatorio (ver isPizza).
  @IsOptional()
  @IsIn(['pizza', 'drink', 'sobremesa'])
  type?: string;
}
