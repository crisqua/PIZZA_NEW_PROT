import { useEffect, useState } from 'react';
import { Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsers, AdminUser } from '../data/repository';
import { Card, CardContent, Button, Badge } from '@pizza/ui';

const PAGE_SIZE = 20;

// Diretorio cross-tenant de usuarios (Sprint 26) -- so-leitura, sem nenhuma acao de
// criar/editar/excluir, mesmo escopo ja validado no sistema irmao da Barbearia (ver
// giggly-beaming-curry.md). Gestao de equipe DENTRO de uma pizzaria (convidar/editar um
// funcionario) e' uma tela diferente, que nao existe ainda em apps/pizzaria -- fora de
// escopo aqui.
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os papéis' },
  { value: 'platform_superadmin', label: 'Superadmin' },
  { value: 'tenant_owner', label: 'Dono' },
  { value: 'tenant_staff', label: 'Funcionário' },
  { value: 'customer', label: 'Cliente' },
];

const ROLE_LABEL: Record<string, string> = {
  platform_superadmin: 'Superadmin',
  tenant_owner: 'Dono',
  tenant_staff: 'Funcionário',
  customer: 'Cliente',
};

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  platform_superadmin: 'destructive',
  tenant_owner: 'success',
  tenant_staff: 'info',
  customer: 'secondary',
};

export function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [role]);

  useEffect(() => {
    setLoading(true);
    getUsers({ role: role || undefined, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [role, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold mb-1">Usuários</h1>
        <p className="text-muted-foreground">
          Diretório de todos os usuários da plataforma — só consulta, sem edição.
        </p>
      </div>

      <div className="flex gap-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1fr_140px_1fr_160px] gap-4 px-6 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Usuário</span>
            <span>Papel</span>
            <span>Pizzaria</span>
            <span>Criado em</span>
          </div>

          {users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr_160px] gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{user.name}</div>
                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
              </div>
              <div>
                <Badge variant={ROLE_BADGE_VARIANT[user.role] ?? 'default'}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate">{user.tenantName ?? '—'}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}

          {!loading && users.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar o filtro de papel</p>
            </div>
          )}
        </CardContent>
      </Card>

      {users.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'usuário' : 'usuários'} — página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
