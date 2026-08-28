# Arquitetura de Sistema — SaaS White-Label para Pizzarias
### Documento técnico: Arquitetura, Engenharia e Segurança

**Revisão (2026-08-27):** seções 3, 4, 5 e 11 atualizadas com base no projeto irmão **Barberaria** (`C:\Users\crist\BARBEARIA`), mesmo modelo de negócio (Incubadora → Tenant → Cliente final) já com backend real construído e testado em sprints. Mudanças: (1) mecanismo concreto de RLS + connection pooling via transação interativa + `SET LOCAL` (seção 3.1) — resolve o ponto que este documento deixava em aberto ("a aplicação seta `app.current_tenant`" sem especificar como, sob pooling); (2) FKs compostas para integridade referencial cross-tenant (seção 4.1); (3) stack de infraestrutura trocada de Kubernetes/Terraform/AWS para **Supabase + Render + Vercel** (seção 5 e 11) — mais leve e validada para o estágio de MVP, sem provisionar conta AWS; (4) ORM travado em **Prisma** (compatibilidade com o mecanismo da seção 3.1, mínimo 4.7+); (5) lista de testes obrigatórios de isolamento (seção 3.2); (6) resolução de tenant por subdomínio simplificada para o MVP (seção 3.3) — o Barberaria documenta essa mesma resolução como pendente por decisão de infra (DNS wildcard), não por falta de prioridade.

---

## 1. Visão geral e premissas

O sistema tem **3 atores/públicos distintos**, cada um com requisitos de disponibilidade, latência e segurança diferentes:

| Ator | Superfície | Criticidade | Perfil de tráfego |
|---|---|---|---|
| **Cliente final** (consumidor) | App/PWA de pedidos | Alta (perda = venda perdida) | Picos em horário de almoço/janta, mobile-first |
| **Pizzaria (tenant)** | Painel de gestão (pedidos, cardápio, KDS) | Altíssima (operação em tempo real da loja) | Uso contínuo durante horário de funcionamento |
| **Plataforma (você, dono do SaaS)** | Painel admin/superadmin | Baixa a média | Uso esporádico, mas acesso extremamente sensível |

Isso já define a primeira decisão de arquitetura: **não é um app único**, são 3 aplicações client-side servidas por uma plataforma de backend multi-tenant compartilhada, com isolamento rígido de dados entre tenants (LGPD + risco de negócio: uma pizzaria não pode, em hipótese alguma, ver pedidos ou dados de outra).

---

## 2. Arquitetura de alto nível

```
                         ┌───────────────────────────┐
                         │      CDN / Edge (WAF)      │  ← Cloudflare/Fastly + WAF + Bot mgmt
                         └──────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
 ┌──────┴───────┐             ┌─────────┴────────┐            ┌─────────┴──────┐
 │ Client Web/  │             │  Restaurant Web  │            │   Admin Web    │
 │ PWA (React)  │             │  Panel (React)   │            │  Panel (React) │
 │ *.suapizza.  │             │ app.suapizza.com │            │ admin.suapizza │
 │   com.br     │             │  (por tenant)    │            │     .com.br    │
 └──────┬───────┘             └─────────┬────────┘            └─────────┬──────┘
        │                               │                               │
        └───────────────────────────────┼───────────────────────────────┘
                                        │  HTTPS / JSON / (WebSocket p/ realtime)
                         ┌──────────────┴──────────────┐
                         │      API Gateway / BFF       │  ← rate limit, authN, roteamento
                         └──────────────┬──────────────┘
                                        │
      ┌─────────────────┬──────────────┼──────────────┬─────────────────┐
      │                 │              │              │                 │
┌─────┴──────┐   ┌──────┴─────┐ ┌──────┴──────┐ ┌─────┴──────┐ ┌────────┴──────┐
│ Auth &     │   │ Catalog &  │ │  Orders &   │ │ Billing &  │ │ Notification  │
│ Identity   │   │ Menu Svc   │ │  Payments   │ │ Tenants    │ │ Svc (push/    │
│ Service    │   │            │ │  Svc        │ │ Svc        │ │ SMS/WhatsApp) │
└─────┬──────┘   └──────┬─────┘ └──────┬──────┘ └─────┬──────┘ └────────┬──────┘
      │                 │              │              │                 │
      └─────────────────┴──────┬───────┴──────────────┴─────────────────┘
                                │
                     ┌──────────┴─────────────┐
                     │   PostgreSQL (RLS)      │  ← isolamento multi-tenant por linha
                     │   + Redis (cache/fila)  │
                     │   + Object Storage (S3) │  ← imagens de produtos, logos
                     └─────────────────────────┘
```

