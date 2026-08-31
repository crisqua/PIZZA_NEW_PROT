// Lista fechada de categorias de despesa (Sprint 8) -- mesmo valor exato do protototipo
// (Financial.tsx: EXPENSE_CATEGORIES), validada so' no DTO via @IsIn, sem CHECK no banco
// (mesmo padrao de Product.type/Plan.modules).
export const EXPENSE_CATEGORIES = ['Insumos', 'Fixas', 'Outras'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
