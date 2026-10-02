# PROTCLINEW — Redesenho do App Cliente (Protótipo + Plano de Implementação)

Documento vivo — registra a proposta de redesenho visual do `apps/cliente`
(cardápio → monte sua pizza → carrinho → checkout → confirmação) e o plano de sprints
pra levar o protótipo pro código real. Nada deste plano foi implementado ainda — é
puramente a proposta aprovada pelo usuário em 2026-10-02, igual ao restante dos
"planos à parte" já registrados em `docs/pizzaria_sprints.md`.

**Legenda de status**: ⏳ aguardando implementação · 🟡 em andamento · ✅ implementada.

---

## 1. Contexto

Usuário avaliou o app `apps/cliente` em produção
(https://pizza-new-prot-cliente.vercel.app/) e considerou o layout "muito abaixo" do
padrão esperado de app/web. Pedido: pensar numa melhoria de layout e produzir um
protótipo visual antes de qualquer mudança de código.

Duas direções visuais foram desenhadas, mantendo o design system real do app
(`apps/cliente/src/styles/theme.css`/`fonts.css`: fundo `#0F0F0F`, dourado `#C9A84C`,
Newsreader serifada + Archivo sans) — nenhuma marca nova, só reorganização do que já
existe:

- **Opção A — "app de delivery"**: hero com foto grande, avatar sobreposto, carrossel
  "Mais Pedidas", categorias em pílulas (padrão iFood/Uber Eats).
- **Opção B — "cardápio editorial"**: sem depender de fotografia, header centralizado
  minimalista, categorias em texto sublinhado, itens no formato de menu impresso
  (nome ··· linha pontilhada ··· preço, descrição em itálico).

**Opção B foi a escolhida pelo usuário** ("ficou melhor").

## 2. Protótipo clicável

Canvas de design (Claude Design), 5 telas navegáveis cobrindo a jornada completa do
cliente, com valores consistentes entre as telas (pedido de exemplo: pizza meio a meio
Marguerita + Calabresa + 1 refrigerante, total R$ 56,00):

**Link**: https://claude.ai/artifact/VP4j8USTYVQWU6BEpmT154

1. **Cardápio** (`Editorial.dc.html`) — header centralizado, busca, categorias em
   texto sublinhado, lista de produtos em formato de menu impresso.
2. **Monte sua Pizza** (`Builder.dc.html`) — 2 sabores já combinados (Marguerita +
   Calabresa), resumo do pedido.
3. **Carrinho** (`Cart.dc.html`) — itens + resumo (subtotal/taxa/total).
4. **Checkout** (`Checkout.dc.html`) — dados pessoais, endereço, forma de pagamento,
   resumo.
5. **Confirmação** (`Confirmation.dc.html`) — pedido recebido, status, próximos
   passos, volta pro cardápio.

A Opção A (`Main.dc.html`) continua no canvas só como referência de comparação, não
faz parte do plano de implementação abaixo.

**Decisão explícita de produto**: fotos saem da lista do Cardápio e do seletor de 2º
sabor (puramente tipográfico, como um cardápio impresso de restaurante) — o campo
`pizza.image` continua existindo no schema, só não é mais renderizado nessas duas
telas. A única tela que continua mostrando foto pequena é "Monte sua Pizza" (ajuda a
comparar os 2 sabores lado a lado).

## 3. Plano de sprints

Nenhuma sprint abaixo toca o backend (`apps/api`) — tudo é `apps/cliente` +
1 variant novo em `packages/ui` (aditivo, não quebra `apps/pizzaria`/`apps/admin-pizzarias`).

### Sprint 1 — Primitivos de design compartilhados ⏳

Fundação — Menu, FlavorSelector e Checkout precisam dos mesmos elementos visuais
novos; sem isso cada tela reimplementaria a mesma coisa.

- `SectionDivider` — linha "──── CLÁSSICAS ────" com texto centralizado.
- `DottedRow` — layout nome · · · · · · preço (leader pontilhado), base de todo item
  de lista nas telas seguintes.
- `CategoryTabs` — nav horizontal sublinhada, substitui o acordeão de categorias
  atual (`openCategoryId` → `selectedCategoryId`).
- Novo variant `minimal` no `Input` de `packages/ui` (label pequeno acima, valor
  serifado, só sublinhado) — **aditivo**, nunca troca o estilo default já usado pelos
  outros 2 apps.

**Verificação**: `tsc --noEmit` em `packages/ui`; confirmar visualmente que o `Input`
padrão (sem o novo variant) continua idêntico em `apps/pizzaria`/`apps/admin-pizzarias`.

### Sprint 2 — Menu.tsx ⏳

- Header: caixa atual → cabeçalho centralizado (avatar, nome, divisor dourado, status
  em small-caps: aberto/fechado, horário, tempo de entrega).
- **Novo** (único item desta sprint que não é so' CSS): campo de busca — filtro
  client-side por nome, substring simples sobre `mockPizzas`/`mockDrinks`/
  `mockSobremesas` já carregados, sem chamada nova à API.
- Troca o acordeão de categorias empilhadas por `CategoryTabs` — só a categoria ativa
  renderiza a lista de produtos.
- Cada item vira `DottedRow` (nome · · preço) + descrição em itálico + seletor de
  tamanho como texto (sem caixinha) — mantém toda a lógica atual intacta: loja fechada
  desabilita tudo, tamanho sem preço fica riscado/bloqueado, ✶ no featured.
- Fotos saem da lista (decisão da seção 2).

**Verificação**: smoke manual (`pnpm dev:cliente`) — busca filtra corretamente, troca
de categoria funciona, loja fechada ainda bloqueia tudo, tamanho sem preço ainda
aparece riscado/bloqueado.

### Sprint 3 — FlavorSelector (dentro de PizzaBuilder.tsx) ⏳

Mesma troca de acordeão → `CategoryTabs` + `DottedRow` da Sprint 2, reaproveitando os
primitivos da Sprint 1 — tela gêmea do Menu, deve saber praticamente de graça depois
da Sprint 2 estar pronta.

### Sprint 4 — PizzaBuilder.tsx ("Monte sua Pizza") ⏳

- Linhas de sabor: mantém a foto pequena (76px, já existe hoje e ajuda a comparar os
  2 sabores — única tela da Opção B que usa imagem), só retrabalha tipografia e os
  badges "1ª Metade"/"2ª Metade".
- Seletor de tamanho: link "Alterar" minimalista em vez da barra de pills — mesma
  lógica de toggle (`showSizePicker`), só CSS.
- Card de "Resumo do Pedido": borda fina + total serifado grande, igual ao protótipo.

### Sprint 5 — Cart.tsx ⏳

- Linhas de item → `DottedRow` + stepper de quantidade, mantendo toda a lógica de
  `onUpdateQuantity`/`onRemoveItem` intacta.
- Card de resumo (subtotal/taxa/total) com a mesma borda fina das outras telas.
- Estado de carrinho vazio: mantém o ícone central, só ajusta tipografia.

### Sprint 6 — Checkout.tsx + AddressForm.tsx ⏳ (a mais sensível)

- Troca os `<Input>` de "Dados Pessoais" e de `AddressForm` pro variant `minimal` da
  Sprint 1 — preserva 100% da validação/mensagens de erro já existentes, só muda a
  casca visual.
- Cards de forma de pagamento: outline dourado quando selecionado, igual ao protótipo.
- Resumo + botão "Confirmar Pedido" no mesmo padrão visual das sprints anteriores.
- **Atenção**: `AddressForm.tsx` também é usado em `Auth.tsx` (cadastro) — testar os
  dois pontos de uso, não só o Checkout, já que o `Input` muda.

**Verificação extra**: rodar o fluxo de cadastro (`Auth.tsx`) manualmente além do
checkout.

### Sprint 7 — OrderConfirmation.tsx ⏳

Restyle direto (ícone de sucesso, card de resumo, "Próximos passos", CTA) — sem
mudança de lógica, o polling de status a cada 10s continua igual.

### Sprint 8 — QA de ponta a ponta ⏳

- `tsc --noEmit` em `apps/cliente` + `packages/ui`.
- Smoke test manual do fluxo real completo contra o homolog: login → cardápio (busca
  + categorias) → meio a meio → carrinho → checkout → confirmação.
- Confirmar que `apps/pizzaria`/`apps/admin-pizzarias` não regrediram (único ponto
  compartilhado é o `Input` variant, aditivo).
- Teste em largura mobile real (390px, mesmo padrão já usado no projeto — Playwright
  quando disponível, ou dev server + redimensionar).

## 4. Fora de escopo deste plano

- **Backend** (`apps/api`) — nenhuma sprint acima precisa de mudança de schema, DTO ou
  endpoint novo.
- **Auth.tsx** (tela de login/cadastro) — não foi redesenhada no protótipo; só é
  tocada de raspão na Sprint 6 por compartilhar `AddressForm`. Um redesenho completo da
  tela de Auth, se quiser, é um plano separado.
- **apps/pizzaria / apps/admin-pizzarias** — fora de escopo; o único ponto de contato é
  o novo variant aditivo do `Input` em `packages/ui`.
