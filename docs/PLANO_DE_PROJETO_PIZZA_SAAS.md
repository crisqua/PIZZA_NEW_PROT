# Plano de Projeto — SaaS White-Label para Pizzarias
### Detalhamento Funcional e Técnico por Fase (baseado no documento de arquitetura)

---

## 0. Como ler este plano

Cada fase tem:
- **Objetivo de negócio** (o que passa a ser possível ao final da fase)
- **Épicos e histórias funcionais** (o que o usuário consegue fazer)
- **Entregáveis técnicos** (o que precisa existir em código/infra)
- **Critérios de aceite / Definition of Done**
- **Riscos e dependências**

Escopo: backend real (hoje inexistente), integração dos 3 frontends já prototipados, segurança e compliance descritos na arquitetura.

---

## FASE 0 — Fundação (Auth, Multi-tenant, CI/CD)
**Duração estimada:** 3–4 semanas | **Pré-requisito de tudo o resto**

### Objetivo de negócio
Ter uma base segura onde é possível criar um tenant (pizzaria), criar usuários com papéis diferentes, e fazer login — sem nenhuma funcionalidade de pedido ainda.

### Épicos e histórias
| # | História | Ator |
|---|---|---|
| 0.1 | Como superadmin, crio um novo tenant (pizzaria) com subdomínio | Plataforma |
| 0.2 | Como owner de tenant, faço login no painel da pizzaria com MFA | Pizzaria |
| 0.3 | Como cliente final, crio conta e faço login (com/sem social login) | Cliente |
| 0.4 | Como superadmin, defino papéis/permissões de um usuário da pizzaria | Plataforma |
| 0.5 | Como sistema, todo acesso é resolvido por subdomínio — tenant_id automaticamente | — |

### Entregáveis técnicos
- [ ] Repositório backend (NestJS ou stack definida) com estrutura modular: `auth/`, `tenants/`, `users/` já isolados como módulos.
- [ ] PostgreSQL provisionado (IaC/Terraform) com schema inicial: `tenants`, `users`, `roles`, `permissions`.
- [ ] **RLS habilitada** em todas as tabelas com `tenant_id` desde o primeiro schema (não "adicionar depois").
- [ ] Middleware de resolução de tenant por subdomínio, injeta `tenant_id` no contexto de request.
- [ ] Serviço de Auth: JWT curto (15 min) + refresh rotativo em cookie `httpOnly/Secure/SameSite=Strict`.
- [ ] Hash de senha Argon2id + verificação contra base de senha vazada.
- [ ] MFA (TOTP) obrigatório para papéis `tenant_owner`, `tenant_staff`, `platform_*`.
- [ ] Pipeline CI: lint — testes unitários — SAST (Semgrep) — SCA (Dependabot/Snyk) — build.
- [ ] Ambientes dev/staging/produção provisionados via Terraform, secrets em vault gerenciado (não `.env`).
- [ ] Audit log (tabela append-only) já registrando: criação de tenant, login, criação de usuário, mudança de papel.

### Critérios de aceite
- Teste automatizado prova que usuário do Tenant A **não consegue**, via API, ler/editar dado do Tenant B (mesmo manipulando o token).
- Login com MFA funcional ponta a ponta para pelo menos 1 papel de cada tipo.
- Nenhum secret em código-fonte (checagem automatizada no CI, ex. gitleaks).

### Riscos
- Subestimar RLS agora gera retrabalho caro depois (migração de dado em produção é arriscada). **Não pular esta etapa.**

---

## FASE 1 — Core Funcional: Catálogo e Pedidos (sem pagamento online)
**Duração estimada:** 4–6 semanas | **Depende de Fase 0**

### Objetivo de negócio
Uma pizzaria piloto consegue cadastrar cardápio real e receber pedidos reais de clientes, com pagamento "na entrega" (dinheiro/maquininha física) — valida o fluxo operacional sem o risco de pagamento online.

### Épicos e histórias
| # | História | Ator |
|---|---|---|
| 1.1 | Como pizzaria, cadastro/edito produtos (pizza, bebida), categorias, preços, imagem | Pizzaria |
| 1.2 | Como pizzaria, defino disponibilidade de item (em falta / disponível) | Pizzaria |
| 1.3 | Como cliente, navego o cardápio do tenant pelo subdomínio dele | Cliente |
| 1.4 | Como cliente, monto uma pizza com 2 sabores (meio a meio) | Cliente |
| 1.5 | Como cliente, adiciono itens ao carrinho e faço checkout (endereço, forma de pagamento na entrega) | Cliente |
| 1.6 | Como pizzaria, recebo o pedido no painel e atualizo status (pendente — preparo — entrega — concluído) | Pizzaria |
| 1.7 | Como cliente, acompanho status do meu pedido | Cliente |
| 1.8 | Como sistema, notifico a pizzaria de novo pedido (via WebSocket) | — |

