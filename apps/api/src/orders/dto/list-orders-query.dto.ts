import { IsDateString, IsISO8601, IsOptional } from 'class-validator';

// Tres modos, em ordem de prioridade em OrdersService.list(): "from"+"to" (instante ISO
// exato, usado pelo Dashboard pro "dia de operacao"); "date" (dia de OPERACAO no fuso de
// Sao Paulo -- corta as 5h da manha, nao meia-noite, mesmo conceito do orderCode: os
// dois PRECISAM concordar entre si, ver sao-paulo-date.util.ts -- usado pelo
// OrdersPanel); nenhum dos dois (sem filtro, comportamento legado ainda usado por
// Financial.tsx/topProducts ate migrarem). GET /orders sem filtro nenhum trazia o
// historico inteiro do tenant a cada chamada -- bug real de desempenho, cresce sem
// limite com o tempo de uso (OrdersPanel.tsx faz polling a cada 10s).
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
