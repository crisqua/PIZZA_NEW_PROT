import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { EXPENSE_CATEGORIES } from '../expense-categories';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
