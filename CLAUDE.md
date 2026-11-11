# PIZZA_NEW_PROT — contexto para qualquer sessão nova

Este arquivo é lido automaticamente por qualquer sessão do Claude Code que abrir este
repositório (nesta máquina, em outra máquina, ou pelo aplicativo) — mantenha-o
atualizado a cada mudança relevante de estado do projeto. Diferente da memória local
do Claude (que não viaja entre dispositivos), este arquivo vive no git e está sempre
disponível.

## O que é o projeto

SaaS white-label multi-tenant para pizzarias, 3 frontends (`apps/cliente`,
`apps/pizzaria`, `apps/admin-pizzarias`) + backend NestJS (`apps/api`) + Postgres via
Supabase, RLS forçada por tenant. Infra: Supabase (banco) + Render (API,
`pizza-api-homolog`) + Vercel (os 3 frontends).

## Onde está cada coisa (fonte canônica, não duplicar de memória)

- **`docs/pizzaria_sprints.md`** — **o único documento de status/histórico de sprints**.
  Tem a tabela completa de todas as sprints/planos e seus status (✅/🟡/⏳/❌), com
  detalhamento técnico de cada uma. **Sempre comece por aqui** para saber o que já foi
  feito e o que falta — nunca assuma a partir de memória de sessão anterior sem
  conferir este arquivo primeiro.
- **`docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md`** — decisões de arquitetura (multi-tenancy,
  RLS, modelo de dados, segurança) + seção 11.1 com o estudo de dimensionamento de
  infra (Render/Supabase, preços reais, recomendação de custo).
- **`docs/MVP.md`** — escopo e critérios de aceite do MVP.
- **`docs/APIS_SISTEMA.md`** — referência de endpoints.
- **`docs/TESTES_PENDENTES.md`** — mudanças ainda não validadas contra ambiente real.

## Regras operacionais recorrentes (aprendidas com dor, não repetir o erro)

- **Sempre revisar `migration.sql` gerado pelo `prisma migrate dev --create-only`
  antes de aplicar** — o Prisma repetidamente derruba sem avisar FKs compostas
  hand-written em `orders`/`order_items`/`products`/`refresh_tokens` ao mexer em
  qualquer coisa perto delas. Nunca aplicar uma migration sem ler o SQL primeiro.
- **Parar servidores locais (`pnpm dev`) antes de rodar a suíte e2e completa** — todos
  apontam pro mesmo Supabase pooled (homolog), contenção de conexão derruba testes
  por motivo errado.
- **Depois de um push, checar o run do GitHub Actions até `success`** — não só
  confiar que a mudança pontual funcionou; olhar o run inteiro.
- **pnpm monorepo**: verificar uso real de um arquivo via grep antes de confiar em
  documentação; pacotes internos (`packages/ui`, `packages/types`) precisam de
  devDependencies explícitas (`react`, `typescript`, etc.) mesmo quando só
  `peerDependency` "deveria" bastar; rodar `tsc --noEmit` de dentro do diretório do
  pacote, nunca da raiz via `-p <path>` (pode resolver o `node_modules` errado).
- **Ambiente do Supabase do Sprint 1 é homolog, não produção** — qualquer infra nova
  deve nomear como `-homolog` por padrão até uma decisão explícita de produção.
- **Gitleaks (CI, desde a Sprint 15) pode dar falso positivo em senha/token FAKE usado
  em teste** (regra `generic-api-key`) — resolver com `// gitleaks:allow` na linha
  exata (nunca desabilitar o step nem reescrever a senha fake pra esconder o padrão).
  Pra testar localmente antes de commitar: baixar o binário em
  `github.com/gitleaks/gitleaks/releases`, rodar
  `gitleaks detect --log-opts="<commit>~1..<commit>"` direto no repo.

## Estado atual (resumo — ver `docs/pizzaria_sprints.md` para detalhe completo)