**Padrão recomendado:** começar como **modular monolith** (um único serviço de backend, mas com módulos internos bem separados — Auth, Catalog, Orders, Billing, Tenants) e só extrair para microsserviços reais (Orders/Payments) quando houver necessidade concreta de escalar ou de times separados. Microsserviços prematuros aqui adicionariam complexidade operacional (observabilidade distribuída, service mesh, saga patterns) sem ganho real para o estágio do produto.

---

## 3. Estratégia de multi-tenancy (decisão central)

Existem 3 modelos possíveis. Recomendação por fase:

| Modelo | Isolamento | Custo op. | Quando usar |
|---|---|---|---|
| **A. Banco compartilhado + `tenant_id` em toda tabela + Row-Level Security (RLS) no Postgres** | Bom, reforçado a nível de banco | Baixo | **Fase 1–2** (até dezenas/centenas de tenants) |
| **B. Schema por tenant** | Melhor | Médio (migrations em N schemas) | Fase 3, se exigência de isolamento subir (ex.: contratos enterprise) |
| **C. Banco por tenant** | Máximo | Alto | Só para tenants "enterprise" com exigência contratual/regulatória específica |

**Recomendação:** Modelo A com **RLS obrigatório no PostgreSQL**, não apenas filtro `WHERE tenant_id = ?` na aplicação. Isso é a diferença entre "esperamos que todo dev nunca esqueça o filtro" e "o banco recusa fisicamente retornar dados de outro tenant mesmo com bug de aplicação".

```sql
-- Exemplo de política RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```
A aplicação seta `app.current_tenant` a cada requisição, a partir do JWT validado — nunca a partir de parâmetro de URL/body não verificado. O mecanismo exato para fazer isso com segurança sob connection pooling está na seção 3.1.

### 3.1 Mecanismo RLS + connection pooling (obrigatório, não opcional)

`current_setting('app.current_tenant')` é uma variável de **sessão** do Postgres. Como o Prisma (e qualquer client) usa pool de conexões, a mesma conexão física é reaproveitada entre tenants diferentes. Um `SET` simples (escopo de sessão) deixaria a variável vazando para a próxima requisição que reaproveitar aquela conexão — isso anula a proteção da RLS sem que ninguém perceba em teste manual (que roda uma requisição de cada vez). Este é o ponto de maior risco técnico de todo o sistema e é bloqueante para o Definition of Done da primeira sprint de backend.

**Implementação obrigatória** (validada no Barberaria, mesmo modelo de negócio):

1. Toda rota autenticada de tenant (não as rotas `/admin/*` da plataforma) passa por um interceptor (`TenantContextInterceptor`, ou equivalente via Prisma Client Extension) que:
   - Abre uma **transação interativa**: `prisma.$transaction(async (tx) => { ... })`.
   - Primeira instrução dentro da transação: `SELECT set_config('app.current_tenant', $1, true)` — **parametrizado (`$1`), nunca concatenação de string**, mesmo o `tenant_id` vindo de um JWT já validado (defesa em profundidade contra SQL injection).
   - O terceiro argumento `true` do `set_config` equivale a `SET LOCAL` — escopo de **transação**, descartado automaticamente no `COMMIT`/`ROLLBACK`. Nunca usar `SET` simples (escopo de sessão) para isso.
2. **Toda query de negócio dentro da requisição usa o client transacional (`tx`), nunca o `prisma` global direto** — usar o client errado faz a query escapar do contexto de tenant e do RLS.
3. O connection pooler (ex. Supabase Supavisor, compatível com PgBouncer) deve estar em **modo transaction pooling obrigatório** — compatível com `SET LOCAL` por transação. Session pooling é incompatível com esta estratégia. `DATABASE_URL` (runtime) aponta para a porta do pooler em modo transaction; `DIRECT_URL` (usada só por `prisma migrate`) aponta para a conexão direta, já que DDL não é confiável através do pooler.
4. Rotas da plataforma (`/admin/*`) não passam por esse wrapper — usam acesso direto sem tenant context, já que operam sobre múltiplos tenants (ver seção 6.3, Superadmin).

