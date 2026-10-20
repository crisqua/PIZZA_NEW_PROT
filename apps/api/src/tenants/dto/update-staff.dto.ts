import { IsArray, IsBoolean, IsEmail, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { STAFF_PERMISSIONS } from '../staff-permissions';

// PATCH de funcionario (Sprint "Equipe") -- sem "password" de proposito (decisao 6:
// redefinir senha e' uma acao separada/futura, nao construida nesta sprint).
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  // Editavel depois de criado (decisao 8) -- dono corrigindo erro de digitacao;
  // conflito de unicidade (@@unique([tenantId, email])) vira 409 tratado no service.
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contractType?: string;

  @IsOptional()
  @IsISO8601()
  admissionDate?: string;

  @IsOptional()
  @IsArray()
  @IsIn(STAFF_PERMISSIONS, { each: true })
  permissions?: string[];

  // Ativar/desativar (decisao 2/3/4) -- checado contra o valor atual no StaffService
  // pra so' gravar auditoria/revogar refresh tokens quando muda de verdade.
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
