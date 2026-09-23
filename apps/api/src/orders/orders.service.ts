import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CepLookupResult, CepLookupService } from '../common/cep-lookup.service';
import { toOrderResponse } from '../common/order-response.util';
import { getPizzaSizePrice } from '../common/product-price.util';
import { businessDayKeySaoPaulo, businessDayRangeSaoPaulo } from '../common/sao-paulo-date.util';
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
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly cepLookup: CepLookupService,
  ) {}

  // Abre a PROPRIA transacao (nao usa o "tx" do TenantContextInterceptor, diferente de
  // list/findOne/updateStatus abaixo) porque precisa poder tentar DUAS transacoes: o
  // Postgres aborta a transacao INTEIRA apos qualquer erro (inclusive violacao de unique),
  // entao apos um P2002 nao da' pra reusar o mesmo tx pra buscar o pedido que a outra
  // requisicao concorrente ja criou (confirmado na pratica via smoke test manual: a
  // tentativa de reusar o tx dava 25P02 "current transaction is aborted"). Mesma
  // justificativa geral de ModuleGuard abrir a propria transacao, motivo diferente aqui.
  async create(tenantId: string, userId: string, idempotencyKey: string, dto: CreateOrderDto) {
    // CEP resolvido ANTES de abrir a transacao (Sprint 12) -- CepLookupService faz uma
    // chamada de rede de verdade (ate 3s), nunca deve rodar com uma transacao Prisma
    // aberta (interativa): segurar a transacao por uma chamada HTTP externa lenta
    // esgota o timeout padrao dela e derruba o pedido com "Transaction not found"
    // (confirmado na pratica via smoke test manual -- bug real, ja corrigido aqui).
    const cepResult = await this.cepLookup.resolve(dto.cep);
    try {
      return await this.tenantContext.runInTenantContext(tenantId, (tx) =>
        this.insertOrder(tx, tenantId, userId, idempotencyKey, dto, cepResult),
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

  private async insertOrder(
    tx: TenantTx,
    tenantId: string,
    userId: string,
    idempotencyKey: string,
    dto: CreateOrderDto,
    cepResult: CepLookupResult | null,
  ) {
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

    // CEP (Sprint 12): ja' resolvido em create() ANTES desta transacao abrir (ver
    // comentario la'). Se o ViaCEP resolveu, vira a fonte da verdade pra
    // address/neighborhood/city/state (ignora o que o cliente mandou nesses 4 campos
    // especificamente); indisponibilidade externa e' fail-open (confia no que o
    // cliente ja tinha resolvido no proprio frontend).
    const address = cepResult?.address || dto.address;
    const neighborhood = cepResult?.neighborhood || dto.neighborhood || '';
    const city = cepResult?.city ?? dto.city ?? '';
    const state = cepResult?.state ?? dto.state ?? '';

    const deliveryFee = tenant.deliveryFee.toNumber();
    const total = round2(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + deliveryFee);

    // Codigo sequencial por tenant+dia de OPERACAO ("AAAAMMDDNNNN", corte as 5h da manha
    // -- ver sao-paulo-date.util.ts: pedido as 00h20 conta pro dia anterior, mesma noite
    // de expediente). INSERT...ON CONFLICT DO UPDATE...RETURNING numa linha so' e'
    // atomico por si (Postgres serializa a concorrencia na propria constraint), dentro
    // da MESMA transacao do pedido: nao precisa de lock manual nem de uma segunda
    // transacao pra evitar corrida entre dois pedidos simultaneos do mesmo tenant no
    // mesmo dia de operacao.
    const dateKey = businessDayKeySaoPaulo(new Date());
    const [{ last_seq: lastSeq }] = await tx.$queryRaw<{ last_seq: number }[]>`
      INSERT INTO order_daily_sequences (tenant_id, date_key, last_seq)
      VALUES (${tenantId}::uuid, ${dateKey}, 1)
      ON CONFLICT (tenant_id, date_key)
      DO UPDATE SET last_seq = order_daily_sequences.last_seq + 1
      RETURNING last_seq
    `;
    const orderCode = `${dateKey}${String(lastSeq).padStart(4, '0')}`;

    const order = await tx.order.create({
      data: {
        tenantId,
        customerId: userId,
        idempotencyKey,
        orderCode,
        customerName: customer.name,
        phone: dto.phone,
        address,
        addressNumber: dto.addressNumber ?? '',
        complement: dto.complement ?? '',
        neighborhood,
        // Guardado exatamente como o cliente mandou (formatado "00000-000" pelo
        // formatCep do frontend) -- mesmo padrao ja usado por "phone" (dto.phone acima),
        // o backend nao reformata, so' valida.
        cep: dto.cep,
        city,
        state,
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

  async list(tx: TenantTx, user: AuthenticatedUser, filter: { date?: string; from?: string; to?: string } = {}) {
    // RLS so' isola por tenant -- dentro do tenant, cliente ve so' os proprios pedidos,
    // staff ve todos (precisa pro painel da Sprint 9). Filtro de aplicacao, sem precedente
    // direto (o mais proximo e' o self-service de UsersController, mas la' e' sempre 1 linha).
    //
    // Tres modos, nessa ordem de prioridade (ver ListOrdersQueryDto):
    // 1) "from"/"to" (instante exato) -- usado por Dashboard.tsx pro "dia de operacao"
    //    (corte as 5h, calculado la' mesmo em from/to explicito).
    // 2) "date" (dia de OPERACAO em Sao Paulo, corte as 5h -- mesmo conceito e mesma
    //    funcao usada por businessDayKeySaoPaulo no orderCode, de proposito: um pedido
    //    com orderCode "22..." PRECISA aparecer filtrando por "22" aqui, os dois tem que
    //    concordar entre si) -- usado por OrdersPanel.tsx, que faz polling a cada 10s e
    //    ANTES desta correcao baixava o historico inteiro do tenant em toda chamada
    //    (custo so' cresce com o tempo de uso, nunca estabiliza).
    // 3) nenhum dos dois -- sem filtro de periodo, comportamento legado ainda usado por
    //    Financial.tsx ate ser migrado (registrado como pendente no plano de desempenho).
    const createdAtRange = filter.from && filter.to
      ? { gte: new Date(filter.from), lt: new Date(filter.to) }
      : filter.date
        ? (() => {
            const { start, end } = businessDayRangeSaoPaulo(filter.date!);
            return { gte: start, lt: end };
          })()
        : null;
    const where: Prisma.OrderWhereInput = {
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
      ...(user.role === 'customer' ? { customerId: user.id } : {}),
    };
    const orders = await tx.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' } });
    return orders.map(toOrderResponse);
  }

  // "Produtos Mais Vendidos (Mensal)" (Sprint 24, item 2b) -- ultimos 30 dias corridos
  // (nao mes-calendario, decisao do usuario: evita ficar com pouco dado logo apos o dia
  // 1). Soma no BANCO (groupBy), nao traz todo item de pedido pro cliente somar -- antes
  // disso, Dashboard.tsx baixava o historico de pedidos inteiro so' pra esse calculo.
  async topProducts(tx: TenantTx, limit: number) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const grouped = await tx.orderItem.groupBy({
      by: ['name'],
      where: { order: { status: 'completed', createdAt: { gte: since } } },
      _sum: { quantity: true },
    });

    // Prisma groupBy nao soma "quantity * unitPrice" direto -- unitPrice pode variar
    // entre itens do mesmo produto (promocao, tamanho), entao a receita precisa ser
    // somada linha a linha sobre os itens do periodo (poucos grupos/itens num mes, nao
    // o historico inteiro).
    const items = await tx.orderItem.findMany({
      where: { order: { status: 'completed', createdAt: { gte: since } } },
      select: { name: true, unitPrice: true, quantity: true },
    });
    const revenueByName = new Map<string, number>();
    for (const item of items) {
      revenueByName.set(item.name, (revenueByName.get(item.name) ?? 0) + item.unitPrice.toNumber() * item.quantity);
    }

    return grouped
      .map((g) => ({
        name: g.name,
        sales: g._sum.quantity ?? 0,
        revenue: Math.round((revenueByName.get(g.name) ?? 0) * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
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
