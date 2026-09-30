# Testes Pendentes

Documento vivo — cada mudança que ainda não foi validada contra o Supabase de
homologação (ou em produção) entra aqui como uma linha nova. Ao validar, atualiza o
status e a data; nunca apaga a linha (histórico fica registrado, mesma convenção do
`docs/pizzaria_sprints.md`).

**Legenda de status**: ⏳ pendente · ✅ validado · ❌ falhou (ver observação).

| Funcionalidade | Onde | O que testar | Status | Data |
|---|---|---|---|---|
| Usuários da Pizzaria | Admin-Pizzarias → Vendas por Pizzaria → Ver Usuários | **Requisito:** tempo de resposta abaixo de 1s ao consultar os usuários de uma pizzaria (`GET /v1/admin/users?tenantId=`). Medir contra o homolog real e confirmar que a lista continua correta (rodar `apps/api/test/admin/admin-users.e2e-spec.ts`, especialmente o caso novo de `tenantId` + `role` combinados). Commit: `de712d1` — otimização aplicada corta 1 round trip, mas não há garantia de que sozinha alcance <1s (ver ressalva registrada na conversa). | ❌ falhou (ver observação) | 2026-09-29 |

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

## Como usar este documento

1. Toda mudança de código que não foi exercitada contra o ambiente real (homolog/produção) nesta sessão ganha uma linha aqui: qual funcionalidade (nome que você reconhece na tela, não o nome técnico do código), onde ela fica no sistema, o que precisa ser verificado, e a data em que foi implementada.
2. Ao rodar o teste de verdade, atualiza o Status (✅/❌) e a Data para a data da validação — não abre linha nova pra isso, edita a existente.
3. Se o teste falhar, mantém ❌ e adiciona uma nota curta logo abaixo da tabela (mesma seção de "observações"), explicando o que quebrou.
