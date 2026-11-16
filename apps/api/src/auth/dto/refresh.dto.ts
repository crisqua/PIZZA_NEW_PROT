import { IsIn, IsOptional } from 'class-validator';

// Sprint 38 (fechamento do gap de refresh) -- mesmo campo opcional do LoginDto, mesma
// razao de ser opcional (nao quebrar chamadas existentes sem o campo, inclusive a
// suite e2e). O cookie de refresh e' compartilhado pelo dominio da API entre os 3
// frontends -- sem isso, uma sessao de staff aberta no Painel Pizzaria sobrevivia
// (via refresh silencioso) dentro do App Cliente, mesmo com /auth/login ja bloqueado.
export class RefreshDto {
  @IsOptional()
  @IsIn(['customer', 'staff'])
  audience?: 'customer' | 'staff';
}
