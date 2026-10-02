import { useState } from 'react';
import { Plus, Lock, User, Search, ShoppingCart } from 'lucide-react';
import { mockPizzas, mockDrinks, mockSobremesas, mockTenant, mockCategories, pizzaSizes } from '../data/repository';
import { Pizza, Drink, PizzaSizeId, priceForSize } from '@pizza/types';
import { Button, Badge, formatCurrency } from '@pizza/ui';
import { SectionDivider } from './SectionDivider';
import { DottedRow } from './DottedRow';
import { CategoryTabs } from './CategoryTabs';

interface MenuProps {
  onAddSingleFlavor: (pizza: Pizza, size: PizzaSizeId) => void;
  onStartHalfHalf: (pizza: Pizza, size: PizzaSizeId) => void;
  onAddDrink: (drink: Drink) => void;
  onAddSobremesa: (sobremesa: Drink) => void;
  cartItemsCount: number;
  onViewCart: () => void;
  isLoggedIn: boolean;
  onAccountClick: () => void;
}

const BEBIDAS_ID = 'bebidas';
const SOBREMESAS_ID = 'sobremesas';

// Tamanho padrao de cada card antes do cliente escolher (8 pedacos, o mais comum) --
// cada pizza tem seu proprio seletor de tamanho no card (pedido do usuario), guardado por
// id em `selectedSizes`. Adicionar rapido e meio a meio sempre usam o tamanho selecionado
// naquele card especifico, nunca um diferente do anunciado (sem susto no carrinho).
const DEFAULT_SIZE_ID: PizzaSizeId = 'oito-pedacos';

// Bug real reportado pelo usuario: o dono pode deixar um tamanho sem preco de proposito
// (ex.: essa pizza nao sai em brotinho) -- antes disso o cliente conseguia selecionar e
// ate adicionar ao carrinho um tamanho sem preco, so' descobrindo que nao dava certo la'
// no checkout, com um erro confuso vindo do backend. Primeiro tamanho com preco
// cadastrado, na ordem de pizzaSizes -- null so' no caso extremo de nenhum tamanho ter
// preco (produto mal cadastrado). Modulo-scope (nao depende de estado do componente,
// reusada pelo PizzaRow abaixo tambem).
function firstAvailableSize(pizza: Pizza): PizzaSizeId | null {
  return pizzaSizes.find((s) => priceForSize(pizza, s.id) != null)?.id ?? null;
}

