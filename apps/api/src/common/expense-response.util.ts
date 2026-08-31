import { Expense } from '@prisma/client';

// Mesmo gotcha de sempre: Prisma.Decimal serializa via .toJSON() como STRING, nao
// number -- response mapeia .toNumber() explicitamente. "date" volta do Prisma como
// Date (meia-noite UTC, coluna @db.Date) -- normalizado pra 'YYYY-MM-DD' aqui, mesmo
// formato que o protototipo (Financial.tsx/mockData.ts) ja usa.
export interface ExpenseResponse {
  id: string;
  tenantId: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toExpenseResponse(expense: Expense): ExpenseResponse {
  return {
    id: expense.id,
    tenantId: expense.tenantId,
    description: expense.description,
    category: expense.category,
    amount: expense.amount.toNumber(),
    date: expense.date.toISOString().slice(0, 10),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}
