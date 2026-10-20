// Vocabulario fechado de areas de acesso operacional (decisao 9, Sprint "Equipe") --
// cada valor aqui corresponde a um @RequiresStaffPermission() real nos controllers de
// Pedidos/Cardapio/Estoque/Financeiro. "configuracoes" e "equipe" propositalmente FORA
// desta lista: configuracoes continua com o mesmo acesso que tenant_staff ja tinha antes
// desta sprint (sem mudanca de RBAC), e Equipe e' owner-only sempre (nem aparece como
// opcao de permissao).
export const STAFF_PERMISSIONS = ['pedidos', 'cardapio', 'estoque', 'financeiro'] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

// Permissoes que exigem o modulo pago correspondente contratado pelo tenant (duplo
// portao -- decisao 9). "pedidos"/"cardapio" sao feature core, sem modulo nenhum pra
// checar.
export const STAFF_PERMISSION_MODULE: Partial<Record<StaffPermission, 'estoque' | 'financeiro'>> = {
  estoque: 'estoque',
  financeiro: 'financeiro',
};
