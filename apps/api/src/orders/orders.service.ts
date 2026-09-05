import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toOrderResponse } from '../common/order-response.util';
import { getPizzaSizePrice } from '../common/product-price.util';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { TenantContextService, TenantTx } from '../prisma/tenant-context.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertValidTransition } from './order-status';
import { PizzaSizeId } from './pizza-size';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

interface ComputedItem {
  tenantId: string;
  productId: string;
  secondProductId: string | null;
  type: string;
  size: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  // Abre a PROPRIA transacao (nao usa o "tx" do TenantContextInterceptor, diferente de
  // list/findOne/updateStatus abaixo) porque precisa poder tentar DUAS transacoes: o
  // Postgres aborta a transacao INTEIRA apos qualquer erro (inclusive violacao de unique),
  // entao apos um P2002 nao da' pra reusar o mesmo tx pra buscar o pedido que a outra
  // requisicao concorrente ja criou (confirmado na pratica via smoke test manual: a
  // tentativa de reusar o tx dava 25P02 "current transaction is aborted"). Mesma
  // justificativa geral de ModuleGuard abrir a propria transacao, motivo diferente aqui.
  async create(tenantId: string, userId: string, idempotencyKey: string, dto: CreateOrderDto) {
    try {
      return await this.tenantContext.runInTenantContext(tenantId, (tx) =>
        this.insertOrder(tx, tenantId, userId, idempotencyKey, dto),
      );
    } catch (err) {
      // Idempotencia sob concorrencia (arquitetura secao 3.2 item 7): duas requisicoes
      // com a mesma Idempotency-Key colidem nesta constraint -- a que perder a corrida
      // busca (em transacao NOVA) e devolve o pedido que a outra ja criou, nunca propaga
      // o erro (retry de rede precisa ver o MESMO sucesso, nao um 409). Sem pre-checagem
      // antes do insert: Read Committed teria a mesma corrida (TOCTOU) e so' adicionaria
      // uma query extra no caminho feliz. Nao da' pra distinguir qual unique constraint
      // disparou via err.meta.target -- confirmado na pratica que o driver Postgres
      // devolve meta.target=null aqui. Tratamos qualquer P2002 deste insert como a colisao
      // de idempotencia: id e' UUID gerado no servidor, colisao real em
      // @@unique([tenantId,id]) e' praticamente impossivel.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        const existing = await this.tenantContext.runInTenantContext(tenantId, (tx) =>
          tx.order.findUnique({
            where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
            include: { items: true },
          }),
        );
        if (existing) {
          return toOrderResponse(existing);
        }
      }
      throw err;
    }
  }

  private async insertOrder(tx: TenantTx, tenantId: string, userId: string, idempotencyKey: string, dto: CreateOrderDto) {
    const customer = await tx.user.findUnique({ where: { id: userId } });
    if (!customer) {
      throw new NotFoundException();
    }

    // Tenant nao tem RLS (secao 3.1/6.3 da arquitetura) -- leitura direta via o mesmo tx,
    // sem problema, so' que a policy nao se aplica a essa tabela.
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException();
    }

    // Pre-validacao RLS-scoped de cada produto -- mesmo padrao de ProductsService.create:
    // produto de outro tenant ja e' invisivel sob RLS (null), 404 limpo antes de gastar um
    // insert. A FK composta (fk_order_item_tenant_matches_product) e' o backstop de banco
    // pro mesmo caso (teste obrigatorio: arquitetura secao 3.2 item 5).
    const items: ComputedItem[] = [];
    for (const itemDto of dto.items) {
      const product = await tx.product.findUnique({ where: { id: itemDto.productId } });
      if (!product) {
        throw new NotFoundException('Produto nao encontrado.');
      }

      const quantity = itemDto.quantity ?? 1;

      // Bebida e sobremesa (qualquer type !== 'pizza') usam preco unico direto, sem
      // segundo sabor nem tamanho -- so' pizza tem esses dois.
      if (product.type !== 'pizza') {
        if (itemDto.secondProductId) {
          throw new BadRequestException('Este produto nao aceita segundo sabor.');
        }
        if (product.price == null) {
          throw new BadRequestException(`Produto "${product.name}" nao tem preco cadastrado.`);
        }
        items.push({
          tenantId,
          productId: product.id,
          secondProductId: null,
          type: product.type,
          size: null,
          name: product.name,
          unitPrice: product.price.toNumber(),
          quantity,
        });
        continue;
      }

      // type === 'pizza'
      if (!itemDto.size) {
        throw new BadRequestException('Pizza precisa de "size".');
      }
      const size = itemDto.size as PizzaSizeId;

      if (itemDto.secondProductId) {
        const secondProduct = await tx.product.findUnique({ where: { id: itemDto.secondProductId } });
        if (!secondProduct) {
          throw new NotFoundException('Segundo sabor nao encontrado.');
        }
        if (secondProduct.type !== 'pizza') {
          throw new BadRequestException('Segundo sabor precisa ser uma pizza.');
        }
        // Meio a meio: media dos precos DE CADA SABOR ja' no tamanho pedido -- nao existe
        // mais multiplicador, cada Product de pizza ja' guarda o preco explicito por
        // tamanho (getPizzaSizePrice). round2 continua necessario pois a media de dois
        // precos pode sobrar mais de 2 casas decimais.
        const avgPrice = (getPizzaSizePrice(product, size) + getPizzaSizePrice(secondProduct, size)) / 2;
        items.push({
          tenantId,
          productId: product.id,
          secondProductId: secondProduct.id,
          type: 'pizza',
          size: itemDto.size,
          name: `${product.name} + ${secondProduct.name}`,
          unitPrice: round2(avgPrice),
          quantity,
        });
        continue;
      }

      items.push({
        tenantId,
        productId: product.id,
        secondProductId: null,
        type: 'pizza',
        size: itemDto.size,
        name: product.name,
        unitPrice: getPizzaSizePrice(product, size),
        quantity,
      });
    }

    const deliveryFee = tenant.deliveryFee.toNumber();
    const total = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + deliveryFee);

    const order = await tx.order.create({
      data: {
        tenantId,
        customerId: userId,
        idempotencyKey,
        customerName: customer.name,
        phone: dto.phone,
        address: dto.address,
        addressNumber: dto.addressNumber ?? '',
        complement: dto.complement ?? '',
        neighborhood: dto.neighborhood ?? '',
        paymentMethod: dto.paymentMethod,
        changeFor: dto.changeFor,
        deliveryFee,
        total,
        items: { create: items },
      },
      include: { items: true },
    });
    return toOrderResponse(order);
  }

  async list(tx: TenantTx, user: AuthenticatedUser) {
    // RLS so' isola por tenant -- dentro do tenant, cliente ve so' os proprios pedidos,
    // staff ve todos (precisa pro painel da Sprint 9). Filtro de aplicacao, sem precedente
    // direto (o mais proximo e' o self-service de UsersController, mas la' e' sempre 1 linha).
    const where = user.role === 'customer' ? { customerId: user.id } : {};
    const orders = await tx.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' } });
    return orders.map(toOrderResponse);
  }

  async findOne(tx: TenantTx, user: AuthenticatedUser, id: string) {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    // 404 tanto pra "nao existe" quanto "e' de outro cliente" -- nunca 403, mesmo padrao
    // anti-enumeracao IDOR de UsersController.findOne.
    if (!order || (user.role === 'customer' && order.customerId !== user.id)) {
      throw new NotFoundException();
    }
    return toOrderResponse(order);
  }

  async updateStatus(tx: TenantTx, id: string, nextStatus: string) {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException();
    }
    assertValidTransition(order.status, nextStatus);
    const updated = await tx.order.update({
      where: { id },
      data: { status: nextStatus },
      include: { items: true },
    });
    return toOrderResponse(updated);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
