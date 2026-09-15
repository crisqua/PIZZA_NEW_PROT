import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  // Perfil de entrega do cliente (Sprint 7) -- so' tem sentido pra role:'customer', mas
  // nao restringido por papel aqui (mesmo espirito de "name": qualquer papel pode editar
  // o proprio registro, RBAC de negocio fica pro DoD que precisar dele).
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

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

  // CEP opcional aqui (Sprint 12) -- diferente do checkout, o perfil pode ser editado
  // sem endereco completo. Quando vem, passa pelo mesmo CepLookupService do checkout.
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;
}
