# Design e Jornada do Cliente — Aprovado em 27/08/2026
### Sistema visual e fluxo de pedido do App do Cliente, validados antes da implementação real

---

## 0. Status

**Aprovado pelo usuário em 27/08/2026.** Este documento registra o que foi decidido durante a exploração visual (protótipo em canvas de design, não código) para que a implementação real (Sprint 0 do `MVP_SPRINTS.md`) siga exatamente isso, sem redecidir nada.

Referência visual viva: [Jornada do Cliente — Pizza Express](https://claude.ai/code/artifact/bab19a07-7208-494e-b980-83bbc14233ce) (canvas com as 5 telas mockadas).

**O motivo de existir este documento**: o protótipo atual (`PIZZA_NEW_PROT`) tem um problema de design identificado nesta sessão — visual "de brinquedo" (gradientes decorativos em quase todo elemento, emoji como logo, uma cor de identidade por módulo usada decorativamente, sombras coloridas brilhantes, hover-scale em tudo). Esse padrão está confirmado em `Cart.tsx`, `Menu.tsx`, `PizzaBuilder.tsx` e `Sidebar.tsx` (painel da pizzaria) — não é só a tela descartável `HomePage.tsx`. O sistema abaixo substitui isso.

---

## 1. Sistema visual aprovado

Baseado na linguagem já validada em produção local no projeto irmão **Barberaria** (`C:\Users\crist\BARBEARIA\admin-barbearia.md`), adaptada para pizzaria.

### 1.1 Cores (tokens)

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0F0F0F` | Fundo principal de todas as telas |
| `surface` | `#181818` | Barras fixas (ex.: barra do carrinho no rodapé) |
| `card` | `#1F1F1F` | Cards, inputs, caixas de tamanho |
| `border` | `#2A2A2A` | Toda borda de card/input/divisor |
| `text` | `#F5F0E8` | Texto principal (branco quente, nunca `#FFFFFF` puro) |
| `muted` | `#777777` | Labels, descrições, texto secundário |
| `muted-2` | `#555555` / `#666666` | Eyebrows/labels ainda mais discretos (uppercase pequeno) |
| `accent` (padrão) | `#C9A84C` (dourado) | **Único** acento de cor — preço, botão primário, estado selecionado, badges |
| `success` | `#34D399` | Só estado real "aberto"/"confirmado" — nunca decorativo |
| `warning` | `#F5A623` | Só estado real "pendente"/tempo estimado |
| `destructive` (ação) | `#B5544A` | Só ações destrutivas (remover item/sabor) |

**Regra de ouro (o motivo de toda essa mudança existir):** cor é reservada para **estado e hierarquia**, nunca para decoração. Um ícone de menu não ganha cor "de identidade" — só o preço, o botão de ação principal e o item selecionado usam `accent`.

**`accent` é por tenant, não fixo.** Cada pizzaria define sua própria cor (campo `primary_color` do tenant — ver `PLANO_SEPARACAO_FRONTENDS.md` seção 0.2) e logo (`logo_url`); `#C9A84C` é só o valor padrão de demonstração. Implementação: variável CSS sobrescrita em runtime a partir dos dados do tenant autenticado, não um valor hardcoded por app.

### 1.2 Tipografia

- **Newsreader** (serif, Google Fonts) — nomes de pizza, títulos de tela, valores de preço em destaque (ex.: total do pedido). Dá o toque "artesanal/pizzaria" que o protótipo antigo tentava (sem sucesso) com `font-extrabold` em sans-serif.
- **Archivo** (sans, Google Fonts) — todo o resto: UI, labels, botões, corpo de texto.
- Nunca usar Inter/Roboto/Arial (fontes genéricas demais, é o que fazia o protótipo antigo parecer template).

### 1.3 Componentes

- **Badge** (tags como "Especial", número do pedido): fundo `accent + 22` (13% opacidade), borda `accent + 44` (27%), texto `accent`, `border-radius: 4px`, uppercase, `font-size: 11px`. Reaproveitado do componente `Badge` do Barberaria.
- **Botão primário**: fundo sólido `accent`, texto `bg` (escuro sobre dourado) — nunca outline como ação principal.
- **Botão secundário/ação alternativa** (ex.: "Meio a meio"): outline `accent` a 33% de opacidade na borda, fundo transparente, texto `accent`.
- **Cards**: fundo `card`, borda 1px `border`, `border-radius: 10px`. Nunca gradiente, nunca sombra colorida (`shadow-primary/30` etc. — banido).
- **Sem emoji como elemento de UI** (logo, ícones) — usar iniciais/monograma ou SVG desenhado. Emoji só em texto livre, se o tenant quiser.
- **Sem hover-scale, sem gradiente decorativo em fundo/blob de ícone.** Motion, se houver, é discreto (transição de cor/opacidade, não escala).

### 1.4 Fotos de produto

- **Miniatura pequena (76×76px), não banner grande.** Decisão explícita do usuário: fotos grandes demais passam impressão de "propaganda enganosa" quando a foto real do produto (tirada pela pizzaria) não é tão boa quanto uma foto de banco de imagens. Miniatura ao lado do texto, não hero image no topo do card.

---

## 2. Jornada do Cliente — fluxo aprovado

### 2.1 O que mudou em relação ao protótipo original

| Antes (protótipo original) | Depois (aprovado) |
|---|---|
| Tamanho (P/M/G/GG) só era escolhido dentro da tela "Monte sua Pizza" | Tamanho vira **combo com preço já calculado**, escolhido direto no card do Cardápio |
| Nomes de tamanho abstratos (Pequena/Média/Grande/Gigante) | Nomes concretos ligados à contagem real de fatias: **Brotinho, 8 pedaços, 12 pedaços** (média foi descartada como opção — só 3 tamanhos, não 4) |
| Todo pedido passava pela tela "Monte sua Pizza", mesmo pedido de 1 sabor só | Tela "Monte sua Pizza" só existe para quem quer **meio a meio** — pedido de 1 sabor vai direto pro carrinho |
| 1 botão "Montar" por pizza | 2 ações por pizza: **"Adicionar"** (sabor único → carrinho direto) e **"Meio a meio"** (→ tela de combinação de sabores) |

### 2.2 Telas (5 mockadas, 1 pendente)

1. **Cardápio** — header com marca do tenant, abas de categoria, cards de produto (foto pequena + nome + descrição + combo de tamanho com preço + botões Adicionar/Meio a meio), barra de carrinho fixa no rodapé.
2. **Monte sua Pizza** — agora só entra quem apertou "Meio a meio". Tamanho já vem resolvido do Cardápio (barra de confirmação "Tamanho: 8 pedaços · Alterar", não é mais uma etapa numerada). Foco 100% na escolha dos 2 sabores.
3. **Carrinho** — itens com stepper de quantidade, resumo (subtotal/taxa/total), avançar para checkout.
4. **Checkout** — dados pessoais, endereço, forma de pagamento (grid 2×2), resumo, enviar via WhatsApp.
5. **Confirmação** — ícone de sucesso (verde, semântico), número do pedido, tempo estimado, próximos passos, novo pedido.

**Pendente de mockar (não bloqueia a aprovação, é um refinamento futuro):** tela intermediária "Escolha o 2º sabor" entre o card do Cardápio e a tela de resumo do meio a meio — já existe como componente no código real (`FlavorSelector`, dentro de `PizzaBuilder.tsx`), só falta desenhar na nova linguagem visual.

### 2.3 Cálculo de preço por tamanho (referência)

Multiplicadores mantidos de `pizzaSizes` em `mockData.ts` (Brotinho = pequena, 8 pedaços = grande, 12 pedaços = gigante — "média" não vira mais opção de UI, mas o multiplicador 1.0 continua sendo o preço-base cadastrado do produto):

| Tamanho na UI | Multiplicador | Fatias |
|---|---|---|
| Brotinho | 0.75 | 4 |
| 8 pedaços | 1.35 | 8 |
| 12 pedaços | 1.8 | 12 |

---

## 3. O que isso muda nos documentos já existentes

- **`PLANO_SEPARACAO_FRONTENDS.md`**: quando a Fase D (criar os 3 apps separados) rodar, `apps/cliente` já nasce com este sistema visual, não com o CSS atual de `default_shadcn_theme.css`/gradientes. `packages/ui` deve ser extraído já limpo dessa forma — não faz sentido migrar os componentes antigos (com gradiente/emoji) para o pacote compartilhado e depois limpar; limpa antes ou durante a extração.
- **`MVP_SPRINTS.md`**: o Sprint 0 (separação dos frontends) passa a incluir a reescrita visual dos componentes do App do Cliente conforme este documento, não só a reorganização de pastas.

---

## 4. Próximos passos (retomar depois)

1. ~~Desenhar a tela "Escolha o 2º sabor"~~ — ✅ feito em 2026-08-28, restilizada dentro de `PizzaBuilder.tsx` (`FlavorSelector`).
2. ~~Aplicar este sistema visual e esta jornada no código real~~ — ✅ feito em 2026-08-28: `Menu.tsx`, `PizzaBuilder.tsx`, `Cart.tsx`, `Checkout.tsx`, `OrderConfirmation.tsx`, hoje vivendo em `apps/cliente/src/components/`.
3. **Pendente**: estender o mesmo sistema visual (não necessariamente a mesma jornada, que é específica do cliente) para o Painel da Pizzaria (`apps/pizzaria`) e o Admin-Pizzarias (`apps/admin-pizzarias`) — os tokens de cor já chegaram lá de graça (tema compartilhado), mas os componentes ainda têm gradiente/sombra do visual antigo na própria JSX.
4. ~~Sprint 0 completo~~ — ✅ feito em 2026-08-28 (ver `MVP_SPRINTS.md` e `PLANO_SEPARACAO_FRONTENDS.md`), incluindo os módulos de Estoque/Financeiro/Planos que foram prototipados depois deste documento ter sido escrito.