export function Menu({ onAddSingleFlavor, onStartHalfHalf, onAddDrink, onAddSobremesa, cartItemsCount, onViewCart, isLoggedIn, onAccountClick }: MenuProps) {
  // So' entram categorias de pizza que realmente tem pizza (mesmo filtro de sempre),
  // mais Bebidas/Sobremesas sinteticas no fim -- igual a` lista que o acordeao antigo
  // ja respeitava, so' que agora vira uma lista so' pro CategoryTabs (PROTCLINEW,
  // Sprint 2) em vez de 3 blocos separados.
  const pizzaCategories = mockCategories.filter((category) => mockPizzas.some((p) => p.category === category.id));
  const allCategories = [...pizzaCategories, { id: BEBIDAS_ID, name: 'Bebidas' }, { id: SOBREMESAS_ID, name: 'Sobremesas' }];

  const [selectedSizes, setSelectedSizes] = useState<Record<string, PizzaSizeId>>({});

  // So' usa o tamanho selecionado se ele realmente tiver preco pra essa pizza -- senao
  // cai pro padrao (8 pedacos, DEFAULT_SIZE_ID -- pedido do usuario, todo card deve abrir
  // com o mesmo tamanho selecionado, nao "o primeiro que o dono cadastrou"), e so' foge do
  // padrao se ELE MESMO nao tiver preco (nunca trava numa selecao antiga que deixou de
  // valer, por exemplo se o dono removeu o preco de um tamanho ja selecionado antes).
  const sizeFor = (pizza: Pizza): PizzaSizeId => {
    const selected = selectedSizes[pizza.id];
    if (selected && priceForSize(pizza, selected) != null) return selected;
    if (priceForSize(pizza, DEFAULT_SIZE_ID) != null) return DEFAULT_SIZE_ID;
    return firstAvailableSize(pizza) ?? DEFAULT_SIZE_ID;
  };

  // Abas de categoria (PROTCLINEW, Sprint 2) -- substitui o acordeao antigo
  // (`openCategoryId`/`toggleCategory`): so' existe UMA categoria ativa por vez.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(allCategories[0]?.id ?? BEBIDAS_ID);

  // Loja fechada: continua impossivel trocar de categoria (mesma regra de hoje, so'
  // migrada do antigo `toggleCategory` pra cá).
  const selectCategory = (id: string) => {
    if (!mockTenant.isOpen) return;
    setSelectedCategoryId(id);
  };

  // Busca (PROTCLINEW, Sprint 2) -- unico item desta sprint que nao e' so' CSS. Filtro
  // client-side simples sobre o catalogo ja carregado, sem chamada nova a` API. Com
  // busca ativa, ignora a aba selecionada e mostra um resultado so', cruzando as 3
  // listas.
  const [searchQuery, setSearchQuery] = useState('');
  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;
  const searchResults = isSearching
    ? {
        pizzas: mockPizzas.filter((p) => p.name.toLowerCase().includes(query)),
        drinks: mockDrinks.filter((d) => d.name.toLowerCase().includes(query)),
        sobremesas: mockSobremesas.filter((d) => d.name.toLowerCase().includes(query)),
      }
    : null;
  const hasSearchResults = searchResults && (searchResults.pizzas.length + searchResults.drinks.length + searchResults.sobremesas.length) > 0;

  const activeCategory = allCategories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="bg-surface border-b border-border">
        <div className="px-6 pt-6 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
              mockTenant.isOpen
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mockTenant.isOpen ? 'bg-success' : 'bg-destructive'}`} />
            {mockTenant.isOpen ? 'Aberto' : 'Fechado'}
          </span>
          <button
            onClick={onAccountClick}
            title={isLoggedIn ? 'Sair' : 'Entrar'}
            aria-label={isLoggedIn ? 'Sair da conta' : 'Entrar na conta'}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {isLoggedIn ? <User className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        </div>

        <div className="px-6 pt-5 pb-7 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-serif font-semibold text-xl shrink-0">
            {mockTenant.logo}
          </div>
          <h1 className="font-serif text-2xl font-semibold text-foreground mt-3.5">{mockTenant.name}</h1>
          <div className="w-9 h-px bg-primary my-3" />
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-center flex-wrap gap-x-1.5">
            {mockTenant.openingTime && mockTenant.closingTime && (
              <span>Funciona das {mockTenant.openingTime} às {mockTenant.closingTime}</span>
            )}
            {mockTenant.openingTime && mockTenant.closingTime && mockTenant.isOpen && <span>·</span>}
            {mockTenant.isOpen && <span>Entrega em até {mockTenant.estimatedDeliveryMinutes ?? 60} min</span>}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge>Pedido mínimo {formatCurrency(mockTenant.minOrder)}</Badge>
            <Badge>Taxa {formatCurrency(mockTenant.deliveryFee)}</Badge>
          </div>
        </div>

        {!mockTenant.isOpen && (
          <div className="mx-6 mb-6 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium text-center">
            Esta pizzaria está fechada no momento. Volte mais tarde para fazer seu pedido.
          </div>
        )}
      </div>

      <div className="px-6 pt-6 max-w-md mx-auto">
        <div className="flex items-center gap-2.5 border-b border-border pb-2.5">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no cardápio"
            className="flex-1 bg-transparent font-serif italic text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="px-6 max-w-md mx-auto">
        {isSearching ? (
          <div className="pt-7">
            <SectionDivider label="Resultados da busca" />
            <div className="mt-5">
              {searchResults!.pizzas.map((pizza) => (
                <PizzaRow
                  key={pizza.id}
                  pizza={pizza}
                  selectedSize={sizeFor(pizza)}
                  onSelectSize={(sizeId) => setSelectedSizes((prev) => ({ ...prev, [pizza.id]: sizeId }))}
                  onHalfHalf={() => onStartHalfHalf(pizza, sizeFor(pizza))}
                  onAdd={() => onAddSingleFlavor(pizza, sizeFor(pizza))}
                  storeOpen={mockTenant.isOpen ?? false}
                />
              ))}
              {searchResults!.drinks.map((drink) => (
                <SimpleItemRow key={drink.id} name={drink.name} meta={drink.size} price={drink.price} onAdd={() => onAddDrink(drink)} />
              ))}
              {searchResults!.sobremesas.map((item) => (
                <SimpleItemRow key={item.id} name={item.name} meta={item.size} price={item.price} onAdd={() => onAddSobremesa(item)} />
              ))}
              {!hasSearchResults && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum item encontrado para "{searchQuery.trim()}".
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-6">
            <CategoryTabs categories={allCategories} activeId={selectedCategoryId} onSelect={selectCategory} />
            {activeCategory && (
              <div className="pt-7">
                <SectionDivider label={activeCategory.name.toUpperCase()} />
                <div className="mt-5">
                  {selectedCategoryId === BEBIDAS_ID &&
                    mockDrinks.map((drink) => (
                      <SimpleItemRow key={drink.id} name={drink.name} meta={drink.size} price={drink.price} onAdd={() => onAddDrink(drink)} />
                    ))}
                  {selectedCategoryId === SOBREMESAS_ID &&
                    mockSobremesas.map((item) => (
                      <SimpleItemRow key={item.id} name={item.name} meta={item.size} price={item.price} onAdd={() => onAddSobremesa(item)} />
                    ))}
                  {selectedCategoryId !== BEBIDAS_ID &&
                    selectedCategoryId !== SOBREMESAS_ID &&
                    mockPizzas
                      .filter((p) => p.category === selectedCategoryId)
                      .map((pizza) => (
                        <PizzaRow
                          key={pizza.id}
                          pizza={pizza}
                          selectedSize={sizeFor(pizza)}
                          onSelectSize={(sizeId) => setSelectedSizes((prev) => ({ ...prev, [pizza.id]: sizeId }))}
                          onHalfHalf={() => onStartHalfHalf(pizza, sizeFor(pizza))}
                          onAdd={() => onAddSingleFlavor(pizza, sizeFor(pizza))}
                          storeOpen={mockTenant.isOpen ?? false}
                        />
                      ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border z-50">
          <Button
            fullWidth
            size="lg"
            onClick={onViewCart}
            className="relative h-14 rounded-lg text-base font-semibold uppercase tracking-wide flex items-center justify-center gap-3"
          >
            <div className="absolute left-6 w-7 h-7 bg-primary-foreground/20 rounded-full flex items-center justify-center text-sm normal-case">
              {cartItemsCount}
            </div>
            Ver Carrinho
            <ShoppingCart className="w-5 h-5 absolute right-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface PizzaRowProps {
  pizza: Pizza;
  selectedSize: PizzaSizeId;
  onSelectSize: (sizeId: PizzaSizeId) => void;
  onHalfHalf: () => void;
  onAdd: () => void;
  storeOpen: boolean;
}

// Item de pizza no formato "cardapio impresso" (PROTCLINEW, Sprint 2) -- nome+preco via
// DottedRow, descricao em italico, tamanhos como texto clicavel (mesmos handlers de
// sempre, so' sem a caixa/pill), meio a meio como link de texto, adicionar como botao
// circular contornado. Sem foto (decisao registrada em docs/PROTCLINEW.md).
function PizzaRow({ pizza, selectedSize, onSelectSize, onHalfHalf, onAdd, storeOpen }: PizzaRowProps) {
  const actionsDisabled = firstAvailableSize(pizza) == null || !storeOpen;

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <DottedRow name={pizza.name} price={formatCurrency(priceForSize(pizza, selectedSize) ?? 0)} featured={pizza.featured} />
      <p className="font-serif italic text-sm text-muted-foreground mt-1.5 leading-relaxed">{pizza.description}</p>
      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <p className="text-[11.5px] tracking-wide">
          {pizzaSizes.map((size, index) => {
            const isSelected = selectedSize === size.id;
            const isAvailable = priceForSize(pizza, size.id) != null;
            return (
              <span key={size.id}>
                {index > 0 && <span className="mx-1.5 text-muted-foreground/60">·</span>}
                <button
                  type="button"
                  disabled={!isAvailable}
                  title={isAvailable ? undefined : 'Tamanho não disponível para esta pizza'}
                  onClick={() => isAvailable && onSelectSize(size.id)}
                  className={
                    !isAvailable
                      ? 'text-muted-foreground/40 line-through cursor-not-allowed'
                      : isSelected
                        ? 'text-primary font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                  }
                >
                  {size.name}
                </button>
              </span>
            );
          })}
        </p>
        <div className="flex items-center gap-3.5 shrink-0">
          <button
            type="button"
            onClick={onHalfHalf}
            disabled={actionsDisabled}
            title={!storeOpen ? 'Pizzaria fechada no momento' : 'Meio a meio'}
            aria-label={`Meio a meio com ${pizza.name}`}
            className="text-[11px] font-semibold tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
          >
            meio a meio
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={actionsDisabled}
            title={!storeOpen ? 'Pizzaria fechada no momento' : 'Adicionar'}
            aria-label={`Adicionar ${pizza.name}`}
            className="w-7 h-7 rounded-full border border-primary text-primary flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface SimpleItemRowProps {
  name: string;
  meta: string;
  price: number;
  onAdd: () => void;
}

// Item de bebida/sobremesa -- versao mais simples do PizzaRow (sem tamanho, sem meio a
// meio). Botao de adicionar nunca foi desabilitado por loja fechada pra esses dois
// tipos (comportamento ja existente antes desta sprint, preservado sem mudanca).
function SimpleItemRow({ name, meta, price, onAdd }: SimpleItemRowProps) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <DottedRow name={name} price={formatCurrency(price)} />
        <p className="text-xs text-muted-foreground mt-1">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        title="Adicionar"
        aria-label={`Adicionar ${name}`}
        className="w-6 h-6 rounded-full border border-primary text-primary flex items-center justify-center shrink-0"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
