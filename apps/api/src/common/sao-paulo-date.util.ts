// Fuso fixo (America/Sao_Paulo, UTC-3, sem horario de verao desde 2019) -- mesma premissa
// ja assumida pelo resto do projeto (nenhuma tela tem seletor de fuso por tenant).
const SAO_PAULO_UTC_OFFSET = '-03:00';

// "AAAAMMDD" no fuso de Brasilia, nao UTC -- um pedido feito as 21h horario local ainda
// e' "hoje" pro dono da pizzaria, mesmo ja sendo o dia seguinte em UTC. Usado pelo codigo
// sequencial do pedido (orderCode).
export function dateKeySaoPaulo(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${byType.year}${byType.month}${byType.day}`;
}

// Dado um dia civil em Sao Paulo ("YYYY-MM-DD"), devolve o intervalo UTC [start, end)
// que cobre esse dia inteiro -- usado pra filtrar createdAt sem trazer pedidos de dias
// adjacentes.
export function saoPauloDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000${SAO_PAULO_UTC_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
