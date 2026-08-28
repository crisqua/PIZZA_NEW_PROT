
  # Pizza SaaS — PIZZA_NEW_PROT

  Monorepo (pnpm workspaces) com os 3 apps do produto — **Cliente**, **Pizzaria** e
  **Admin-Pizzarias** (DesenvolvaINC) — separados em `apps/*`, mais os pacotes
  compartilhados `packages/ui` (design system) e `packages/types` (tipos de domínio).
  Originado do protótipo Figma Make "High-Fidelity SaaS Pizza System"
  (https://www.figma.com/design/cviewCK9TmvjBHSnXIHdg5/High-Fidelity-SaaS-Pizza-System),
  já separado em 3 aplicações independentes (Sprint 0, ver `docs/PLANO_SEPARACAO_FRONTENDS.md`).

  ## Rodando o código

  Instale as dependências uma vez, na raiz (workspace inteiro):

  ```
  pnpm install
  ```

  Suba cada app independentemente (portas fixas em dev — 5173/5174/5175):

  ```
  pnpm dev:cliente   # App do Cliente — http://localhost:5173
  pnpm dev:pizzaria  # Painel da Pizzaria — http://localhost:5174
  pnpm dev:admin     # Admin-Pizzarias — http://localhost:5175
  ```

  Cada app ainda usa dados mockados localmente (`apps/<app>/src/data/mockData.ts`,
  acessados via `apps/<app>/src/data/repository.ts`) — não há backend real ainda
  (ver `docs/MVP_SPRINTS.md`, Sprints 1+).

  ## Documentação de arquitetura e roadmap

  A arquitetura (baseada no projeto irmão **Barberaria**, mesmo modelo Incubadora →
  Tenant → Cliente já validado em produção local), o modelo de multi-tenancy,
  segurança/LGPD e o roadmap de implementação são padronizados nos documentos abaixo —
  qualquer decisão técnica sobre este projeto deve ser consistente com eles:

  - [`docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md`](docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md) — arquitetura de sistema, multi-tenancy (RLS + mecanismo de connection pooling), auth/RBAC, segurança de pagamentos, LGPD, OWASP, stack (Supabase + Render + Vercel).
  - [`docs/PLANO_DE_PROJETO_PIZZA_SAAS.md`](docs/PLANO_DE_PROJETO_PIZZA_SAAS.md) — plano de projeto completo por fase (Fundação → Core → Pagamentos → Realtime → Compliance), ~16–20 semanas.
  - [`docs/MVP.md`](docs/MVP.md) — recorte de MVP (9–10 semanas): o que é inegociável (RLS, RBAC, auth) vs. o que fica para depois (pagamento online, WhatsApp, WebSocket, LGPD formal).
  - [`docs/MVP_SPRINTS.md`](docs/MVP_SPRINTS.md) — o MVP acima traduzido em sprints executáveis (Sprint 0 a 11), com entregável e Definition of Done por sprint.
  - [`docs/PLANO_SEPARACAO_FRONTENDS.md`](docs/PLANO_SEPARACAO_FRONTENDS.md) — plano que guiou a separação da SPA única em `apps/cliente`, `apps/pizzaria`, `apps/admin-pizzarias` (Sprint 0, já executada).
  - [`docs/DESIGN_JORNADA_CLIENTE.md`](docs/DESIGN_JORNADA_CLIENTE.md) — sistema visual (dark + acento único por tenant) e jornada de pedido do App do Cliente, **aprovados em 27/08/2026**. Inclui link para o protótipo visual de referência.
  