### Entregáveis técnicos
- [ ] Módulo `catalog/`: CRUD de produtos/categorias, upload de imagem via URL assinada para Object Storage (S3), nunca upload direto no servidor de app.
- [ ] Módulo `orders/`: criação de pedido, máquina de estados de status (`pending — preparing — delivery — completed / cancelled`), com transições validadas no backend (não confiar em input de status arbitrário).
- [ ] Cache Redis para leitura de cardápio (TTL curto + invalidação ativa ao editar produto).
- [ ] WebSocket (Socket.IO) para push de novo pedido/mudança de status ao painel da pizzaria em tempo real.
- [ ] Idempotência na criação de pedido (chave de idempotência no header, evita duplicar pedido em retry de rede/duplo clique).
- [ ] Integração dos 3 frontends existentes (client/restaurant) com a API real, substituindo `mockData.ts`.
- [ ] Rate limiting por tenant e por IP no endpoint público de criação de pedido.
- [ ] `tsconfig.json` adicionado ao projeto frontend + correção dos usos de `any` identificados na revisão do protótipo.
- [ ] Code-splitting por rota (`React.lazy`) separando bundles client/restaurant/admin.

### Critérios de aceite
- Pedido criado pelo cliente aparece no painel da pizzaria em tempo real sem refresh.
- Editar preço de produto reflete no cardápio do cliente em até 1 min (respeitando cache).
- Testes de carga simples comprovam que rate limit isola tenants (um tenant sob abuso não derruba outro).

### Riscos
- Migração dos frontends prototipados pode expor decisões de UI que não mapeiam 1:1 para o modelo de dados real (ex. adicionais/observações de pizza) — validar modelo de dados com o time de produto antes de codar a integração.

---

## FASE 2 — Pagamentos Online
**Duração estimada:** 3–5 semanas | **Depende de Fase 1**

### Objetivo de negócio
Cliente paga online no checkout (cartão/PIX), pizzaria recebe conciliação financeira confiável.

### Épicos e histórias
| # | História | Ator |
|---|---|---|
| 2.1 | Como cliente, pago com cartão tokenizado no checkout | Cliente |
| 2.2 | Como cliente, pago via PIX e vejo confirmação | Cliente |
| 2.3 | Como pizzaria, vejo o status financeiro de cada pedido (pago/pendente/estornado) | Pizzaria |
| 2.4 | Como plataforma, cobro comissão/mensalidade do tenant (billing do próprio SaaS) | Plataforma |
| 2.5 | Como sistema, trato webhook de confirmação de pagamento de forma idempotente | — |

### Entregáveis técnicos
- [ ] Integração com gateway PCI-compliant (Stripe/Pagar.me/Mercado Pago) via checkout tokenizado client-side — **nenhum dado de cartão passa pelo nosso backend**.
- [ ] Endpoint de webhook com **validação de assinatura HMAC** obrigatória antes de processar qualquer evento.
- [ ] Tabela `payments` append-only (nunca `UPDATE` destrutivo; novo estado = novo registro).
- [ ] Reconciliação: job que confere pedidos "pago" no gateway vs. no nosso banco, alerta divergência.
- [ ] Módulo `billing/` para cobrança da própria plataforma sobre os tenants (assinatura SaaS).
- [ ] Circuit breaker na integração com o gateway (evita que instabilidade do provedor derrube o checkout inteiro).

### Critérios de aceite
- Webhook duplicado (reenviado pelo gateway) não gera pedido pago duas vezes nem cobrança duplicada.
- Simulação de estorno reflete corretamente no painel da pizzaria.
- Nenhum log da aplicação contém PAN/CVV (checagem automatizada de padrão em log).

### Riscos
- Esta é a fase de maior exposição regulatória/financeira — recomenda-se revisão de segurança dedicada (não só o pentest final da Fase 4) focada exclusivamente no fluxo de pagamento antes de liberar para tenants reais.

---

## FASE 3 — Realtime, Notificações e Escala
**Duração estimada:** 3–4 semanas | **Pode rodar em paralelo com Fase 2**

### Objetivo de negócio
Operação suporta múltiplos tenants simultâneos com boa performance, e cliente/pizzaria recebem notificações fora do app (WhatsApp/SMS/push).

