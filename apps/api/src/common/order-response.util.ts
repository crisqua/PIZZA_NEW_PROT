import { Order, OrderItem } from '@prisma/client';

// Mesmo gotcha de sempre: Prisma.Decimal serializa via .toJSON() como STRING, nao number
// -- response mapeia .toNumber() explicitamente (ver product-response.util.ts).
export interface OrderItemResponse {
  id: string;
  productId: string;
  secondProductId: string | null;
  type: string;
  size: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderResponse {
  id: string;
  tenantId: string;
  customerId: string;
  status: string;
  customerName: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  paymentMethod: string;
  changeFor: number | null;
  deliveryFee: number;
  total: number;
  items: OrderItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export function toOrderItemResponse(item: OrderItem): OrderItemResponse {
  return {
    id: item.id,
    productId: item.productId,
    secondProductId: item.secondProductId,
    type: item.type,
    size: item.size,
    name: item.name,
    unitPrice: item.unitPrice.toNumber(),
    quantity: item.quantity,
  };
}

export function toOrderResponse(order: Order & { items: OrderItem[] }): OrderResponse {
  return {
    id: order.id,
    tenantId: order.tenantId,
    customerId: order.customerId,
    status: order.status,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    addressNumber: order.addressNumber,
    complement: order.complement,
    neighborhood: order.neighborhood,
    paymentMethod: order.paymentMethod,
    changeFor: order.changeFor ? order.changeFor.toNumber() : null,
    deliveryFee: order.deliveryFee.toNumber(),
    total: order.total.toNumber(),
    items: order.items.map(toOrderItemResponse),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
