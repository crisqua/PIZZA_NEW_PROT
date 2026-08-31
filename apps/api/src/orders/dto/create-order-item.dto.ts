import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PIZZA_SIZE_IDS, PizzaSizeId } from '../pizza-size';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  // Segundo sabor (pizza meio a meio) -- ausente = sabor unico.
  @IsOptional()
  @IsUUID()
  secondProductId?: string;

  // So' faz sentido pra pizza -- OrdersService valida a combinacao (bebida nao manda size).
  @IsOptional()
  @IsIn(PIZZA_SIZE_IDS)
  size?: PizzaSizeId;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;
}
