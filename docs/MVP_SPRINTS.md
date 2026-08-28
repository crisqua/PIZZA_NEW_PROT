# MVP em Sprints — SaaS White-Label para Pizzarias
### Sequenciamento de execução, baseado no modelo já validado no Barberaria

---

## 0. Como usar este documento

Este documento traduz o escopo do `MVP.md` e a arquitetura do `ARQUITETURA_SISTEMA_PIZZA_SAAS.md` em **sprints executáveis**, cada uma com entregável, Definition of Done e dependências explícitas. É um documento vivo: conforme cada sprint é concluída, marque com ✅ e registre aqui qualquer ajuste real de escopo descoberto na implementação — mesma convenção usada no `CLAUDE.md`/`admin-desenvolvain.md` do projeto Barberaria (`C:\Users\crist\BARBEARIA`), que já percorreu exatamente essa sequência para o mesmo modelo de negócio (Incubadora → Tenant → Cliente final, lá aplicado a barbearias).

**Não pule etapas nem antecipe escopo fora do MVP** (`MVP.md` seção 4) sem confirmar antes — mesma regra que o Barberaria usa.

**Atualização de 2026-08-28:** as Sprints 4, 6 e 8 (`plans`, `inventory`, `financial`) são novas em relação à primeira versão deste documento — nasceram de um protótipo funcional (mock, sem backend, `useState` local) já validado com o usuário nas telas reais do App do Cliente (`Menu.tsx`), do Painel da Pizzaria (`Inventory.tsx`, `Financial.tsx`, `Settings.tsx`) e do Admin-Pizzarias (`PlansManagement.tsx`, `TenantsManagement.tsx`). O desenho de dados abaixo (`Plan`/`Subscription`) segue o mesmo padrão já em produção local no Barberaria (`admin-plans.controller.ts`, `admin-subscriptions.service.ts`) — ver seção 2 de cada sprint nova para o mapeamento exato mock → real.

---

## 1. Visão geral das sprints

| Sprint | Entregável | Depende de |
|---|---|---|
| 0 | Separação dos 3 frontends (`cliente`, `pizzaria`, `admin-pizzarias`) | — (100% frontend, roda em paralelo com tudo) |
| 1 | Infra base + schema (`tenants`, `users`) + RLS + mecanismo de pooling + testes de isolamento | Sprint 0 não bloqueia; pode rodar em paralelo |
| 2 | Auth (JWT + refresh) + RBAC + guards | Sprint 1 |
| 3 | Módulo `tenants` (rotas admin/tenant separadas, branding, ativar/desativar) + cache Redis | Sprint 2 |
| 4 | Módulo `plans` (catálogo de planos + assinatura por tenant + guard de feature-gating) | Sprint 3 |
| 5 | Módulo `catalog` (produtos, categorias dinâmicas por tenant, upload de imagem) | Sprint 3 |
| 6 | Módulo `inventory` (Estoque, add-on pago) | Sprint 4 |
| 7 | Módulo `orders` (criação, estados, idempotência) + conectar app `cliente` | Sprint 5, Sprint 0 |
| 8 | Módulo `financial` (Financeiro, add-on pago) | Sprint 4, Sprint 7 (precisa de `orders` pra receita) |
| 9 | Conectar painel `pizzaria` (Cardápio, Pedidos, Estoque, Financeiro) ao backend real | Sprint 6, Sprint 7, Sprint 8 |
| 10 | Conectar `admin-pizzarias` (CRUD de tenants, planos, onboarding, dashboard) ao backend real | Sprint 4 (não precisa esperar Sprint 6/7/8) |
| 11 | Piloto com 1 pizzaria real — ajustes | Sprints 1–10 |

Status: Sprint 0 **✅ concluída em 2026-08-28**. Sprints 1–11 **⏳ não iniciadas** — cada
app já roda isolado (`apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias`), mas ainda
com dados mockados locais (`apps/<app>/src/data/mockData.ts`), sem backend real.

