# Pizzaria Sprints — histórico completo do projeto
### SaaS White-Label para Pizzarias — do MVP em sprints ao roadmap pós-piloto

---

## 0. Como usar este documento

Este é o **único** documento de sprints do projeto — consolida em 2026-09-26 o antigo
`docs/MVP_SPRINTS.md` (Sprints 0-11, escopo original do MVP) com todo o roadmap
planejado e executado depois disso (Sprint 11a em diante: CEP/telefone/e-mail no
cadastro, upload de imagem, performance/escala, usuários cross-tenant, horário de
funcionamento, e a "Mudança de Dashboard"), que até aqui só existia num arquivo de
plano de sessão, fora do repositório. Documento vivo: cada ajuste real de escopo, bug
de arquitetura corrigido, ou decisão revista durante a implementação vira uma nota
datada na sprint correspondente — nunca reescreva silenciosamente uma sprint já
concluída como se tivesse sido assim desde o início (mesma convenção usada desde o
início do projeto, herdada do `CLAUDE.md` do projeto irmão Barberaria).

**Não pule etapas nem antecipe escopo fora do MVP** (`MVP.md` seção 4) sem confirmar
antes.

**Legenda de status**: ✅ concluída/implementada · 🟡 parcialmente implementada ·
⏳ desenhada, aguardando implementação · ❌ substituída/descartada.

---

## 1. Visão geral — todas as sprints e planos

| # | Entregável | Status |
|---|---|---|
| 0 | Separação dos 3 frontends (`cliente`, `pizzaria`, `admin-pizzarias`) | ✅ |
| 1 | Infra base + schema (`tenants`, `users`) + RLS + pooling + testes de isolamento | ✅ |
| 2 | Auth (JWT + refresh) + RBAC + guards | ✅ |
| 3 | Módulo `tenants` (rotas admin/tenant, branding, ativar/desativar) + cache | ✅ |
| 4 | Módulo `plans` (catálogo + assinatura + feature-gating) | ✅ |
| 5 | Módulo `catalog` (produtos, categorias, imagem) | ✅ |
| 6 | Módulo `inventory` (Estoque, add-on pago) | ✅ |
| 7 | Módulo `orders` + conectar app `cliente` | ✅ |
| 8 | Módulo `financial` (Financeiro, add-on pago) | ✅ |
| 9 | Conectar painel `pizzaria` ao backend real | ✅ |
| 10 | Conectar `admin-pizzarias` ao backend real | ✅ |
| 11a | Infra do piloto (deploy Vercel, cookie cross-site, CORS) | ✅ |
| 12 | CEP no checkout (validação real via ViaCEP) | ✅ |
| 13 | Telefone + endereço no cadastro | ✅ |
| 14 | Confirmação de e-mail | ✅ |
| 11b | Fechar o piloto com tenant real | ⏳ |
| 15 | Rate limiting + audit log + secrets no CI | ✅ |
| 16 | Upload de imagem real (Supabase Storage) | ✅ |
| — | Plano à parte: responsividade mobile | ✅ |
| — | Plano à parte: código de pedido sequencial por dia | ✅ |
| — | Plano à parte: CNPJ da pizzaria | ✅ |
| — | Plano à parte: redesenho do Financeiro | ✅ |
| — | Plano à parte: app nas lojas (Sprints 17-21) | ⏳ (não iniciado) |
| — | Plano à parte: tema claro/escuro no app Cliente | ✅ |
| — | Plano à parte: tela de consulta do audit log | ⏳ (protótipo aprovado) |
| — | Plano à parte: Sprint "Equipe" (cadastro de funcionários) | ✅ |
| 22 | Eliminar N transações por tenant (resumo de assinatura) | ✅ |
| 23 | Cache do dashboard | ✅ |
| 24 | Corte às 5h (Dashboard/OrdersPanel/orderCode) + top-products + Financeiro por período | ✅ |
| 25 | Concorrência no checkout (pedido fantasma) | 🟡 |
| 26 | Diretório de usuários cross-tenant (admin) | ✅ |
| 27 | Horário de funcionamento + loja aberta/fechada | ✅ |
| 28 | Job batch pra denormalizar pedidos/usuários no Dashboard | ❌ (substituída) |
| — | **Mudança de Dashboard** (remove agregado cross-tenant, consulta por pizzaria) | ✅ |
| — | Usuários dentro de Vendas por Pizzaria (sai da tela cross-tenant lenta) | ✅ |
| — | Pizzaria nasce com a loja fechada por padrão | ✅ |
| — | **Desempenho Sistema** (`GET /orders` sem filtro, `/financial/expenses` sem filtro) | ✅ |

Backlog sem sprint definida: pagamento online, notificações WhatsApp, MFA,
WebSocket/realtime, exportação/exclusão LGPD formal, pentest externo, observabilidade
completa (OTel/Grafana), particionamento de `orders`, Redis real em produção, vault de
secrets dedicado, code-splitting dos 3 frontends.

---

# Parte 1 — MVP em sprints (Sprints 0-11)

## Sprint 0 — Separação dos 3 frontends

**Detalhe completo:** `PLANO_SEPARACAO_FRONTENDS.md` (Fases A–E).

**Entregável:** `apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias` rodando de forma
independente (builds/portas separadas), consumindo um `packages/ui` compartilhado (56
componentes shadcn/Radix unificados). `HomePage.tsx` e os componentes de UI vestigiais
removidos.

**✅ Concluída em 2026-08-28.** Ajuste real de escopo encontrado na execução:
`components/{Button,Card,Badge,Input,Textarea}.tsx` (não `components/ui/`) é o que é
realmente usado em quase todo componente de feature; `components/ui/` (48 arquivos
shadcn/Radix) estava quase toda morta, só `ui/switch.tsx` tinha uso real. `tsc --noEmit`
acusou isso ao deletar por engano os 5 arquivos reais — restaurados, e `packages/ui` foi
montado com o conjunto certo (caiu de ~37 dependências radix pra 3). `apps/cliente` roda
em 5173, `apps/pizzaria` em 5174, `apps/admin-pizzarias` em 5175.

---

## Sprint 1 — Infra base + schema + RLS + pooling + testes de isolamento

**Entregável:**
- Projeto Supabase (Postgres gerenciado) + serviço Render (backend NestJS) + CI/CD no GitHub Actions.
- `schema.prisma` inicial: `tenants`, `users` (`role VARCHAR(20)`, sem tabela `roles`/`permissions` separada), `CHECK` garantindo que só `platform_superadmin` tem `tenant_id NULL`.
- Migration inicial já incluindo as policies de RLS (exceto `tenants`, fora por design).
- `TenantContextInterceptor`: transação interativa por requisição, `set_config` com escopo `LOCAL`, uso obrigatório do client transacional (`tx`).
- Gate de RLS no CI: quebra o build se alguma tabela com `tenant_id` não tiver `relrowsecurity = true`.
- Testes automatizados de isolamento básico e vazamento de contexto sob connection pooling.

**✅ Concluída em 2026-08-30.** `TenantContextService`/`TenantContextInterceptor`/
`@CurrentTenant()` aplicados de verdade no Supabase de homologação: migration rodada via
`prisma migrate deploy`, gate de RLS confirmado OK, role restrita `pizza_app`
(`NOSUPERUSER NOBYPASSRLS`) criada via `scripts/setup-app-role.ts` e promovida a
`DATABASE_URL` padrão (a app nunca roda como a role `postgres` do Supabase). Os dois
testes de isolamento (isolamento básico + 40 disparos concorrentes de vazamento sob
pooling) passaram contra o Supabase real. CI verde no primeiro push (`8c36e0e`). Deploy
real no Render concluído (`pizza-api-homolog.onrender.com`). Dois bugs de deploy
corrigidos: `pnpm install` sem `--filter` estourava a memória do Render (corrigido
escopando o Build Command a `@pizza/api`), e o Corepack resolvia versão diferente do
pnpm entre Build e Start Command (corrigido fixando `packageManager` no `package.json`
raiz).

---

## Sprint 2 — Auth + RBAC

**Entregável:**
- JWT de curta duração (15 min) + refresh token rotativo em cookie `httpOnly/Secure/SameSite=Strict`.
- Hash de senha com Argon2id.
- RBAC: `platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`, via guard.
- `tenant_id` extraído **somente** do JWT validado, nunca de URL/query/body.

**✅ Concluída em 2026-08-30.** Divergências deliberadas do padrão já validado no
Barberaria: **Argon2id** (lá usa bcryptjs) e **refresh token rotativo com tabela no
banco + detecção de reuso** (lá é stateless). Implementado `AuthModule`/`AuthService`/
`JwtAuthGuard`/`RolesGuard` (sem Passport), model `RefreshToken` (RLS + FK composta
`(tenant_id, user_id)`), prefixo `v1` adotado. Sem endpoint de registro público nesta
sprint — contas seedadas via `scripts/seed-auth-users.ts`.

Quatro bugs reais corrigidos: (1) `argon2` é pacote nativo cujo build script o pnpm
ignora por padrão — adicionado a `onlyBuiltDependencies`; (2) `@nestjs/jwt@12.x` é
ESM-only e quebra o Jest — pinado em `11.0.2`; (3) `cookie-parser` é CJS puro sem
export `.default` — corrigido com `esModuleInterop: true`; (4) o JWT de refresh é
determinístico (sem nonce) — duas emissões no mesmo segundo colidiam no `UNIQUE` de
`token_hash`, corrigido com um claim `jti` aleatório. 25 specs e2e verdes.

---

## Sprint 3 — Módulo `tenants` + cache

**Entregável:**
- `/v1/admin/tenants/*` (superadmin, CRUD completo) e `/v1/tenants/me` (tenant
  autenticado, sempre filtrado pelo JWT) como módulos NestJS distintos.
- Branding do tenant (cor + logo) persistido e cacheado no Redis.
- `active` (boolean) em `tenants` — `PATCH /v1/admin/tenants/:id/active` bloqueia login imediatamente.

**✅ Concluída em 2026-08-31.** Três divergências confirmadas com o usuário: **uma cor
de acento só** (`primaryColor`, não primária/secundária); **`logo` como emoji curto**,
não URL/upload; **incluídos `phone`/`address`/`deliveryFee`/`minOrder`** desde já (evita
retrabalho de migration na Sprint 10) — `planId` deliberadamente fora (Sprint 4). Rota
extra não prevista: `GET /v1/public/tenants/:slug` (sem auth). `Tenant` ganhou as
primeiras colunas monetárias (`Decimal(10,2)`, nunca `Float`/centavos) — convenção que
se repete em todo o schema daqui em diante. `CacheModule` (Redis via `ioredis`, fallback
in-memory sem `REDIS_URL`). 48 specs e2e verdes.

---

## Sprint 4 — Módulo `plans` (catálogo + assinatura)

**Nasceu do protótipo `PlansManagement.tsx`, validado em 2026-08-28.**

**Entregável:**
- `Plan` (catálogo global, RLS-exempt como `tenants`) e `Subscription` (tenant-scoped, RLS normal).
- `/v1/admin/plans` (CRUD) e `/v1/admin/tenants/:tenantId/subscription` (upsert).
- Guard de feature-gating `@RequiresModule('estoque' | 'financeiro')` — bloqueio sempre no backend.

**✅ Concluída em 2026-08-31.** `ModuleGuard` sem precedente em nenhum projeto anterior
(o Barberaria nunca teve módulo pago pra travar) — resolvido com um detalhe real de
ordenamento: guards rodam ANTES de interceptors no Nest, então o guard abre a própria
transação curta via `TenantContextService` direto. Cacheado (`subscription:tenant:<id>`,
TTL 60s) com cuidado de nunca cachear um `null` cru. Confirmado com o usuário: manter
`Subscription` como tabela separada (não simplificar pra `Tenant.planId` direto) — abre
espaço pra histórico depois. 68 specs e2e verdes.

---

## Sprint 5 — Módulo `catalog`

**Entregável:**
- CRUD de `products`/`categories`, upload de imagem via URL (nesta sprint ainda texto simples, upload real só na Sprint 16).
- `categories` tenant-scoped de verdade (não enum fixo).
- Disponibilidade de item (em falta / disponível).

