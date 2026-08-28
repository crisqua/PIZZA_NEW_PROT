# Plano de Separação dos Frontends — Cliente, Pizzaria e Admin-Pizzarias
### Como sair da SPA única do protótipo para os 3 apps que a arquitetura exige

---

**✅ Executado em 2026-08-28 (Sprint 0 do `MVP_SPRINTS.md`).** Este documento registra o
plano *como foi escrito antes da execução* — mantido como referência histórica de
decisão, não como descrição do estado atual do código. Divergências reais encontradas
durante a execução (uma delas séria — ver nota na seção 1) estão registradas em
`MVP_SPRINTS.md`, seção "Sprint 0". Para instruções de como rodar os 3 apps hoje, use o
`README.md` na raiz do repo, não os comandos deste documento.

---

## 0. Por que este documento existe

O `ARQUITETURA_SISTEMA_PIZZA_SAAS.md` (seções 1, 2 e 5) já define que o sistema **não é um app único**: são 3 aplicações client-side servidas por domínios/subdomínios diferentes. Nomes e domínios confirmados com o usuário em 27/08/2026, seguindo o mesmo padrão do projeto irmão **Barberaria** (`C:\Users\crist\BARBEARIA`, ver seção 0.1):

| App | Domínio alvo | Público | Escopo de tenant |
|---|---|---|---|
| **Cliente** | `{slug}.suapizza.com.br` | Cliente final | Por tenant |
| **Pizzaria** | `painel.{slug}.suapizza.com.br` | Dono/funcionário da pizzaria | Por tenant |
| **Admin-Pizzarias** | `admin.suapizza.com.br` | Plataforma (DesenvolvaINC) | Todos os tenants |

Hoje o código (`PIZZA_NEW_PROT`) é **1 único build Vite**, com React Router escolhendo entre `/client`, `/restaurant` e `/admin` dentro do mesmo domínio (`src/app/App.tsx`). A tela "central" com os 3 cards que você viu rodando em `localhost:5173` (`HomePage.tsx`) é esse seletor de rotas — um artefato do protótipo Figma Make.

**Decisão confirmada:** a `HomePage.tsx` é **descartada**, não vira landing page separada. Motivo: o projeto Barberaria — arquitetura irmã já validada em produção local — não tem nenhuma tela seletora entre os 3 apps; cada um é publicado isoladamente no seu próprio (sub)domínio. Uma central de navegação só faz sentido enquanto os 3 módulos moram artificialmente no mesmo domínio de protótipo.

Este plano cobre a separação em si. É trabalho **100% frontend**, sem dependência do backend real — pode começar imediatamente, em paralelo com a Fase 0 do `PLANO_DE_PROJETO_PIZZA_SAAS.md`. No `MVP_SPRINTS.md` isso é o **Sprint 0**.

### 0.1 O que o Barberaria confirma sobre esta separação

O Barberaria é o mesmo modelo de negócio (Incubadora → Tenant → Cliente final) num domínio diferente (barbearias em vez de pizzarias), já com 7+ sprints de backend real construídas e testadas. Ele roda exatamente como 3 apps independentes num monorepo (`apps/api`, `apps/cliente-app`, `apps/painel-barbearia`, `apps/admin-desenvolvain`), cada um com seu próprio `package.json`, subindo em porta própria em dev. Isso confirma que a separação em 3 projetos não é um exagero arquitetural — é o que já funciona na prática para este exato modelo de negócio.

**Uma divergência deliberada em relação ao Barberaria:** lá, os 3 frontends **não compartilham um pacote de UI** — cada `App.jsx` é um arquivo único com estilo inline e um objeto de tokens de cor (`T`) duplicado manualmente em cada app. Isso funciona no Barberaria porque os protótipos originais eram simples (JS puro, sem Tailwind, sem biblioteca de componentes). **Não vamos repetir essa escolha aqui** — o protótipo do Pizza já tem um design system real (56 componentes shadcn/Radix + Tailwind + TypeScript em `components/ui/`), e duplicar isso em 3 apps seria caro de manter. Por isso este plano mantém `packages/ui` compartilhado (seção 2). Ver seção 0.2 para o mecanismo de tema por tenant, que resolve o mesmo problema que o Barberaria resolve com o objeto `T`.