---

## Sprint 0 — Separação dos 3 frontends

**Detalhe completo:** `PLANO_SEPARACAO_FRONTENDS.md` (Fases A–E).

**Entregável:** `apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias` rodando de forma independente (builds/portas separadas), consumindo um `packages/ui` compartilhado (56 componentes shadcn/Radix unificados — resolve a duplicação de design system encontrada no protótipo). `HomePage.tsx` e os componentes de UI vestigiais removidos.

**Definition of Done:**
- Os 3 apps sobem cada um com seu próprio `pnpm --filter <app> dev`.
- Nenhum componente de UI importa `mockData.ts` diretamente (camada de repositório isolada — Fase C).
- Visual idêntico ao protótipo atual em cada um dos 3 apps.

**✅ Concluída em 2026-08-28.** Ajuste real de escopo encontrado na execução: o
`PLANO_SEPARACAO_FRONTENDS.md` (seção 1) estava errado sobre qual era o design system
"de verdade" — `components/{Button,Card,Badge,Input,Textarea}.tsx` (não `components/ui/`)
é o que é realmente usado em quase todo componente de feature; `components/ui/` (48
arquivos shadcn/Radix) estava quase toda morta, só `ui/switch.tsx` tinha uso real (3
lugares). `tsc --noEmit` acusou isso imediatamente ao deletar por engano os 5 arquivos
reais — restaurados, e `packages/ui` foi montado com o conjunto certo (caiu de ~37
dependências radix pra 3). `apps/cliente` roda em 5173, `apps/pizzaria` em 5174,
`apps/admin-pizzarias` em 5175 — `pnpm dev:cliente` / `dev:pizzaria` / `dev:admin` na raiz.

---

## Sprint 1 — Infra base + schema + RLS + pooling + testes de isolamento

**Referência técnica:** `ARQUITETURA_SISTEMA_PIZZA_SAAS.md` seções 3.1, 3.2, 4, 4.1.

**Entregável:**
- Projeto Supabase (Postgres gerenciado) + serviço Render (backend NestJS) + CI/CD no GitHub Actions.
- `schema.prisma` inicial: `tenants`, `users`, `roles`/`permissions`, com `CHECK` garantindo que só `platform_superadmin` tem `tenant_id NULL` (mesmo padrão do Barberaria para `super_admin`).
- Migration inicial já incluindo as policies de RLS (exceto `tenants`, que fica de fora por design — seção 3.1/6.3 da arquitetura) — **RLS não é tarefa separada, nasce na mesma migration da tabela.**
- `TenantContextInterceptor` (ou Prisma Client Extension) implementando o mecanismo da seção 3.1: transação interativa por requisição, `set_config` parametrizado com escopo `LOCAL`, uso obrigatório do client transacional (`tx`) em todos os repositórios.
- Pipeline de CI com o gate de RLS (seção 11 da arquitetura): quebra o build se alguma tabela com `tenant_id` não tiver `relrowsecurity = true`.
- Testes automatizados dos itens 1–4 e 6 da seção 3.2 da arquitetura (isolamento básico, IDOR, manipulação de body/query, vazamento sob connection pooling). Os itens 5 e 7 (FK composta, idempotência) entram nas Sprints 5 e 7, quando essas tabelas existirem.

**Definition of Done:** **não é considerada concluída sem o mecanismo de `SET LOCAL` implementado e testado sob concorrência real** (teste de vazamento de contexto, não só isolamento sequencial) — RLS "ligado" sem esse mecanismo testado gera falsa sensação de segurança. Mesmo critério usado no Barberaria Sprint 1.

---

## Sprint 2 — Auth + RBAC

**Entregável:**
- Serviço de Auth: JWT de curta duração (15 min) + refresh token rotativo em cookie `httpOnly/Secure/SameSite=Strict`.
- Hash de senha com Argon2id.
- RBAC: papéis `platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`, checados via guard — nunca checagem manual dentro de controller.
- `tenant_id` extraído **somente** do JWT validado, nunca de URL/query/body (regra não-negociável, seção 6.1 da arquitetura).