### Épicos e histórias
| # | História | Ator |
|---|---|---|
| 3.1 | Como cliente, recebo confirmação de pedido via WhatsApp | Cliente |
| 3.2 | Como pizzaria, recebo alerta sonoro/push de novo pedido mesmo com painel em segundo plano | Pizzaria |
| 3.3 | Como plataforma, monitoro saúde do sistema (latência, erros) por tenant | Plataforma |

### Entregáveis técnicos
- [ ] Fila assíncrona (Redis Streams/SQS) para disparo de notificações — desacopla checkout da latência de envio.
- [ ] Integração com WhatsApp Business API / SMS gateway.
- [ ] Observabilidade: OpenTelemetry + dashboards (Grafana/Datadog), logs estruturados com `request_id` + `tenant_id`.
- [ ] Alertas automáticos: taxa de erro por tenant, latência p95/p99, filas de notificação acumulando.
- [ ] Particionamento de `orders` por tenant/data se volume justificar (avaliar métricas reais antes de implementar).

### Critérios de aceite
- Queda momentânea do provedor de WhatsApp não impede a criação/confirmação do pedido (fila reprocessa depois).
- Dashboard permite identificar, por tenant, se o problema é do tenant específico ou da plataforma inteira.

---

## FASE 4 — Compliance, Auditoria e Go-Live Seguro
**Duração estimada:** 3–4 semanas | **Gate final antes de produção real com pagamento**

### Objetivo de negócio
Sistema pronto para operar com dados reais de clientes e pagamentos em conformidade legal, com processo de resposta a incidente definido.

### Épicos e histórias
| # | História | Ator |
|---|---|---|
| 4.1 | Como cliente, solicito exportação dos meus dados pessoais | Cliente |
| 4.2 | Como cliente, solicito exclusão da minha conta e dados | Cliente |
| 4.3 | Como plataforma, tenho DPA assinado com cada tenant definindo controlador/operador | Plataforma/Jurídico |
| 4.4 | Como suporte, ao acessar como um tenant (impersonation), essa ação fica registrada e visível ao tenant | Plataforma |

### Entregáveis técnicos
- [ ] Endpoints de exportação (JSON/CSV) e exclusão (hard delete + anonimização onde há obrigação fiscal de retenção) de dados do cliente final.
- [ ] Política de retenção de dados documentada e implementada (jobs de expurgo automático).
- [ ] Impersonation de suporte: log obrigatório + banner visível "suporte está acessando esta conta" no painel do tenant durante a sessão.
- [ ] CSP estrita nos 3 frontends; CORS restrito por subdomínio de tenant (não wildcard).
- [ ] Backup automatizado do Postgres com **teste de restore documentado** (não presumir que backup funciona).
- [ ] **Pentest externo de aplicação e infraestrutura** contratado e executado; findings críticos/altos corrigidos antes do go-live.
- [ ] Runbook de resposta a incidente de segurança (quem aciona, quem comunica tenants, prazos legais de notificação de vazamento conforme LGPD).

### Critérios de aceite
- Pentest sem findings críticos/altos em aberto.
- Simulação de "solicitação de exclusão de dados" executada ponta a ponta com sucesso.
- Restore de backup testado em ambiente isolado com sucesso comprovado.

---

## Resumo cronológico

| Fase | Semanas (estimativa) | Gate de saída |
|---|---|---|
| 0 — Fundação | 3–4 | RLS + Auth + CI/CD funcionando |
| 1 — Core (catálogo/pedidos) | 4–6 | Pedido real ponta a ponta (sem pagamento online) |
| 2 — Pagamentos | 3–5 | Checkout tokenizado + webhook seguro |
| 3 — Realtime/Escala | 3–4 (paralelo à Fase 2) | Notificações + observabilidade |
| 4 — Compliance/Go-live | 3–4 | Pentest aprovado + LGPD implementado |

**Total estimado: ~16–20 semanas** para primeiro tenant real operando com pagamento em produção, considerando um time pequeno (2–4 engenheiros) dedicado. Pode comprimir se Fases 2 e 3 rodarem realmente em paralelo com squads separados.

---

## Próximos passos imediatos (o que fazer nesta semana)
1. Definir a stack final (linguagem/framework do backend) — decisão bloqueante para tudo.
2. Desenhar o schema de banco definitivo (tenants, users, roles, products, orders, payments) e validar com RLS num protótipo de banco antes de escrever código de aplicação.
3. Escolher o gateway de pagamento (impacta modelo de dados de `payments` desde já, mesmo que a Fase 2 venha depois).
4. Definir 1 tenant piloto real para validar Fase 1 com dados de cardápio verdadeiros, não fictícios.