### 0.2 Tema por tenant (cor/logo) — como o Barberaria resolve, adaptado

No painel master do Barberaria, as cores do tenant (`primary_color`, `secondary_color`, `logo_url`) vêm do banco e são aplicadas em runtime via uma função `applyTheme()` que muta os tokens de cor do app. Vamos adotar o mesmo princípio aqui, mas via CSS custom properties (compatível com Tailwind, que o Pizza já usa e o Barberaria não usava): os apps `cliente` e `pizzaria` leem `primary_color`/`secondary_color`/`logo_url` do tenant autenticado e sobrescrevem variáveis CSS no `:root` (`--primary`, etc., já definidas em `default_shadcn_theme.css`) — nenhuma mudança estrutural no Tailwind, só os valores das variáveis passam a vir do tenant em vez de fixos no arquivo.

---

## 1. Achado técnico que muda o plano: dois design systems duplicados

**⚠️ Correção pós-execução (2026-08-28): a conclusão original desta seção estava
invertida.** Ao investigar o código, este documento identificou corretamente dois
conjuntos de componentes de UI concorrentes:

- `src/app/components/{Button,Card,Badge,Input,Textarea}.tsx` — implementação própria (usa `cn()` direto).
- `src/app/components/ui/*.tsx` — biblioteca shadcn/Radix completa (48 arquivos).

Mas errou sobre qual dos dois era o "de verdade": ao executar a Sprint 0, `grep` nos
imports reais mostrou que `components/{Button,Card,Badge,Input,Textarea}.tsx` é quem é
usado em quase todo componente de feature (`Cart`, `Checkout`, `Menu`, `PizzaBuilder`,
`MenuManagement`, `TenantForm`, `OrdersPanel`, etc.) — o oposto do que esta seção
afirmava. `components/ui/` estava ~98% morta; só `ui/switch.tsx` tinha uso real (3
lugares, todos adicionados na sessão de 28/08, depois deste documento ter sido
escrito). Consequência prática: deletar os 5 arquivos "vestigiais" pela autoridade
deste documento quebrou a build imediatamente (~80 erros de `tsc`) — corrigido restaurando-os. `packages/ui` foi montado com o conjunto certo: os 5 componentes reais +
`Switch.tsx` (o único sobrevivente de `ui/`), não com os 48 arquivos abaixo.

**Texto original (mantido como registro do raciocínio na hora, já sabendo que a conclusão estava errada):**

> Ou seja, o design system "de verdade" do produto é o `components/ui/`. O outro é vestigial — nasceu para as telas-contêiner do protótipo Figma Make e nunca foi migrado. Se eu extrair um `packages/ui` compartilhado sem resolver isso antes, ele nasce com dois `Button` incompatíveis.
>
> **Decisão adotada neste plano:** `components/ui/` é o pacote compartilhado canônico. As 4 telas-contêiner **não são migradas** (elas são descartadas junto com a `HomePage.tsx` — ver seção 0), e os 5 arquivos duplicados (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `Textarea.tsx` na raiz de `components/`) são removidos sem substituição.

**O que de fato aconteceu**: `components/{Button,Card,Badge,Input,Textarea}.tsx` viraram
`packages/ui` (+ `Switch.tsx`). As 3 telas-contêiner com lógica real
(`ClientApp.tsx`/`RestaurantApp.tsx`/`AdminApp.tsx`) **foram migradas** — só
`HomePage.tsx` (puro seletor de rota, zero lógica de negócio) foi descartada de fato.

---

