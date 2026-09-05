import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // 'pizza' | 'drink' | 'sobremesa' -- mesma convencao de Product.type. Default 'pizza'
  // no schema quando omitido.
  @IsOptional()
  @IsIn(['pizza', 'drink', 'sobremesa'])
  type?: string;
}
