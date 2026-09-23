// Fuso fixo (America/Sao_Paulo, UTC-3, sem horario de verao desde 2019) -- mesma premissa
// ja assumida pelo resto do projeto (nenhuma tela tem seletor de fuso por tenant).
const SAO_PAULO_UTC_OFFSET = '-03:00';

// "Dia de operacao" corta as 5h da manha, nao meia-noite -- pizzaria pode abrir 18h e
// fechar depois da 0h, dia-calendario puro cortaria uma mesma noite em dois dias (ex.:
// pedido feito 23/09 00h20 deveria contar como "22/09" pro dono). Usado tanto pelo
// codigo sequencial do pedido (orderCode) quanto pelo filtro de data do OrdersPanel --
// os dois PRECISAM concordar entre si (um orderCode que diz "22" tem que aparecer
// filtrando o painel por "22", nao por "23"). Dashboard.tsx usa esse mesmo corte, mas
// calculado no proprio frontend (from/to explicito) -- decisao consciente, nao duplica
// esta funcao la'.
const BUSINESS_DAY_CUTOFF_HOUR = 5;

// "AAAAMMDD" no fuso de Brasilia, dia-calendario puro (meia-noite exata) -- usado so'
// como primitivo interno de businessDayKeySaoPaulo abaixo.
function dateKeySaoPauloRaw(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${byType.year}${byType.month}${byType.day}`;
}

// "AAAAMMDD" do DIA DE OPERACAO (corte as 5h) que contem o instante dado -- ex.: um
// pedido as 23/09 02:00 (Sao Paulo) devolve "20260922", nao "20260923". Truque: adiantar
// o relogio pra tras pelo tamanho do corte antes de perguntar "que dia-calendario e'
// esse" -- funciona exatamente porque Sao Paulo nao tem horario de verao (offset fixo).
export function businessDayKeySaoPaulo(date: Date): string {
  const shifted = new Date(date.getTime() - BUSINESS_DAY_CUTOFF_HOUR * 60 * 60 * 1000);
  return dateKeySaoPauloRaw(shifted);
}

// Dado um DIA DE OPERACAO ("YYYY-MM-DD", com hifen -- formato diferente do "AAAAMMDD"
// sem hifen do orderCode, nao confundir), devolve o intervalo UTC [start, end) que cobre
// esse dia inteiro (das 5h de "dateStr" as 5h do dia seguinte) -- usado pra filtrar
// createdAt sem trazer pedidos de dias adjacentes.
export function businessDayRangeSaoPaulo(dateStr: string): { start: Date; end: Date } {
  const cutoff = String(BUSINESS_DAY_CUTOFF_HOUR).padStart(2, '0');
  const start = new Date(`${dateStr}T${cutoff}:00:00.000${SAO_PAULO_UTC_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
