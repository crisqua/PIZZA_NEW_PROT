# MVP em Sprints — SaaS White-Label para Pizzarias
### Sequenciamento de execução, baseado no modelo já validado no Barberaria

---

## 0. Como usar este documento

Este documento traduz o escopo do `MVP.md` e a arquitetura do `ARQUITETURA_SISTEMA_PIZZA_SAAS.md` em **sprints executáveis**, cada uma com entregável, Definition of Done e dependências explícitas. É um documento vivo: conforme cada sprint é concluída, marque com ✅ e registre aqui qualquer ajuste real de escopo descoberto na implementação — mesma convenção usada no `CLAUDE.md`/`admin-desenvolvain.md` do projeto Barberaria (`C:\Users\crist\BARBEARIA`), que já percorreu exatamente essa sequência para o mesmo modelo de negócio (Incubadora → Tenant → Cliente final, lá aplicado a barbearias).

**Não pule etapas nem antecipe escopo fora do MVP** (`MVP.md` seção 4) sem confirmar antes — mesma regra que o Barberaria usa.

**Atualização de 2026-08-28 (Sprint 1 — escopo de dados e testes, achado ao detalhar a implementação):** dois ajustes de escopo: (1) o texto original da Sprint 1 mencionava `schema.prisma inicial: tenants, users, roles/permissions`, sugerindo tabelas normalizadas de papéis/permissões; a implementação segue o padrão já validado no Barberaria — `role` como coluna `VARCHAR(20)` simples em `users`, validada em código contra os 4 papéis fixos do RBAC (`platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`), sem tabela `roles`/`permissions` própria. Texto da Sprint 1 corrigido abaixo. (2) os testes dos itens 2–4 da seção 3.2 da arquitetura (IDOR via URL, manipulação de `tenant_id` no body, manipulação de `tenant_id` na query) exigem uma rota HTTP real protegida por um guard que extraia `tenant_id` de um JWT validado — que só existe a partir da Sprint 2 (Auth). Criar uma rota que confia num header/param pra simular isso na Sprint 1 testaria scaffolding descartável, não o mecanismo real. Sprint 1 entrega só os itens 1 e 6 da seção 3.2 (isolamento básico e vazamento sob pooling — ambos testáveis diretamente no `TenantContextService`, sem HTTP/guard) + o gate de RLS no CI. Itens 2–4 movidos para o Definition of Done da Sprint 2.

**Atualização de 2026-08-28 (correção):** as telas de Login/Cadastro (email/senha) dos 3 papéis de frontend (`customer` no app Cliente, `tenant_owner`/`tenant_staff` no Painel da Pizzaria, `platform_superadmin` no Admin-Pizzarias) já eram escopo do MVP (`MVP.md`, itens 2 e 3 da tabela de escopo funcional) mas não estavam explícitas como entregável em nenhuma sprint — só o serviço de Auth *backend* (Sprint 2) e uma menção solta a "login de platform_superadmin" dentro do texto da Sprint 10. Nenhum dos 3 apps do protótipo tem hoje uma tela de login (cada um abre direto na tela principal). Corrigido: cada sprint que conecta um frontend à API real (7 = Cliente, 9 = Pizzaria, 10 = Admin-Pizzarias) agora lista a tela de Login/Cadastro daquele papel como entregável explícito, já que é ali que o Auth da Sprint 2 passa a ser consumido pela primeira vez em cada app.

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

Status: Sprint 0 **✅ concluída em 2026-08-28**. Sprint 1 **✅ concluída em 2026-08-30**
(mecanismo de RLS + CI verificados em 2026-08-29; deploy no Render — `pizza-api-homolog`
— fechado em 2026-08-30). Sprint 2 **✅ concluída em 2026-08-30**. Sprint 3 **✅ concluída
em 2026-08-31**. Sprint 4 **✅ concluída em 2026-08-31**. Sprint 5 **✅ concluída em
2026-08-31**. Sprint 6 **✅ concluída em 2026-08-31** — ver nota logo abaixo da sprint.
Sprints 7–11 **⏳ não
iniciadas** — os 3 apps frontend rodam isolados (`apps/cliente`, `apps/pizzaria`,
`apps/admin-pizzarias`) mas ainda com dados mockados locais
(`apps/<app>/src/data/mockData.ts`), sem consumir a API real ainda (isso é Sprint 7/9/10).

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
- `schema.prisma` inicial: `tenants`, `users` (papel do usuário como coluna `role VARCHAR(20)`, sem tabela `roles`/`permissions` separada — ver nota de 2026-08-28 no topo deste documento), com `CHECK` garantindo que só `platform_superadmin` tem `tenant_id NULL` (mesmo padrão do Barberaria para `super_admin`).
- Migration inicial já incluindo as policies de RLS (exceto `tenants`, que fica de fora por design — seção 3.1/6.3 da arquitetura) — **RLS não é tarefa separada, nasce na mesma migration da tabela.**
- `TenantContextInterceptor` (ou Prisma Client Extension) implementando o mecanismo da seção 3.1: transação interativa por requisição, `set_config` parametrizado com escopo `LOCAL`, uso obrigatório do client transacional (`tx`) em todos os repositórios.
- Pipeline de CI com o gate de RLS (seção 11 da arquitetura): quebra o build se alguma tabela com `tenant_id` não tiver `relrowsecurity = true`.
- Testes automatizados dos itens 1 e 6 da seção 3.2 da arquitetura (isolamento básico e vazamento de contexto sob connection pooling), executados diretamente contra o `TenantContextService` (sem HTTP, já que não há Auth ainda nesta sprint — ver nota de 2026-08-28 no topo deste documento). Os itens 2–4 (IDOR via URL, manipulação de `tenant_id` via body/query) exigem guard real de JWT e foram movidos para o Definition of Done da Sprint 2. Os itens 5 e 7 (FK composta, idempotência) entram nas Sprints 5 e 7, quando essas tabelas existirem.

**Definition of Done:** **não é considerada concluída sem o mecanismo de `SET LOCAL` implementado e testado sob concorrência real** (teste de vazamento de contexto, não só isolamento sequencial) — RLS "ligado" sem esse mecanismo testado gera falsa sensação de segurança. Mesmo critério usado no Barberaria Sprint 1.