**✅ Concluída em 2026-08-31.** Correção de escopo: FK composta desta sprint cobre só
`products → categories` (a metade `order_items → products` é da Sprint 7, que ainda não
existia). `Product.price` é a terceira coluna monetária do schema. 85 specs e2e verdes.

---

## Sprint 6 — Módulo `inventory` (Estoque, add-on pago)

**Nasceu do protótipo `Inventory.tsx`, validado em 2026-08-28.**

**Entregável:** `inventory_items` (tenant-scoped) com CRUD real, todas as rotas atrás de
`@RequiresModule('estoque')`.

**✅ Concluída em 2026-08-31.** Primeiro consumidor real do `ModuleGuard` da Sprint 4 —
a rota fixture temporária foi apagada. `quantity`/`minQuantity` usam `Decimal(10,2)`
mesmo não sendo dinheiro (precisão sem drift de `Float`). 90 specs e2e verdes.

---

## Sprint 7 — Módulo `orders` + conectar app `cliente`

**Entregável:**
- Criação de pedido, máquina de estados (`pending → preparing → delivery → completed / cancelled`) validada no backend.
- Idempotência na criação (chave de idempotência no header).
- `order_items` com FK composta contra `orders` e `products`.
- Tela de Cadastro + Login do cliente final.
- `apps/cliente` conectado à API real.

**✅ Concluída em 2026-08-31.** Maior sprint até então. Decisões reais: `User`
estendido com `phone/address/addressNumber/complement/neighborhood` (não uma tabela
`Customer` separada); `order_items` é o primeiro caso do schema com 3 pernas de FK
composta hand-written. **Bug real de idempotência**: o desenho original (inserir,
capturar `P2002`, reconsultar na MESMA transação) falhava com `25P02 current
transaction is aborted` — Postgres aborta a transação inteira após qualquer erro;
corrigido abrindo transações próprias (inserção numa, reconsulta — só se colidir — numa
nova). Catálogo público novo (`GET /v1/public/tenants/:slug/catalog`). Cookie de refresh
`SameSite=Strict` identificado como risco conhecido pra quando `apps/cliente` ganhar
hosting real (resolvido só na Sprint 11a). 103 specs e2e verdes, incluindo teste de
concorrência real e de FK composta cross-tenant.

---

## Sprint 8 — Módulo `financial` (Financeiro, add-on pago)

**Nasceu do protótipo `Financial.tsx`, validado em 2026-08-28. Depende de `orders`.**

**Entregável:**
- `expenses` (tenant-scoped) com CRUD real.
- Endpoint de receita: agrega `orders.total` por tenant/dia (consulta, não tabela própria).
- Rotas atrás de `@RequiresModule('financeiro')`.

**✅ Concluída em 2026-08-31.** Escopo ficou só backend (conexão do painel ficou pra
Sprint 9). Correção de escopo: `Expense.amount` é `Decimal(10,2)` em reais (não
`amount_cents`). **Decisão confirmada com o usuário**: receita conta só pedidos
`status='completed'` — pagamento é na entrega, `pending`/`preparing`/`delivery` ainda
não é dinheiro que entrou de verdade. 116 specs e2e verdes.

---

## Sprint 9 — Conectar painel `pizzaria`

**Entregável:**
- Tela de Login de owner/staff.
- `apps/pizzaria` conectado à API real: CRUD de cardápio, pedidos via polling, Estoque e Financeiro reais.

**✅ Concluída em 2026-08-31.** Gap real encontrado: não existia endpoint pra um
`tenant_owner`/`tenant_staff` saber os módulos do próprio plano — adicionado `GET
/v1/tenants/me/subscription`. Descoberta real: o formato de pedido do mock antigo não
bate com `OrderResponse` real (backend guarda snapshot achatado, sem os objetos `Pizza`
completos) — `OrdersPanel.tsx`/`OrderDetails.tsx` precisaram de reescrita real.
`Dashboard.tsx` incluído mesmo sem pedido explícito no DoD (primeira tela pós-login).
**Lição operacional**: primeira tentativa da suíte e2e completa desta sprint deu 28
falhas — não era regressão, eram os 3 servidores locais competindo por conexão com o
mesmo pooler do Supabase durante os testes. Nunca rodar a suíte e2e com servidores
locais abertos. 121 specs e2e verdes.

---

## Sprint 10 — Conectar `admin-pizzarias`

**Entregável:**
- Tela de Login do `platform_superadmin`.
- CRUD de tenants + onboarding atômico (tenant + dono + assinatura numa transação só).
- Planos & Preços conectado a `/v1/admin/plans`.
- Ativar/desativar tenant conectado de verdade.
- Dashboard básico (contagem de tenants, pedidos do mês).

**✅ Concluída em 2026-08-31.** Última sprint de conexão antes do piloto. Gap real:
onboarding atômico não existia — construído `TenantOnboardingService` abrindo uma única
`prisma.$transaction` que cria o tenant, faz `SET LOCAL app.current_tenant_id` pro
próprio tenant recém-criado NA MESMA transação (funciona por MVCC), e só depois cria o
dono e a assinatura. Segundo gap: "pedidos do mês" da plataforma inteira precisa iterar
tenant por tenant via `runInTenantContext` (RLS forçada) — não um bug, o próprio modelo
de isolamento funcionando como desenhado; ponto que voltaria a doer meses depois (ver
Sprints 22-28/"Mudança de Dashboard" na Parte 2). 129 specs e2e verdes.

---

## Sprint 11 — Piloto com pizzaria real

**Entregável:** ajustes decorrentes de uso real por 1 tenant piloto em staging.

**⏳ Renomeada/adiada**: passou a ser "Sprint 11b" no roadmap da Parte 2, condicionada a
Sprints 12-14 (validação de cadastro) terem sido implementadas antes — ainda pendente.

---

# Parte 2 — Roadmap pós-Sprint 10 (piloto, robustez de cadastro, performance)

Levantamento feito em 2026-09-05 conferindo `MVP.md`/`MVP_SPRINTS.md` contra o código
real — juntando três frentes: (1) fechar a Sprint 11 (piloto, nunca concluída), (2) a
preocupação do usuário com cadastro sem validação (CEP/telefone/e-mail), (3) itens que
o próprio `MVP.md` marca como não-negociáveis mas a auditoria encontrou como não
implementados (rate limiting, audit log, secrets no CI).

## Sprint 11a — Infra do piloto ✅ CONCLUÍDA em 2026-09-23

Deploy dos 3 frontends (Vercel), cookie `SameSite` entre domínios diferentes
(Vercel↔Render), CORS.

- **Cookie cross-site**: `sameSite: 'strict'` hardcoded só funciona no mesmo domínio
  registrável — corrigido reaproveitando o mesmo sinal de `NODE_ENV=production`
  (`sameSite: isProd ? 'none' : 'strict'`, exige `secure: true`).
- **`CORS_ORIGIN`** configurado com as 3 URLs reais no Render. Bug de infra encontrado:
  Build Command com `corepack enable` quebrava com `EROFS` na imagem Node 24 do Render
  (já vem com pnpm pré-instalado, somente-leitura) — corrigido removendo `corepack
  enable`. Segundo bug: `CORS_ORIGIN` salvo com o próprio nome da variável colado no
  valor, corrompendo só a primeira URL da lista.
- **Deploy real**: `apps/cliente` → `pizza-new-prot-cliente.vercel.app`, `apps/pizzaria`
  → `pizzariahk.vercel.app`, `apps/admin-pizzarias` → `pizza-adm-hk.vercel.app`. API já
  publicada desde a Sprint 1 (`pizza-api-homolog.onrender.com`).
- **Decisão**: sem subdomínio real por tenant ainda — `VITE_TENANT_SLUG` fixo por
  deploy, suficiente pro piloto de 1 tenant.
- Verificação de ponta a ponta confirmada: cookie `SameSite=None; Secure` persistindo
  sessão, pedido criado no cliente aparecendo no painel da pizzaria sem erro de CORS,
  dashboard do admin carregando dados reais.

---

## Sprint 12 — CEP no checkout ✅ IMPLEMENTADA em 2026-09-15 (commit `67c1723`)

Checkout validava só se os campos de endereço não estavam vazios (aceitava lixo como
bairro). Solução: usar o CEP (ViaCEP) pra buscar e confirmar o endereço de verdade.

- Novo `CepLookupService`: valida formato, chama ViaCEP, sobrescreve
  address/neighborhood/city/state quando resolve, rejeita CEP inexistente (400),
  **fail-open** só quando o ViaCEP está fora do ar (nunca quando o CEP é genuinamente
  inválido).
- `User`/`Order` ganham `cep`/`city`/`state`. Endereço resolvido é salvo no perfil do
  cliente pra já vir preenchido na próxima compra.
- CEP passa a ser **obrigatório** no checkout.

**Bug real encontrado no smoke test manual** (não pego pelos testes automatizados, que
mockam o `CepLookupService`): tanto `OrdersService.create` quanto
`UsersController.updateMe` chamavam o lookup (rede real, até 3s) DENTRO de uma transação
Prisma já aberta — estourava o timeout da transação com "Transaction not found".
Corrigido resolvendo o CEP sempre ANTES de abrir a transação. Suíte e2e completa
145/145.

---

## Sprint 13 — Telefone + endereço no cadastro ✅ IMPLEMENTADA em 2026-09-16 (commit `bff7f25`)

Telefone obrigatório no cadastro + opção de já cadastrar o endereço, reaproveitando o
`AddressForm.tsx` da Sprint 12.

`updateProfile` chamado como requisição separada após `register()`, de propósito fora
da transação (evita reintroduzir o bug de timeout de transação da Sprint 12). Suíte e2e
completa 149/149.

---

## Sprint 14 — Confirmação de e-mail ✅ IMPLEMENTADA em 2026-09-16 (commit `341f605`)

Link por e-mail que o cliente precisa clicar — sem bloqueio de uso (só rastreia se
confirmou). Provedor real ainda não escolhido — arquitetura atrás de uma interface
trocável (`EMAIL_SENDER`), com `ConsoleEmailSender` (loga o link) enquanto isso.

**Correção real feita durante a implementação**: o plano original assumia que buscar o
token via `PrismaService` direto "bypassa RLS" — errado, a role de runtime tem RLS
FORÇADA, uma query sem contexto de tenant aberto não veria a linha. Corrigido incluindo
`tenantSlug` no link (o backend resolve o tenant primeiro — `tenants` não tem RLS — e só
então abre o `runInTenantContext` certo). Suíte e2e completa 154/154.

**Com isso, o trio CEP + telefone/endereço + e-mail do roadmap principal está
completo.**

---

## Correções pontuais fora do roadmap (2026-09-16) ✅ todas commitadas

- **`e3971f1`**: `OrdersPanel.tsx` travava no dia em que a tela foi aberta — o filtro de
  data era um snapshot calculado só uma vez no mount.
- **`e9c39e1`**: trocar de CEP no `AddressForm.tsx` nunca disparava nova busca.
- **`35787bb`**: número da casa não era limpo ao trocar de CEP.
- **Confirmado, não é bug**: "Vendas Hoje"/"Ticket Médio" só contam pedidos
  `completed` — R$0,00 antes de qualquer entrega é o comportamento correto.

---

## Sprint 11b — Fechar o piloto com tenant real ⏳ pendente

Escolher a pizzaria real, onboarding pelo painel admin, cadastro do cardápio de
verdade, validar em staging todos os critérios de `MVP.md` §7 com dado real (a maioria
já passa via os testes automatizados existentes). Depende das Sprints 12-14 (já
concluídas). Expectativa realista (experiência do Barberaria): uso real quase sempre
revela pelo menos um ajuste de schema/regra de negócio imprevisto.

---

## Sprint 15 — Rate limiting + audit log + secrets no CI 🟡 IMPLEMENTADA (3 partes), 1 pendência do usuário em 2026-10-01

`MVP.md` seção 3 lista estes 3 itens como não-negociáveis mesmo no MVP; auditoria de
código confirmou que nenhum tinha sido construído. Implementação dividida em partes
independentes, a pedido do usuário ("pode começar por uma parte sim").