## 2. Estrutura de repositório alvo

```
PIZZA_NEW_PROT/
├── apps/
│   ├── cliente/               (App do Cliente — {slug}.suapizza.com.br)
│   ├── pizzaria/               (Painel da Pizzaria — painel.{slug}.suapizza.com.br)
│   └── admin-pizzarias/        (Painel Admin-Pizzarias — admin.suapizza.com.br)
├── packages/
│   ├── ui/                     (componentes shadcn/Radix — hoje em src/app/components/ui)
│   ├── types/                  (tipos compartilhados: Product, Order, Tenant, User, CartItem — hoje em mockData.ts)
│   └── config/                 (tsconfig base, tailwind/postcss config, tema — default_shadcn_theme.css, src/styles/*)
├── docs/
├── pnpm-workspace.yaml         (já existe, hoje só aponta pra '.')
└── package.json                 (root: scripts orquestradores, ex. "dev:cliente", "dev:pizzaria", "dev:admin")
```

**1 repositório** (monorepo via pnpm workspaces) para os 3 projetos — confirmado. Mesmo padrão do Barberaria (`apps/api` + 3 frontends, tudo em 1 repo).

---

## 3. Mapeamento: o que existe hoje → onde vai

| Hoje | Vai para |
|---|---|
| `src/app/pages/ClientApp.tsx` + `components/client/*` | `apps/cliente/src/` |
| `src/app/pages/RestaurantApp.tsx` + `components/restaurant/*` | `apps/pizzaria/src/` |
| `src/app/pages/AdminApp.tsx` + `components/admin/*` | `apps/admin-pizzarias/src/` |
| `src/app/components/ui/*` (56 arquivos shadcn/Radix) | `packages/ui/src/` |
| `src/app/components/{Button,Card,Badge,Input,Textarea}.tsx` | **removidos** (duplicados — ver seção 1) |
| `src/app/lib/utils.ts`, `components/figma/ImageWithFallback.tsx` | `packages/ui/src/` (utilitários da UI compartilhada) |
| `src/app/data/mockData.ts` | tipos → `packages/types/src/`; dados mock ficam locais em cada app até existir API real |
| `default_shadcn_theme.css`, `src/styles/*` | `packages/config/` (tema compartilhado, cada app importa; cliente/pizzaria sobrescrevem em runtime por tenant — seção 0.2) |
| `src/app/pages/HomePage.tsx` | **removida**, sem substituição (decisão confirmada — seção 0) |

---

## 4. Fases de execução

### Fase A — Preparar o monorepo (nada quebra ainda)
- Atualizar `pnpm-workspace.yaml` para incluir `apps/*` e `packages/*`.
- Criar `packages/config` com `tsconfig.base.json` e config do Tailwind/PostCSS compartilhados.
- **Critério de aceite:** `pnpm install` continua funcionando; o app atual (SPA única) continua rodando sem nenhuma mudança visível.

### Fase B — Resolver a duplicação de design system e extrair `packages/ui`
- Remover `HomePage.tsx` e `components/{Button,Card,Badge,Input,Textarea}.tsx` (decisão da seção 1).
- Mover `components/ui/*` + `lib/utils.ts` + `ImageWithFallback.tsx` para `packages/ui/src/`.
- **Critério de aceite:** `packages/ui` compila isoladamente e exporta os 56 componentes; nenhum import quebrado no restante do código.

### Fase C — Isolar acesso a dados (preparação para a Fase 1 do plano de projeto)
- Criar uma camada de repositório por domínio (ex. `ProductRepository`, `OrderRepository`, `TenantRepository`) que hoje lê de `mockData.ts`, mas encapsula esse acesso — nenhum componente de UI importa `mockData.ts` diretamente.
- **Critério de aceite:** trocar mock por API real, no futuro, é uma mudança dentro do repositório, não em cada componente.