**✅ Status em 2026-08-29:** `apps/api` (NestJS + Prisma) criado — `schema.prisma`
(`tenants`/`users`), migration com CHECK + RLS/FORCE RLS + policy `tenant_isolation`
(já na versão que trata `tenant_id IS NULL` corretamente, evitando o bug que o Barberaria
bateu antes de chegar nessa versão), `TenantContextService`/`TenantContextInterceptor`/
`@CurrentTenant()`. Aplicado de verdade no Supabase de homologação (não só local):
migration rodada via `prisma migrate deploy`, gate de RLS (`scripts/check-rls.sql`)
confirmado OK contra o banco real, role restrita `pizza_app` (`NOSUPERUSER NOBYPASSRLS`)
criada via `scripts/setup-app-role.ts` e promovida a `DATABASE_URL` padrão do `.env` (a
app nunca roda como a role `postgres` do Supabase). Os dois testes de isolamento
(`test/isolation/*.e2e-spec.ts` — isolamento básico + os 40 disparos concorrentes do
teste de vazamento sob pooling) rodaram contra o Supabase real, como a role restrita, e
passaram (depois disso os dados de teste seedados foram removidos do homolog). `GET
/health` confirmado local apontando pro Supabase real.
CI (`.github/workflows/ci.yml`) rodou verde no primeiro push (`8c36e0e`, Postgres efêmero
+ gate de RLS + testes de isolamento como role restrita) — https://github.com/crisqua/PIZZA_NEW_PROT/actions/runs/33230877167.
**✅ Fechada em 2026-08-30:** deploy real no Render concluído — serviço `pizza-api-homolog`
(`pizza-api-homolog.onrender.com`) rodando contra o Supabase de homologação, `GET /health`
confirmado em produção. Dois bugs reais de deploy encontrados e corrigidos nesse processo
(detalhes na memória de sessão, não repetidos aqui por não serem specíficos deste domínio):
`pnpm install` sem `--filter` instalava o monorepo inteiro e estourava a memória do Render
(corrigido escopando o Build Command a `@pizza/api`), e o Corepack resolvia uma versão
diferente do pnpm entre Build e Start Command (corrigido fixando `"packageManager"` no
`package.json` raiz).

---

## Sprint 2 — Auth + RBAC

**Entregável:**
- Serviço de Auth: JWT de curta duração (15 min) + refresh token rotativo em cookie `httpOnly/Secure/SameSite=Strict`.
- Hash de senha com Argon2id.
- RBAC: papéis `platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`, checados via guard — nunca checagem manual dentro de controller.
- `tenant_id` extraído **somente** do JWT validado, nunca de URL/query/body (regra não-negociável, seção 6.1 da arquitetura).

**Definition of Done:** login funcional para os 4 papéis; teste automatizado provando que manipular `tenant_id` no body/query de uma requisição autenticada não tem efeito algum; testes automatizados dos itens 2–4 da seção 3.2 da arquitetura (IDOR via rota HTTP real protegida por `JwtAuthGuard`, manipulação de `tenant_id` no body, manipulação de `tenant_id` na query) — movidos da Sprint 1 porque dependem de guard real de JWT (ver nota de 2026-08-28 no topo do documento).

**✅ Concluída em 2026-08-30.** Pesquisado o padrão já validado no Barberaria
(`src/auth/*`) antes de desenhar do zero — dois pontos divergem deliberadamente, por
pedido explícito do usuário, já que a arquitetura deste projeto pede mais do que o
Barberaria entregou: **Argon2id** (Barberaria usa bcryptjs) e **refresh token rotativo
com tabela no banco + detecção de reuso** (Barberaria é stateless, sem revogação real).
Implementado: `AuthModule`/`AuthService`/`JwtAuthGuard`/`RolesGuard` (sem Passport, mesmo
padrão do Barberaria — `JwtService.verifyAsync` direto), model `RefreshToken` (RLS igual
`users` + FK composta `(tenant_id, user_id)` pro mesmo padrão da seção 4.1), módulos
fixture `users`/`admin` (base real do futuro módulo de usuários, não descartável — só
existiam pra dar uma rota HTTP autenticada real aos testes de IDOR/override do DoD, já
que não há módulo de produto/pedido antes da Sprint 4/5), prefixo `v1` adotado agora
(sprints futuras já assumiam esse path). Sem endpoint de registro público — DoD só pede
login funcional, contas são seedadas via `scripts/seed-auth-users.ts`.

Três bugs reais encontrados e corrigidos durante a implementação (generalizáveis, não
specíficos deste domínio): (1) `argon2` é um pacote nativo cujo build script o pnpm ignora
por padrão — adicionado a `onlyBuiltDependencies` no `pnpm-workspace.yaml`, mesma classe de
problema do Prisma na Sprint 1; (2) `@nestjs/jwt@12.x` (instalado como "latest") é ESM-only
e quebra o runner CommonJS do Jest — pinado em `11.0.2` (última versão CJS compatível com
Nest 11), mesmo problema documentado na Sprint 1 pro `@nestjs/*` core; (3) `cookie-parser`
é CJS puro sem export `.default` e o `tsconfig.json` tinha `allowSyntheticDefaultImports`
mas não `esModuleInterop` — import default quebrava em runtime mesmo compilando limpo;
corrigido adicionando `esModuleInterop: true`. Um quarto bug, de lógica (não de tooling):
o JWT de refresh é determinístico (sem nonce) — duas emissões no mesmo segundo pra
mesma família/usuário geravam o token byte-a-byte idêntico, colidindo no `UNIQUE` de
`token_hash`; corrigido adicionando um claim `jti` aleatório a cada emissão. Todos os 4
bugs foram pegos rodando a suíte de verdade contra o Supabase de homologação antes do
push (sem Postgres/Docker local disponível no ambiente de desenvolvimento) — os 25 testes
e2e (7 arquivos novos + os 2 da Sprint 1, agora reparados após o novo campo obrigatório
`User.passwordHash`) passaram e o homolog foi limpo dos dados de teste depois.

---

## Sprint 3 — Módulo `tenants` + cache

**Entregável:**
- Dois módulos NestJS distintos (nunca o mesmo controller para os dois casos — mesmo cuidado do Barberaria seção 6.4, para não expor rota de plataforma por erro de roteamento):
  - `/v1/admin/tenants/*` — exige `role = platform_superadmin`, sem tenant context, CRUD completo de tenants.
  - `/v1/tenants/me` — exige tenant autenticado, sempre filtra pelo `tenant_id` do JWT, nunca aceita outro ID via parâmetro.
