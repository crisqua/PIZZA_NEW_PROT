import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// Cadastro publico do cliente final (Sprint 7) -- so' cria role:'customer', sempre
// tenant-scoped (diferente de LoginDto, aqui tenantSlug e' sempre obrigatorio: nao existe
// "cadastro de superadmin" publico).
export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  tenantSlug!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // Obrigatorio desde o cadastro (Sprint 13) -- consistente com o checkout, que ja
  // exige. Mesmo padrao de CreateOrderDto.phone: sem regex de formato aqui, so'
  // validado/mascarado no frontend via formatPhone.
  @IsString()
  @MaxLength(20)
  phone!: string;
}
