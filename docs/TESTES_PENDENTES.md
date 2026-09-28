# Testes Pendentes

Documento vivo — cada mudança que ainda não foi validada contra o Supabase de
homologação (ou em produção) entra aqui como uma linha nova. Ao validar, atualiza o
status e a data; nunca apaga a linha (histórico fica registrado, mesma convenção do
`docs/pizzaria_sprints.md`).

**Legenda de status**: ⏳ pendente · ✅ validado · ❌ falhou (ver observação).

| Funcionalidade | Descrição do que testar | Status | Data |
|---|---|---|---|
| `GET /v1/admin/users?tenantId=` (round trip único) | Rodar a suíte e2e completa (`apps/api/test/admin/admin-users.e2e-spec.ts`) contra o homolog real, em especial o teste novo de `tenantId` + `role` combinados (`ANY($1::text[])` via SQL raw). Confirmar que o resultado bate com o comportamento anterior e medir se o tempo de resposta caiu de fato (~150-300ms esperado, sem garantia de <1s). Commit: `de712d1`. | ⏳ pendente | 2026-09-28 |

---

## Como usar este documento

1. Toda mudança de código que não foi exercitada contra o ambiente real (homolog/produção) nesta sessão ganha uma linha aqui, com a funcionalidade afetada, o que precisa ser verificado, e a data em que foi implementada.
2. Ao rodar o teste de verdade, atualiza o Status (✅/❌) e a Data para a data da validação — não abre linha nova pra isso, edita a existente.
3. Se o teste falhar, mantém ❌ e adiciona uma nota curta logo abaixo da tabela (mesma seção de "observações"), explicando o que quebrou.