Sprints 0–10 e boa parte de 11a–30 concluídas. Todo "Plano à parte" já virou sprint
numerada (16a-16d, 17-21, 29-35) em `docs/pizzaria_sprints.md` — não existe mais
nenhum item "sem número" nesse doc. Pendências abertas conhecidas:
- **Sprint 11b** — fechar o piloto com tenant real (ainda não escolhido).
- **Sprint 15** — ✅ completa (rate limiting, gitleaks, audit log append-only; secrets
  `API_BASE_URL`/`AUDIT_LOG_RETENTION_SECRET` já cadastrados no GitHub desde
  2026-10-03). Falta só, opcionalmente, a **Sprint 32** (tela de consulta do audit log
  no `admin-pizzarias` — protótipo aprovado, plano escrito, não implementada).
- **Sprint 25** — 🟡 parcial: concorrência no checkout (pedido fantasma) parcialmente
  mitigada; falta mover o upsert do contador sequencial pro fim da transação e
  testar `pool_timeout` do Prisma.
- **Sprints 17-21 (App nas lojas)** — plano escrito, nada implementado ainda.
- **Sprint 35 "Equipe"** — ✅ implementada em 2026-10-20 (cadastro de funcionários pelo
  dono + permissão por módulo via `User.permissions`). `GET/POST /tenants/me/staff`,
  `PATCH /tenants/me/staff/:id`, tela "Equipe" em `apps/pizzaria`.
- **Sprint 33 — App Cliente: moldura, cabeçalho e Meus Pedidos** — ✅ implementada em
  2026-10-24 (frontend only: moldura em tela larga, drawer hambúrguer,
  histórico/acompanhe/"Peça novamente" — agora um carrossel de 2 em 2 com barra de
  progresso arrastável, commits até `977910d` —, polling que para em estado final).
  Falta a validação manual (ver `docs/TESTES_PENDENTES.md`).
- **Sprint 34 — App Cliente: "Pedir de novo"** — ⏳ plano escrito, aguardando
  aprovação do usuário (ver `docs/pizzaria_sprints.md`). Checagem de
  preço/disponibilidade atual antes de somar itens de um pedido antigo ao carrinho;
  frontend only, zero mudança de backend. Entrada confirmada: botão no rodapé do
  detalhe do pedido (`OrderConfirmation.tsx`), ao lado do "Voltar".
- **Sprint 36 — Painel Pizzaria: identidade do usuário + "Loja Aberta" única** — ✅
  implementada em 2026-11-10. "Olá, {nome}" + cargo no cabeçalho do Dashboard; "Loja
  Aberta" saiu de Dashboard/Pedidos (duplicados) e virou único, na Sidebar, embaixo
  do nome da pizzaria. **Adendo no mesmo dia**: nova permissão "loja" (5ª, junto de
  Pedidos/Cardápio/Estoque/Financeiro) — só Dono e `tenant_staff` com essa permissão
  marcada podem abrir/fechar a loja agora (`PATCH /tenants/me` checa isso pro campo
  `isOpen` especificamente); antes disso QUALQUER funcionário podia, achado do
  próprio usuário depois de ver o recurso já no ar. **2º adendo**: "Produtos Mais
  Vendidos (Mensal)" no Dashboard virou mês-calendário atual (era janela deslizante
  de 30 dias) — `OrdersService.topProducts`.
- **Sprint 37 — Dashboard: "Vendas Hoje"/"Ticket Médio" restritos a Dono/Financeiro** —
  ✅ implementada em 2026-11-11 (`Dashboard.tsx`, reaproveita a permissão "financeiro"
  já existente). "Vendas da Semana" e "Produtos Mais Vendidos" continuam visíveis pra
  todo mundo (fora de escopo por ora, decisão explícita).
- Backlog sem sprint definida: pagamento online, WhatsApp, MFA, WebSocket/realtime,
  LGPD formal, pentest externo, observabilidade completa, particionamento de
  `orders`, Redis real em produção, vault de secrets dedicado, code-splitting.
