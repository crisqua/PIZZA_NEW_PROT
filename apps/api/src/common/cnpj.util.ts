import { BadRequestException } from '@nestjs/common';

// Validacao real de CNPJ (Sprint "CNPJ da pizzaria") -- nao so' formato, calcula os 2
// digitos verificadores pelo algoritmo oficial da Receita Federal. So' uma funcao de
// verdade resolve isso (nao da' pra fazer com @Matches sozinho no DTO).

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function checkDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split('')
    .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(rawCnpj: string): boolean {
  const digits = rawCnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    return false;
  }
  // "00000000000000", "11111111111111", etc. passam no formato mas nunca sao um CNPJ
  // de verdade -- mais barato/claro rejeitar de cara do que deixar o calculo abaixo
  // (que tambem rejeitaria, mas so' depois de fazer a conta a toa).
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const base = digits.slice(0, 12);
  const firstDigit = checkDigit(base, FIRST_WEIGHTS);
  const secondDigit = checkDigit(base + firstDigit, SECOND_WEIGHTS);

  return digits === `${base}${firstDigit}${secondDigit}`;
}

// Mascara "00.000.000/0000-00" -- aplicada so' no backend (nao em packages/ui) porque o
// digito verificador depende do CNPJ inteiro; mais simples ter uma formatacao so' server-
// side aplicada antes de salvar do que duplicar a regra cliente/servidor.
export function formatCnpj(rawCnpj: string): string {
  const digits = rawCnpj.replace(/\D/g, '');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

// Usado nos 4 pontos que escrevem Tenant.cnpj (updateMe, onboard, create, update) --
// undefined (nao veio no body) vira undefined pro Prisma tambem, que ai' nao mexe no
// campo (create: fica NULL pelo default do schema; update: mantem o valor atual).
export function resolveCnpj(rawCnpj: string | undefined): string | undefined {
  if (!rawCnpj) {
    return undefined;
  }
  if (!isValidCnpj(rawCnpj)) {
    throw new BadRequestException('CNPJ invalido.');
  }
  return formatCnpj(rawCnpj);
}