### Parte 1 — Rate limiting ✅ IMPLEMENTADA em 2026-09-29 (commit `6fcf35b`, main, CI verde)

`POST /v1/orders` ganhou `@nestjs/throttler` (v6.7.1), com 2 limites nomeados
configurados em `OrdersModule` e aplicados via `@UseGuards(ThrottlerGuard)` só no
método `create()` (não na classe inteira, não global em `AppModule`):

- **`ip`** — limite por IP de origem (tracker default do `@nestjs/throttler`).
- **`tenant`** — limite por pizzaria, via tracker customizado novo
  (`apps/api/src/common/tenant-throttler-tracker.ts`): usa `req.user.tenantId` quando
  autenticado, cai pro IP quando não há tenant (ex. `platform_superadmin`, sem
  tenant próprio) ou não há usuário.

Limites configuráveis via `RATE_LIMIT_IP_PER_MIN`/`RATE_LIMIT_TENANT_PER_MIN`
(defaults de produção documentados em `.env.example`: 10/min por IP, 30/min por
tenant). **Detalhe de implementação que evitou uma regressão real**: `limit` é
lido como FUNÇÃO (`() => Number(process.env...)`), não um número fixo capturado
uma vez no boot — o `@nestjs/throttler` v6 aceita um `Resolvable<T>` reavaliado a
cada requisição. Sem isso, a suíte e2e inteira (que roda `--runInBand`, um
processo Node só) travaria: vários arquivos de teste pré-existentes
(`orders-crud`, `idempotency`) legitimamente criam mais de 10 pedidos numa mesma
suite, e tomariam 429 por engano se o limite fosse fixo. Com o valor lido por
requisição, CI/local sobem com `RATE_LIMIT_IP_PER_MIN=1000` (não atrapalha os
outros testes) e só o `rate-limit.e2e-spec.ts` abaixa o próprio limite pra `5`
dentro do seu `beforeAll` — restaurando o valor original no `afterAll` (Jest
isola o cache de módulos por arquivo de teste, mas **não** isola `process.env`
entre arquivos rodando no mesmo processo).

Testes novos: `tenant-throttler-tracker.spec.ts` (4 casos unitários) +
`test/orders/rate-limit.e2e-spec.ts` (confirma 429 após estourar o limite por
IP). Suíte e2e completa 199/205 (as 6 falhas são as já conhecidas — CNPJ
duplicado por dado sujo no homolog + flakiness de paginação de tenants em
`admin-tenants-crud`/`admin-subscriptions`, confirmado que nenhuma toca
`orders`/rate limiting).

### Parte 2 — Scan de secrets no CI (gitleaks) ✅ IMPLEMENTADA em 2026-10-01 (commit `a2ba2eb`, main, CI verde)

Novo step `Gitleaks secrets scan` (`gitleaks/gitleaks-action@v2`) no `.github/workflows/ci.yml`,
rodando logo após o checkout e antes de qualquer outro step do job `api` — falha rápido
se algum segredo foi commitado, sem gastar tempo com o resto do pipeline. `GITHUB_TOKEN`
é injetado automaticamente pelo Actions, sem precisar cadastrar nenhum secret novo. O
step `Checkout` precisou ganhar `fetch-depth: 0` (histórico completo) — o gitleaks-action
precisa disso pra conseguir escanear os commits do push/PR, não só o HEAD. Único arquivo
alterado: `.github/workflows/ci.yml`. CI run confirmado verde, incluindo esse step
especificamente, antes de qualquer outro (`Checkout` → `Gitleaks secrets scan` → resto).

### Partes pendentes

### Parte 3 — Audit log append-only ✅ IMPLEMENTADA em 2026-10-01 (commit `b859c89`, main, CI verde)

Cobre exatamente o vocabulário fechado desenhado: `auth.login`/`auth.login_failed`
(sucesso e falha — falha captura `tenantSlug`/email tentados, `actorRole: 'unknown'`,
IP/user-agent, e **nunca** a senha, em nenhum campo, confirmado em teste), `user.create`
(cadastro público de cliente — ator é o próprio cadastrado — e criação do dono no
onboarding — ator é o superadmin que fez o onboarding), `tenant.create` (onboarding),
`order.status_change` (`metadata: {from, to}`), `tenant.store_status_change` (só quando
`isOpen` veio no PATCH **e** mudou de verdade — testado que um PATCH só de
`deliveryFee` não gera log fantasma).

**Schema**: `AuditLog` + `AuditLogArchive` (mesmo shape, coluna a coluna), ambas com RLS
obrigatória e o **mesmo carve-out de policy que `users` já usa** (`tenant_id` anulável —
eventos de plataforma como login de superadmin não pertencem a nenhum tenant). Toda
escrita acontece **na mesma transação** da ação sendo registrada (login é a exceção
natural — não há uma transação de negócio única pra "login", já que o check de
credencial é só leitura).

**Retenção**: `AuditLogRetentionService.runDailyRetention()` — por tenant (via
`mapWithConcurrency`, concorrência 5, mesmo padrão da Sprint 22), um único
`DELETE ... RETURNING * ` + `INSERT INTO audit_logs_archive SELECT * FROM movidos`
movendo o que passou de 30 dias, depois um `DELETE` em `audit_logs_archive` pro que
passou de 2 anos — e o mesmo par de queries fora de `runInTenantContext` pros eventos de
plataforma (`tenant_id IS NULL`). Erro isolado por tenant (try/catch, não derruba o
job inteiro). Disparado por `POST /v1/internal/audit-log-retention/run`, protegido por
header `X-Retention-Job-Secret` comparado contra `AUDIT_LOG_RETENTION_SECRET` (nunca
JWT — é máquina-pra-máquina) e por um novo workflow agendado
(`.github/workflows/audit-log-retention.yml`, cron `'0 7 * * *'` UTC = 4h em São Paulo).
**Pendência do usuário, não automatizável por aqui**: cadastrar os secrets
`API_BASE_URL` e `AUDIT_LOG_RETENTION_SECRET` no GitHub (Settings → Secrets → Actions)
pra esse workflow funcionar de verdade — sem isso o cron roda mas o `curl` falha.

**Migration revisada manualmente** (`--create-only`) — o Prisma tentou derrubar 6 FKs
compostas hand-written (`orders`/`order_items`/`products`/`refresh_tokens`) + 1 índice
de `inventory_items`, zero relação com esta mudança (mesmo bug de sempre deste
projeto) — removido antes de aplicar, confirmado via query direta que as 6 FKs + o
índice sobreviveram.

**Achado operacional real, testado contra o homolog de verdade (160 tenants)**: o job
de retenção processa **todos** os tenants reais (por desenho, não só um de teste) —
nesse volume, boa parte das tentativas individuais falhou com `"Engine is not yet
connected"` (erro do motor do Prisma sob carga de muitas transações curtas seguidas
contra o pooler do Supabase). **Não é perda de dado** — o try/catch por tenant isola
cada falha (nenhuma trava as outras, o job sempre termina e reporta `{tenantCount,
failed}`), e um tenant que falhar hoje tenta de novo amanhã, sem acumular nada errado.
Mas é um sinal real de fragilidade sob esse volume que vale observar depois do
primeiro deploy — se o campo `failed` do log de resumo vier consistentemente alto,
investigar (`connection_limit` na `DATABASE_URL`, ou reduzir a concorrência de 5 pra
menos). Testes e2e usam `timeout: 30_000` nesses casos específicos por rodarem contra
o volume real do homolog — no CI (Postgres efêmero, começa vazio) isso é rápido e
limpo, não reproduz o sintoma.

**Testes novos**: `test/audit-log/audit-log.e2e-spec.ts` (11 casos — um por ação do
vocabulário + o caso negativo do PATCH sem `isOpen` + a prova de que senha nunca é
gravada) e `test/audit-log/audit-log-retention.e2e-spec.ts` (401 sem/com segredo
errado, move/expurga corretamente, idempotente rodando 2x seguidas). Suíte e2e
completa 221/227 (as 6 falhas são as já conhecidas — CNPJ duplicado por dado sujo no
homolog + flakiness de paginação de tenants, confirmado que nenhuma toca audit log).

**Ainda não construído, por decisão explícita de sequenciamento** (não é a mesma coisa
que "fora de escopo" — só entra quando chegar a vez): a tela de consulta do audit log
no `admin-pizzarias`. **Virou plano à parte, com protótipo já aprovado — ver seção
própria "Plano à parte: tela de consulta do audit log" mais abaixo neste documento**
(separada de propósito, 2026-10-18, pra não ficar misturada com o resto da Sprint 15).

**Com isso, a Sprint 15 tem os 3 itens de código fechados** (rate limiting, gitleaks,
audit log) — só resta a pendência do usuário abaixo (secrets do GitHub); a tela de
consulta segue como plano separado, não bloqueia a Sprint 15 ser considerada fechada.

### ⚡ Correção de performance — email no JWT (2026-10-03, commit `3581ff8`)

Achado real testando `pizzariahk.vercel.app` (painel da pizzaria): mudar o status de
um pedido (`PATCH /orders/:id/status`) levou **~3,4s** de "waiting for server
response" no DevTools do Chrome, bem acima do piso de ~1-1,5s já conhecido do Render
Free. Causa raiz: a auditoria desta sprint adicionou **2 idas ao banco extras** a essa
transação — `resolveActorEmail(tx, user.id)` (busca só pra achar o email do usuário
logado, já que o JWT nunca carregava esse campo) + o próprio insert do log — dobrando
de 2 pra 4 round trips. Nesse projeto o custo é dominado por round trip (handshake de
conexão do Render Free), não pela complexidade da query — dobrar os round trips de
uma transação já lenta tem efeito proporcional real, confirmado pela medição.

**Correção**: `AuthenticatedUser` ganha `email?: string`, populado a partir do JWT
(access **e** refresh token, pra sobreviver a um refresh sem perder o campo). Os 2
únicos callers de `resolveActorEmail` (`orders.service.ts`, `tenants.controller.ts`)
passam a usar `user.email ?? await resolveActorEmail(...)` — só cai pro lookup no
banco se for um token emitido antes desta mudança (expira em até 15min, período de
transição curto, sem precisar de migração). Resultado: volta de 4 pra 3 round trips
nessas 2 ações.

**Descartado de propósito**: tirar a gravação do log de dentro da transação (deixaria
mais rápido ainda, mas quebraria a garantia já documentada — "se a ação der rollback,
o log some junto"); reescrever como 1 query SQL só via CTE (ganho menor que a opção
do token, risco maior de manter). Suíte e2e completa 210/216 (as 6 falhas já
conhecidas, confirmado que nenhuma toca auth/audit-log/orders).

### ✅ Pendência do usuário — secrets do GitHub Actions cadastrados em 2026-10-03

