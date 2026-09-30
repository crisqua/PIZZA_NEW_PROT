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

## Estado atual (resumo — ver `docs/pizzaria_sprints.md` para detalhe completo)

Sprints 0–10 e boa parte de 11a–27 concluídas. Pendências abertas conhecidas:
- **Sprint 11b** — fechar o piloto com tenant real (ainda não escolhido).
- **Sprint 15** — 🟡 parcial: rate limiting em `POST /orders` ✅ implementado
  (2026-09-29); faltam audit log append-only e scan de secrets no CI (gitleaks).
- **Sprint 25** — 🟡 parcial: concorrência no checkout (pedido fantasma) parcialmente
  mitigada; falta mover o upsert do contador sequencial pro fim da transação e
  testar `pool_timeout` do Prisma.
- **App nas lojas (Sprints 17-21)** — plano escrito, nada implementado ainda.
- Backlog sem sprint definida: pagamento online, WhatsApp, MFA, WebSocket/realtime,
  LGPD formal, pentest externo, observabilidade completa, particionamento de
  `orders`, Redis real em produção, vault de secrets dedicado, code-splitting.
