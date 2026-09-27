import { IsDateString, IsOptional } from 'class-validator';

// from/to opcionais (mesma convencao de RevenueQueryDto) -- diferente de GET /orders
// (Sprint "Desempenho Sistema", 2026-09-27), aqui o filtro NAO e' obrigatorio: sem
// nenhum dos dois, mantem o comportamento legado (todas as despesas). Risco teorico
// baixo -- volume de despesas de uma pizzaria real cresce devagar (poucas por semana),
// diferente do caso de "orders" que crescia sem limite com o polling do OrdersPanel.
export class ExpensesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