Os dois secrets (`API_BASE_URL=https://pizza-api-homolog.onrender.com` e
`AUDIT_LOG_RETENTION_SECRET`, valor aleatório de 64 hex gerado com `openssl rand -hex
32`) foram cadastrados no GitHub (`Settings → Secrets and variables → Actions`) e o
mesmo `AUDIT_LOG_RETENTION_SECRET` foi colado na env var de mesmo nome no serviço
`pizza-api-homolog` do Render. **Disparo manual confirmado com sucesso**
(`workflow_dispatch`, run #1, step "Trigger retention job" verde, 1m 6s) — primeira
vez que o job rodou passando pela API real do Render (antes só tinha sido testado
localmente, direto no Supabase, onde apareceu o sintoma de `"Engine is not yet
connected"` registrado acima). O corpo da resposta (`{tenantCount, failed}`) não foi
inspecionado neste disparo — `curl -sf` só confirma HTTP 2xx, não o conteúdo —
registrado como item ainda em aberto em `docs/TESTES_PENDENTES.md`.

---

## Sprint 16 — Upload de imagem real (Object Storage) ✅ IMPLEMENTADA em 2026-09-23 (commit `ae68f22`)

Troca de URL colada por upload assinado pro Supabase Storage (decisão confirmada com o
usuário — banco já está no mesmo projeto Supabase, evita conta/infra nova).

- Novo `ProductUploadService`: valida `contentType` contra lista fechada, gera path
  único isolado por tenant (`products/${tenantId}/${uuid}-...`), gera URL assinada via
  `createSignedUploadUrl`.
- Frontend: upload sai do navegador direto pro Supabase Storage, nunca passa pelo
  backend. Opção de colar URL manualmente mantida.
- `Product.image` continua sendo uma `String` (URL) — sem mudança de schema.

Confirmado ponta a ponta em produção (geração de URL assinada, upload real, leitura
pública), e visualmente pelo usuário. Suíte e2e 176/179 (3 falhas conhecidas de CNPJ,
não relacionadas).

---

## Plano à parte: responsividade mobile ✅ IMPLEMENTADO (commits `ebfc7c9` + `4e78640`)

Pedido separado do usuário depois de ver telas do `apps/pizzaria` cortadas num celular
real. **Causa raiz sistêmica**: o container de página tinha só `flex-1` sem `min-w-0` —
`min-width` padrão de item flex é `auto`, então qualquer elemento largo empurrava a
página inteira pra fora da viewport. Fix: `min-w-0` no container, nos dois apps
(`pizzaria`/`admin-pizzarias`). Correções pontuais adicionais em `OrdersPanel.tsx`
(truncate sem min-w-0, coluna de grid `1fr` sem `minmax(0,...)`),
`MenuManagement.tsx` (botão "Editar" cortado), `Dashboard.tsx`, `Settings.tsx`,
`ProductForm.tsx`, `Inventory.tsx`. Validado com screenshots Playwright (390×844,
414×896) antes/depois.

---

## Plano à parte: código de pedido sequencial por dia ✅ IMPLEMENTADO (commit `65ebe72`)

`Order.id` (UUID) cortado em 8 caracteres era só cosmético, não sequencial, sem
garantia de unicidade de prefixo. Trocado por código `AAAAMMDDNNNN` (ex.:
`202609140001`), contador **por tenant, por dia**, calculado no fuso
`America/Sao_Paulo`.

Geração atômica via `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` numa tabela
nova `order_daily_sequences` (RLS obrigatória), dentro da mesma transação de
`OrdersService.create`. **Correção pontual posterior** (commit `04cdab6`): o corte de
"dia" pro `orderCode`/filtro do `OrdersPanel` passou a usar o mesmo corte às 5h da
manhã já usado no Dashboard (Sprint 24) — um pedido às 00h20 conta como o dia anterior
(mesma noite de expediente), decisão explícita do usuário depois de notar a
inconsistência. `Financial.tsx` continua em dia-calendário puro (trabalha com períodos
de 7/30/90 dias, não um dia específico).

---

## Plano à parte: CNPJ da pizzaria ✅ IMPLEMENTADO em 2026-09-17 (commit `fafa781`)

Campo CNPJ em "Informações Básicas", com validação de verdade (dígito verificador via
algoritmo oficial da Receita Federal), não só formato.

- **Opcional**, guardado formatado (`00.000.000/0000-00`), único quando preenchido mas
  não bloqueia tenants sem CNPJ (Postgres trata múltiplos `NULL` como não-colisão em
  `UNIQUE`).
- **Nunca exposto no endpoint público** (`GET /public/tenants/:slug`) — mesma régua já
  aplicada a phone/address.
- Novo `apps/api/src/common/cnpj.util.ts` (`isValidCnpj`/`formatCnpj`), aplicado nos 4
  DTOs diferentes que editam dados de tenant (self-service + 3 rotas do superadmin).

Suíte e2e completa 165/165 (20 casos novos).

---

## Plano à parte: redesenho do Financeiro ✅ IMPLEMENTADO (commit `0172cd1`)

Protótipo de redesenho da tela `Financial.tsx` (Claude Design), aprovado pelo usuário —
100% frontend, nenhum endpoint novo, nenhuma migration.

- Seletor de período (7/30/90 dias) aplicado tanto à Receita quanto às Despesas (antes
  eram ranges diferentes, inconsistência real corrigida).
- Comparação com o período anterior (badge de variação %).
- KPI novo: Ticket Médio.
- "Despesas por Categoria" e "Formas de Pagamento" (barras proporcionais).
- Editar despesa (reaproveita o form de criação, generalizado).
- Exportar CSV client-side (`Blob` + `<a download>`) — padrão que viria a ser
  reaproveitado depois na "Mudança de Dashboard".

---

## Plano à parte: `apps/cliente` nas lojas de aplicativo ⏳ não iniciado

Modelo **white-label, um app por pizzaria** (confirmado com o usuário) — cada pizzaria
contratante ganha o próprio app na loja, com a própria marca, não um app único
multi-tenant. `apps/cliente` hoje é 100% greenfield pra isso (sem manifest, sem service
worker, sem ícone real).

5 sprints desenhadas, nenhuma iniciada:
- **17** — Contas de desenvolvedor (Apple/Google) + Política de Privacidade/Termos +
  minuta contratual de uso de marca.
- **18** — PoC técnica com **Capacitor** (não React Native, não TWA sozinho) — empacota
  o build do Vite existente numa casca nativa, 1 tenant só.
- **19** — Pipeline de build white-label (script por tenant, Fastlane, screenshots
  automatizados) pra N tenants.
- **20** — Primeiro envio real às lojas — maior risco: guideline 4.3 da Apple
  (antispam contra "apps molde"), mitigado por diferenciação de negócio real por app
  (mesmo padrão que ChowNow/Toast/Owner.com já usam, aprovados). Isento de
  In-App-Purchase (pagamento é sempre na entrega).
- **21** — Pós-lançamento: decisão OTA vs. reenvio em lote, push notifications.

---

# Parte 3 — Desempenho do sistema (antes do upgrade de infra)

Investigação disparada em 2026-09-22 pela preocupação do usuário com o tempo de
resposta do painel admin conforme o número de pizzarias cresce.

## Contexto e diagnóstico

Dois bugs de produção corrigidos no mesmo dia (`142e2c8`, `a3a427c`): listagem de
pizzarias e dashboard abriam **uma transação de banco por pizzaria** (RLS de
`subscriptions`) — com 44 tenants estourava o pool de conexões e derrubava os dois
endpoints com 500. Corrigido processando em lotes de 5 (`mapWithConcurrency`) —
resolveu o crash, não a lentidão.

**Medição real (2026-09-22)**: `GET /health` (SELECT 1 puro) já levava 1,1-1,5s — não é
distância geográfica, é o **plano Free do Render**: CPU compartilhada faz o pool do
Prisma ficar minúsculo, forçando reconexão constante (handshake TLS) a cada transação. O
Supabase processa a query em milissegundos; o gargalo é o Render. **Decisão do
usuário**: upgrade de infra fica pra quando houver receita/escala — até lá, o objetivo é
melhorar o que depende só de código.

## Sprint 22 — Eliminar as N transações por tenant ✅ IMPLEMENTADA em 2026-09-22 (commit `f700421`)

Resumo de assinatura (status/plano/módulos) denormalizado direto em `Tenant` (tabela
sem RLS) — `subscriptions` continua sendo a fonte da verdade, o resumo é só pra leitura
cross-tenant O(1). Só 2 pontos no código escrevem em `subscriptions`
(`SubscriptionsAdminService.upsertForTenant`, `TenantOnboardingService.onboard`), cada
um passou a também atualizar o resumo.

**Medido**: `GET /admin/tenants?pageSize=20` caiu de ~7s pra ~1,3-1,8s. `GET
/admin/dashboard` melhorou pouco (~20s → ~17,8s) — sua parte cara nunca foi a
assinatura, é a agregação de pedidos/usuários por tenant, que continua no loop (fora
do escopo desta sprint, resolvida só na "Mudança de Dashboard").

## Sprint 23 — Cache do dashboard ✅ IMPLEMENTADA em 2026-09-22 (commit `7105e81`)

`GET /admin/dashboard` cacheado (TTL inicial 90s). **Medido**: 1ª chamada (cache frio)
~27s — igual a antes, o cache não elimina o custo, só evita repeti-lo; chamadas
seguintes (dentro do TTL) ~0,7s.

**Atualização (2026-09-26)**: usuário reportou o Dashboard travando de novo — medido
~47s de carga fria com 135 tenants (era 44 na Sprint 23, cresce **linear**, exatamente
como previsto). Alívio tático: TTL subiu de 90s pra 10min (commit `e931603`). Correção
estrutural definitiva veio só com a "Mudança de Dashboard" (Parte 4).

## Sprint 24 — Corte às 5h + top-products + Financeiro por período ✅ IMPLEMENTADA (commits `838681e`, `04cdab6`, `6e15b44`)

- **Item 1** (`OrdersPanel`): decisão de remover de vez a opção "ver todos os dias" —
  painel sempre mostra 1 dia por vez. `GET /orders?date=` filtra no banco, não mais em
  JS. **Bug real encontrado escrevendo o teste**: calcular "ontem" a partir de
  `Date.now() - 24h` em UTC dá errado entre 21h-23h59 em Brasília — corrigido derivando
  "ontem" a partir do "hoje" já calculado em São Paulo.
- **Correção pontual** (`04cdab6`): corte às 5h da manhã estendido também pro
  `orderCode` e pro filtro `?date=` do `OrdersPanel` (decisão do usuário, pra manter
  código e filtro consistentes).
- **Item 2** (Dashboard): cards "Hoje" passam a usar corte às 5h (`[hoje 5h, amanhã
  5h)`), não meia-noite — pizzaria que fecha depois da meia-noite não tem a própria
  noite cortada em dois dias. `OrdersPanel`/`orderCode` continuam em dia-calendário
  puro (decisão explícita, não propagar esse conceito pro resto do sistema — só o
  Dashboard usava até a correção pontual acima estender também pro orderCode).
  "Produtos Mais Vendidos" vira mensal (últimos 30 dias corridos), com novo endpoint
  `GET /orders/top-products` (agregação no banco).
- **Item 3** (`Financial.tsx`): passa a pedir `from`/`to` do período selecionado em vez
  de baixar o histórico inteiro e filtrar em JS.

Suíte e2e 172/175 (3 falhas conhecidas de CNPJ).

---

## Sprint 25 — Concorrência no checkout (pedido fantasma) 🟡 parcialmente resolvida (commit `2ef6bdc`)

Achado motivado pela preocupação do usuário com "vários clientes fazendo pedido ao
mesmo tempo" — diferente das sprints anteriores (lentidão), este é um problema de
**inconsistência de dado real** sob carga modesta.

**O que foi medido**: lotes de 5/10/20 pedidos simultâneos só deixavam ~2 passarem,
sempre — teto rígido, não degradação gradual. **Achado grave**: o banco tinha mais
pedidos criados de verdade (17) do que sucessos reportados ao cliente (6) — 11 pedidos
"fantasma": processados no banco, mas o cliente recebeu erro 500.

**Causa raiz**: `OrdersService.insertOrder` faz, em série, dentro de uma única
transação: busca de cliente, busca de tenant, busca de produto **um a um num loop** (não
`Promise.all`), upsert atômico do contador sequencial (**trava a linha até o fim da
transação inteira**, serializando pedidos da MESMA pizzaria), criação do pedido. No
Render Free, isso estoura o `pool_timeout` padrão de 10s do Prisma sob concorrência —
às vezes o insert já tinha terminado quando o timeout dispara do lado do cliente.

**Implementado**: busca de produtos em uma query só (não mais loop sequencial) + chave
de idempotência em `sessionStorage` no `Checkout.tsx` (sobrevive a F5). **Resultado do
reteste**: taxa de sucesso sob carga pesada não melhorou (continua travada em ~2 por
lote — confirma que o teto é a infra do Render Free, só o upgrade resolve isso de vez);
zero pedidos fantasma no reteste (contra 11 antes) — sinal positivo, mas amostra
pequena.

**Deliberadamente não implementado ainda**: mover o upsert do contador sequencial pro
fim da transação (reduz a janela de lock), ajustar o `pool_timeout` do Prisma, retestar
com pedidos de 2-3 itens.

---

## Correções e recursos fora do roadmap (2026-09-23) ✅ todos commitados

- **Bug real em 3 camadas**: cliente conseguia comprar tamanho de pizza sem preço.
  Tipo mentindo sobre nullability (`priceBrotinho: number` quando podia ser `null`),
  cadastro nunca permitia deixar um tamanho em branco de propósito, e R$0,00 gravado
  sendo tratado como preço válido em vez de indisponível. Corrigido em toda a cadeia
  (tipos, DTOs com `Min(0.01)`, `priceForSize`, `ProductForm.tsx`). Commits `e4f08ea`,
  `b2d7e6c`, `54b0363`, `b9cdd00`, `be8c358`.
- **Aba aberta não percebia mudanças**: deploy novo (SHA da Vercel + `UpdateBanner`) e
  dado de catálogo mudado em outra sessão (recarrega ao voltar o foco). Achado
  testando: `visibilitychange` sozinho não dispara com 2 janelas lado a lado — reforçado
  com `window.addEventListener('focus', ...)`. Commits `8e54e77`, `91328f3`, `f75db6b`.
- **Documentação do modelo de dados**: Artifact publicado com diagrama físico +
  conceitual (Chen/MER) + fichas de tabela — sem sincronização automática.

---

## Sprint 26 — Usuários: diretório cross-tenant no admin-pizzarias ✅ IMPLEMENTADA em 2026-09-25 (commit `09db769`)

Tela "Usuários" do `admin-pizzarias` era um item de menu sobrado do mockup, nunca
especificado em nenhuma sprint. Investigado o sistema irmão Barberaria, que já resolveu
exatamente essa lacuna: diretório cross-tenant, **só-leitura** (sem criar/editar/
excluir), com filtro por papel/tenant.

Mesmo padrão de leitura cross-tenant sem violar RLS já usado desde a Sprint 22
(`mapWithConcurrency` + `runInTenantContext` por tenant, exceto `platform_superadmin`
que é lido direto via `PrismaService`, aproveitando o carve-out da policy pra
`tenant_id IS NULL`). Paginação em memória (dado vem de N consultas separadas, não do
banco já paginado). 5 casos de teste novos. Suíte e2e completa 184/190 (6 falhas
conhecidas — CNPJ + flakiness de paginação).

---

## Sprint 27 — Horário de funcionamento real + loja aberta/fechada ✅ IMPLEMENTADA em 2026-09-25 (commit `4cddf10`)

"Aberto • Entrega em 40-60 min" do Menu do cliente era hard-code — junto, o card
"Horário de Funcionamento" e "Tempo de Entrega Estimado" em Configurações também eram
mock puro (sem coluna no banco, "Salvar" não persistia nada).

**Dois conceitos separados, um só implementado**: (1) loja aberta/fechada é um
**interruptor MANUAL** (`Tenant.isOpen`) — o dono liga/desliga na hora; (2) horário de
funcionamento vira só **informativo** (persiste, aparece pro cliente como texto), mas
não fecha a loja sozinha fora do horário — automatizar isso é decisão de produto maior,
registrada como evolução futura separada.

**Requisito não-negociável, reforçado pelo usuário**: loja fechada = **zero pedido
criado**, sem exceção, sem brecha de retry/idempotência — checagem lê `isOpen` fresco
do banco a cada `POST /v1/orders`, nunca um valor em cache do frontend. Critério de
aceite do teste vai além do HTTP 400: confirma direto no banco que nenhuma linha nova
foi criada. `TenantBrandingResponse` (público) ganha os 5 campos novos — decisão
diferente do CNPJ/telefone/endereço: esses SÃO pra aparecer pro cliente, esse é o
próprio propósito deles. Suíte e2e completa 191/197 (6 falhas conhecidas).

---

# Parte 4 — A "Mudança de Dashboard" (2026-09-26)

## Sprint 28 — job batch pra denormalizar pedidos/usuários ❌ substituída, não implementada

Desenho original (correção estrutural pro resíduo da Sprint 23 que voltou a doer com
135 tenants): job periódico externo (GitHub Actions a cada 15min, disparando um
endpoint interno protegido — mesmo padrão pensado pro expurgo de audit log da Sprint
15) recalculando pedidos/usuários do zero e gravando em `Tenant`, deixando o Dashboard
O(1) independente do número de pizzarias.

**Descartada** depois de uma conversa de acompanhamento: o usuário esclareceu que o
agregado cross-tenant de pedidos/usuários **não é útil no dia a dia** — ele prefere
consultar uma pizzaria por vez, sob demanda. A pergunta certa deixou de ser "como
manter esse agregado sempre atualizado" e virou "por que manter esse agregado, se
ninguém olha?" — a resposta é remover a consulta cara por completo, não otimizá-la.

## Sprint — Mudança de Dashboard ✅ IMPLEMENTADA, testada e fechada em 2026-09-26 (commits `411f4a7` + `4372e0e`)

Protótipo clicável validado pelo usuário antes de implementar —
https://claude.ai/artifact/Y1M1d5pKWUUYd2R2k6p2L8.

### Decisão final

1. **Removido do Dashboard**: `ordersThisMonth`/`ordersLastMonth`/`revenueThisMonth`/
   `monthlyOrderVolume`/`topTenants`/`userCount` — o loop inteiro (`mapWithConcurrency`
   + `runInTenantContext` por tenant) some do `admin-dashboard.service.ts`. Fica só o
   que já era O(1) desde as Sprints 22/27: `mrr`, `plansDistribution`, `tenantCount`,
   `openTenantCount`, `closedTenantCount`.
2. **Nova tela "Vendas por Pizzaria"** (`admin-pizzarias`): seletor de pizzaria (busca
   no servidor com debounce) + consulta sob demanda — `GET /admin/tenants/:id/sales`,
   1 única transação por pizzaria selecionada, custo **constante**, não cresce com o
   total de tenants na plataforma.
3. **Exportar CSV escopado à pizzaria selecionada**, não a todas — descartada a ideia
   de um relatório cross-tenant completo. Como o dado já está carregado na tela,
   o export é gerado **no navegador** (`Blob` + `<a download>`, mesmo padrão já usado
   no redesenho do Financeiro) — sem nenhum endpoint novo de export no backend.

Resultado: **zero operação O(N) sobra neste fluxo** — todo ponto que percorria as 135+
pizzarias deixou de existir, sem precisar de job/cache/infra nova nenhuma.

### Campos do relatório (confirmados com o usuário)

- **Resumo**: Pizzaria, Slug, Gerado em, Pedidos Este Mês, Pedidos Mês Passado,
  Variação (%), Receita Este Mês, Usuários Cadastrados, Ticket Médio.
- **Detalhe mensal** (6 meses): Mês, Pedidos Concluídos, Receita — `ordersCompleted`
  por mês é campo novo (o cálculo antigo do Dashboard só somava receita por mês, nunca
  contagem de pedidos).

### Estudo de desempenho (projeção baseada em medições reais desta sessão)

| Operação | Antes | Depois |
|---|---|---|
| `GET /admin/dashboard` | ~47s a frio (135 tenants), cresce linear | ~1-1,5s, constante |
| Consultar 1 pizzaria (nova tela) | não existia | ~1,5-2,5s, constante |
| Exportar dados | não existia (relatório de todas foi descartado) | instantâneo (client-side) |

O upgrade de infra do Render deixaria de fazer diferença perceptível pra este fluxo
(já bate no piso de "1 operação simples") — só importaria se um relatório cross-tenant
de verdade voltasse a ser necessário, o que não é mais o caso.

### Verificação e bugs encontrados

`npx tsc --noEmit` limpo em `apps/api`/`apps/admin-pizzarias`. Suíte e2e 195/201 (6
falhas já conhecidas — CNPJ + flakiness de paginação, confirmado que nenhuma toca os
arquivos desta sprint).

**Bug real em produção** (smoke test manual, `pizza-adm-hk.vercel.app`): o seletor de
pizzarias pedia `pageSize=500` pra carregar tudo de uma vez — `ListTenantsQueryDto.
pageSize` tem `@Max(100)`, a API respondia 400 e o `.catch(() => undefined)` engolia o
erro silenciosamente (dropdown aparecia vazio, sem aviso nenhum). Corrigido (commit
`4372e0e`) trocando por busca no servidor com debounce, mesmo padrão já usado em
`TenantsManagement.tsx`.

**Achado de ambiente, não desta sprint**: `nest start --watch` está quebrado neste
projeto (`deleteOutDir: true` do `nest-cli.json` + `incremental: true` do TypeScript
brigam — o watch apaga `dist/` mas o cache `.tsbuildinfo` acha que nada mudou e não
reescreve nada). Contornado localmente com `nest build` + `node dist/main.js` sem
watch. Fix de verdade (provavelmente `deleteOutDir: false` ou remover `incremental`)
fica como pendência registrada.

---

## Correção pontual (2026-09-27): usuários saem da tela cross-tenant, entram em Vendas por Pizzaria ✅ implementada

A tela "Usuários" (Sprint 26) sempre carregava **sem filtro nenhum** ao abrir — todos os
papéis, de todas as pizzarias — disparando o mesmo loop de 1 transação por tenant que já
tinha sido eliminado do Dashboard: usuário reportou **mais de 1 minuto** pra abrir. O
endpoint (`AdminUsersService.list()`) já suportava filtro por `tenantId` desde a Sprint
26 — quando filtrado por 1 tenant, já era O(1) (1 transação só). **Nenhuma mudança de
backend nesta correção** — só reestruturação de frontend, mesma lição da "Mudança de
Dashboard".

- Tela "Usuários" removida do menu lateral por completo (`UsersManagement.tsx` apagado,
  `AdminSidebar.tsx`/`App.tsx` atualizados).
- Dentro de **`TenantSales.tsx`** ("Vendas por Pizzaria"), abaixo do gráfico de volume
  mensal: botão **"Ver Usuários desta Pizzaria"** (só busca ao clicar, nunca junto da
  consulta de vendas) + filtro de papel (Dono/Funcionário/Cliente) que **refaz a
  consulta no servidor** a cada troca (não filtra em memória — evita resultado
  incompleto quando a pizzaria tem mais clientes do que cabe numa página) + paginação.
- Trocar de pizzaria fecha a seção de usuários e reseta o filtro — nunca mostra dado da
  pizzaria anterior por engano.
- **Decisão consciente**: usuários `platform_superadmin` (sem tenant) deixam de ter
  qualquer tela de consulta — baixo uso esperado, registrado como possível item futuro
  se um dia fizer falta.

Protótipo clicável validado antes de implementar (2 rodadas, incluindo o filtro de
papel a pedido do usuário) — https://claude.ai/artifact/7QH6sbJuY4EujJRzcL5mWd.
`npx tsc --noEmit` e `vite build` limpos em `apps/admin-pizzarias`. Sem teste e2e novo
(nenhuma mudança de backend).

**Ajuste de desempenho no mesmo dia**: usuário reportou ~2,5s pra abrir a seção de
usuários em produção (DevTools, aba Timing) — melhor que os +1min de antes, mas mais
que o piso de ~1-1,5s esperado pra 1 transação no Render Free. Causa: `AdminUsersService.
list()`, ao filtrar por `tenantId`, ainda fazia **2 round-trips SEQUENCIAIS** — um
`tenant.findMany()` só pra descobrir o nome do tenant (que o próprio `TenantSales.tsx` já
tinha carregado) antes de abrir a transação de usuários. Corrigido: quando `tenantId` é
passado, o nome do tenant é buscado **em paralelo** com a transação (`Promise.all`), não
mais antes dela — o "descobrir quais tenants existem" também deixa de rodar (o
`tenantId` já diz qual é). Caminho sem `tenantId` (chamada cross-tenant direta via API,
não mais usada pelo frontend) mantido como estava. 5/5 specs de
`test/admin/admin-users.e2e-spec.ts` verdes.

---

## Correção pontual (2026-09-27): pizzaria nasce fechada por padrão ✅ implementada

Pedido do usuário: toda pizzaria recém-cadastrada deve nascer com a loja **fechada**
(`Tenant.isOpen = false`), não aberta — o dono precisa ligar manualmente antes do
primeiro pedido (mesmo interruptor da Sprint 27, só mudando o valor inicial).

- `schema.prisma`: default de `isOpen` mudou de `true` pra `false` (migration
  `20260927013234_tenant_isopen_default_false` — revisada à mão antes de aplicar: o
  Prisma gerou de novo `DROP CONSTRAINT` nas FKs compostas hand-written de
  `orders`/`order_items`/`products`/`refresh_tokens` + um `DROP INDEX` em
  `inventory_items`, sem relação nenhuma com essa mudança — mesmo bug já conhecido
  deste projeto, limpo do SQL antes de aplicar).
- `TenantsAdminService.create()` e `TenantOnboardingService.onboard()` (os dois únicos
  pontos que criam tenant) passam a setar `isOpen: false` explícito, não só confiar no
  default do schema — mais claro pra quem ler o código depois.
- Fixtures de teste (`test/utils/seed-tenant.ts`, `seed-auth-fixtures.ts`) passaram a
  setar `isOpen: true` explícito, senão toda a suíte de pedidos/checkout (que assume
  loja aberta por padrão) quebraria em cascata.

Confirmado direto no banco que as 6 FKs compostas + o índice continuam intactos depois
da migration. Suíte e2e completa 195/201 (as 6 falhas conhecidas de sempre — CNPJ +
paginação — nenhuma relacionada).

---

## Sprint — Desempenho Sistema ✅ IMPLEMENTADA (itens 1 e 2) em 2026-09-27

Auditoria de desempenho de `apps/pizzaria` (`pizzariahk.vercel.app`), pedida pelo
usuário em 2026-09-27, cobrindo todas as consultas (GET) que o painel da pizzaria faz.

### Metodologia

Os dados reais no homolog eram bem menores que 50-100 registros (o tenant mais cheio
tinha 14 pedidos). Criado um **tenant descartável** com volume realista — 4 categorias,
20 produtos, **80 pedidos** (com itens, status variados, espalhados nos últimos 60
dias), **60 itens de estoque**, **60 despesas** — medido cada endpoint direto contra a
API de produção (`pizza-api-homolog.onrender.com`, a mesma que `pizzariahk.vercel.app`
usa), tenant apagado por completo depois (confirmado via `prisma.tenant.findUnique`).

### Resultado por consulta

| Endpoint | O que traz | Volume testado | Tempo medido |
|---|---|---|---|
| `POST /auth/login` | autenticação (hash Argon2id) | — | **~5,0s** |
| `GET /tenants/me` | dados da própria pizzaria | 1 | ~1,1 – 1,5s |
| `GET /tenants/me/subscription` | plano/módulos liberados | 1 | ~1,8 – 2,2s |
| `GET /catalog/categories` | categorias do cardápio | 4 | ~1,5s |
| `GET /catalog/products` | produtos do cardápio | 20 | ~1,7 – 1,9s |
| `GET /orders` (sem filtro) | pedidos — histórico inteiro | 80 (+itens) | ~2,0 – 2,7s |
| `GET /orders/top-products` | mais vendidos (30 dias, agregado no banco) | 4 no top | ~1,8 – 2,0s |
| `GET /inventory` | itens de estoque | 60 | ~1,5 – 3,1s |
| `GET /financial/expenses` | despesas — todas, sem filtro | 60 | ~1,5s |
| `GET /financial/revenue?from&to` | receita diária agregada | período de 60 dias | ~1,5s |

**Piso geral (~1,1-2s) é o Render Free** (mesmo diagnóstico das Sprints 22-23), não o
volume de dados — cada consulta acima é 1 transação/1 query simples, sem loop por
tenant nem N+1. Com 20-80 registros, tempo seria basicamente o mesmo com 5 ou 500
registros nessas rotas específicas.

### O que precisa ser feito

1. <span style="color:blue">**`GET /orders` sem filtro baixava o histórico inteiro, sem
   limite ✅ IMPLEMENTADO em 2026-09-27**</span> — `OrdersService.list()` agora rejeita
   com 400 ("Informe 'date' ou 'from'+'to' pra listar pedidos") quando nenhum dos dois
   filtros vem na query — o 3º modo ("sem filtro nenhum") foi removido por completo.
   Confirmado antes de implementar que os únicos 3 chamadores reais
   (`OrdersPanel.tsx` usa `?date=`, `Dashboard.tsx`/`Financial.tsx` usam `?from&to`)
   já sempre passavam um dos dois — nenhuma tela do `apps/pizzaria` precisou mudar.
   - **Arquivos alterados**: `orders.service.ts` (`list()`),
     `dto/list-orders-query.dto.ts` (comentário atualizado).
   - **Testes**: novo caso em `orders-crud.e2e-spec.ts` confirmando 400 sem filtro;
     o teste de isolamento ("cliente vê só os próprios, staff vê todos") e o teste do
     corte por dia (que antes verificava "sem date mantém o histórico completo")
     ajustados pra usar um range `from`/`to` largo em vez de nenhum filtro. Suíte
     completa 196/202 (as 6 falhas de sempre — CNPJ + paginação — não relacionadas).

2. <span style="color:blue">**`GET /financial/expenses` nunca teve filtro ✅
   IMPLEMENTADO em 2026-09-27**</span> — ganhou suporte opcional a `from`/`to`
   (`ExpensesQueryDto`, mesma convenção de `RevenueQueryDto`) — sem os dois, mantém o
   comportamento legado (todas as despesas), já que o risco aqui é teórico, não medido
   (volume de despesas de uma pizzaria real cresce devagar). `Financial.tsx` passou a
   fazer **2 chamadas escopadas** (período atual + período anterior, pro cálculo da
   variação %) em vez de 1 chamada sem filtro + filtro em JS — mesmo padrão que
   `getRevenue()` já usava.
   - **Arquivos alterados**: novo `dto/expenses-query.dto.ts`, `expenses.service.ts`
     (`list()` aceita `{from, to}`), `expenses.controller.ts` (`@Query()`),
     `apps/pizzaria/src/data/repository.ts` (`getExpenses(from?, to?)`),
     `Financial.tsx` (novo estado `prevExpensesTotal`, substituindo o filtro local
     `prevPeriodExpenses`).
   - **Testes**: novo caso em `expenses-crud.e2e-spec.ts` confirmando que `from`/`to`
     filtra corretamente e que sem os dois mantém o histórico completo (comportamento
     legado preservado de propósito, diferente de `orders` que virou obrigatório).
     Suíte completa 197/203 (as 6 falhas de sempre, sem relação).

3. <span style="color:white">**Login em ~5s — não é bug, é decisão de design
   (Argon2id)**</span> — de longe o pior tempo de resposta do app, mas é o custo
   computacional *proposital* do hash de senha (Sprint 2, escolhido de propósito pra
   tornar força-bruta inviável) rodando numa CPU fatiada do Render Free. **Nenhuma ação
   recomendada** — só registrado pra não ser confundido com um problema de consulta a
   banco nas próximas auditorias.

### O que já está bem arquitetado (confirmado, sem ação necessária)

`orders/top-products` e `financial/revenue` já agregam no banco (nunca trazem tudo pro
cliente somar); `catalog/*`, `inventory`, `tenants/me` são leituras diretas de 1 tabela,
sem N+1 — mesmo padrão já validado nas correções de performance anteriores.

### Verificação (quando for implementado)

1. Item 1: novo teste e2e em `test/orders/orders-crud.e2e-spec.ts` (400 sem filtro).
2. Item 2 (se decidir implementar): suíte de `test/financial/expenses-crud.e2e-spec.ts`
   estendida com casos de `from`/`to`.
3. `npx tsc --noEmit` em `apps/api`, `apps/pizzaria`.
4. Repetir a mesma metodologia de medição (tenant descartável, ~50-100 registros) pra
   confirmar que nada regrediu.
5. Commit + push + acompanhar o Actions run até `success`.

### Dependência com outras sprints

**Nenhuma.** Mexe só em `orders`/`financial`, não toca em nenhuma tabela/rota que outra
sprint pendente dependa.

---

# <span style="color:blue">Plano à parte: tema claro/escuro no app Cliente ✅ IMPLEMENTADA em 2026-10-18 (commit `7f62523`, main, CI verde)</span>

Pedido do usuário em 2026-10-13: deixar o cliente final de `apps/cliente` escolher entre
fundo escuro (o único que existe hoje) ou claro. Protótipo clicável aprovado antes de
implementar (Claude Design Artifact, `https://claude.ai/artifact/GY5jzJ1JRuE6VapwPAQaeK`
— reconstrução fiel da tela Cardápio com um toggle sol/lua funcionando de verdade).
Plano completo salvo em `docs/TEMA_CLARO_ESCURO_PLANO.md` antes do código ser tocado.

**Achado que mudou o desenho original**: `App.tsx` já injeta a cor de marca de cada
tenant (`mockTenant.primaryColor`) como estilo inline, sobrescrevendo qualquer token
CSS — decisão tomada de deixar isso como está (nenhum tenant real usa cor
problemática hoje; revisitar só se um dia um dono escolher uma cor clara ilegível no
fundo claro).

**Correção de escopo feita pelo usuário durante o planejamento**: o botão de trocar
tema não fica só no Cardápio (desenho original) — vira um **botão flutuante único**,
renderizado uma vez em `App.tsx` como sibling de todas as views (mesmo padrão já usado
por `<UpdateBanner />` e pelo toast de "item adicionado"), visível em Cardápio, Monte
sua Pizza, Carrinho, Checkout, Confirmação e Login sem precisar tocar em nenhum desses
componentes individualmente.

**Decisões**: tema padrão continua escuro (zero mudança visual pra quem nunca tocar no
botão); preferência salva só no `localStorage` (é do aparelho, não da conta — nenhuma
rota de API nova); dourado da marca (`--primary`/`--accent`) ganhou um tom mais escuro
no tema claro (de `#c9a84c` pra `#8a6b28`) especificamente porque o tom original não
tem contraste suficiente como TEXTO sobre fundo claro (preço, aba ativa, ícone do botão
"+") — verificado matematicamente via fórmula de luminância do WCAG: contraste subiu de
~2:1 (reprovado) pra ~4,7:1 (aprovado pra texto normal). Como preenchimento de botão/
logo continua legível do mesmo jeito nos dois tons, só mudou o texto que vai por cima
(`--primary-foreground` ganhou valor próprio por tema).

**Arquivos**: `apps/cliente/src/styles/theme.css` (paleta clara nova vira o `:root`
padrão; a paleta escura atual — já em produção — migra pra dentro de `.dark`,
substituindo um bloco morto do shadcn que nunca era usado); `apps/cliente/index.html`
(script síncrono antes do React montar, aplica a classe certa a partir do
`localStorage` — evita o "flash" de tema errado no primeiro load); `apps/cliente/src/
App.tsx` (estado `theme`, `useEffect` que persiste e aplica/remove a classe `dark` em
`document.documentElement`, renderiza `<ThemeToggle>`); novo `apps/cliente/src/
components/ThemeToggle.tsx`.

**Verificação**: `tsc --noEmit` e `vite build` limpos em `apps/cliente`. Validação
visual automatizada não foi possível nesta sessão (tentativa com Playwright travou em
"Carregando cardápio..." por falta de `apps/api` rodando neste ambiente) — compensado
com checagem matemática de contraste. **Usuário testou ao vivo em 2026-10-18** e achou
um bug real na primeira tentativa: o botão flutuante ficava em cima do botão de login/
conta do `Menu.tsx` (mesmo canto). Corrigido no mesmo dia (commit `baf6248`, desloca o
botão de tema pra `right-[72px]`, abrindo espaço entre os dois). Depois da correção,
usuário confirmou ("ficou mto bom") — ver `docs/TESTES_PENDENTES.md`.

---

# <span style="color:white">Plano à parte: tela de consulta do audit log ⏳ protótipo aprovado em 2026-10-18, aguardando aprovação pra implementar</span>

Separada da Sprint 15 de propósito (2026-10-18) — a escrita do audit log e o expurgo já
estão implementados e fechados; isso aqui é só a tela de consulta, que ficou pendente
por decisão de sequenciamento desde o início.

**Desenho definido com o usuário**: **não é uma tela nova** — reaproveita o fluxo que
já existe em `TenantSales.tsx` ("Vendas por Pizzaria"), no `admin-pizzarias`. Um botão
**"Ver Log desta Pizzaria"** fica ao lado do já existente "Ver Usuários desta
Pizzaria" (mesmo padrão: 1 consulta sob demanda pra 1 tenant já selecionado, nunca um
loop cross-tenant — mesma disciplina da "Mudança de Dashboard"). Protótipo clicável
aprovado ("mto bom") — `https://claude.ai/artifact/7nSCTMj6BLUAskmVND2ose`.