- Branding do tenant: cor primária/secundária + logo, persistidos em `tenants` e cacheados no Redis (TTL curto + invalidação ativa ao editar) — cardápio/config é lido com muito mais frequência do que é escrito.
- **Campo `active` (boolean) em `tenants`** — protótipo já valida a UI (`TenantsManagement.tsx`, switch por tenant). `PATCH /v1/admin/tenants/:id/active` (superadmin only) alterna o campo; o guard de auth (Sprint 2) passa a checar `tenant.active === true` no momento do login, não só no cadastro — desativar um tenant precisa bloquear login imediatamente, não é decorativo.

**Definition of Done:** admin da pizzaria só edita o próprio tenant; tentar editar outro `tenant_id` via payload é rejeitado; desativar um tenant via `/v1/admin/tenants/:id/active` faz o próximo login de `tenant_owner`/`tenant_staff` desse tenant falhar com 403.

**✅ Concluída em 2026-08-31.** Três divergências de escopo confirmadas com o usuário
antes de implementar (`AskUserQuestion`), todas puxando pra design/protótipo já validado
em vez do texto mais antigo da arquitetura: (1) **uma cor de acento só** (`primaryColor`),
não "primária/secundária" — bate com `docs/DESIGN_JORNADA_CLIENTE.md` e com o formulário
real (`TenantForm.tsx` só tem um seletor de cor); (2) **`logo` como emoji curto**, não
URL/upload — o protótipo trata como `Input maxLength={2}`; (3) **incluídos agora
`phone`/`address`/`deliveryFee`/`minOrder`** (o protótipo já espera, evita retrabalho de
migration na Sprint 10) — **`planId` deliberadamente fora** (Sprint 4). Foi adicionada
também uma quarta rota não prevista no texto original, `GET /v1/public/tenants/:slug`
(sem auth) — sem ela, nenhuma das duas rotas listadas acima tem tráfego alto o bastante
pra justificar o próprio requisito de cache Redis do enunciado.
`Tenant` ganhou as primeiras colunas monetárias do schema (`deliveryFee`/`minOrder`,
`Decimal(10,2)` — define o padrão pra `products.price` na Sprint 5); todo response
mapeia `.toNumber()` explicitamente, já que `Prisma.Decimal` serializa como string por
padrão. `CacheModule` (Redis via `ioredis` com fallback in-memory quando `REDIS_URL` não
está setada) segue o mesmo padrão do Barberaria — infra opcional, sem exigir Upstash
agora; CI ganhou um serviço `redis:7` efêmero pra exercitar o caminho real do Redis pelo
menos uma vez (sem isso, só o fallback rodaria em qualquer lugar). 48 specs e2e verdes
(5 novos + os 43 das Sprints 1/2), verificados contra o homolog real antes do push.

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

**✅ Concluída em 2026-08-31.** Pesquisado o Barberaria antes de planejar — achado um
limite real: ele tem CRUD de `Plan`/`Subscription` funcionando, mas **nunca construiu
guard de feature-gating nenhum** (nunca teve módulo pago pra travar). Só o CRUD teve
referência validada pra espelhar; o `ModuleGuard` foi desenho novo, sem precedente em
nenhum dos dois projetos.

Ajustes de escopo sobre o snippet original da doc (copiado do Barberaria sem adaptar às
convenções já em uso neste schema): `Plan.id`/`Subscription.id` usam `uuid()` (não
`cuid()` — todo outro model do schema já usa uuid); `Plan.price` é `Decimal(10,2)` em
reais, não `priceCents Int` em centavos (mesma convenção monetária da Sprint 3,
`Tenant.deliveryFee`/`minOrder` — evita uma segunda convenção pra um campo só, e bate
com o protótipo real que já usa `price: number` em reais); sem FK composta entre
`Subscription` e `Tenant`/`Plan` (o padrão de FK composta do Sprint 2 exige duas tabelas
RLS-protegidas compartilhando `tenant_id` — não é o caso aqui, `Tenant`/`Plan` não têm
`tenant_id` nenhum pra compor contra); sem `GET /admin/subscriptions` (lista cross-tenant,
não pedida pela doc, fica pra quando a Sprint 10 precisar de verdade).

Confirmado com o usuário (`AskUserQuestion`): manter a tabela `Subscription` separada
(status/data de início), não simplificar pra um `Tenant.planId` direto como o protótipo
real (`@pizza/types`) sugeriria — custo extra pequeno, abre espaço pra histórico depois.
`Subscription` nasceu com RLS real desde o início (o Barberaria só percebeu no meio da
implementação que precisava disso e reverteu a decisão original de deixá-la RLS-exempt
como `Plan`).

`ModuleGuard` resolvido com um detalhe de ordenamento que não tinha como copiar de
lugar nenhum: guards rodam ANTES de interceptors no pipeline do Nest, então
`@CurrentTenant()`/a transação do `TenantContextInterceptor` ainda não existem durante
`canActivate()` — o guard abre sua própria transação curta via `TenantContextService`
diretamente. Cacheado via o `CacheService` já existente (chave
`subscription:tenant:<id>`, TTL 60s — mais curto que o de branding, isso trava acesso
pago) com um cuidado real: nunca cachear um `null` cru (`CacheService.get()` não
distingue "não está no cache" de "tenant sem assinatura"), sempre um wrapper
`{found, status, modules}`. Sem assinatura ou assinatura cancelada → 403, mesmo critério
de "módulo não incluso". Testado primeiro com um spec unitário (mocks, sem HTTP/banco)
antes de qualquer wiring HTTP — mesmo padrão usado pra rotação de refresh token na
Sprint 2.

DoD literal ("teste automatizado... não só verificação manual") satisfeito via uma rota
fixture claramente temporária (`src/module-gate-fixture/`, comentário explícito pra
apagar quando `/v1/inventory` nascer na Sprint 6) — `inventory`/`financial` ainda não
existem, então não fazia sentido antecipar o desenho deles só pra ter uma rota de teste.

