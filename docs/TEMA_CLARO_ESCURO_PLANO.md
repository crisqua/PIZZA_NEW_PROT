# Plano — Tema claro/escuro no app Cliente

**Status: 🟡 aprovado em 2026-10-18, implementação em andamento.** Guardado em
2026-10-13 a pedido do usuário ("guarde esse plano até amanhã"), depois de ele aprovar
o protótipo clicável (Claude Design Artifact, `https://claude.ai/artifact/GY5jzJ1JRuE6VapwPAQaeK`
— "Tema do Cardápio", toggle sol/lua funcionando de verdade sobre uma reconstrução fiel
da tela Cardápio real). Decisão 4 corrigida em 2026-10-18 (toggle global, não só no
Cardápio) — ver nota na própria decisão abaixo.

## Contexto

Hoje `apps/cliente` é **dark-only**: `apps/cliente/src/styles/theme.css` define a
paleta escura direto no `:root`, e existe um bloco `.dark` morto (cinza genérico do
shadcn, nunca usado — nenhum lugar do código adiciona a classe `.dark`). Confirmado por
grep que **nenhum componente usa cor literal** (hex/rgb/oklch) — todo o app lê só das
variáveis CSS (`text-primary`, `bg-background`, `border-border`, etc.), então trocar os
tokens no CSS basta pra repintar o app inteiro, sem tocar tela por tela.

**Achado importante que muda o desenho**: `App.tsx:311` já injeta a cor da marca de
cada pizzaria direto como estilo inline
(`style={{ '--primary': mockTenant.primaryColor, '--accent': mockTenant.primaryColor }}`)
— isso **sobrescreve** qualquer valor definido em `theme.css` pra `--primary`, porque
estilo inline sempre vence CSS de classe. A cor de marca de cada tenant já poderia, em
teoria, ficar com contraste ruim no fundo claro dependendo da cor escolhida pelo dono —
ver decisão 3.

## Decisões a confirmar com o usuário antes de implementar

1. **Tema padrão continua ESCURO** pra quem nunca mexeu no botão — zero mudança visual
   pra qualquer usuário atual ou que volte depois. Só quem clicar no sol/lua vê o claro.
2. **Escolha salva no navegador** (`localStorage`), não no perfil do usuário no
   backend — é preferência de dispositivo, não dado de conta; nenhuma rota de API nova
   necessária.
3. **Cor de marca do tenant (`mockTenant.primaryColor`) fica como está, sem tratamento
   especial por tema** — hoje todo tenant de teste usa o dourado padrão, que funciona
   bem nos dois fundos. Se um dia uma pizzaria real escolher uma cor clara que fique
   ilegível no fundo claro, isso é tratado então (mesmo raciocínio já usado pro
   Peperoni sem preço em 2026-10-13: não resolver um problema que nenhum dado real
   ainda tem).
4. **Atualizado em 2026-10-18 (correção do usuário)**: o botão de alternar tema fica
   **acessível em todas as telas** (Cardápio, Monte sua Pizza, Carrinho, Checkout,
   Confirmação, Login), não só no Cardápio. Implementação: um botão **flutuante único**
   (canto superior direito, `fixed`), renderizado uma vez em `App.tsx` por cima de
   qualquer view ativa — mesmo padrão já usado por `<UpdateBanner />` e pelo toast de
   "item adicionado" (ambos já são siblings de todas as views no retorno de `App.tsx`,
   visíveis em qualquer tela sem precisar de prop por componente). Isso elimina a
   necessidade de tocar em `Menu.tsx`, `Cart.tsx`, `Checkout.tsx`, `PizzaBuilder.tsx` ou
   `Auth.tsx` — só `App.tsx` + o novo `ThemeToggle.tsx`.
5. **Script anti-flash no `index.html`** — sem isso, toda vez que alguém com tema claro
   salvo abrir o app, a tela pisca escura por uma fração de segundo antes do React
   montar e aplicar a classe certa. Resolvido com uma linha de script síncrona antes do
   React carregar.

## Arquivos a alterar/criar

| Arquivo | Tipo | O que muda |
|---|---|---|
| `apps/cliente/src/styles/theme.css` | Alterado | Paleta clara nova vira o `:root` padrão (fundo papel/creme, texto quase-preto — mesmos tons do protótipo). Paleta escura atual (a que já está em produção) migra pra dentro de `.dark` (substituindo o bloco cinza genérico morto que está lá hoje). `--primary-foreground` passa a ter valor próprio por tema, pra manter contraste do botão dourado nos dois fundos. |
| `apps/cliente/index.html` | Alterado | Script pequeno e síncrono antes do React montar: lê o tema salvo no `localStorage` e já aplica a classe `dark` em `<html>` antes da primeira pintura — evita o flash de tema errado. |
| `apps/cliente/src/App.tsx` | Alterado | Novo estado `theme` (`'light' \| 'dark'`, lido do `localStorage` na primeira renderização, fallback `'dark'`); `useEffect` que grava no `localStorage` e aplica/remove a classe `dark` em `document.documentElement` a cada troca; novo handler `toggleTheme`; renderiza `<ThemeToggle theme={theme} onToggle={toggleTheme} />` uma vez, logo após `<UpdateBanner />`, como sibling de todas as views (visível em qualquer tela). |
| `apps/cliente/src/components/ThemeToggle.tsx` | Novo | Botão flutuante (`fixed top-4 right-4`, circular, `w-10 h-10 rounded-full border border-border bg-surface/90 backdrop-blur`) com ícone sol/lua (`lucide-react`) — mesmo padrão já usado neste app pra peças pequenas reutilizáveis (`SectionDivider`, `DottedRow`, `CategoryTabs`). |

**Nenhuma mudança em**: backend (`apps/api`), `packages/ui`, `packages/types`,
`apps/pizzaria`, `apps/admin-pizzarias` — pedido escopado só pro app do Cliente, e o
mecanismo (tokens CSS locais desse app) não vaza pros outros.

## Verificação (quando for implementado)

1. `npx tsc --noEmit` + `npx vite build` em `apps/cliente`.
2. Smoke test manual: `pnpm dev:cliente` → alternar o tema no Cardápio → navegar por
   Carrinho/Checkout/Confirmação conferindo que o tema se mantém em todas; recarregar a
   página com tema claro salvo e confirmar que não pisca escuro antes; testar em
   largura mobile real (390px).
3. Sem teste e2e novo (zero mudança de backend/lógica de negócio) — mesmo padrão já
   usado nos sprints de responsividade mobile e redesenho do Financeiro.
4. Commit + push + acompanhar o Actions run até `success`; registrar a sprint em
   `docs/pizzaria_sprints.md` como "Plano à parte", mesmo padrão dos outros recursos
   fora do roadmap principal.