**Definition of Done:** login funcional para os 4 papéis; teste automatizado provando que manipular `tenant_id` no body/query de uma requisição autenticada não tem efeito algum.

---

## Sprint 3 — Módulo `tenants` + cache

**Entregável:**
- Dois módulos NestJS distintos (nunca o mesmo controller para os dois casos — mesmo cuidado do Barberaria seção 6.4, para não expor rota de plataforma por erro de roteamento):
  - `/v1/admin/tenants/*` — exige `role = platform_superadmin`, sem tenant context, CRUD completo de tenants.
  - `/v1/tenants/me` — exige tenant autenticado, sempre filtra pelo `tenant_id` do JWT, nunca aceita outro ID via parâmetro.
- Branding do tenant: cor primária/secundária + logo, persistidos em `tenants` e cacheados no Redis (TTL curto + invalidação ativa ao editar) — cardápio/config é lido com muito mais frequência do que é escrito.
- **Campo `active` (boolean) em `tenants`** — protótipo já valida a UI (`TenantsManagement.tsx`, switch por tenant). `PATCH /v1/admin/tenants/:id/active` (superadmin only) alterna o campo; o guard de auth (Sprint 2) passa a checar `tenant.active === true` no momento do login, não só no cadastro — desativar um tenant precisa bloquear login imediatamente, não é decorativo.

**Definition of Done:** admin da pizzaria só edita o próprio tenant; tentar editar outro `tenant_id` via payload é rejeitado; desativar um tenant via `/v1/admin/tenants/:id/active` faz o próximo login de `tenant_owner`/`tenant_staff` desse tenant falhar com 403.

---

## Sprint 4 — Módulo `plans` (catálogo de planos + assinatura)

**Novo — nasceu do protótipo `PlansManagement.tsx` (Admin-Pizzarias → Planos & Preços), validado com o usuário em 2026-08-28. Segue o mesmo padrão já em produção local no Barberaria** (`admin-plans.controller.ts`/`service.ts`, `admin-subscriptions.service.ts`).

**Entregável:**
- `Plan` — catálogo **global**, RLS-exempt como `tenants` (mesmo racional da seção 3.1/6.3: não é dado de um tenant, é dado da plataforma):
  ```prisma
  model Plan {
    id         String  @id @default(cuid())
    code       String  @unique // 'trial' | 'pro' | 'enterprise' — imutável após criado
    name       String
    priceCents Int?    // null = "negociado" (Enterprise)
    limitLabel String? // texto livre, ex. "Pedidos ilimitados"
    modules    Json    @default("[]") // string[] de módulos opcionais inclusos: 'estoque' | 'financeiro'
    active     Boolean @default(true)
    subscriptions Subscription[]
  }
  ```
- `Subscription` — tenant-scoped, RLS normal (1:1 com tenant):
  ```prisma
  model Subscription {
    id        String   @id @default(cuid())
    tenantId  String   @unique
    planId    String
    status    String   // 'active' | 'cancelled'
    startedAt DateTime @default(now())
    tenant    Tenant   @relation(fields: [tenantId], references: [id])
    plan      Plan     @relation(fields: [planId], references: [id])
  }
  ```
- `/v1/admin/plans` — CRUD completo (`platform_superadmin` only). `code` só aceita valores ainda não usados na criação (`@IsIn` dos códigos livres) e é omitido do DTO de update — imutável, mesma regra do Barberaria.
- `/v1/admin/tenants/:tenantId/subscription` — upsert (superadmin atribui/troca o plano de um tenant).
- **Guard de feature-gating**: `@RequiresModule('estoque' | 'financeiro')` (decorator + guard) resolve `subscription.plan.modules` do tenant autenticado e retorna 403 se o módulo pedido não estiver incluso. Aplicado nas rotas de `inventory/` (Sprint 6) e `financial/` (Sprint 8) — o bloqueio é sempre no backend, nunca só a tela escondida no frontend (não-negociável, mesma regra do RBAC).