### Fase D — Criar os 3 apps separados
- Criar `apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias`, cada um com seu próprio `vite.config.ts`, `index.html` e `package.json`, consumindo `@pizza/ui` e `@pizza/types`.
- Mover páginas e componentes específicos de cada domínio (mapeamento da seção 3).
- Cada app sobe em porta própria durante dev (ex. `cliente` 5173, `pizzaria` 5174, `admin-pizzarias` 5175 — mesma convenção de portas do Barberaria).
- Resolução de tenant simplificada para o MVP: cada app lê o slug do tenant de uma variável de ambiente (`VITE_TENANT_SLUG`) fixada no build, **não** de subdomínio real — mesma solução pragmática adotada pelo Barberaria (que documenta o DNS wildcard como decisão de infra pendente, fora do escopo de código). Migrar para subdomínio real (`window.location.hostname`) é um passo pequeno e adiado até essa decisão de infra existir.
- **Critério de aceite:** os 3 apps sobem de forma independente (`pnpm --filter cliente dev`, `pnpm --filter pizzaria dev`, `pnpm --filter admin-pizzarias dev`) e cada um reproduz visualmente o que a rota correspondente fazia na SPA única.

### Fase E — Descomissionar a SPA única
- Remover `App.tsx` e `react-router-dom` do nível raiz (cada app agora é sua própria raiz de aplicação).
- Atualizar `README.md` com instruções para rodar cada app individualmente.
- **Critério de aceite:** não existe mais 1 único domínio/porta servindo os 3 papéis.

---

## 5. Estimativa

| Fase | Esforço (1 dev) |
|---|---|
| A — Preparar monorepo | 0,5 dia |
| B — Unificar design system + extrair `packages/ui` | 1 dia |
| C — Isolar acesso a dados | 1 dia |
| D — Criar os 3 apps separados | 2–3 dias |
| E — Descomissionar SPA única | 0,5 dia |
| **Total** | **~5–6 dias** |

Este é o **Sprint 0** do `MVP_SPRINTS.md` — roda antes e em paralelo à Fase 0 de backend (`PLANO_DE_PROJETO_PIZZA_SAAS.md`), já que não depende de nenhuma decisão de stack de backend.

---

## 6. Decisões confirmadas (27/08/2026)

1. ~~`HomePage.tsx`~~ — **removida**, sem virar landing page (seção 0).
2. **Nomes dos 3 projetos**: `admin-pizzarias`, `pizzaria`, `cliente` — confirmado pelo usuário.
3. **1 repositório Git para os 3 projetos** — confirmado, monorepo via pnpm workspaces (mesmo padrão do Barberaria).

### Ainda em aberto (não bloqueia o início do Sprint 0)
- **Nome do escopo dos pacotes internos**: assumindo `@pizza/ui`, `@pizza/types`, `@pizza/config` por padrão. Troque para `@desenvolvainc/...` ou outro prefixo se preferir — é um find-and-replace, não afeta a arquitetura.
- **Provedor de deploy dos 3 apps**: recomendado 3 projetos de deploy separados a partir do mesmo repositório (ex. Vercel, que é o que o Barberaria usa para seus 3 frontends), cada um apontando para `apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias`.

---

## 7. Riscos

- **Assets referenciados via `figma:asset`**: o protótipo usa imports especiais do Figma Make para algumas imagens; mover arquivos de pasta pode quebrar esses caminhos — validar visualmente cada app após a Fase D.
- **Componentes de feature usados por mais de um domínio**: se algum componente em `client/`, `restaurant/` ou `admin/` for reaproveitado entre eles (além do `ui/` genérico), ele também precisa ir para um pacote compartilhado — mapear isso durante a Fase D, não assumir que a divisão por pasta atual já é limpa.
- **Duplicação de config**: se `packages/config` não for bem estruturado na Fase A, cada app tende a divergir silenciosamente em Tailwind/tsconfig com o tempo.
