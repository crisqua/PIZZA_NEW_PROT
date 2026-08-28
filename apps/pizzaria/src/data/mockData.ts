import { Pizza, Category, Tenant, Order, Addon, Plan, PlanCode, InventoryItem, Expense } from '@pizza/types';

export const mockCategories: Category[] = [
  { id: 'classicas', name: 'Clássicas' },
  { id: 'carnes', name: 'Carnes' },
  { id: 'frango', name: 'Frango' },
  { id: 'queijos', name: 'Queijos' },
  { id: 'doces', name: 'Doces' },
];

export const mockPizzas: Pizza[] = [
  {
    id: '1',
    name: 'Margherita',
    description: 'Molho de tomate, mussarela, manjericão fresco e azeite',
    price: 45.90,
    category: 'classicas',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    ingredients: ['Molho de tomate', 'Mussarela', 'Manjericão', 'Azeite'],
  },
  {
    id: '2',
    name: 'Calabresa',
    description: 'Calabresa fatiada, cebola, mussarela e azeitonas',
    price: 48.90,
    category: 'carnes',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
    ingredients: ['Calabresa', 'Cebola', 'Mussarela', 'Azeitonas'],
  },
  {
    id: '3',
    name: 'Portuguesa',
    description: 'Presunto, ovos, cebola, azeitonas, mussarela e ervilha',
    price: 52.90,
    category: 'carnes',
    image: 'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=800',
    ingredients: ['Presunto', 'Ovos', 'Cebola', 'Azeitonas', 'Mussarela', 'Ervilha'],
  },
  {
    id: '4',
    name: 'Quatro Queijos',
    description: 'Mussarela, provolone, parmesão, gorgonzola e catupiry',
    price: 56.90,
    category: 'queijos',
    featured: true,
    image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800',
    ingredients: ['Mussarela', 'Provolone', 'Parmesão', 'Gorgonzola', 'Catupiry'],
  },
  {
    id: '5',
    name: 'Frango com Catupiry',
    description: 'Frango desfiado, catupiry, milho e azeitonas',
    price: 49.90,
    category: 'frango',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800',
    ingredients: ['Frango', 'Catupiry', 'Milho', 'Azeitonas'],
  },
  {
    id: '6',
    name: 'Pepperoni',
    description: 'Pepperoni, mussarela e orégano',
    price: 54.90,
    category: 'carnes',
    featured: true,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
    ingredients: ['Pepperoni', 'Mussarela', 'Orégano'],
  },
  {
    id: '7',
    name: 'Chocolate',
    description: 'Chocolate ao leite derretido com granulado',
    price: 42.90,
    category: 'doces',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
    ingredients: ['Chocolate ao leite', 'Granulado'],
  },
  {
    id: '8',
    name: 'Chocolate Branco com Morango',
    description: 'Chocolate branco e morangos frescos',
    price: 48.90,
    category: 'doces',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    ingredients: ['Chocolate branco', 'Morangos'],
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'João Silva',
    phone: '(11) 98765-4321',
    address: 'Rua das Flores, 123 - Centro',
    items: [
      {
        id: 'item1',
        type: 'pizza',
        pizza: { size: 'oito-pedacos', flavors: [mockPizzas[0], mockPizzas[1]] },
        quantity: 1,
        price: 52.90,
      },
    ],
    total: 60.90,
    status: 'preparing',
    paymentMethod: 'Dinheiro',
    createdAt: new Date('2026-06-05T18:30:00'),
  },
  {
    id: 'ORD-002',
    customerName: 'Maria Santos',
    phone: '(11) 91234-5678',
    address: 'Av. Principal, 456 - Apto 102',
    items: [
      {
        id: 'item2',
        type: 'pizza',
        pizza: { size: 'oito-pedacos', flavors: [mockPizzas[3]] },
        quantity: 2,
        price: 56.90,
      },
    ],
    total: 121.80,
    status: 'delivery',
    paymentMethod: 'Cartão de Débito',
    createdAt: new Date('2026-06-05T19:15:00'),
  },
];

export const mockTenant: Tenant = {
  id: 'tenant-1',
  name: 'Pizza Express',
  subdomain: 'pizzaexpress',
  logo: 'PE',
  primaryColor: '#C9A84C',
  phone: '(11) 3333-4444',
  address: 'Rua da Pizzaria, 789 - Centro',
  deliveryFee: 8.00,
  minOrder: 30.00,
  active: true,
  planId: 'plan-pro',
};

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

export const mockPlans: Plan[] = [
  { id: 'plan-trial', code: 'trial', name: 'Trial', price: 0, limitLabel: 'Até 30 pedidos/mês', modules: [], active: true },
  { id: 'plan-pro', code: 'pro', name: 'Pro', price: 199, limitLabel: 'Pedidos ilimitados', modules: ['estoque'], active: true },
  { id: 'plan-enterprise', code: 'enterprise', name: 'Enterprise', price: null, limitLabel: 'Múltiplas unidades, preço negociado', modules: ['estoque', 'financeiro'], active: true },
];

export const mockInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Mussarela', unit: 'kg', quantity: 18, minQuantity: 10 },
  { id: 'inv-2', name: 'Molho de tomate', unit: 'L', quantity: 6, minQuantity: 8 },
  { id: 'inv-3', name: 'Calabresa', unit: 'kg', quantity: 9, minQuantity: 6 },
  { id: 'inv-4', name: 'Presunto', unit: 'kg', quantity: 3, minQuantity: 5 },
  { id: 'inv-5', name: 'Catupiry', unit: 'kg', quantity: 4, minQuantity: 4 },
  { id: 'inv-6', name: 'Frango desfiado', unit: 'kg', quantity: 7, minQuantity: 5 },
  { id: 'inv-7', name: 'Massa de pizza', unit: 'un', quantity: 45, minQuantity: 30 },
  { id: 'inv-8', name: 'Caixa de pizza', unit: 'un', quantity: 12, minQuantity: 50 },
  { id: 'inv-9', name: 'Azeitonas', unit: 'kg', quantity: 2.5, minQuantity: 2 },
  { id: 'inv-10', name: 'Chocolate ao leite', unit: 'kg', quantity: 5, minQuantity: 3 },
];

export const mockExpenses: Expense[] = [
  { id: 'exp-1', description: 'Compra de insumos (Distribuidora Central)', category: 'Insumos', amount: 840.00, date: '2026-08-24' },
  { id: 'exp-2', description: 'Aluguel do salão', category: 'Fixas', amount: 2200.00, date: '2026-08-22' },
  { id: 'exp-3', description: 'Conta de energia', category: 'Fixas', amount: 310.50, date: '2026-08-20' },
  { id: 'exp-4', description: 'Gás para forno', category: 'Insumos', amount: 180.00, date: '2026-08-19' },
  { id: 'exp-5', description: 'Manutenção da moto de entrega', category: 'Outras', amount: 150.00, date: '2026-08-18' },
  { id: 'exp-6', description: 'Embalagens e caixas', category: 'Insumos', amount: 260.00, date: '2026-08-15' },
];

export const mockDailyRevenue: { date: string; revenue: number; expenses: number }[] = [
  { date: '2026-08-22', revenue: 1840, expenses: 2200 },
  { date: '2026-08-23', revenue: 2210, expenses: 0 },
  { date: '2026-08-24', revenue: 1980, expenses: 840 },
  { date: '2026-08-25', revenue: 2450, expenses: 0 },
  { date: '2026-08-26', revenue: 2680, expenses: 0 },
  { date: '2026-08-27', revenue: 3120, expenses: 0 },
  { date: '2026-08-28', revenue: 2870, expenses: 0 },
];
