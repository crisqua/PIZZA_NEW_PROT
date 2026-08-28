export interface Category {
  id: string;
  name: string;
}

export interface Pizza {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  featured?: boolean;
  image: string;
  ingredients: string[];
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  size: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';
  paymentMethod: string;
  createdAt: Date;
}

export type PizzaSizeId = 'brotinho' | 'oito-pedacos' | 'doze-pedacos';

export interface CartItem {
  id: string;
  type: 'pizza' | 'drink';
  pizza?: {
    size: PizzaSizeId;
    flavors: Pizza[];
  };
  drink?: Drink;
  quantity: number;
  price: number;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo: string;
  primaryColor: string;
  phone: string;
  address: string;
  deliveryFee: number;
  minOrder: number;
  active?: boolean;
  planId?: string;
}

export type PlanCode = 'trial' | 'pro' | 'enterprise';

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  price: number | null;
  limitLabel: string;
  modules: AddonId[];
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
}

export type AddonId = 'estoque' | 'financeiro';

export interface Addon {
  id: AddonId;
  name: string;
  description: string;
  price: number;
}
