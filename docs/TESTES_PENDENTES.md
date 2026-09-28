# Testes Pendentes

Documento vivo — cada mudança que ainda não foi validada contra o Supabase de
homologação (ou em produção) entra aqui como uma linha nova. Ao validar, atualiza o
status e a data; nunca apaga a linha (histórico fica registrado, mesma convenção do
`docs/pizzaria_sprints.md`).

**Legenda de status**: ⏳ pendente · ✅ validado · ❌ falhou (ver observação).

| Funcionalidade | Onde | O que testar | Status | Data |
|---|---|---|---|---|
| Usuários da Pizzaria | Admin-Pizzarias → Vendas por Pizzaria → Ver Usuários | **Requisito:** tempo de resposta abaixo de 1s ao consultar os usuários de uma pizzaria (`GET /v1/admin/users?tenantId=`). Medir contra o homolog real e confirmar que a lista continua correta (rodar `apps/api/test/admin/admin-users.e2e-spec.ts`, especialmente o caso novo de `tenantId` + `role` combinados). Commit: `de712d1` — otimização aplicada corta 1 round trip, mas não há garantia de que sozinha alcance <1s (ver ressalva registrada na conversa). | ⏳ pendente | 2026-09-28 |

---

## Como usar este documento

1. Toda mudança de código que não foi exercitada contra o ambiente real (homolog/produção) nesta sessão ganha uma linha aqui: qual funcionalidade (nome que você reconhece na tela, não o nome técnico do código), onde ela fica no sistema, o que precisa ser verificado, e a data em que foi implementada.
2. Ao rodar o teste de verdade, atualiza o Status (✅/❌) e a Data para a data da validação — não abre linha nova pra isso, edita a existente.
3. Se o teste falhar, mantém ❌ e adiciona uma nota curta logo abaixo da tabela (mesma seção de "observações"), explicando o que quebrou.