**Decisões já fechadas no protótipo**:
- **Junta `audit_logs` (últimos 30 dias) + `audit_logs_archive` (até 2 anos) numa lista
  só**, ordenada por data — evita o buraco de "sei que algo aconteceu mas não acho
  porque passou de 30 dias".
- **3 filtros combináveis**: período (De/Até, dois `<input type="date">`) + tipo de
  ação (dropdown com as 6 ações do vocabulário fechado) + "Limpar filtros".
- **Colunas**: Data/Hora, Ação (badge colorido por tipo), Quem (nome + e-mail), Detalhe.
- Reaproveita o guard de superadmin e o padrão de endpoint já usado em `GET
  /admin/tenants/:id/sales` e `GET /admin/users?tenantId=`.

## Pendência real de implementação

- **Backend**: endpoint novo, provável `GET /admin/tenants/:id/audit-log`, com
  `from`/`to`/`action` como query params — lê `audit_logs` + `audit_logs_archive` via
  `runInTenantContext` pro tenant selecionado, junta os dois resultados, ordena por
  data. `@Roles('platform_superadmin')`, mesmo guard dos outros endpoints de
  `tenants-admin.controller.ts`.
- **Frontend** (`apps/admin-pizzarias`): botão + seção nova em `TenantSales.tsx`
  (o protótipo usa dado de exemplo fixo, só pra validar a interação — a implementação
  real chama o endpoint acima) + nova `getTenantAuditLog()` em `src/data/repository.ts`.
