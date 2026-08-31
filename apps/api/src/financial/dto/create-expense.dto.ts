import { IsDateString, IsIn, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { EXPENSE_CATEGORIES } from '../expense-categories';

export class CreateExpenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  description!: string;

  @IsIn(EXPENSE_CATEGORIES)
  category!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount!: number;

  @IsDateString()
  date!: string;
}