**Exceção deliberada: a tabela `tenants` fica fora da policy de RLS.** Motivo (mesmo do Barberaria): a plataforma precisa enxergar todos os tenants simultaneamente no painel Admin-Pizzarias, o que não combina com um modelo baseado numa única `current_setting` por transação. O isolamento de `tenants` é feito por **separação de rotas e RBAC**, não por RLS:
- `/v1/admin/tenants/*` — exige `role = platform_superadmin`, sem tenant context, acesso irrestrito a todas as linhas.
- `/v1/tenants/me` — exige tenant autenticado, sempre filtra `WHERE id = <tenant_id do JWT>`, nunca aceita outro ID via parâmetro.

Implementar como **dois módulos NestJS distintos**, cada um com seu próprio guard — nunca reaproveitar o mesmo controller para os dois casos de uso, para evitar que um erro de roteamento exponha rota de plataforma para admin de tenant.

### 3.2 Testes obrigatórios de isolamento (não pular, mesmo no MVP)

1. **Isolamento básico entre tenants:** criar tenant A e B, autenticar como A, tentar ler/escrever dado de B → deve sempre falhar.
2. **IDOR via URL:** `GET /orders/{id-do-tenant-B}` autenticado como tenant A → `DENIED`/`NOT FOUND`.
3. **Manipulação de body:** enviar `{ "tenant_id": "tenant-B" }` no payload de uma requisição autenticada como tenant A → `tenant_id` do body deve ser ignorado, nunca usado.
4. **Manipulação de query string:** `GET /orders?tenant_id=tenant-B` → `tenant_id` da query não deve alterar o contexto autenticado.
5. **Associação cruzada em `order_items`:** tentar criar um item de pedido referenciando um `product_id` de outro tenant → deve falhar por violação de FK composta (seção 4.1).
6. **Vazamento de contexto sob connection pooling:** disparar requisições quase simultâneas de tenants diferentes reaproveitando conexões do pool, e provar que não há vazamento de `tenant_id` entre elas (mecanismo da seção 3.1). Este é mais rigoroso que o teste de isolamento "normal" do item 1 — roda sob concorrência real.
7. **Idempotência sob concorrência:** disparar duas requisições simultâneas de criação de pedido com a mesma chave de idempotência → apenas um pedido é criado.

Estes testes rodam no CI e bloqueiam merge se falharem — não são um "nice to have" de fase posterior.

### 3.3 Resolução de tenant — simplificado para o MVP

O modelo alvo é subdomínio (`pizzariaX.suapizza.com.br`) resolvido no gateway, que injeta o `tenant_id` no contexto da requisição antes mesmo de chegar na lógica de negócio. **Para o MVP e o piloto**, essa resolução automática por subdomínio real é adiada por decisão de infraestrutura, não de prioridade: implementar corretamente exige domínio próprio + DNS wildcard (`*.suapizza.com.br`) + configuração de wildcard domain no provedor de hosting do frontend — decisões que não têm relação com o código da aplicação e não valem a pena resolver antes de ter o domínio real contratado.

Solução pragmática para o MVP (mesma adotada pelo Barberaria, documentada como débito técnico consciente, não esquecimento): cada frontend aponta para um tenant fixo via variável de ambiente (`VITE_TENANT_SLUG`) resolvida em build time. O código que troca isso por resolução real via `window.location.hostname` é pequeno e pode ser adiantado a qualquer momento — o bloqueio é só a decisão de infra (domínio + DNS).

---

## 4. Modelo de dados (núcleo)

Entidades principais e relações-chave de segurança:

- `tenants` (id, subdomínio, plano, status, dados fiscais)
- `users` (id, tenant_id **nullable** — usuários da plataforma não pertencem a tenant; usuários de pizzaria/cliente pertencem)
- `roles` / `permissions` (RBAC granular — ver seção 6)
- `products`, `categories` (tenant_id obrigatório)
- `orders`, `order_items` (tenant_id obrigatório + `customer_id`)
- `customers` (dados pessoais — PII, ver LGPD seção 8)
- `payments` (nunca armazena dados de cartão — ver seção 7)
- `audit_log` (append-only, ver seção 9)

Todo tabela com dado de tenant tem `tenant_id UUID NOT NULL REFERENCES tenants(id)` + índice composto `(tenant_id, id)` e RLS ativa. Isso é nível arquitetural mínimo inegociável.

### 4.1 FKs compostas — integridade referencial cross-tenant (validado no Barberaria)

