import { Pizza, Drink, Category, Tenant, PizzaSizeId } from '@pizza/types';

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

export const mockDrinks: Drink[] = [
  { id: 'd1', name: 'Coca-Cola', price: 6.00, size: '350ml' },
  { id: 'd2', name: 'Coca-Cola', price: 10.00, size: '2L' },
  { id: 'd3', name: 'Guaraná Antarctica', price: 6.00, size: '350ml' },
  { id: 'd4', name: 'Guaraná Antarctica', price: 10.00, size: '2L' },
  { id: 'd5', name: 'Suco de Laranja', price: 8.00, size: '500ml' },
  { id: 'd6', name: 'Água Mineral', price: 4.00, size: '500ml' },
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

export const pizzaSizes: { id: PizzaSizeId; name: string; slices: number; multiplier: number }[] = [
  { id: 'brotinho', name: 'Brotinho', slices: 4, multiplier: 0.75 },
  { id: 'oito-pedacos', name: '8 pedaços', slices: 8, multiplier: 1.35 },
  { id: 'doze-pedacos', name: '12 pedaços', slices: 12, multiplier: 1.8 },
];
