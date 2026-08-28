# MVP — SaaS White-Label para Pizzarias (PIZZA_NEW_PROT)
### Escopo enxuto de 6–7 semanas, derivado da Arquitetura e do Plano de Projeto completos

---

## 0. Por que este documento existe

Os documentos `ARQUITETURA_SISTEMA_PIZZA_SAAS.md` e `PLANO_DE_PROJETO_PIZZA_SAAS.md` descrevem o **sistema completo** (~16–20 semanas, 5 fases, incluindo pagamento online, WhatsApp, observabilidade completa e compliance formal).

Este documento é o **recorte de MVP**: o menor conjunto de entregáveis que ainda respeita os não-negociáveis de segurança e multi-tenancy, mas adia tudo que não é indispensável para validar o produto com um tenant piloto real.

**Regra de corte:** nada que envolva isolamento de dados entre tenants, autenticação básica ou controle de papel é adiável. Tudo que é otimização de UX, canal de notificação externo, escala ou formalização jurídica é adiável.

---

## 1. Objetivo do MVP

Ter **1 pizzaria piloto em staging**, operando o fluxo completo:
cliente navega cardápio — monta pedido — faz checkout com pagamento **na entrega** — pizzaria recebe o pedido no painel e atualiza status — cliente acompanha o status.

Tudo isso com isolamento multi-tenant real (RLS) e autenticação/autorização reais — não mock.

**Fora do objetivo do MVP:** pagamento online, notificação via WhatsApp, realtime via WebSocket, observabilidade completa, LGPD formal (export/delete), pentest externo.

---

## 2. Escopo funcional incluído

| # | História | Ator |
|---|---|---|
| 1 | Superadmin cria um tenant (pizzaria) com subdomínio | Plataforma |
| 2 | Owner/staff da pizzaria faz login (email/senha) | Pizzaria |
| 3 | Cliente final cria conta e faz login (email/senha) | Cliente |
| 4 | Pizzaria cadastra/edita produtos, categorias, preços, imagem, disponibilidade | Pizzaria |
| 5 | Cliente navega cardápio pelo subdomínio do tenant | Cliente |
| 6 | Cliente monta pizza (inclusive meio a meio) e monta carrinho | Cliente |
| 7 | Cliente faz checkout com endereço + pagamento na entrega (dinheiro/maquininha física) | Cliente |
| 8 | Pizzaria vê pedido novo no painel (via polling, não WebSocket) e atualiza status (`pendente — preparo — entrega — concluído`) | Pizzaria |
| 9 | Cliente acompanha status do próprio pedido (via polling) | Cliente |

---

## 3. Escopo técnico incluído (não-negociável mesmo no MVP)

- [ ] **Multi-tenancy com RLS no PostgreSQL** desde o primeiro schema — `tenant_id` obrigatório em toda tabela de domínio + política RLS ativa.
- [ ] Middleware de resolução de tenant por subdomínio — injeta `tenant_id` no contexto da requisição.
- [ ] **Auth:** JWT de curta duração (15 min) + refresh rotativo em cookie `httpOnly/Secure/SameSite=Strict`. Sem MFA no MVP.
- [ ] Hash de senha com **Argon2id**.
- [ ] **RBAC básico:** papéis `platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`, com enforcement no backend (nunca só no frontend).
- [ ] Backend estruturado como **modular monolith** (módulos `auth/`, `tenants/`, `users/`, `catalog/`, `orders/`), preparado para extração futura, mas sem microsserviços agora.
- [ ] Módulo `catalog/`: CRUD de produtos/categorias, imagem via upload assinado para Object Storage (S3), nunca upload direto no servidor de app.
- [ ] Módulo `orders/`: máquina de estados de pedido validada no backend, idempotência na criação (chave de idempotência no header).
- [ ] **Atualização de status via polling** no painel da pizzaria e na tela do cliente (WebSocket fica para pós-MVP).
- [ ] Rate limiting básico por tenant e por IP no endpoint público de criação de pedido.
- [ ] Correção dos débitos técnicos do protótipo identificados na avaliação: adicionar `tsconfig.json`, resolver referências de assets do Figma para pasta inexistente, remover usos de `any` em pontos-chave de navegação, corrigir geração de ID propensa a colisão.
- [ ] Integração dos 3 frontends existentes com a API real, substituindo `mockData.ts`.
- [ ] Audit log append-only cobrindo: criação de tenant, login, criação de usuário, mudança de papel, mudança de status de pedido.
- [ ] Pipeline CI mínimo: lint — testes — build. (SAST/SCA completos podem ficar mais leves no MVP, mas não removidos — ver seção 5.)
- [ ] Secrets em vault gerenciado (não `.env` versionado) mesmo em staging.
- [ ] Ambiente de **staging** provisionado (não precisa produção completa multi-AZ ainda).