68 specs e2e verdes (4 novos arquivos + os 64 das Sprints 1-3), validados contra o
homolog real antes do push (sem Postgres/Docker local disponível neste ambiente de
desenvolvimento).

---

## Sprint 5 — Módulo `catalog`

**Entregável:**
- CRUD de `products`/`categories`, upload de imagem via URL assinada do Supabase Storage — nunca upload direto passando pelo backend sem validação de tipo/tamanho.
- **`categories` é uma tabela tenant-scoped de verdade** (não um enum fixo) — cada pizzaria cadastra as próprias categorias de sabor (ex.: Clássicas, Carnes, Frango, Queijos, Doces). Isso já está validado no protótipo (`Category` em `mockData.ts`, criação inline em `MenuManagement.tsx`/`ProductForm.tsx`) — esta sprint só troca o `useState` local por persistência real, o comportamento de UI não muda.
- Disponibilidade de item (em falta / disponível).

**Definition of Done:** teste do item 5 da seção 3.2 da arquitetura (FK composta) passando — associar um produto de outro tenant a uma categoria/pedido deve falhar no banco, não só na aplicação.

**✅ Concluída em 2026-08-31.** Pesquisado o Barberaria antes de planejar — ele **não tem
conceito de categoria nenhum** (catálogo dele, `Service`, é plano), então a metade
"categorias tenant-scoped" desta sprint não teve nenhuma referência pra espelhar; o que
ele já validou foi só o mecanismo de FK composta (`professional_services` → `services`),
confirmando que o padrão já usado no Sprint 2 (`refresh_tokens` → `users`) estava certo
e é reaplicável sem inventar nada novo.

**Correção de escopo registrada**: o item 5 da §3.2 fala literalmente de
`order_items` → `products`, mas `orders`/`order_items` só nascem na Sprint 7 — esta
sprint só constrói a primeira metade da cadeia (`products` → `categories`), com um teste
dedicado que bypassa de propósito o pre-check de RLS do `ProductsService` (que faz o
caminho normal da aplicação nunca tocar na FK de verdade) pra provar que a constraint do
banco em si funciona. A metade `order_items`→`products` fica pra Sprint 7 por
dependência real.

**Confirmado com o usuário via `AskUserQuestion`**: `image` fica como URL simples (texto),
não upload real via Supabase Storage — infra nova que não existe no projeto ainda, e nem
o Barberaria resolveu isso de verdade (só um upload local em disco, marcado como
gambiarra temporária no código dele). Outros ajustes sem precedente no protótipo: sem
`Category.slug` (nada busca categoria por slug nesta API, diferente de `Tenant.slug`);
sem persistência de tamanho/multiplicador de pizza (continua só constante hardcoded no
frontend); `available` é campo novo sem UI real por trás ainda; sem paginação em
categories/products (catálogo pequeno por tenant, mesmo raciocínio de `plans`).

`Product.price` é a terceira coluna monetária do schema (`Decimal(10,2)`, mesma
convenção de `Tenant.deliveryFee`/`minOrder` e `Plan.price`). 85 specs e2e verdes (3
arquivos novos + os 68 já existentes das Sprints 1-4), validados contra o homolog real
antes do push.

---

## Sprint 6 — Módulo `inventory` (Estoque, add-on pago)

**Novo — nasceu do protótipo `Inventory.tsx` (Painel da Pizzaria → Estoque), validado com o usuário em 2026-08-28.**

**Entregável:**
- `inventory_items` (tenant-scoped, RLS normal): `id`, `tenant_id`, `name`, `unit`, `quantity`, `min_quantity`.
- CRUD real substituindo o mock — mesmo modelo de dados e mesmas regras de status (`quantity <= min_quantity` → alerta) já validadas em `Inventory.tsx`.
- Todas as rotas protegidas por `@RequiresModule('estoque')` (Sprint 4).

**Definition of Done:** tenant sem o módulo `estoque` no plano recebe 403 ao chamar `/v1/inventory` diretamente; UI real (Sprint 9) bate visualmente com o protótipo já aprovado.

**✅ Concluída em 2026-08-31.** Sprint mais simples que as últimas 4 — sem FK composta
(`inventory_items` não referencia nenhuma outra tabela tenant-scoped), sem decisão de
infra nova, sem pesquisa adicional no Barbearia (já confirmado na Sprint 4 que ele nunca
teve módulo pago nenhum). `quantity`/`minQuantity` usam `Decimal(10,2)` mesmo não sendo
dinheiro — quarta aplicação dessa convenção do schema, mesma necessidade de precisão sem
drift de `Float`. Status ("Crítico"/"Baixo"/"OK") continua calculado só no frontend
(`Inventory.tsx`), nunca persistido.

**Primeiro consumidor real do `@RequiresModule('estoque')`** (Sprint 4) — a rota fixture
temporária `_fixtures/estoque-probe` foi apagada (`src/module-gate-fixture/` inteiro +
`ModuleGateFixtureModule` do `app.module.ts`), e as asserções de comportamento do guard
que viviam em `test/plans/module-guard.e2e-spec.ts` migraram pra
`test/inventory/inventory-crud.e2e-spec.ts`, agora testando contra `/v1/inventory` de
verdade em vez da fixture — os 4 cenários (200 com módulo, 403 sem módulo, 403 sem
assinatura, 403 assinatura cancelada) foram reconfirmados manualmente contra o homolog
antes de escrever a versão automatizada. 90 specs e2e verdes (spec de inventory novo,
spec antigo do fixture removido), validados contra o homolog real antes do push.

---

## Sprint 7 — Módulo `orders` + conectar app `cliente`

**Entregável:**
- Criação de pedido, máquina de estados (`pending → preparing → delivery → completed / cancelled`) validada no backend — nunca aceitar status arbitrário vindo do cliente.
- Idempotência na criação (chave de idempotência no header) — teste do item 7 da seção 3.2.
- `order_items` com FK composta contra `orders` e `products` (seção 4.1 da arquitetura).
- **Tela de Cadastro + Login (email/senha) do cliente final** (`MVP.md` item 3 do escopo funcional) — hoje não existe no protótipo (`apps/cliente/src/App.tsx` abre direto no `Menu`, sem tela de autenticação); nasce nesta sprint, consumindo o Auth da Sprint 2. Após login, o Checkout deixa de usar o `mockCustomer` fixo (`data/mockData.ts`) e passa a pré-preencher nome/telefone/endereço a partir do cadastro real do cliente autenticado — mesmo comportamento já prototipado, dado real em vez de mock.
- `apps/cliente` (Sprint 0) conectado à API real, substituindo `mockData.ts` na camada de repositório já isolada.