- Lista de arquivos completa e detalhamento de testes e2e ficam pra quando a
  implementação for priorizada — mesmo processo já usado no tema claro/escuro e na
  Sprint Equipe (plano detalhado antes de mexer em código).

## Dependência com outras sprints

**Nenhuma.** A escrita do audit log e o expurgo (Sprint 15) já estão prontos — isso é
só a camada de leitura/consulta, não tech em nenhuma tabela/rota nova além de ler o
que já existe.

---

# <span style="color:blue">Plano à parte: Sprint "Equipe" — cadastro de funcionários ✅ IMPLEMENTADA em 2026-10-20 (main, suíte e2e 224/230)</span>

Implementada exatamente como desenhada abaixo, incluindo o modelo de permissão por
funcionário (decisão 9) fechado nesta conversa. Migration (`20261020015423_add_staff_fields_to_users`)
revisada manualmente antes de aplicar — o Prisma tentou derrubar as mesmas 6 FKs/índice
hand-written de sempre (`orders`/`order_items`/`products`/`refresh_tokens`/`inventory_items`),
confirmado via query direta que sobreviveram. `npx tsc --noEmit` limpo em `apps/api` e
`apps/pizzaria`; `vite build`/`nest build` limpos. Suíte e2e completa **224/230** (14
casos novos em `staff-crud.e2e-spec.ts`, todos verdes) — as 6 falhas são as já
conhecidas (CNPJ duplicado por dado sujo no homolog + flakiness de paginação de
tenants), confirmado que nenhuma toca staff/auth/orders/catalog/inventory/financial.

