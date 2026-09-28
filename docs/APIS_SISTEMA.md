# APIs do Sistema — Pizzaria White-Label

Documento vivo — mapeia toda rota de `apps/api` (prefixo real: `/v1/...`) à
funcionalidade que ela atende. Gerado em 2026-09-28 lendo os controllers direto do
código (fonte da verdade); atualize esta lista sempre que uma rota nascer, mudar de
papel/guard ou for removida — mesma convenção do `docs/pizzaria_sprints.md`.

**Legenda de acesso**: 🌐 pública (sem login) · 🔒 autenticada (JWT) · papéis entre
parênteses quando restrita a um subconjunto. `@RequiresModule` marca rota atrás de
add-on pago (Estoque/Financeiro) — 403 se o plano do tenant não incluir o módulo.

---

## Autenticação (`/v1/auth`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/auth/login` | 🌐 | Login (e-mail/senha) dos 4 papéis — devolve access token + seta cookie de refresh. |
| POST | `/auth/register` | 🌐 | Cadastro de cliente final (sempre `role:customer`, tenant-scoped) — auto-login após criar a conta. |
| POST | `/auth/refresh` | 🔒 (cookie) | Renova o access token a partir do refresh token rotativo (cookie `httpOnly`). |
| POST | `/auth/logout` | 🔒 (cookie) | Revoga o refresh token atual e limpa o cookie. |
| POST | `/auth/verify-email` | 🌐 | Confirma o e-mail do cliente via link/token recebido por e-mail. |
| POST | `/auth/resend-verification` | 🔒 (customer) | Reenvia o e-mail de confirmação de cadastro. |

---

## Usuários — self-service (`/v1/users`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/users/me` | 🔒 (owner, staff, customer) | Dados do próprio perfil logado. |
| GET | `/users/:id` | 🔒 (owner, staff, customer) | Consulta de um usuário específico (sempre escopado ao próprio tenant via RLS). |
| PATCH | `/users/me` | 🔒 (owner, staff, customer) | Edita o próprio perfil — nome, telefone, endereço/CEP (cliente), etc. |

---

## Diretório de usuários (superadmin) (`/v1/admin/users`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/admin/users` | 🔒 (platform_superadmin) | Consulta de usuários — cross-tenant (sem filtro) ou de 1 pizzaria (`?tenantId=`, caminho usado hoje pela tela "Vendas por Pizzaria → Ver Usuários"). Só-leitura, com filtro por papel. |

---

## Tenants — self-service (`/v1/tenants`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/tenants/me` | 🔒 (owner, staff) | Dados do próprio tenant (branding, endereço, CNPJ, horário, etc.). |
| GET | `/tenants/me/subscription` | 🔒 (owner, staff) | Módulos liberados no plano atual do próprio tenant (Estoque/Financeiro), pro painel saber o que mostrar liberado/bloqueado. |
| PATCH | `/tenants/me` | 🔒 (owner, staff) | Edita branding, dados de contato, CNPJ, horário de funcionamento e o interruptor loja aberta/fechada do próprio tenant. |

---

## Tenants — administração da plataforma (`/v1/admin/tenants`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/admin/tenants` | 🔒 (platform_superadmin) | Cria um tenant (uso administrativo pontual — o fluxo normal é o onboarding abaixo). |
| POST | `/admin/tenants/onboard` | 🔒 (platform_superadmin) | Onboarding atômico: cria tenant + dono (`tenant_owner`) + assinatura numa única transação. Fluxo usado pela tela de cadastro de nova pizzaria. |
| GET | `/admin/tenants` | 🔒 (platform_superadmin) | Lista de pizzarias com busca no servidor (paginada) — alimenta os seletores de pizzaria do admin. |
| GET | `/admin/tenants/:id` | 🔒 (platform_superadmin) | Detalhe de uma pizzaria específica. |
| GET | `/admin/tenants/:id/sales` | 🔒 (platform_superadmin) | Relatório de vendas de 1 pizzaria (pedidos/receita do mês, histórico de 6 meses) — tela "Vendas por Pizzaria", consulta sob demanda, custo constante. |
| PATCH | `/admin/tenants/:id` | 🔒 (platform_superadmin) | Edita dados de uma pizzaria (troca de plano, dados cadastrais) via painel admin. |
| PATCH | `/admin/tenants/:id/active` | 🔒 (platform_superadmin) | Ativa/desativa uma pizzaria — desativar bloqueia login de `owner`/`staff` daquele tenant imediatamente. |

