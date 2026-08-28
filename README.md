
  # High-Fidelity SaaS Pizza System

  This is a code bundle for High-Fidelity SaaS Pizza System. The original project is available at https://www.figma.com/design/cviewCK9TmvjBHSnXIHdg5/High-Fidelity-SaaS-Pizza-System.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Documentação de arquitetura e roadmap

  Este protótipo é apenas a camada visual (3 frontends: cliente, pizzaria, admin), com dados mockados em `src/app/data/mockData.ts`. A arquitetura, o modelo de multi-tenancy, segurança/LGPD e o roadmap de implementação do sistema completo (backend real, auth, pagamentos, etc.) são padronizados nos documentos abaixo — qualquer decisão técnica sobre este projeto deve ser consistente com eles:

  - [`docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md`](docs/ARQUITETURA_SISTEMA_PIZZA_SAAS.md) — arquitetura de sistema, multi-tenancy (RLS), auth/RBAC, segurança de pagamentos, LGPD, OWASP.
  - [`docs/PLANO_DE_PROJETO_PIZZA_SAAS.md`](docs/PLANO_DE_PROJETO_PIZZA_SAAS.md) — plano de projeto completo por fase (Fundação → Core → Pagamentos → Realtime → Compliance), ~16–20 semanas.
  - [`docs/MVP.md`](docs/MVP.md) — recorte de MVP (6–7 semanas): o que é inegociável (RLS, RBAC, auth) vs. o que fica para depois (pagamento online, WhatsApp, WebSocket, LGPD formal).
  