**Definition of Done:** cliente cria conta, faz login, monta pedido (inclusive meio a meio), faz checkout com endereço pré-carregado do próprio cadastro e pagamento na entrega, pedido é persistido; duas requisições simultâneas com a mesma chave de idempotência geram só 1 pedido.

**✅ Concluída em 2026-08-31.** Maior sprint até agora — backend (`orders`) e frontend
(`apps/cliente`) planejados e construídos juntos, por decisão explícita do usuário. Sem
pesquisa nova no Barbearia pra state machine/idempotência: pesquisa já feita confirmou que
ele não tem mecanismo de idempotência nenhum (desenho novo) e sua validação de transição é
só `if` solto por método, sem utilitário compartilhado (aqui optou-se por um mapa de
transições único, dado que pedido tem mais ramificações que os agendamentos dele).

Decisões e divergências reais:
- **Perfil do cliente**: `User` estendido com `phone/address/addressNumber/complement/
  neighborhood` (nullable, só preenchido pra `role:'customer'`) em vez da tabela `Customer`
  separada que o esboço ER da arquitetura sugere — decisão tomada com o usuário nesta
  sprint, reaproveitando o self-service `/v1/users/me` (Sprint 2) já pronto para isso
  (`User.@@unique([tenantId,id])` já tinha sido deixado preparado pra esse reuso).
- **`order_items`**: primeiro caso do schema com 3 pernas de FK composta hand-written —
  `(tenant_id,order_id)→orders`, `(tenant_id,product_id)→products`,
  `(tenant_id,second_product_id)→products` (nullable, meio a meio). `Product` ganhou o
  campo `type` (`'pizza'|'drink'`) pra `order_items` saber como calcular preço sem
  casamento frágil por nome de categoria.
- **Idempotência — bug real encontrado no smoke test manual**: o desenho original
  (inserir, capturar `P2002`, reconsultar o pedido já existente **na mesma transação**)
  falhava com `25P02 current transaction is aborted` — Postgres aborta a transação
  INTEIRA após qualquer erro, então nenhuma query seguinte no mesmo `tx` funciona depois
  de um `P2002`. Corrigido fazendo `OrdersService.create` abrir as **próprias** transações
  (via `TenantContextService`, não o `tx` do `TenantContextInterceptor`): a tentativa de
  inserção numa transação, e — só se colidir — a reconsulta numa transação NOVA. Também
  descoberto que `err.meta.target` vem `null` no driver Postgres do Prisma dentro de uma
  transação interativa (mesmo em versões onde outros caminhos populam `target`) — não dá
  pra distinguir qual `@@unique` disparou por aí; tratado qualquer `P2002` deste insert
  como a colisão de idempotência (seguro, já que `id` é UUID gerado no servidor).
- **Catálogo público novo** (`GET /v1/public/tenants/:slug/catalog`, `src/catalog-public/`):
  resolve tenant por slug (leitura direta, `Tenant` não tem RLS) e abre a própria
  `runInTenantContext` pra ler `categories`/`products` (que têm RLS) sem JWT nenhum —
  cache só com TTL curto (60s), sem invalidação ativa, mesmo padrão de `tenants-public`.
- **Branding público estendido**: `GET /v1/public/tenants/:slug` ganhou `deliveryFee`/
  `minOrder` (`tenant-response.util.ts`) — divergência do comentário original da Sprint 3
  ("nunca expor deliveryFee/minOrder"), mas `apps/cliente` precisa desses dois pra montar
  o total do carrinho antes do checkout confirmar (preço de verdade continua sempre
  recalculado no servidor). `active/phone/address` continuam de fora.
- **`POST /v1/auth/register`**: estende `AuthController`/`AuthService` existentes (não
  módulo novo) — sempre `role:'customer'`, sempre tenant-scoped, auto-login via
  `issueTokens()` reaproveitado do `login()`.
- **`apps/cliente`**: `repository.ts` reescrito (único arquivo que muda, por desenho desde
  a Sprint 0) — `mockTenant/mockCategories/mockPizzas/mockDrinks/mockCustomer` continuam
  como bindings `let` de nível de módulo (não viraram funções): `loadCatalog()`/login
  reatribuem esses bindings depois de resolver, e `Menu.tsx`/`PizzaBuilder.tsx`/`Cart.tsx`
  continuam lendo-os do jeito síncrono de sempre — nenhum desses três precisou mudar.
  `App.tsx` só renderiza a tela real depois que `loadCatalog()`/`tryRestoreSession()`
  resolvem. `Checkout.tsx`/`OrderConfirmation.tsx` perderam toda a linguagem de WhatsApp
  (não é MVP, `docs/MVP.md` linha 23/78) — confirmação agora faz polling real de status
  (`GET /v1/orders/:id` a cada 10s, item 9 do `MVP.md`). Resolução de tenant
  (`data/tenant.ts`) usa o primeiro label do hostname em produção (item 5 do `MVP.md`,
  ainda sem hosting real) com fallback `VITE_TENANT_SLUG` pro Vite dev local.
- **Risco conhecido, não corrigido nesta sprint**: cookie de refresh é `SameSite=Strict`
  (decisão da Sprint 2) — funciona testando `apps/cliente` contra uma `apps/api` rodando
  **localmente** (mesmo domínio registrável, fluxo de dev natural), mas não funcionaria
  chamando a API já publicada no Render direto do Vite dev local (domínio registrável
  diferente). Revisitar quando `apps/cliente` ganhar hosting de verdade.

103 specs e2e verdes (13 novos: `test/orders/{orders-crud,idempotency,order-composite-fk}
.e2e-spec.ts`), incluindo o teste literal de concorrência real (`Promise.all` de 2 POSTs
idênticos) e o de FK composta cross-tenant, validados manualmente contra o homolog antes
de escrever as versões automatizadas.

---

## Sprint 8 — Módulo `financial` (Financeiro, add-on pago)