**Decisão adicional, fechada durante a implementação (não estava no desenho original)**:
`RevenueController` (`GET /financial/revenue`, usado pelo gráfico de vendas do
Dashboard) **não** ganhou `@RequiresStaffPermission('financeiro')` — só
`ExpensesController` (despesas) foi gateado por essa permissão. Motivo: o Dashboard
(decisão do usuário nesta conversa: "visível pra qualquer funcionário") usa
`getRevenue()` pro próprio gráfico semanal — se a receita exigisse a permissão
"financeiro", um Atendente sem essa permissão perderia parte do próprio Dashboard.
Como receita é só um agregado de `Order.total` (dado que qualquer funcionário com a
permissão "pedidos" já vê linha a linha no painel de Pedidos), a permissão
"financeiro" protege especificamente o lado sensível — despesas/custos, que combinados
com receita revelam margem — não o número de vendas em si.

**Escopo deliberadamente mantido do jeito que já era** (decisão tomada durante a
implementação, pra não exceder o que foi pedido): `PATCH /tenants/me` (tela
Configurações) continua `@Roles('tenant_owner', 'tenant_staff')`, sem nenhum
`StaffPermissionGuard` novo — "Configurações é owner-only" na decisão 9 se referia só
a não existir um checkbox de permissão pra essa área no formulário da Equipe, não a
revogar o acesso que `tenant_staff` já tinha antes desta sprint (mudar isso quebraria
`tenants-me-isolation.e2e-spec.ts`, que testa exatamente um `tenant_staff` fazendo
`PATCH /tenants/me`, e seria escopo maior do que o usuário pediu).

**Performance do JWT** (ver decisão técnica abaixo, não estava no plano original):
`permissions` viaja no ACCESS token (mesmo padrão do `email`, Sprint 15) pra
`StaffPermissionGuard` nunca precisar de uma consulta ao banco por requisição — mas
**não** viaja no refresh token: `AuthService.refresh()` relê `active`/`permissions`
frescos do banco só pra `role:'tenant_staff'`, especificamente pra uma permissão
revogada nunca ficar "presa" por até 7 dias (vida do refresh token) — staleness real
fica limitada a 15min (vida do access token).