RLS impede uma *query* de vazar dado entre tenants, mas não impede, sozinho, que uma FK simples associe duas linhas de tenants diferentes entre si (ex.: um `order_item` do tenant A referenciando um `product_id` que na verdade pertence ao tenant B). Isso é bloqueado **no nível de banco**, não só em validação de aplicação, usando FK composta contra `(tenant_id, id)`:

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,

  -- Garante que order_id pertence ao MESMO tenant_id desta linha, não apenas que existe
  CONSTRAINT fk_item_order_tenant FOREIGN KEY (tenant_id, order_id)
    REFERENCES orders (tenant_id, id),
  -- Mesma garantia para product_id
  CONSTRAINT fk_item_product_tenant FOREIGN KEY (tenant_id, product_id)
    REFERENCES products (tenant_id, id)
);
```

Isso exige que `orders` e `products` tenham `UNIQUE (tenant_id, id)` (além da PK simples em `id`), para que a FK composta tenha uma chave única para referenciar. Aplicar o mesmo padrão em toda associação entre entidades que poderiam, por engano ou ataque, pertencer a tenants diferentes — não depender só de checagem em código para isso (teste obrigatório correspondente: seção 3.2, item 5).

---

## 5. Stack tecnológica sugerida

| Camada | Escolha | Justificativa |
|---|---|---|
| Frontend | React + TS + Vite (já existente), 3 apps separados (`cliente`, `pizzaria`, `admin-pizzarias`) — ver `PLANO_SEPARACAO_FRONTENDS.md` | Reaproveita o protótipo já feito |
| BFF/API | **NestJS + TypeScript**, com módulos por domínio | Facilita RBAC, DTO validation, testabilidade |
| ORM | **Prisma** (mínimo 4.7+, necessário para transação interativa — seção 3.1) | Compatível com o mecanismo obrigatório de RLS + connection pooling |
| Banco relacional | PostgreSQL (RLS nativo, particionamento por `tenant_id`/data em `orders` quando o volume justificar) | Consistência forte é essencial para pedidos/pagamentos |
| Cache/filas | Redis (cache de cardápio, filas de notificação, rate limiting) — provedor compatível com Render/Vercel (ex. Upstash) | Baixa latência, suporte a pub/sub para realtime |
| Realtime | WebSocket (Socket.IO) ou SSE para status de pedido ao vivo no painel da pizzaria | UX crítica: pizzaria precisa ver pedido novo instantaneamente |
| Storage de arquivos | Supabase Storage (S3-compatible), com URLs assinadas | Nunca servir uploads direto do servidor de app |
| Pagamentos | Gateway PCI-compliant (Stripe, Pagar.me, Mercado Pago) via tokenização | **Nunca tocar em dado de cartão cru** |
| Infra | **Supabase** (Postgres gerenciado + pooler Supavisor, compatível com PgBouncer em modo transaction) + **Render** (backend NestJS) + **Vercel** (os 3 frontends) | Infra leve o suficiente para o estágio de MVP, sem provisionar conta AWS nem Terraform — decisão validada no Barberaria |
| Observabilidade | OpenTelemetry + Grafana/Datadog, logs estruturados | Rastreamento cross-tenant deve ser auditável |

---

## 6. Autenticação e Autorização

### 6.1 Autenticação
- **OAuth2/OIDC** com tokens JWT de curta duração (15 min) + refresh token rotativo em cookie `httpOnly`, `Secure`, `SameSite=Strict`.
- **Nunca** armazenar JWT em `localStorage` (vulnerável a XSS) — usar cookie httpOnly para o token de sessão.
- Login do cliente final: e-mail/telefone + senha, com opção de social login; **MFA obrigatório para painel de pizzaria e admin** (TOTP no mínimo).
- Senhas com Argon2id (não bcrypt puro se puder evitar) + política de complexidade + verificação contra bases de senha vazada (ex.: HaveIBeenPwned k-anonymity API).

### 6.2 Autorização (RBAC + escopo de tenant)
Modelo de permissões em duas dimensões:

1. **Papel** (role): `platform_superadmin`, `platform_support`, `tenant_owner`, `tenant_staff`, `customer`.
2. **Escopo** (tenant_id): todo token carrega `tenant_id` (exceto papéis de plataforma) e toda query passa por esse escopo automaticamente via RLS — nunca confiar em checagem só no frontend.

**Regra de ouro:** o frontend esconder botões não é controle de acesso. Toda ação sensível é revalidada no backend contra o papel + tenant do usuário autenticado, independentemente do que a UI permite clicar.

### 6.3 Superadmin (painel da plataforma)
É a superfície de maior risco — um comprometimento aqui expõe todos os tenants.
- Acesso via rede restrita (VPN corporativa ou IP allowlist) além de MFA.
- Sessões de superadmin com timeout curto e log obrigatório de "impersonation" (quando suporte acessa como um tenant, deve ficar registrado e visível para o tenant, nunca silencioso).

---

## 7. Segurança de pagamentos (ponto crítico)

- **PCI-DSS**: a aplicação **não deve nunca** receber/processar/armazenar número de cartão. Usar SDK do gateway (tokenização client-side, ex. Stripe Elements/Checkout, Pagar.me Checkout Transparente com tokenização) para que o dado sensível vá direto do navegador ao gateway.
- Backend só recebe *tokens*/*payment_intent_id*, nunca PAN, CVV.
- Webhooks do gateway de pagamento: **validar assinatura HMAC** de cada webhook recebido, e tratá-los de forma idempotente (podem chegar duplicados).
- Reconciliação: todo evento financeiro gera entrada imutável em `payments` + `audit_log`; nunca fazer `UPDATE` destrutivo em registro de pagamento — apenas inserir novos estados.

---

## 8. Privacidade e conformidade (LGPD)

Como o sistema lida com dados pessoais de clientes finais (nome, telefone, endereço de entrega) em escala multi-tenant, a LGPD se aplica integralmente:

- **Base legal clara** por finalidade (execução de contrato para pedido; consentimento para marketing/notificações).
- **Minimização**: coletar só o necessário para entrega/cobrança.
- **Direito de titular**: endpoints para exportação e exclusão de dados do cliente final (o backend precisa suportar isso desde o desenho do schema — não é um "adicionar depois fácil").
- **Retenção**: política de tempo de guarda de dados de pedido/pagamento definida (ex.: obrigação fiscal exige alguns anos; dado de navegação não).
- **Anonimização em analytics**: dashboards agregados (admin) não devem expor PII crua — usar IDs pseudonimizados quando possível.
- **DPA (Data Processing Agreement)** com cada tenant, já que a plataforma processa dados dos *clientes dos seus clientes* — deixar claro contratualmente quem é controlador e quem é operador.
- **Criptografia**: dados sensíveis (endereço, telefone) criptografados em repouso (encryption at rest do banco no mínimo; considerar criptografia de coluna para campos mais sensíveis) e em trânsito (TLS 1.2+ obrigatório, HSTS).

---

## 9. Auditoria, logging e detecção

- **Audit log append-only** (nunca editável) para: login, mudança de papel/permissão, edição de cardápio/preço, mudança de status de pedido, ações de superadmin, impersonation.
- Logs de aplicação **nunca** contêm senha, token, PAN de cartão, ou corpo bruto de requisição com PII — mascarar antes de logar.
- Alertas automáticos para padrões suspeitos: múltiplas tentativas de login falhas, acesso de superadmin fora de padrão, spike de pedidos com o mesmo cartão/endereço (fraude), mudanças de `tenant_id` em massa.
- Correlacionar logs por `request_id` + `tenant_id` para investigação forense sem misturar dados de tenants diferentes.

---

## 10. Segurança de aplicação (OWASP-aligned)

Aplicado a cada serviço/rota:

| Risco OWASP | Mitigação neste sistema |
|---|---|
| Broken Access Control | RLS no banco + RBAC no backend + testes automatizados de "tenant A não acessa dado de tenant B" |
| Injection | ORM/queries parametrizadas sempre; nunca concatenar SQL/string em query |
| Cryptographic Failures | TLS everywhere, Argon2id para senha, secrets fora do código |
| Insecure Design | Threat modeling nas features críticas (pagamento, impersonation, exportação de dados) antes de codar |
| Security Misconfiguration | IaC revisado, scanning de configuração (ex. checkov/tfsec), sem debug mode em produção |
| Vulnerable Components | SCA automatizado (Dependabot/Snyk) no CI — o protótipo atual já tem ~40 pacotes de terceiros, isso precisa de monitoramento contínuo |
| Auth Failures | Rate limit de login, lockout progressivo, MFA em papéis sensíveis |
| Data Integrity Failures | Assinatura de webhooks, verificação de integridade de builds no CI/CD (evitar supply-chain attack) |
| Logging Failures | Ver seção 9 |
| SSRF | Validar/allowlist qualquer URL fornecida por usuário (ex. logo por URL) antes de fetch server-side |

Além disso, específico deste domínio:
- **Rate limiting por tenant e por IP** na API pública de pedidos (evitar abuso/DoS de um tenant afetando os demais — "noisy neighbor").
- **WAF + proteção anti-bot** na camada de borda para o app do cliente (superfície mais exposta, sem auth forte).
- **CSP estrita** nos 3 frontends, já que usam bastante componente de terceiro (Radix, embla-carousel, etc.) — reduz impacto de eventual XSS.
- **CORS restrito** por subdomínio de tenant, não wildcard.

---

## 11. Infraestrutura e deploy

- **Supabase + Render + Vercel**, sem Terraform/AWS nesta fase (seção 5) — decisão consciente para reduzir complexidade operacional no estágio de MVP, validada no Barberaria. Reavaliar Terraform/IaC formal só se/quando a plataforma crescer além do que esses três provedores gerenciados suportam confortavelmente.
- **Ambientes separados**: dev / staging / produção, com dados sintéticos em dev/staging (nunca cópia de produção com PII real sem anonimização).
- **CI/CD** com pipeline obrigatório: lint — testes — SAST (ex. Semgrep) — SCA (dependências) — build — deploy com aprovação manual para produção.
- **Gate de RLS no CI**: a cada migration nova, um step do pipeline consulta o catálogo do Postgres e confere se toda tabela com coluna `tenant_id` tem `relrowsecurity = true` (exceto `tenants`, exceção documentada na seção 3.1 — a plataforma precisa enxergar todos os tenants). Se uma tabela nova não tiver RLS ativo, o build quebra. Vale desde a primeira sprint de backend, não depois.
- **Secrets** nas variáveis de ambiente/secrets do próprio provedor (Render para o backend, Vercel para os frontends, Supabase para credenciais de banco) — nunca em `.env` versionado ou variável hardcoded. `.env.example` sem valores reais pode ir para o repositório.
- **Backups** automáticos do Postgres (gerenciados pelo Supabase) com teste periódico de restore (backup não testado não é backup).
- **Resiliência do caminho crítico** (Orders/Payments): Render e Supabase oferecem redundância gerenciada nesse estágio; Multi-AZ dedicado só vira decisão própria de infra se/quando o volume justificar migrar para além do que esses provedores cobrem.

---

## 12. Escalabilidade e resiliência

- **Cache de cardápio** (Redis) — cardápio muda pouco, é lido muito; TTL curto + invalidação ativa ao editar produto.
- **Fila assíncrona** (ex. Redis Streams/SQS) para notificações (WhatsApp/push/SMS) e para processamento pós-pagamento — desacopla latência do checkout do envio de notificação.
- **Idempotência** em endpoints de criação de pedido e webhook de pagamento (chave de idempotência) — crítico para evitar pedido duplicado em retry de rede.
- **Circuit breaker** nas integrações externas (gateway de pagamento, WhatsApp API) para não derrubar o sistema inteiro se um provedor terceiro cair.
- **Particionamento** de `orders` por tenant/data conforme volume crescer, para manter performance de dashboard.

---

## 13. Roadmap de implementação sugerido

1. **Fase 0 — Fundação:** Auth/Identity + modelo multi-tenant com RLS + CI/CD com security gates.
2. **Fase 1 — Core funcional:** Catalog + Orders (sem pagamento online, ex. "pagar na entrega") para validar fluxo operacional real com tenants piloto.
3. **Fase 2 — Pagamentos:** integração com gateway tokenizado + webhooks + reconciliação financeira.
4. **Fase 3 — Realtime e escala:** WebSocket para painel da pizzaria, filas assíncronas, observabilidade completa.
5. **Fase 4 — Compliance formal:** DPA com tenants, exportação/exclusão de dados LGPD, pentest externo antes de abrir para tenants em produção com dados reais de pagamento.

**Recomendação forte:** contratar (ou fazer internamente) um **pentest de aplicação e de infraestrutura** antes do primeiro tenant real processar pagamento em produção — isso não é opcional dado que o sistema lida com dados de pagamento e PII de terceiros em ambiente multi-tenant.

---

## 14. O que muda em relação ao protótipo atual

O protótipo que você tem hoje (`PIZZA_NEW_PROT`) é **só a camada visual dos 3 frontends** — é o ponto de partida correto para as telas, mas tudo abaixo da UI (API, banco, auth, multi-tenancy, pagamento, RLS, auditoria) precisa ser construído do zero seguindo este desenho. Nenhum dos dados hoje é real (`mockData.ts`), então não há "dívida técnica de segurança" ainda — é o momento certo para desenhar certo antes de conectar a um backend real.