**Novo — nasceu do protótipo `Financial.tsx` (Painel da Pizzaria → Financeiro), validado com o usuário em 2026-08-28. Depende de `orders` (Sprint 7) porque a receita do período é agregada a partir de pedidos reais, não é um dado próprio do módulo.**

**Entregável:**
- `expenses` (tenant-scoped, RLS normal): `id`, `tenant_id`, `description`, `category`, `amount_cents`, `date`. CRUD real substituindo o mock já validado em `Financial.tsx`.
- Endpoint de receita: agrega `orders.total` por tenant e por dia num intervalo (substitui o `mockDailyRevenue` do protótipo) — consulta, não tabela própria (a receita **é** os pedidos, não um dado duplicado).
- Todas as rotas protegidas por `@RequiresModule('financeiro')` (Sprint 4).

**Definition of Done:** gráfico Receita × Despesas do painel passa a refletir pedidos e despesas reais do tenant; tenant sem o módulo `financeiro` no plano recebe 403 ao chamar `/v1/financial/*` diretamente.

**✅ Concluída em 2026-08-31.** Sprint bem menor/mais contida que a Sprint 7 — sem
pesquisa nova no Barbearia (já confirmado desde a Sprint 4 que ele nunca teve nenhum
módulo pago). Escopo ficou **só backend**, mesmo o texto acima sugerindo "substituindo o
mock de `Financial.tsx`": a própria Sprint 9 já lista "Telas de Estoque (Sprint 6) **e
Financeiro (Sprint 8)** conectadas à API real" como entregável dela, confirmando que a
Sprint 6 (mesma ambiguidade no texto) foi backend-only e a conexão do painel ficou pra
lá — mesmo padrão aplicado aqui.

**Correção de escopo** (mesma categoria da correção de `Plan.price` na Sprint 4): o texto
original listava `amount_cents` — cópia do padrão em centavos do Barbearia. `Expense.
amount` é `Decimal(10,2)` em reais, quinta aplicação dessa convenção (depois de
`Tenant.deliveryFee`/`minOrder`, `Plan.price`, `Product.price`,
`InventoryItem.quantity`/`minQuantity`, `Order.total`/`deliveryFee`/`OrderItem.unitPrice`)
— o próprio protótipo (`Financial.tsx`/`mockData.ts`) já usa `Expense.amount: number` em
reais, confirmando.

**Decisão confirmada com o usuário**: receita conta só pedidos `status='completed'` —
pagamento é na entrega, `pending`/`preparing`/`delivery` ainda não é dinheiro que entrou
de verdade, `cancelled` obviamente não conta.

`Expense` — tenant-owned, RLS estrita (mesma forma de `Category`/`Product`/
`InventoryItem`), sem FK composta (não referencia nenhuma outra tabela tenant-scoped,
mesmo caso de `InventoryItem`). `category` é lista fechada de 3 valores
(`'Insumos'|'Fixas'|'Outras'`, igual o protótipo), validada só no DTO via `@IsIn`, sem
CHECK no banco (mesmo padrão de `Product.type`). `date` usa `@db.Date` (só a data, sem
hora), diferente de `createdAt`/`updatedAt`.

`src/financial/` — `ExpensesController`/`RevenueController` no mesmo módulo (mesmo padrão
multi-controller de `CatalogModule`), guard stack idêntico ao `InventoryController`
(primeiro precedente real de "recurso único + `ModuleGuard`", Sprint 6):
`JwtAuthGuard, RolesGuard, ModuleGuard` + `TenantContextInterceptor` + `@Roles('tenant_owner',
'tenant_staff')` + `@RequiresModule('financeiro')`. `RevenueService.getDailyRevenue`
agrega em JS (não `$queryRaw`/`groupBy` com `DATE_TRUNC` — primeiro lugar do projeto que
precisaria de SQL bruto em runtime, desnecessário na escala de uma pizzaria individual),
preenchendo todo o intervalo pedido com `revenue: 0` nos dias sem pedido `completed`.

Nenhum bug de aplicação encontrado no smoke test manual desta vez — só um erro no próprio
script de smoke test (tentei trocar a assinatura de UM tenant no meio do teste via Prisma
direto, sem passar pelo `SubscriptionsAdminService` que invalida o cache do `ModuleGuard`
— a checagem seguinte bateu no cache de 60s ainda com o resultado antigo. Não é bug do
app, é o comportamento documentado do guard; corrigido usando tenants separados por
cenário, mesmo padrão que `inventory-crud.e2e-spec.ts` já usa). 116 specs e2e verdes (13
novos: `test/financial/{expenses-crud,revenue}.e2e-spec.ts`), validados manualmente
contra o homolog antes de escrever as versões automatizadas.

---

## Sprint 9 — Conectar painel `pizzaria`

**Entregável:**
- **Tela de Login (email/senha) de owner/staff da pizzaria** (`MVP.md` item 2 do escopo funcional) — hoje não existe no protótipo (`apps/pizzaria` abre direto no painel, sem autenticação); nasce nesta sprint, consumindo o Auth da Sprint 2. Sessão expirada/token inválido redireciona pra essa tela, não deixa a SPA num estado quebrado.
- `apps/pizzaria` (Sprint 0) conectado à API real: CRUD de cardápio, visualização de pedidos novos via **polling** (não WebSocket — fora do MVP, ver `MVP.md` seção 4), atualização de status.
- Telas de Estoque (Sprint 6) e Financeiro (Sprint 8) conectadas à API real, com o estado de cadeado/upsell (`AddonUpsell.tsx`, já prototipado) refletindo `subscription.plan.modules` de verdade em vez do `useState` local de demonstração.

**Definition of Done:** owner/staff faz login e só enxerga dados do próprio tenant; pedido criado pelo cliente aparece no painel da pizzaria via polling em tempo hábil; status é atualizável e reflete no acompanhamento do cliente; Estoque/Financeiro aparecem liberados ou bloqueados de acordo com o plano real do tenant, não mais um toggle manual em Configurações.

**✅ Concluída em 2026-08-31.** Sprint 100% de wiring frontend (`apps/pizzaria`) — nenhum
módulo de negócio novo no backend, só uma rota pequena que faltava.

