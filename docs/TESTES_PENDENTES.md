# Testes Pendentes

Documento vivo — cada mudança que ainda não foi validada contra o Supabase de
homologação (ou em produção) entra aqui como uma linha nova. Ao validar, atualiza o
status e a data; nunca apaga a linha (histórico fica registrado, mesma convenção do
`docs/pizzaria_sprints.md`).

**Legenda de status**: ⏳ pendente · ✅ validado · ❌ falhou (ver observação).

| Funcionalidade | Onde | O que testar | Status | Data |
|---|---|---|---|---|
| Usuários da Pizzaria | Admin-Pizzarias → Vendas por Pizzaria → Ver Usuários | **Requisito:** tempo de resposta abaixo de 1s ao consultar os usuários de uma pizzaria (`GET /v1/admin/users?tenantId=`). Medir contra o homolog real e confirmar que a lista continua correta (rodar `apps/api/test/admin/admin-users.e2e-spec.ts`, especialmente o caso novo de `tenantId` + `role` combinados). Commit: `de712d1` — otimização aplicada corta 1 round trip, mas não há garantia de que sozinha alcance <1s (ver ressalva registrada na conversa). | ❌ falhou (ver observação) | 2026-09-29 |
| Acompanhar Pedido | Cliente → Confirmação do Pedido (polling a cada 10s) | **Pergunta do usuário:** dá pra deixar `GET /v1/orders/:id` abaixo de 1s? Avaliar se é possível via código. | ✅ validado (ver observação — conclusão: não é possível só com código) | 2026-09-29 |
| Expurgo do Audit Log | Sem tela — job interno (`POST /v1/internal/audit-log-retention/run`, disparado pelo `.github/workflows/audit-log-retention.yml` agendado) | **O que testar:** rodar o job contra o volume real de tenants em produção/homolog (hoje ~160) e conferir a resposta `{tenantCount, failed}` — em teste local contra o homolog real, boa parte das tentativas individuais falhou com `"Engine is not yet connected"` (ver observação). **Como testar:** (1) confirmar que os secrets `API_BASE_URL`/`AUDIT_LOG_RETENTION_SECRET` foram cadastrados no GitHub (Settings → Secrets → Actions) — sem isso o workflow agendado nem chega a chamar o endpoint; (2) disparar manualmente via `workflow_dispatch` (aba Actions → "Audit log retention" → "Run workflow") ou `curl -X POST <API_BASE_URL>/v1/internal/audit-log-retention/run -H "X-Retention-Job-Secret: <segredo>"` direto; (3) ler o `failed` no corpo da resposta e o log do Render (`Expurgo diario concluido -- X tenant(s), Y falha(s)`) — se `failed` vier alto (próximo do total de tenants), investigar `connection_limit` na `DATABASE_URL` ou reduzir a concorrência de 5 (`TENANT_CONCURRENCY` em `audit-log-retention.service.ts`) pra 2-3; (4) repetir no dia seguinte e confirmar que `failed` cai (prova que é transitório, não uma falha permanente por tenant). | 🟡 parcial (ver observação) | 2026-10-03 |
| Mudança de layout do Cliente (PROTCLINEW) | App Cliente → Cardápio, Monte sua Pizza, Carrinho, Checkout, Confirmação (fluxo inteiro) | **O que testar:** redesenho completo da Opção B (cardápio editorial, ver `docs/PROTCLINEW.md`) nas 7 telas/componentes do fluxo do cliente — `Menu.tsx` (header + busca nova + abas de categoria), `PizzaBuilder.tsx` (builder + seletor de 2º sabor), `Cart.tsx`, `Checkout.tsx`/`AddressForm.tsx`, `OrderConfirmation.tsx`. `tsc --noEmit` e `vite build` já confirmados limpos nos 4 pacotes (`apps/cliente`, `packages/ui`, `apps/pizzaria`, `apps/admin-pizzarias`) — falta a validação visual/interativa de verdade, que exige um browser (não disponível neste ambiente). **Como testar:** `pnpm dev:cliente` e seguir o fluxo completo — login → busca no cardápio (filtra e limpa certo) → trocar categoria → "meio a meio" numa pizza → escolher 2º sabor → "Monte sua Pizza" (trocar tamanho via "Alterar") → adicionar ao carrinho → Carrinho (stepper de quantidade, remover item) → Checkout (CEP real pra testar busca automática de endereço, forma de pagamento, troco) → Confirmação (código do pedido, status, polling) → "Fazer Novo Pedido" volta pro cardápio. Testar também: loja fechada bloqueia troca de categoria/ações no Cardápio; cadastro (`Auth.tsx`) com "+ Cadastrar endereço" ainda funciona (usa o mesmo `AddressForm` com o novo visual `Input variant="minimal"`, mas o resto do formulário de cadastro continua no visual antigo — mistura esperada, ver `docs/PROTCLINEW.md` seção Sprint 6); e a largura mobile real (390px) sem nada cortando. | ⏳ pendente | 2026-10-03 |
| Confirmação visual ao adicionar item ao carrinho (toast) | App Cliente → Cardápio ("+" em pizza/bebida/sobremesa) e Monte sua Pizza ("Adicionar ao Carrinho", inclusive meio a meio) | **Achado real do usuário** durante o teste manual do PROTCLINEW acima: adicionar item (sobretudo o 2º sabor de uma meio a meio) não dava nenhuma confirmação visível além do número da barra mudar — parecia "não fez nada". Commit `3160127`: toast simples (pílula fixa no topo, `CheckCircle2` + nome do item, some sozinho após 2,2s, sem lib nova) disparado nos 4 handlers de adicionar. `tsc --noEmit` e `vite build` limpos em `apps/cliente`. **Como testar:** `pnpm dev:cliente` → clicar "+" numa pizza/bebida/sobremesa no Cardápio → confirmar que o toast aparece e some em ~2,2s; "Monte sua Pizza" → meio a meio, escolher 2º sabor → confirmar que o toast aparece ao voltar pro Cardápio (o builder já navega de volta via `setView('menu')`, não deveria mais parecer "sumiu sem feedback"); testar os 3 outros caminhos (pizza inteira, bebida, sobremesa). | ⏳ pendente | 2026-10-03 |