Pedido do usuário em 2026-10-18, motivado por uma pergunta de arquitetura ("dono pode
ter vários funcionários operando o sistema — está preparado?"). Investigação no código
real (não suposição) encontrou um achado importante: o papel `tenant_staff` está
**autorizado em todo endpoint** (`@Roles('tenant_owner', 'tenant_staff')` em catálogo,
estoque, financeiro, pedidos) mas **não existe nenhum caminho de código que crie um
usuário com esse papel** — nem cadastro público, nem rota de admin, nem tela em
nenhum dos 2 painéis. O papel ficou "esquecido": definido no RBAC, sem provisionamento
possível. `Login.tsx` do painel da pizzaria até documenta isso num comentário:
"não há cadastro público de owner/staff, essas contas são provisionadas pela
plataforma" — mas a própria plataforma não tem como provisionar um `tenant_staff`.

**Protótipo clicável aprovado** ("excelente"), **atualizado 2x em 2026-10-19** —
primeiro com o campo de cargo/função, depois com os checkboxes de permissão por
módulo (decisão 9 abaixo) —
`https://claude.ai/artifact/UNCEnHsiaXTj8ARqHeE8Dd`: nova tela "Equipe" no painel da
pizzaria, item novo na sidebar (marcado "NOVO"), com cadastro de funcionário (nome,
telefone, e-mail, senha provisória, cargo/função, tipo de contratação, data de
admissão, acesso aos módulos), toggle Ativo/Inativo por linha, e edição. Inclui um
4º funcionário de exemplo ("Fernanda Lima — Gerente", com Estoque e Financeiro
marcados) ilustrando exatamente o caso levantado pelo usuário: cargo customizado com
acesso a módulo específico, sem herdar nada de ninguém.

## Decisões (registradas antes de implementar, mesmo processo do tema claro/escuro)

1. **Só `tenant_owner` gerencia a Equipe** — `tenant_staff` não vê o item "Equipe" na
   sidebar nem tem acesso às rotas novas (403 se tentar). Um funcionário não pode
   cadastrar/editar outro funcionário nem a si mesmo.
2. **Novo campo `User.active`** (Boolean, default `true`) — tecnicamente genérico na
   tabela toda (clientes e donos também ganham a coluna), mas só a tela Equipe
   expõe UI pra mudar o valor; cliente e dono sempre ficam `true` na prática (dono é
   desativado via `Tenant.active`, nível tenant inteiro, não por essa coluna).
3. **Checagem de `active` acontece DEPOIS de validar a senha**, não antes — diferente
   do gate de `tenant.active` (que checa antes, de propósito, porque ali só revela
   algo sobre o TENANT, nunca sobre um e-mail específico). Checar `active` antes da
   senha vazaria "esse e-mail existe neste tenant" pra alguém que não sabe a senha —
   checando depois, só quem já provou saber a senha descobre que a conta está
   desativada.
4. **Desativar um funcionário também revoga os refresh tokens dele** (mesmo mecanismo
   de revogação de família já usado contra roubo de token) — login e refresh bloqueados
   na hora; o access token de até 15 min já emitido continua valendo até expirar
   sozinho (mesmo limite já aceito e documentado pro caso de tenant desativado).
5. **Tipo de contratação é texto livre** (`contractType String?`, não um enum fixo no
   banco) — sem precisar de migration toda vez que uma pizzaria quiser um tipo novo
   (ex. "Estagiário", "Meio período"). O dropdown no frontend sempre sugere CLT/
   Freelancer, mais qualquer valor **já usado por outro funcionário desse mesmo
   tenant** (consulta os valores distintos já cadastrados) — um tipo digitado uma vez
   fica disponível pra próxima contratação, sem tabela nova nem cadastro separado.
5b. **Cargo/função também é texto livre** (`position String?`, adicionado em
   2026-10-19 a pedido do usuário) — mesmo raciocínio exato da decisão 5, campo
   diferente: o dropdown sempre sugere Atendente/Pizzaiolo/Motoboy, mais qualquer
   valor já usado por outro funcionário do mesmo tenant. Nome de coluna `position`
   (não `role`) de propósito — `role` já existe em `User` e guarda o papel de RBAC
   (`tenant_owner`/`tenant_staff`/`customer`/`platform_superadmin`); usar o mesmo nome
   pra "cargo operacional" criaria confusão real entre dois conceitos diferentes.
6. **Senha definida pelo dono na hora do cadastro** — não existe nesta sprint um fluxo
   de "funcionário troca a própria senha depois do primeiro login". Registrado como
   possível melhoria futura, fora de escopo agora (mesmo raciocínio de não resolver
   um problema que ninguém pediu ainda).
7. **Auditoria**: criar funcionário reaproveita a ação já existente `user.create`
   (ator = o dono que cadastrou) — não é uma ação nova. Ativar/desativar ganha uma
   ação nova no vocabulário fechado, `user.status_change`, mesmo formato de
   `metadata: {from, to}` que `order.status_change`/`tenant.store_status_change` já
   usam (motivo igual ao que justificou `tenant.store_status_change`: vale ter rastro
   de quem mudou o estado operacional, agora aplicado ao funcionário).
8. **E-mail pode ser editado depois de criado** (dono corrigindo erro de digitação) —
   mesma unicidade já existente (`@@unique([tenantId, email])`), conflito vira 409
   tratado, não um 500 cru do Prisma.
9. **Permissão de acesso a módulo é por FUNCIONÁRIO, não por cargo** (decisão de
   2026-10-19, motivada pela pergunta do usuário "atendente não terá acesso ao
   financeiro, terá acesso ao estoque se o módulo for comprado"). Hoje o RBAC só tem 2
   níveis (`tenant_owner` = tudo, `tenant_staff` = igual pra qualquer funcionário, só
   gated por módulo pago do TENANT via `@RequiresModule`) — não existe "este
   funcionário específico vê X, aquele não". Resolvido com um campo novo,
   **independente do `position` (cargo, texto livre)**: `permissions: string[]`,
   lista explícita de áreas (`pedidos`, `cardapio`, `estoque`, `financeiro`) marcada
   por checkbox no cadastro de CADA funcionário. `position` não pode ser a fonte da
   permissão porque é texto livre/customizável (decisão 5b) — não dá pra hardcodar
   regra pra um cargo que o dono pode inventar na hora.
   - **Duplo portão pra Estoque/Financeiro**: acesso exige módulo contratado pelo
     tenant (`@RequiresModule`, já existe) **E** a permissão marcada pra aquela
     pessoa (`@RequiresStaffPermission`, novo) — os dois, sempre. O checkbox de
     Estoque/Financeiro só **aparece** no formulário se o tenant já tiver aquele
     módulo contratado.
   - **`tenant_owner` sempre ignora esse guard** — o dono nunca é restringido por
     `permissions` (o campo só existe/importa pra `tenant_staff`).
   - **Dashboard é sempre visível pra qualquer funcionário logado**, não entra na
     lista de permissões configuráveis (é só leitura de KPI, baixo risco).
   - **Configurações (CNPJ, horário, loja aberta/fechada) é owner-only sempre** — nem
     aparece como opção de permissão pro funcionário nesta sprint.
   - **Sem memória/template por cargo** (decisão explícita do usuário, "mantém o
     simples... pode ser que eu não queira que o gerente novo veja o módulo que o
     gerente anterior viu") — cada funcionário novo começa com as permissões em
     branco (exceto a sugestão fraca dos 3 cargos fixos abaixo), mesmo repetindo um
     cargo já usado antes nesse tenant. Nunca um "perfil" reutilizável automaticamente.
   - **Sugestão de preenchimento no formulário** (editável, nunca travada): ao
     escolher Atendente/Pizzaiolo/Motoboy, pré-marca `pedidos`; cargo customizado não
     pré-marca nada — o dono decide do zero.

## Schema (`User`)

```prisma
active        Boolean   @default(true)
position      String?   @db.VarChar(40)
contractType  String?   @map("contract_type") @db.VarChar(40)
admissionDate DateTime? @map("admission_date") @db.Date
permissions   String[]  @default([])   // "pedidos" | "cardapio" | "estoque" | "financeiro"
```

`permissions` usa array nativo do Postgres (suportado direto pelo Prisma, sem tabela
nova) — só é lido/escrito pra usuários `role: 'tenant_staff'`; `tenant_owner`/
`customer` sempre ficam com `[]` e nunca são checados contra esse campo.

Migration `--create-only`, revisão manual de sempre (disciplina obrigatória neste
projeto — `users` já teve FK composta derrubada sem avisar numa sprint anterior).

## Backend (`apps/api`)

- **Novo `src/tenants/dto/create-staff.dto.ts`** — `name`, `email` (`@IsEmail`), `password`
  (`@MinLength(8) @MaxLength(72)`, mesma regra do `RegisterDto`), `phone`, `position?`,
  `contractType?`, `admissionDate?` (ISO date opcional), `permissions?: string[]`
  (`@IsArray() @IsIn(['pedidos','cardapio','estoque','financeiro'], { each: true })`).
- **Novo `src/tenants/dto/update-staff.dto.ts`** — todos os campos acima opcionais
  (PATCH), mais `active?: boolean`. Sem `password` aqui (redefinir senha de funcionário,
  se precisar, é uma ação separada/futura, não implementada nesta sprint).
- **Validação de servidor pro `permissions` recebido**: o controller rejeita
  (`BadRequestException`) se `estoque`/`financeiro` vier na lista mas o tenant não tiver
  aquele módulo contratado (`@RequiresModule` já resolve isso pra leitura, mas a
  ESCRITA do próprio array também precisa checar — senão o dono consegue marcar um
  módulo que não tem, só pra ele nunca conseguir usar; evita dado inconsistente).
- **Novo `src/tenants/staff.controller.ts`** (controller próprio, não inchar
  `TenantsController`) — `@Controller('tenants/me/staff')`, `@Roles('tenant_owner')`
  na classe inteira:
  - `POST /` — hash de senha via o mesmo `hashPassword`/Argon2id já usado em
    `auth.service.ts`; grava `role: 'tenant_staff'`, `tenantId` do próprio token
    (nunca do body); audit log `user.create`.
  - `GET /` — lista funcionários do próprio tenant (RLS cuida do isolamento sozinha),
    ordenado por nome. Resposta nunca inclui `passwordHash`.
  - `PATCH /:id` — edita campos; se `active` vier e for diferente do valor atual,
    grava `user.status_change` (`metadata: {from, to}`) e, se virou `false`, revoga os
    refresh tokens desse usuário (reaproveita a função de revogação de família já
    existente). 404 se o `:id` não pertencer ao próprio tenant — RLS já garante isso
    via `findUnique` dentro do `runInTenantContext`, nunca vaza se o ID existe em
    outro tenant.
  - `GET /contract-types` — devolve os valores distintos de `contractType` já usados
    neste tenant (mais `CLT`/`Freelancer` sempre inclusos), pro dropdown do frontend.
  - `GET /positions` — mesmo padrão, devolve os valores distintos de `position` já
    usados neste tenant (mais `Atendente`/`Pizzaiolo`/`Motoboy` sempre inclusos).
- **`src/tenants/tenants.module.ts`** — registra o controller/serviço novo.
- **`src/auth/auth.service.ts`** (`validateCredentials`) — depois de `verifyPassword`
  confirmar certo: `if (!user.active) { throw new ForbiddenException('Conta
  desativada.'); }` (ordem invertida em relação ao gate de `tenant.active` — ver
  decisão 3 acima).

### Guard novo: permissão por funcionário (decisão 9)

- **Novo `src/common/staff-permission.decorator.ts`** — `@RequiresStaffPermission('pedidos' | 'cardapio' | 'estoque' | 'financeiro')`, mesmo padrão de `@RequiresModule`
  (metadata via `SetMetadata`).
- **Novo `src/common/staff-permission.guard.ts`** — `StaffPermissionGuard`: lê a
  permissão exigida da metadata; se `user.role !== 'tenant_staff'` deixa passar direto
  (dono/superadmin nunca são restringidos); senão checa
  `user.permissions.includes(required)` — 403 se não tiver.
- **Aplicado junto do `@Roles`/`@RequiresModule` já existentes** nos 4 controllers que
  já existem: `OrdersController` (`@RequiresStaffPermission('pedidos')`),
  `ProductsController`/`CategoriesController` (`'cardapio'`),
  `InventoryController` (`'estoque'`, já tem `@RequiresModule('estoque')` — fica os
  dois guards juntos), `ExpensesController`/`RevenueController` (`'financeiro'`, idem
  com `@RequiresModule('financeiro')`).
- **`AuthenticatedUser`** (usado pelos guards/`@CurrentUser()`) ganha `permissions:
  string[]` — populado a partir do JWT (mesmo padrão já usado pro `email`, correção de
  performance de 2026-10-03) ou, se o token for antigo e não tiver o claim, um lookup
  pontual no banco (período de transição curto, token expira em até 15min).

## Frontend (`apps/pizzaria`)

- **`src/components/Sidebar.tsx`** — novo item "Equipe" (ícone `Users`), renderizado
  só quando o papel logado é `tenant_owner`. **Além disso** (decisão 9): os itens
  Pedidos/Cardápio/Estoque/Financeiro passam a ser filtrados também por
  `currentUser.permissions` quando o papel é `tenant_staff` — hoje só filtram por
  módulo contratado (`subscription.modules`), owner continua vendo tudo normalmente.
- **Novo `src/components/Equipe.tsx`** — lista + formulário de cadastro/edição,
  replicando o protótipo aprovado: toggle Ativo/Inativo por linha, badge de cargo e
  badge de tipo de contratação, formulário com os 7 campos (senha só aparece na
  criação, não na edição) **+ um bloco novo de checkboxes "Acesso aos módulos"**
  (Pedidos/Cardápio sempre visíveis; Estoque/Financeiro só aparecem se
  `tenantSubscription.modules` incluir aquele módulo). Pré-marca `pedidos` quando o
  cargo escolhido é Atendente/Pizzaiolo/Motoboy; nada pré-marcado pra cargo
  customizado (decisão 9 — sem memória por cargo).
- **`src/data/repository.ts`** — novas `getStaff()`, `createStaff(input)`,
  `updateStaff(id, input)`, `getContractTypes()`, `getPositions()`; `StaffInput`/
  `StaffResponse` ganham `permissions: string[]`.
- **`src/App.tsx`** — novo branch `activePage === 'equipe'`.

## Testes e2e (`apps/api/test`)

Novo `test/tenants/staff-crud.e2e-spec.ts`:
- `tenant_owner` cria funcionário → 201, resposta nunca inclui a senha/hash.
- `tenant_staff`/`customer` tentando `POST /tenants/me/staff` → 403.
- E-mail duplicado no mesmo tenant → 409 (não 500 cru).
- `PATCH` desativando (`active: false`) → tentativa de login desse funcionário depois
  dá 403 "Conta desativada"; refresh token emitido antes também passa a falhar.
- Reativar (`active: true`) → login volta a funcionar normalmente.
- Isolamento: dono do tenant A não consegue ver/editar funcionário do tenant B — 404,
  nunca revela se o ID existe em outro tenant.
- Audit log: confirma `user.create` na criação e `user.status_change` com
  `metadata.from`/`metadata.to` corretos ao ativar/desativar.
- **Permissões (decisão 9)**: funcionário com `permissions: ['pedidos']` acessa
  `GET /orders` mas recebe 403 em `GET /financial/expenses` mesmo que o tenant TENHA
  o módulo Financeiro contratado; funcionário com `permissions: ['financeiro']` em
  tenant SEM o módulo contratado também recebe 403 (módulo vem primeiro — prova o
  duplo portão nos dois sentidos); `tenant_owner` sempre acessa os 4 módulos
  independente de `permissions` (campo nem é checado pra ele); `POST
  .../staff` com `permissions: ['financeiro']` num tenant sem o módulo → 400 (não
  deixa salvar permissão pra módulo que a pizzaria não tem).
- Suíte completa precisa continuar 100% verde.

## Verificação

1. `npx tsc --noEmit` em `apps/api`, `apps/pizzaria`.
2. Migration `--create-only`, revisão manual do SQL, só então `prisma migrate deploy`.
3. Suíte e2e completa, servidores locais parados primeiro.
4. Smoke test manual: cadastrar um funcionário → logar com a conta nova → confirmar
   acesso ao Cardápio/Pedidos (mas não a "Equipe", que é só do dono) → desativar pelo
   painel do dono → confirmar que o login do funcionário passa a falhar → reativar →
   confirmar que volta a funcionar. Testar também o campo de tipo de contratação:
   digitar um tipo novo, confirmar que aparece sugerido pro próximo cadastro.
5. Commit + push + acompanhar o Actions run até `success`.

## Dependência com outras sprints

**Nenhuma.** Mexe só em `User` (tabela já existente, RLS já correta) e cria rotas
novas sob `/tenants/me/staff` — não toca em `orders`/`catalog`/`financial`/
`inventory` nem em nenhuma sprint pendente.

---

# Pendências consolidadas (visão geral, atualizada em 2026-10-01)

- ~~**Desempenho Sistema**~~ — ✅ implementada por completo em 2026-09-27 (itens 1 e 2).
- **Sprint 15** — 🟡 código 100% implementado em 2026-10-01 (rate limiting, gitleaks,
  audit log), mas **pendência real do usuário, não automatizável**: cadastrar os
  secrets `API_BASE_URL`/`AUDIT_LOG_RETENTION_SECRET` no GitHub (Settings → Secrets →
  Actions) — sem isso o workflow agendado de expurgo do audit log roda mas falha
  silenciosamente (ver seção "⚠️ Pendência do usuário" dentro da Sprint 15 acima, com o
  passo a passo). Opcional, sem pressa: a tela de consulta do audit log no
  admin-pizzarias.
- **Sprint 11b** — fechar o piloto com um tenant real.
- **Sprint 25** — mover o upsert do contador sequencial pro fim da transação, testar
  `pool_timeout`, retestar com pedidos de 2-3 itens. Resolução definitiva da taxa de
  sucesso sob carga pesada depende do upgrade de infra do Render (decisão adiada pra
  quando houver receita/escala).
- **App nas lojas** (Sprints 17-21) — nenhuma iniciada.
- **Backlog fora do MVP** — pagamento online, WhatsApp, MFA, WebSocket/realtime, LGPD
  formal, pentest externo, observabilidade completa, particionamento de `orders`,
  Redis real em produção, vault de secrets dedicado, code-splitting.
- **Bug de ambiente**: `nest start --watch` quebrado (`deleteOutDir` + `incremental`).
