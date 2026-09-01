import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Mascara BR de telefone (fixo ou celular) -- usada em qualquer campo de telefone/
// WhatsApp editavel dos 3 apps (antes duplicada localmente em Checkout.tsx e
// TenantForm.tsx, unificada aqui pra nao divergir).
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (!ddd) return '';
  if (!rest) return `(${ddd}`;
  const splitAt = digits.length > 10 ? 5 : 4;
  const prefix = rest.slice(0, splitAt);
  const suffix = rest.slice(splitAt);
  return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
}

// Mascara BR de moeda pro padrao "digita da direita pra esquerda" (cursor sempre no
// fim) -- o estado controlado guarda so' os digitos em centavos (string), nunca o
// valor formatado. `centsToDisplay` formata pra exibicao, `reaisToCentsDigits`
// converte um numero em reais (ex: vindo da API) pro formato de digitos inicial.
export function centsToDisplay(digitsInCents: string): string {
  if (!digitsInCents) return '';
  const cents = parseInt(digitsInCents, 10);
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Trata null/undefined como "sem valor" (campo vazio) -- mas 0 e' um valor real (ex:
// plano gratuito, taxa de entrega zero), tem que virar "0" e nao ficar vazio junto.
export function reaisToCentsDigits(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return Math.round(value * 100).toString();
}

const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