---

## Observações

**Usuários da Pizzaria (2026-09-29)**: correção validada (`admin-users.e2e-spec.ts`
completo, 6/6 verde, incluindo o caso `tenantId`+`role` — isolamento entre tenants
confirmado, sem vazamento de dado). **A meta de <1s NÃO foi alcançada**: medido contra
produção real (`pizza-api-homolog.onrender.com`), 8 tentativas entre `?tenantId=` e
`?tenantId=&role=` combinados, todas entre **1,1s e 1,6s** — nenhuma abaixo de 1s. A
correção (cortar 1 round trip) é real e ajuda, mas o piso de resposta é dominado pelo
handshake de conexão do Render Free por transação, não pelo número de idas ao banco
dentro dela — mesmo diagnóstico já registrado em `docs/pizzaria_sprints.md` (frente
"Desempenho Sistema"). Pra cruzar a barreira de 1s de forma confiável, a alavanca que
resta é o upgrade de infra do Render (decisão já tomada de adiar pra quando houver
receita/escala), não mais otimização de código nesta rota específica.

**Acompanhar Pedido (2026-09-29)**: usuário reportou 2,06s num `GET /v1/orders/:id`
que retornou **304 Not Modified** (status não tinha mudado desde o poll anterior).
`OrdersService.findOne()` já é 1 única query por chave primária (`findUnique`,
sem loop) — não sobra nada pra otimizar na consulta em si. O 304 prova o ponto: ele só
economiza bytes na resposta, o backend ainda roda o pipeline inteiro (guard, abrir
transação, query, serializar, só então comparar) antes de decidir não mandar o corpo —
por isso levou o mesmo ~2s de qualquer outra chamada. **Conclusão: não dá pra cruzar a
barreira de 1s só com mudança de código nesta rota** — é o mesmo piso de conexão do
Render Free já confirmado em toda outra medição desta sessão (health check, vendas por
pizzaria, usuários por pizzaria, todas na faixa de 1,1-2,2s independente da
complexidade da query). As únicas duas alavancas reais: upgrade de infra do Render
(decisão já adiada pra quando houver receita/escala), ou reduzir a frequência do
polling / trocar por push (WebSocket/realtime, já no backlog fora do MVP) — nenhuma
das duas é uma correção de código nesta sprint.