**Gap real encontrado na pesquisa**: não existia nenhum endpoint que um `tenant_owner`/
`tenant_staff` autenticado pudesse chamar pra saber os módulos do próprio plano —
`/v1/tenants/me` não inclui isso, `/v1/admin/tenants/:id/subscription` é
`platform_superadmin`-only. Adicionado `GET /v1/tenants/me/subscription` em
`TenantsController` (`@UseInterceptors(TenantContextInterceptor)` só neste handler, já
que `Subscription` tem RLS e `Tenant` não — mesmo padrão de guard por método já usado em
`OrdersController` na Sprint 7). Sem assinatura retorna 200 com `modules:[]` (não 404 —
estado normal, não erro). `apps/api/.env.example`: `CORS_ORIGIN` ganhou a origem do
`apps/pizzaria` (porta 5174).

`apps/pizzaria` seguiu o mesmo template da Sprint 7 (`data/api.ts`, `data/tenant.ts`),
mas com uma diferença real de arquitetura: o truque de "binding `let` reatribuído uma vez
no boot" do `apps/cliente` só funciona pra dado só-leitura lido antes do primeiro render
(catálogo de navegação). Aqui o painel faz CRUD de verdade em vários recursos
(produtos, estoque, despesas) — cada tela (`Inventory.tsx`, `Financial.tsx`,
`OrdersPanel.tsx`, `Dashboard.tsx`) busca e gerencia seus próprios dados via
`useEffect`+`useState`, chamando funções assíncronas simples do repository (não bindings
reatribuídos); só `mockTenant`/`mockCategories`/`mockPizzas`/`unlockedModules` continuam
como valor inicial de `useState` lifted em `App.tsx` (mesmo papel de sempre, só que agora
alimentando estado real de categorias/produtos com CRUD, não mais leitura pura).

**Descoberta real durante a implementação**: o formato de pedido do mock antigo
(`@pizza/types`'s `Order`/`CartItem`, com `pizza.flavors: Pizza[]` completo) não bate com
o `OrderResponse`/`OrderItemResponse` real da API (Sprint 7) — o backend guarda um
snapshot achatado (`name` já concatenado tipo "Marguerita + Calabresa", `unitPrice`,
sem os objetos `Pizza` completos dos sabores, de propósito: preço/nome não podem
depender de o produto ainda existir/ter o mesmo preço depois). `OrdersPanel.tsx`/
`OrderDetails.tsx` precisaram de edição de verdade (não só `repository.ts`) pra consumir
esse formato mais simples — mesmo precedente já visto na Sprint 7 (`Checkout.tsx`/
`OrderConfirmation.tsx` também precisaram de reescrita real, não só a camada de dados).
Removido de `OrderDetails.tsx`: a taxa de entrega hardcoded (`order.total - 8`, agora usa
`order.deliveryFee` real) e o card de "Timeline" (dependia de um horário fake tipo
"18:35" pro passo "Em preparo" — sem dado real equivalente, removido em vez de inventado).

**Escopo mantido no que já existia, sem inventar tela nova**: `MenuManagement.tsx` nunca
teve gestão de bebida (só pizza) — continua filtrando produtos por `type==='pizza'`,
gap conhecido e deliberado (conectar o que já existe, não construir UI nova). Campo
`Product.available` também não ganhou UI nova (já era um gap conhecido desde a Sprint 5).

**`Dashboard.tsx`** — antes 100% dado inventado (nenhum import de `repository`), sem
pedido explícito no DoD literal desta sprint. Incluído mesmo assim (primeira tela que o
dono vê pós-login, deixá-la fake seria pior que antes de logar) — derivado 100% dos
mesmos dados já buscados por `getOrders()`/`getRevenue()`, sem endpoint novo: vendas/
pedidos/ticket médio/tempo médio de hoje, gráfico semanal (reaproveita `getRevenue()`),
pedidos por hora (agrupado client-side), produtos mais vendidos (agregado dos itens de
pedidos `completed`). Percentuais de tendência (`+12%` etc.) removidos — não há período
anterior real pra comparar, mostrar um número real sem tendência é melhor que fabricar
uma.

**`Settings.tsx`/`AddonUpsell.tsx`**: card "Pacotes Opcionais" (toggle manual) removido
por completo — DoD literal confirma. `AddonUpsell`'s botão "Contratar módulo" (que só
fingia ativar o módulo) virou mensagem informativa — sem fluxo de compra in-app (sem
pagamento online, fora do MVP), contratar um add-on é ação comercial fora do próprio
painel do tenant.

Nenhum bug de aplicação no smoke test manual — só a rota nova (seção acima). 121 specs
e2e verdes (5 novos: `test/tenants/tenants-me-subscription.e2e-spec.ts`). Fluxo completo
(login → boot → CRUD de cardápio → pedidos → status → estoque → financeiro) validado via
chamadas HTTP diretas simulando exatamente o que o frontend chama, contra o homolog —
sem ferramenta de browser neste ambiente (mesma limitação da Sprint 7), servidores
locais deixados no ar (`apps/api` :3000, `apps/pizzaria` :5174) contra o tenant demo
`demo-sprint7` (já seedado com assinatura completa, estoque e despesas) pro usuário
clicar.

---

## Sprint 10 — Conectar `admin-pizzarias`

**Entregável:**
- **Tela de Login (email/senha) do `platform_superadmin`** — hoje não existe no protótipo (`apps/admin-pizzarias` abre direto no painel, sem autenticação); nasce nesta sprint, consumindo o Auth da Sprint 2.
- `apps/admin-pizzarias` (Sprint 0) conectado à API real: CRUD de tenants (`/v1/admin/tenants`, já existente desde a Sprint 3), onboarding de nova pizzaria (cria tenant + admin + assinatura numa única transação — mesmo padrão usado no Barberaria para onboarding de barbearia).
- Tela **Planos & Preços** (`PlansManagement.tsx`, já prototipada) conectada a `/v1/admin/plans` (Sprint 4) — CRUD real de planos, não mais `useState` local.
- Ativar/desativar tenant (`TenantsManagement.tsx`, já prototipado) conectado a `/v1/admin/tenants/:id/active` (Sprint 3) — passa a bloquear login de verdade, não só trocar a badge.
- Dashboard básico: contagem de tenants, pedidos do mês — sem métricas financeiras de plataforma (billing da própria DesenvolvaINC fica fora do MVP, `MVP.md` seção 4; billing é o que o *tenant* paga à plataforma, já coberto pelo módulo `plans`).

