import { LayoutDashboard, Store, Settings, Users, LogOut, Tag } from 'lucide-react';
import { cn } from '@pizza/ui';

interface AdminSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function AdminSidebar({ activePage, onNavigate }: AdminSidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', name: 'Pizzarias', icon: Store },
    { id: 'plans', name: 'Planos & Preços', icon: Tag },
    { id: 'users', name: 'Usuários', icon: Users },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">
            D
          </div>
          <div>
            <h2 className="font-bold text-lg">DESENVOLVAINC</h2>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                activePage === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