**Definition of Done:** superadmin cria/edita um plano e atribui a um tenant pelo painel; chamar uma rota de módulo pago sem o plano incluir aquele módulo retorna 403 mesmo manipulando a requisição diretamente (teste automatizado, não só verificação manual).

---

## Sprint 5 — Módulo `catalog`

**Entregável:**
- CRUD de `products`/`categories`, upload de imagem via URL assinada do Supabase Storage — nunca upload direto passando pelo backend sem validação de tipo/tamanho.
- **`categories` é uma tabela tenant-scoped de verdade** (não um enum fixo) — cada pizzaria cadastra as próprias categorias de sabor (ex.: Clássicas, Carnes, Frango, Queijos, Doces). Isso já está validado no protótipo (`Category` em `mockData.ts`, criação inline em `MenuManagement.tsx`/`ProductForm.tsx`) — esta sprint só troca o `useState` local por persistência real, o comportamento de UI não muda.
- Disponibilidade de item (em falta / disponível).

**Definition of Done:** teste do item 5 da seção 3.2 da arquitetura (FK composta) passando — associar um produto de outro tenant a uma categoria/pedido deve falhar no banco, não só na aplicação.

---

## Sprint 6 — Módulo `inventory` (Estoque, add-on pago)

**Novo — nasceu do protótipo `Inventory.tsx` (Painel da Pizzaria → Estoque), validado com o usuário em 2026-08-28.**

**Entregável:**
- `inventory_items` (tenant-scoped, RLS normal): `id`, `tenant_id`, `name`, `unit`, `quantity`, `min_quantity`.
- CRUD real substituindo o mock — mesmo modelo de dados e mesmas regras de status (`quantity <= min_quantity` → alerta) já validadas em `Inventory.tsx`.
- Todas as rotas protegidas por `@RequiresModule('estoque')` (Sprint 4).

**Definition of Done:** tenant sem o módulo `estoque` no plano recebe 403 ao chamar `/v1/inventory` diretamente; UI real (Sprint 9) bate visualmente com o protótipo já aprovado.

---

## Sprint 7 — Módulo `orders` + conectar app `cliente`

**Entregável:**
- Criação de pedido, máquina de estados (`pending → preparing → delivery → completed / cancelled`) validada no backend — nunca aceitar status arbitrário vindo do cliente.
- Idempotência na criação (chave de idempotência no header) — teste do item 7 da seção 3.2.
- `order_items` com FK composta contra `orders` e `products` (seção 4.1 da arquitetura).
- `apps/cliente` (Sprint 0) conectado à API real, substituindo `mockData.ts` na camada de repositório já isolada.

**Definition of Done:** cliente monta pedido (inclusive meio a meio), faz checkout com pagamento na entrega, pedido é persistido; duas requisições simultâneas com a mesma chave de idempotência geram só 1 pedido.

---

## Sprint 8 — Módulo `financial` (Financeiro, add-on pago)

**Novo — nasceu do protótipo `Financial.tsx` (Painel da Pizzaria → Financeiro), validado com o usuário em 2026-08-28. Depende de `orders` (Sprint 7) porque a receita do período é agregada a partir de pedidos reais, não é um dado próprio do módulo.**

**Entregável:**
- `expenses` (tenant-scoped, RLS normal): `id`, `tenant_id`, `description`, `category`, `amount_cents`, `date`. CRUD real substituindo o mock já validado em `Financial.tsx`.
- Endpoint de receita: agrega `orders.total` por tenant e por dia num intervalo (substitui o `mockDailyRevenue` do protótipo) — consulta, não tabela própria (a receita **é** os pedidos, não um dado duplicado).
- Todas as rotas protegidas por `@RequiresModule('financeiro')` (Sprint 4).

