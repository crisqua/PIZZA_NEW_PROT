# Arquitetura de Sistema — SaaS White-Label para Pizzarias
### Documento técnico: Arquitetura, Engenharia e Segurança

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
A aplicação seta `app.current_tenant` a cada requisição, a partir do JWT validado — nunca a partir de parâmetro de URL/body não verificado.

**Resolução de tenant:** subdomínio (`pizzariaX.suapizza.com.br`) resolvido no gateway, que injeta o `tenant_id` no contexto da requisição antes mesmo de chegar na lógica de negócio.

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

---

## 5. Stack tecnológica sugerida

| Camada | Escolha | Justificativa |
|---|---|---|
| Frontend | React + TS + Vite (já existente), 3 builds separados com code-splitting por rota | Reaproveita o protótipo já feito |
| BFF/API | Node.js (NestJS) ou similar tipado, com módulos por domínio | Facilita RBAC, DTO validation, testabilidade |
| Banco relacional | PostgreSQL 16+ (RLS, particionamento por `tenant_id`/data em `orders`) | Consistência forte é essencial para pedidos/pagamentos |
| Cache/filas | Redis (cache de cardápio, filas de notificação, rate limiting) | Baixa latência, suporte a pub/sub para realtime |
| Realtime | WebSocket (Socket.IO) ou SSE para status de pedido ao vivo no painel da pizzaria | UX crítica: pizzaria precisa ver pedido novo instantaneamente |
| Storage de arquivos | S3-compatible (imagens de produto/logo), com URLs assinadas | Nunca servir uploads direto do servidor de app |
| Pagamentos | Gateway PCI-compliant (Stripe, Pagar.me, Mercado Pago) via tokenização | **Nunca tocar em dado de cartão cru** |
| Infra | Kubernetes ou serviço gerenciado (ECS/Cloud Run) + IaC (Terraform) | Reprodutibilidade e revisão de infraestrutura como código |
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

- **IaC (Terraform)** — toda infra versionada e revisada via PR, nunca criada manualmente no console.
- **Ambientes separados**: dev / staging / produção, com dados sintéticos em dev/staging (nunca cópia de produção com PII real sem anonimização).
- **CI/CD** com pipeline obrigatório: lint — testes — SAST (ex. Semgrep) — SCA (dependências) — build — deploy com aprovação manual para produção.
- **Secrets** em vault gerenciado (AWS Secrets Manager / HashiCorp Vault) — nunca em `.env` versionado ou variável hardcoded (o protótipo atual não tem isso, mas é ponto zero ao sair de mock para real).
- **Backups** automáticos do Postgres com teste periódico de restore (backup não testado não é backup).
- **Multi-AZ** para banco e serviços críticos (Orders/Payments) — este é o caminho crítico do negócio, cai = pizzaria para de vender.

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
