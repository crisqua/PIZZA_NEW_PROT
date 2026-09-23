import { IsDateString, IsOptional } from 'class-validator';

// Opcional -- quando omitido, OrdersService.list() usa "hoje" (fuso de Sao Paulo) como
// default. Nunca "todos os dias": GET /orders sem filtro nenhum trazia o historico
// inteiro do tenant a cada chamada (bug real de desempenho, cresce sem limite com o
// tempo de uso — ver OrdersPanel.tsx, que faz polling a cada 10s).
export class ListOrdersQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