**Definition of Done:** gráfico Receita × Despesas do painel passa a refletir pedidos e despesas reais do tenant; tenant sem o módulo `financeiro` no plano recebe 403 ao chamar `/v1/financial/*` diretamente.

---

## Sprint 9 — Conectar painel `pizzaria`

**Entregável:**
- `apps/pizzaria` (Sprint 0) conectado à API real: CRUD de cardápio, visualização de pedidos novos via **polling** (não WebSocket — fora do MVP, ver `MVP.md` seção 4), atualização de status.
- Telas de Estoque (Sprint 6) e Financeiro (Sprint 8) conectadas à API real, com o estado de cadeado/upsell (`AddonUpsell.tsx`, já prototipado) refletindo `subscription.plan.modules` de verdade em vez do `useState` local de demonstração.

**Definition of Done:** pedido criado pelo cliente aparece no painel da pizzaria via polling em tempo hábil; status é atualizável e reflete no acompanhamento do cliente; Estoque/Financeiro aparecem liberados ou bloqueados de acordo com o plano real do tenant, não mais um toggle manual em Configurações.

---

## Sprint 10 — Conectar `admin-pizzarias`

**Entregável:**
- `apps/admin-pizzarias` (Sprint 0) conectado à API real: login de `platform_superadmin`, CRUD de tenants (`/v1/admin/tenants`, já existente desde a Sprint 3), onboarding de nova pizzaria (cria tenant + admin + assinatura numa única transação — mesmo padrão usado no Barberaria para onboarding de barbearia).
- Tela **Planos & Preços** (`PlansManagement.tsx`, já prototipada) conectada a `/v1/admin/plans` (Sprint 4) — CRUD real de planos, não mais `useState` local.
- Ativar/desativar tenant (`TenantsManagement.tsx`, já prototipado) conectado a `/v1/admin/tenants/:id/active` (Sprint 3) — passa a bloquear login de verdade, não só trocar a badge.
- Dashboard básico: contagem de tenants, pedidos do mês — sem métricas financeiras de plataforma (billing da própria DesenvolvaINC fica fora do MVP, `MVP.md` seção 4; billing é o que o *tenant* paga à plataforma, já coberto pelo módulo `plans`).

**Definition of Done:** superadmin cria uma pizzaria nova pelo painel (não via seed manual no banco), atribuindo um plano no fluxo de onboarding, e o tenant criado consegue logar em `apps/pizzaria` imediatamente com os módulos do plano escolhido já liberados.

**Nota:** esta sprint só depende da Sprint 4 (módulo `plans`), não precisa esperar Inventory/Orders/Financial — pode ser adiantada em paralelo, mesma flexibilidade que o Barberaria explorou ao construir `admin-desenvolvain` em paralelo aos outros dois frontends.

---

## Sprint 11 — Piloto com pizzaria real

**Entregável:** ajustes decorrentes de uso real por 1 tenant piloto em staging — cardápio verdadeiro, pedidos reais (sem dinheiro real trafegando, pagamento na entrega), estoque e financeiro reais se o tenant piloto contratar esses módulos.

**Expectativa realista, com base na experiência do Barberaria:** a sprint de piloto quase sempre revela pelo menos um ajuste real de schema/regra de negócio que não aparece em nenhuma sprint anterior (no Barberaria: campo `active` em profissionais, status `needs_reschedule`, bug de timezone). Reserve esta sprint para isso — não para funcionalidade nova de escopo.

**Definition of Done:** os critérios de aceite do MVP, seção 7 do `MVP.md`, todos verificados em staging com dado real do tenant piloto.

---

## 2. O que fica registrado aqui conforme as sprints avançam

Siga a mesma convenção do `CLAUDE.md` do Barberaria: cada ajuste real de escopo, bug de arquitetura corrigido, ou decisão revista durante a implementação (não durante o planejamento) vira uma entrada datada no topo deste documento ou uma nota dentro da sprint correspondente — nunca reescreva silenciosamente uma sprint já concluída como se tivesse sido assim desde o início.