**Expurgo do Audit Log (2026-10-01)**: implementado e testado via e2e (suíte isolada
com tenant descartável, passou limpo), mas rodado também, nesta sessão, contra o
homolog real — que já acumula **~160 tenants** de sprints anteriores. Sob esse volume,
`AuditLogRetentionService.runDailyRetention()` (que percorre `mapWithConcurrency`,
concorrência 5, um `runInTenantContext` por tenant) viu boa parte das tentativas
individuais falhar com `PrismaClientUnknownRequestError: Engine is not yet connected`
— erro do motor do Prisma, não do SQL em si (a mesma query `DELETE ... RETURNING *` +
`INSERT INTO audit_logs_archive` funciona corretamente quando testada isolada contra
1 tenant). O try/catch por tenant já existente isolou cada falha (nenhuma travou as
outras, o job sempre terminou e devolveu `{tenantCount, failed}`), e **não há perda de
dado** — um tenant que falha hoje é só reprocessado no próximo ciclo (o próximo dia
simplesmente teria >30 dias de dado acumulado pra mover, não um buraco permanente).
Mas o padrão (muitas falhas de uma vez, concentradas) sugere que o pooler do Supabase
e/ou o Prisma Client não aguentam bem ~32 transações concorrentes-em-rajada (160
tenants / lotes de 5) nesse ambiente. Hipóteses a investigar se o sintoma voltar:
(1) `connection_limit` explícito na `DATABASE_URL` (hoje ausente, Prisma calcula
sozinho a partir da CPU); (2) reduzir `TENANT_CONCURRENCY` de 5 pra 2-3.

**Atualização (2026-10-03)**: secrets `API_BASE_URL`/`AUDIT_LOG_RETENTION_SECRET`
cadastrados no GitHub + Render (ver `docs/pizzaria_sprints.md`, Sprint 15). Disparo
manual (`workflow_dispatch`) confirmado com **sucesso** — primeira vez que o job rodou
passando pela API real do Render, não direto no Supabase local. Step "Trigger
retention job" terminou verde em 1m 6s, sem o sintoma de "Engine is not yet connected"
reproduzido (reforça a hipótese de que o caminho via Render não sofre do mesmo
problema que bater direto do laptop no pooler). **Ainda em aberto**: o corpo da
resposta (`{tenantCount, failed}`) não foi inspecionado nesse disparo — `curl -sf` só
confirma HTTP 2xx, não o conteúdo — falta ler o log de resumo no Render
(`Expurgo diario concluido -- X tenant(s), Y falha(s)`) pra confirmar que `failed`
veio baixo/zero antes de marcar este item como totalmente validado.

## Como usar este documento

1. Toda mudança de código que não foi exercitada contra o ambiente real (homolog/produção) nesta sessão ganha uma linha aqui: qual funcionalidade (nome que você reconhece na tela, não o nome técnico do código), onde ela fica no sistema, o que precisa ser verificado, e a data em que foi implementada.
2. Ao rodar o teste de verdade, atualiza o Status (✅/❌) e a Data para a data da validação — não abre linha nova pra isso, edita a existente.
3. Se o teste falhar, mantém ❌ e adiciona uma nota curta logo abaixo da tabela (mesma seção de "observações"), explicando o que quebrou.