---

## Assinatura de um tenant (superadmin) (`/v1/admin/tenants/:tenantId/subscription`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/admin/tenants/:tenantId/subscription` | 🔒 (platform_superadmin) | Consulta o plano/módulos atribuídos a um tenant específico. |
| PATCH | `/admin/tenants/:tenantId/subscription` | 🔒 (platform_superadmin) | Atribui ou troca o plano de um tenant. |

---

## Planos (catálogo) (`/v1/admin/plans`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/admin/plans` | 🔒 (platform_superadmin) | Cria um plano (nome, preço, módulos inclusos). |
| GET | `/admin/plans` | 🔒 (platform_superadmin) | Lista o catálogo de planos — tela "Planos & Preços". |
| GET | `/admin/plans/:id` | 🔒 (platform_superadmin) | Detalhe de um plano. |
| PATCH | `/admin/plans/:id` | 🔒 (platform_superadmin) | Edita um plano existente (código do plano é imutável após criado). |

---

## Dashboard da plataforma (`/v1/admin`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/admin/whoami` | 🔒 (platform_superadmin) | Confirma identidade/sessão do superadmin logado. |
| GET | `/admin/dashboard` | 🔒 (platform_superadmin) | Métricas O(1) da plataforma: MRR, distribuição de planos, contagem de tenants abertos/fechados. Cacheado (TTL 10min). Não inclui mais agregados cross-tenant de pedidos (removidos na "Mudança de Dashboard", 2026-09-26 — consulta por pizzaria vive em `/admin/tenants/:id/sales`). |

---

## Catálogo público (sem login) (`/v1/public/tenants`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/public/tenants/:slug` | 🌐 | Branding público de uma pizzaria (nome, cor, logo, endereço, taxa de entrega, horário, aberto/fechado) — consumido pelo app do cliente antes do login. |
| GET | `/public/tenants/:slug/catalog` | 🌐 | Cardápio público (categorias + produtos disponíveis) de uma pizzaria, sem autenticação — tela inicial do app do cliente. |

---

## Catálogo — gestão (`/v1/catalog`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/catalog/categories` | 🔒 (owner, staff) | Cria uma categoria de cardápio (tenant-scoped). |
| GET | `/catalog/categories` | 🔒 (owner, staff) | Lista categorias do próprio tenant. |
| GET | `/catalog/categories/:id` | 🔒 (owner, staff) | Detalhe de uma categoria. |
| PATCH | `/catalog/categories/:id` | 🔒 (owner, staff) | Edita uma categoria. |
| DELETE | `/catalog/categories/:id` | 🔒 (owner, staff) | Remove uma categoria. |
| POST | `/catalog/products` | 🔒 (owner, staff) | Cria um produto (pizza/bebida) no cardápio. |
| POST | `/catalog/products/upload-url` | 🔒 (owner, staff) | Gera URL assinada do Supabase Storage pro upload direto da imagem do produto (não passa pelo backend). |
| GET | `/catalog/products` | 🔒 (owner, staff) | Lista produtos do próprio tenant. |
| GET | `/catalog/products/:id` | 🔒 (owner, staff) | Detalhe de um produto. |
| PATCH | `/catalog/products/:id` | 🔒 (owner, staff) | Edita um produto (preço, disponibilidade, imagem). |
| DELETE | `/catalog/products/:id` | 🔒 (owner, staff) | Remove um produto. |