---

## 4. Explicitamente fora do MVP (pós-MVP / roadmap)

| Item | Por quê fica de fora | Fase original |
|---|---|---|
| MFA para papéis sensíveis | Reduz fricção de entrega inicial; superfície de risco aceitável com 1 tenant piloto em staging | Fase 0 |
| Pagamento online (gateway tokenizado, webhook HMAC) | Maior superfície de risco regulatório/financeiro do sistema; requer revisão de segurança dedicada | Fase 2 |
| Notificações WhatsApp | Canal externo, não bloqueia validação do fluxo operacional | Fase 3 |
| Cache Redis | Otimização de performance, não necessária com 1 tenant piloto e baixo volume | Fase 1/3 |
| Code-splitting dos 3 frontends | Otimização de bundle, não bloqueia funcionalidade | Fase 1 |
| WebSocket/realtime | Polling é suficiente para validar o fluxo com 1 tenant; some a complexidade de infra de pub/sub | Fase 3 |
| Exportação/exclusão de dados LGPD, DPA formal | Compliance formal necessária antes de dados reais de produção em escala, não para piloto controlado em staging | Fase 4 |
| Pentest externo | Investimento reservado para antes do go-live real com pagamento e dados reais | Fase 4 |
| Observabilidade completa (OTel/Grafana/Datadog) | Logging básico estruturado é suficiente no MVP; stack completa vem com escala | Fase 3 |
| Particionamento de `orders` | Só se justifica por volume, que não existe ainda | Fase 3 |

**Importante:** nenhum item "fora do MVP" compromete a arquitetura de dados. Todos foram desenhados para serem adicionados depois sem migração destrutiva (ex.: `payments` já nasce append-only na arquitetura completa; quando pagamento online entrar, o modelo já está pronto).

---

## 5. Ressalvas de segurança mesmo no MVP

Mesmo cortando escopo, os seguintes pontos continuam obrigatórios porque são estruturais, não incrementais:

- **RLS desde o dia 1** — retrofitting depois é caro e arriscado em produção (destacado tanto na arquitetura quanto no plano original).
- **RBAC com enforcement no backend** — não dá para adiar nem no MVP mais enxuto.
- **Nenhum secret em código-fonte** — checagem automatizada no CI (ex. gitleaks), mesmo em pipeline reduzido.
- **Sem dado de cartão** — como o MVP usa só pagamento na entrega, isso não é ainda um risco ativo, mas o modelo de dados de `orders`/`payments` já deve prever o campo de forma de pagamento de forma extensível para não exigir migração quando a Fase de pagamento online entrar.
- **Staging com dados sintéticos**, nunca cópia de produção.

---

## 6. Cronograma estimado (6–7 semanas)

| Semana | Foco |
|---|---|
| 1 | Setup de infra (staging, CI mínimo, vault de secrets), schema inicial + RLS, módulo `auth/` |
| 2 | `tenants/`, `users/`, RBAC básico, resolução de tenant por subdomínio |
| 3 | Módulo `catalog/` (CRUD produtos/categorias, upload de imagem) |
| 4 | Módulo `orders/` (criação, máquina de estados, idempotência) |
| 5 | Integração dos 3 frontends com API real (substituição de `mockData.ts`), correção dos débitos técnicos do protótipo |
| 6 | Polling de status (cliente e painel), audit log, rate limiting básico, testes de isolamento tenant A / tenant B |
| 7 | Buffer, ajustes com tenant piloto, hardening básico, deploy em staging |

---

## 7. Critérios de aceite do MVP

- Pedido criado pelo cliente aparece no painel da pizzaria (via polling) em tempo hábil e o status é atualizável.
- Teste automatizado prova que um usuário do Tenant A não consegue, via API, ler ou editar dado do Tenant B — mesmo manipulando o token.
- Login funcional para os 4 papéis (`platform_superadmin`, `tenant_owner`, `tenant_staff`, `customer`).
- Nenhum secret em código-fonte (checagem automatizada).
- `tsconfig.json` presente, sem uso de `any` nos pontos de navegação identificados, IDs sem colisão.
- Tenant piloto consegue cadastrar cardápio real e um pedido de ponta a ponta funciona em staging.

---

## 8. Próximos passos imediatos

1. Confirmar stack final do backend (NestJS ou equivalente tipado) — decisão bloqueante.
2. Desenhar o schema definitivo de `tenants`, `users`, `roles`, `products`, `orders` e validar RLS num protótipo de banco antes de codar.
3. Definir o tenant piloto real (cardápio verdadeiro, não fictício) para validar a Fase MVP.
4. Abrir repositório do backend com a estrutura modular (`auth/`, `tenants/`, `users/`, `catalog/`, `orders/`) e pipeline CI mínimo já no primeiro commit.
