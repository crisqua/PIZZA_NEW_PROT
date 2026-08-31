import { Addon } from '@pizza/types';

// Copy/preco de marketing pro card de upsell (AddonUpsell.tsx) -- constante estatica do
// frontend, nao dado de tenant, nao precisa vir da API (mesmo raciocinio de pizzaSizes
// ter ficado hardcoded em apps/cliente na Sprint 7). Liberacao de verdade e' sempre via
// unlockedModules (repository.ts), nunca esta lista.
export const ADDONS: Addon[] = [
  {
    id: 'estoque',
    name: 'Controle de Estoque',
    description: 'Acompanhe a quantidade de cada ingrediente, receba alerta de estoque baixo e evite ficar sem insumo no meio do serviço.',
    price: 39.90,
  },
  {
    id: 'financeiro',
    name: 'Controle Financeiro',
    description: 'Fluxo de caixa da sua pizzaria: receitas dos pedidos, despesas lançadas por você e o saldo do período, tudo num só lugar.',
    price: 49.90,
  },
];