---

## Pedidos (`/v1/orders`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/orders` | 🔒 (customer) | Cria um pedido — exige header `Idempotency-Key` (evita pedido duplicado em retry/F5). Gera código sequencial diário (`AAAAMMDDNNNN`, corte às 5h). |
| GET | `/orders` | 🔒 (customer, owner, staff) | Lista pedidos — cliente vê os próprios, painel da pizzaria vê os do dia (filtro `?date=`, corte às 5h). |
| GET | `/orders/top-products` | 🔒 (owner, staff) | Produtos mais vendidos nos últimos 30 dias — card do Dashboard da pizzaria. |
| GET | `/orders/:id` | 🔒 (customer, owner, staff) | Detalhe de um pedido — usado no acompanhamento (polling) do cliente e no painel da pizzaria. |
| PATCH | `/orders/:id/status` | 🔒 (owner, staff) | Atualiza o status do pedido (`pending → preparing → delivery → completed/cancelled`), validado como máquina de estados. |

---

## Estoque — add-on pago (`/v1/inventory`)

`@RequiresModule('estoque')` — 403 se o plano do tenant não incluir Estoque.

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/inventory` | 🔒 (owner, staff) | Cadastra um item de estoque. |
| GET | `/inventory` | 🔒 (owner, staff) | Lista itens de estoque, com alerta de quantidade baixa. |
| GET | `/inventory/:id` | 🔒 (owner, staff) | Detalhe de um item. |
| PATCH | `/inventory/:id` | 🔒 (owner, staff) | Edita quantidade/dados de um item. |
| DELETE | `/inventory/:id` | 🔒 (owner, staff) | Remove um item de estoque. |

---

## Financeiro — add-on pago (`/v1/financial`)

`@RequiresModule('financeiro')` — 403 se o plano do tenant não incluir Financeiro.

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| POST | `/financial/expenses` | 🔒 (owner, staff) | Registra uma despesa (Insumos/Fixas/Outras). |
| GET | `/financial/expenses` | 🔒 (owner, staff) | Lista despesas do tenant, com filtro opcional `from`/`to` por período. |
| GET | `/financial/expenses/:id` | 🔒 (owner, staff) | Detalhe de uma despesa. |
| PATCH | `/financial/expenses/:id` | 🔒 (owner, staff) | Edita uma despesa. |
| DELETE | `/financial/expenses/:id` | 🔒 (owner, staff) | Remove uma despesa. |
| GET | `/financial/revenue` | 🔒 (owner, staff) | Receita agregada por dia/período (conta só pedidos `completed`) — gráfico Receita × Despesas do painel. |

---

## Infra (`/v1/health`)

| Método | Rota | Acesso | Funcionalidade |
|---|---|---|---|
| GET | `/health` | 🌐 | Health check (`SELECT 1`) — monitorado pelo Render, também usado pra medir o piso de latência de conexão com o Supabase. |

---

## Resumo por app consumidor

- **`apps/cliente`** (app do cliente da pizzaria): `auth/*` (register/login/refresh/verify-email), `public/tenants/*`, `orders` (criar/listar/detalhe), `users/me`.
- **`apps/pizzaria`** (painel do dono/staff): `auth/login`, `tenants/me*`, `catalog/*`, `orders/*` (exceto criar), `inventory/*`, `financial/*`.
- **`apps/admin-pizzarias`** (superadmin/DesenvolvaIN): `auth/login`, `admin/*`, `admin/tenants/*`, `admin/plans/*`, `admin/users`.

## Como manter este documento atualizado

Toda vez que uma rota for criada, alterada (guard, papel, path) ou removida, atualize a
tabela correspondente nesta mesma edição — nunca deixe o código divergir do que está
aqui, e registre a data de qualquer revisão relevante no topo do documento.
