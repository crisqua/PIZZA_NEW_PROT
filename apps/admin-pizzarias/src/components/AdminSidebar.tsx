import { LayoutDashboard, Store, Settings, Users, LogOut, Tag } from 'lucide-react';
import { cn, Sidebar as SidebarShell } from '@pizza/ui';

interface AdminSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function AdminSidebar({ activePage, onNavigate, onLogout }: AdminSidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', name: 'Pizzarias', icon: Store },
    { id: 'plans', name: 'Planos & Preços', icon: Tag },
    { id: 'users', name: 'Usuários', icon: Users },
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  return (
    <SidebarShell
      activePage={activePage}
      mobileTitle="DESENVOLVAINC"
      widthClassName="w-64"
      header={
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">
            D
          </div>
          <div>
            <h2 className="font-bold text-lg">DESENVOLVAINC</h2>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </div>
      }
      footer={
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 m-4 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      }
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
              activePage === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </button>
        );
      })}
    </SidebarShell>
  );
}
