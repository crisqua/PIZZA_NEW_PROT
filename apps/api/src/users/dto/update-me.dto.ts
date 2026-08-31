import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
