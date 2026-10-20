import { IsArray, IsEmail, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { STAFF_PERMISSIONS } from '../staff-permissions';

// Cadastro de funcionario pelo dono (Sprint "Equipe") -- sempre role:'tenant_staff',
// sempre tenant-scoped (StaffController ja' e' @Roles('tenant_owner') na classe inteira,
// nunca o proprio funcionario se auto-cadastrando). Mesma regra de senha do RegisterDto
// (cadastro publico do cliente) -- consistencia de politica de senha no projeto todo.
export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  // Texto livre (cargo/funcao) -- ver decisao 5b/9 em docs/pizzaria_sprints.md: nao e'
  // enum fixo, o dono pode criar qualquer cargo novo (sugestao no frontend via
  // GET /tenants/me/staff/positions).
  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;

  // Texto livre (tipo de contratacao) -- mesmo raciocinio do campo acima.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contractType?: string;

  @IsOptional()
  @IsISO8601()
  admissionDate?: string;

  // Vocabulario fechado (decisao 9) -- diferente de position/contractType, que sao
  // texto livre: aqui SIM e' uma lista fechada, porque cada valor corresponde a um
  // guard real (@RequiresStaffPermission) nos 4 modulos existentes. Validacao de que o
  // tenant TEM o modulo contratado pra cada valor de estoque/financeiro acontece no
  // StaffService (depende de uma consulta a assinatura, fora do alcance de um DTO).
  @IsOptional()
  @IsArray()
  @IsIn(STAFF_PERMISSIONS, { each: true })
  permissions?: string[];
}
