import { Addon, Plan, PlanCode } from '@pizza/types';

export const mockAddons: Addon[] = [
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

export const PLAN_CODES: PlanCode[] = ['trial', 'pro', 'enterprise'];

export const CORE_MODULES = ['Cardápio', 'Pedidos'];

export const mockPlans: Plan[] = [
  { id: 'plan-trial', code: 'trial', name: 'Trial', price: 0, limitLabel: 'Até 30 pedidos/mês', modules: [], active: true },
  { id: 'plan-pro', code: 'pro', name: 'Pro', price: 199, limitLabel: 'Pedidos ilimitados', modules: ['estoque'], active: true },
  { id: 'plan-enterprise', code: 'enterprise', name: 'Enterprise', price: null, limitLabel: 'Múltiplas unidades, preço negociado', modules: ['estoque', 'financeiro'], active: true },
];