**Definition of Done:** superadmin cria uma pizzaria nova pelo painel (não via seed manual no banco), atribuindo um plano no fluxo de onboarding, e o tenant criado consegue logar em `apps/pizzaria` imediatamente com os módulos do plano escolhido já liberados.

**Nota:** esta sprint só depende da Sprint 4 (módulo `plans`), não precisa esperar Inventory/Orders/Financial — pode ser adiantada em paralelo, mesma flexibilidade que o Barberaria explorou ao construir `admin-desenvolvain` em paralelo aos outros dois frontends.

**✅ Concluída em 2026-08-31.** Última sprint de conexão de frontend antes do piloto
(Sprint 11).

**Gap real de trabalho novo, não só wiring**: onboarding atômico (tenant + dono +
assinatura numa transação só) não existia em lugar nenhum do código — `POST
/v1/admin/tenants` sempre só criou a linha de `Tenant`; não havia endpoint algum pra
criar um usuário `tenant_owner` fora do `scripts/seed-auth-users.ts` manual; e o único
precedente de "tenant + dono" (`test/utils/seed-tenant.ts`) faz isso em duas transações
separadas, não atômico. Construído do zero: `TenantOnboardingService` (módulo
`TenantsAdminModule`, separado de `TenantsAdminService` — mesmo espírito de separar
`ExpensesService`/`RevenueService` na Sprint 8) abrindo uma única
`prisma.$transaction` que cria o tenant, faz `SET LOCAL app.current_tenant_id` pro
próprio tenant recém-criado **na mesma transação**, e só depois cria o dono
(`role:'tenant_owner'`) e a assinatura — funciona porque MVCC garante leitura-da-
própria-escrita dentro de uma transação (RLS/FK enxergam o tenant mesmo ele ainda não
tendo committado pra fora). Testado explicitamente que um `planId` inválido não deixa
tenant órfão (a prova real de atomicidade).

**Segundo gap real de pesquisa**: `orders` tem RLS forçada, e a role de banco da
aplicação (`pizza_app`, `NOSUPERUSER NOBYPASSRLS`) nunca pode ler entre tenants numa
query só. "Pedidos do mês" da plataforma inteira (`GET /v1/admin/dashboard`, novo em
`AdminController`) precisa iterar tenant por tenant via `runInTenantContext` e somar —
não um bug, é o próprio modelo de isolamento funcionando como desenhado; aceitável na
escala de MVP/piloto (poucos tenants), documentado no código pra quem ler depois.

`GET /v1/admin/tenants` ganhou um resumo de assinatura por tenant (mesmo shape de
`GET /v1/tenants/me/subscription` da Sprint 9) — sem isso o badge de plano que
`TenantsManagement.tsx` já mostrava no mock ficaria pior que o protótipo.

Frontend seguiu o mesmo template da Sprint 9 (login, `data/api.ts`, cada tela buscando
os próprios dados). `TenantForm.tsx` bifurca por modo: **criar** mostra dados do
proprietário (com o campo de **senha** que o mock nunca teve — login real exige) e
plano, chamando o onboarding atômico numa chamada só; **editar** esconde a seção de
dono (sem endpoint pra alterar email/senha de um dono existente, fora de escopo) mas
mantém a troca de plano, reaproveitando `PATCH /v1/admin/tenants/:tenantId/subscription`
da Sprint 4 — endpoint que existia desde então mas nunca tinha ganho UI nenhuma.
`AdminDashboard.tsx` teve o gráfico de receita da plataforma/pizza de planos/ranking de
tenants por receita **removido**, não conectado — não pedido pelo DoD, e "receita da
plataforma" nem é um conceito que este projeto modela (a receita real é do *tenant*,
módulo `financial`).

**Lição operacional, não um bug de aplicação**: a primeira tentativa de rodar a suíte
e2e completa desta sprint deu 28 falhas (timeouts de hook + violação de FK no cleanup)
— não era regressão nenhuma, era os 3 servidores locais (`apps/api` +
`apps/pizzaria` + `apps/admin-pizzarias`, todos conectados ao mesmo pooler do
Supabase) competindo por conexão com a suíte Jest rodando ao mesmo tempo. Parando os
servidores locais antes de rodar a suíte, 129/129 passaram de novo. **Lembrete pra
próxima vez**: nunca rodar a suíte e2e completa com servidores de dev locais abertos
apontando pro mesmo homolog.

129 specs e2e verdes (8 novos: `test/tenants/admin-tenants-onboard.e2e-spec.ts`,
`test/admin/admin-dashboard.e2e-spec.ts`), fluxo completo (login superadmin →
onboarding → login do dono recém-criado em `apps/pizzaria` → módulos liberados →
editar plano de tenant existente → CRUD de planos → dashboard) validado via chamadas
HTTP diretas contra o homolog antes das versões automatizadas. Sem ferramenta de
browser neste ambiente (mesma limitação das Sprints 7/9) — os três servidores locais
ficaram no ar pro usuário clicar, com o superadmin de QA já seedado
(`scripts/seed-auth-users.ts`).

---

## Sprint 11 — Piloto com pizzaria real

**Entregável:** ajustes decorrentes de uso real por 1 tenant piloto em staging — cardápio verdadeiro, pedidos reais (sem dinheiro real trafegando, pagamento na entrega), estoque e financeiro reais se o tenant piloto contratar esses módulos.

**Expectativa realista, com base na experiência do Barberaria:** a sprint de piloto quase sempre revela pelo menos um ajuste real de schema/regra de negócio que não aparece em nenhuma sprint anterior (no Barberaria: campo `active` em profissionais, status `needs_reschedule`, bug de timezone). Reserve esta sprint para isso — não para funcionalidade nova de escopo.

**Definition of Done:** os critérios de aceite do MVP, seção 7 do `MVP.md`, todos verificados em staging com dado real do tenant piloto.

---

## 2. O que fica registrado aqui conforme as sprints avançam

Siga a mesma convenção do `CLAUDE.md` do Barberaria: cada ajuste real de escopo, bug de arquitetura corrigido, ou decisão revista durante a implementação (não durante o planejamento) vira uma entrada datada no topo deste documento ou uma nota dentro da sprint correspondente — nunca reescreva silenciosamente uma sprint já concluída como se tivesse sido assim desde o início.
