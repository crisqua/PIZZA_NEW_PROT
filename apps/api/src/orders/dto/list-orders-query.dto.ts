import { IsDateString, IsISO8601, IsOptional } from 'class-validator';

// Um dos dois filtros e' OBRIGATORIO desde a Sprint "Desempenho Sistema" (2026-09-27) --
// OrdersService.list() rejeita com 400 se nenhum vier. Dois modos, em ordem de
// prioridade: "from"+"to" (instante ISO exato, usado por Dashboard.tsx/Financial.tsx pro
// "dia de operacao"); "date" (dia de OPERACAO no fuso de Sao Paulo -- corta as 5h da
// manha, nao meia-noite, mesmo conceito do orderCode: os dois PRECISAM concordar entre
// si, ver sao-paulo-date.util.ts -- usado pelo OrdersPanel). Antes, sem filtro nenhum
// trazia o historico inteiro do tenant a cada chamada -- bug real de desempenho, cresce
// sem limite com o tempo de uso (OrdersPanel.tsx faz polling a cada 10s); auditoria de
// desempenho confirmou que nenhum chamador real precisava desse 3o modo.
export class ListOrdersQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
