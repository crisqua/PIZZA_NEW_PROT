import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

// customerName vem de user.name (autenticado), nunca do body -- mesmo racional de nunca
// confiar em tenant_id do body (arquitetura secao 6.1), aqui aplicado a "de quem e' o
// pedido".
export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  // Obrigatorio (Sprint 12) -- e' o que da' de verdade valor a essa sprint: sem isso o
  // backend nunca teria como consultar o CepLookupService. Aceita com ou sem hifen (o
  // frontend ja manda formatado, mas o formato exato nao deveria ser motivo de 400).
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep!: string;

  // Preenchidos de verdade pelo CepLookupService no backend -- o cliente pode mandar
  // vazio, nunca sao a fonte da verdade quando o CEP resolve.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsIn(['dinheiro', 'cartao'])
  paymentMethod!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  changeFor?: number;
}
