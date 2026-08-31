import { IsIn } from 'class-validator';
import { ORDER_STATUSES } from '../order-status';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: string;
}
