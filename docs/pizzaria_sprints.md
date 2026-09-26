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
| 15 | Rate limiting + audit log + secrets no CI | ⏳ (desenhada) |
| 16 | Upload de imagem real (Supabase Storage) | ✅ |
| — | Plano à parte: responsividade mobile | ✅ |
| — | Plano à parte: código de pedido sequencial por dia | ✅ |
| — | Plano à parte: CNPJ da pizzaria | ✅ |
| — | Plano à parte: redesenho do Financeiro | ✅ |
| — | Plano à parte: app nas lojas (Sprints 17-21) | ⏳ (não iniciado) |
| 22 | Eliminar N transações por tenant (resumo de assinatura) | ✅ |
| 23 | Cache do dashboard | ✅ |
| 24 | Corte às 5h (Dashboard/OrdersPanel/orderCode) + top-products + Financeiro por período | ✅ |
| 25 | Concorrência no checkout (pedido fantasma) | 🟡 |
| 26 | Diretório de usuários cross-tenant (admin) | ✅ |
| 27 | Horário de funcionamento + loja aberta/fechada | ✅ |
| 28 | Job batch pra denormalizar pedidos/usuários no Dashboard | ❌ (substituída) |
| — | **Mudança de Dashboard** (remove agregado cross-tenant, consulta por pizzaria) | ✅ |

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

## Sprint 15 — Rate limiting + audit log + secrets no CI ⏳ desenhada, não implementada

`MVP.md` seção 3 lista estes 3 itens como não-negociáveis mesmo no MVP; auditoria de
código confirma que nenhum foi construído ainda.

- **Rate limiting** em `POST /v1/orders` (por tenant e por IP) via `@nestjs/throttler`.
- **Scan de secrets no CI** (gitleaks), rodando antes dos outros steps.
- **Audit log append-only** (desenho completo já fechado): cobre login (sucesso e
  falha), criação de tenant/usuário, mudança de status de pedido, e alternar loja
  aberta/fechada. Model `AuditLog` com RLS obrigatória, `actorEmail`/`actorRole`
  congelados no momento do evento, senha de login falho NUNCA gravada em nenhum campo.
  Retenção: 30 dias na tabela quente `audit_logs`, expurgo diário movendo pra
  `audit_logs_archive` (2 anos de vida total). **Gatilho via GitHub Actions** (não
  `@Cron` interno — o Render Free hiberna sem tráfego, um timer interno não dispara
  contra um processo dormindo), endpoint interno protegido por segredo compartilhado.
  Tela de consulta no `admin-pizzarias` fica pra depois de todo o resto pronto.

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

# Pendências consolidadas (visão geral, atualizada em 2026-09-26)

- **Sprint 11b** — fechar o piloto com um tenant real.
- **Sprint 15** — rate limiting, audit log append-only, secrets no CI (gitleaks).
- **Sprint 25** — mover o upsert do contador sequencial pro fim da transação, testar
  `pool_timeout`, retestar com pedidos de 2-3 itens. Resolução definitiva da taxa de
  sucesso sob carga pesada depende do upgrade de infra do Render (decisão adiada pra
  quando houver receita/escala).
- **App nas lojas** (Sprints 17-21) — nenhuma iniciada.
- **Backlog fora do MVP** — pagamento online, WhatsApp, MFA, WebSocket/realtime, LGPD
  formal, pentest externo, observabilidade completa, particionamento de `orders`,
  Redis real em produção, vault de secrets dedicado, code-splitting.
- **Bug de ambiente**: `nest start --watch` quebrado (`deleteOutDir` + `incremental`).
