import { Tenant } from '@prisma/client';

// Prisma.Decimal serializa via .toJSON() como STRING ("8.00"), nao number -- todo
// response HTTP precisa passar por aqui antes de sair, senao o contrato quebra o
// formatCurrency(value: number) que o frontend real vai esperar (Sprint 9/10).
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  primaryColor: string;
  logo: string;
  phone: string;
  address: string;
  deliveryFee: number;
  minOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toTenantResponse(tenant: Tenant): TenantResponse {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    active: tenant.active,
    primaryColor: tenant.primaryColor,
    logo: tenant.logo,
    phone: tenant.phone,
    address: tenant.address,
    deliveryFee: tenant.deliveryFee.toNumber(),
    minOrder: tenant.minOrder.toNumber(),
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}

// Formato da rota publica (GET /public/tenants/:slug) -- so' o que e' seguro expor sem
// autenticacao, nunca active/phone/address. deliveryFee/minOrder entraram na Sprint 7:
// diferente de phone/address/active (dado operacional/interno), sao preco pro cliente --
// apps/cliente precisa deles pra montar o total do carrinho ANTES do checkout confirmar
// (o servidor recalcula o total de verdade em OrdersService.create de qualquer jeito,
// isso aqui e' so' preview).
export interface TenantBrandingResponse {
  name: string;
  slug: string;
  primaryColor: string;
  logo: string;
  deliveryFee: number;
  minOrder: number;
}

export function toTenantBrandingResponse(
  tenant: Pick<Tenant, 'name' | 'slug' | 'primaryColor' | 'logo' | 'deliveryFee' | 'minOrder'>,
): TenantBrandingResponse {
  return {
    name: tenant.name,
    slug: tenant.slug,
    primaryColor: tenant.primaryColor,
    logo: tenant.logo,
    deliveryFee: tenant.deliveryFee.toNumber(),
    minOrder: tenant.minOrder.toNumber(),
  };
}
