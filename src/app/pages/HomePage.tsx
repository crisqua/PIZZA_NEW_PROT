import { Link } from 'react-router-dom';
import { Store, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../components/Card';
import { Badge } from '../components/Badge';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-rose-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 text-6xl mb-6 shadow-inner shadow-primary/20">🍕</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight text-foreground">
            DESENVOLVA<span className="text-primary">INC</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground mb-6">
            Plataforma SaaS White Label para Pizzarias
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sistema completo com App do Cliente, Painel de Gestão e Painel Administrativo.
            Selecione um módulo para visualizar a demonstração.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link to="/client" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-primary h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">App do Cliente</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Interface mobile-first para pedidos online e montagem de pizzas
                </p>
                <Badge variant="default" className="mb-6 mx-auto w-fit bg-primary/10 text-primary hover:bg-primary/20 border-0">Mobile-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Cardápio interativo</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Montador de pizza (2 sabores)</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Carrinho e checkout</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Integração WhatsApp</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-primary font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/restaurant" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-success h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-success/20 to-success/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Store className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Painel da Pizzaria</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Gestão completa de pedidos e cardápio para o estabelecimento
                </p>
                <Badge variant="success" className="mb-6 mx-auto w-fit bg-success/10 text-success hover:bg-success/20 border-0">Desktop-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Dashboard com métricas</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Gestão de cardápio</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Pedidos em tempo real</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Configurações da loja</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-success font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin" className="group">
            <Card className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-info h-full bg-card/50 backdrop-blur-sm hover:-translate-y-2">
              <CardContent className="p-8 text-center flex flex-col h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-info/20 to-info/5 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-10 h-10 text-info" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Painel Admin</h3>
                <p className="text-base text-muted-foreground mb-6 flex-grow">
                  Controle total da plataforma SaaS e gestão de franquias
                </p>
                <Badge variant="info" className="mb-6 mx-auto w-fit bg-info/10 text-info hover:bg-info/20 border-0">Desktop-First</Badge>
                <div className="mt-auto pt-6 border-t border-border">
                  <ul className="text-sm text-left space-y-3 text-muted-foreground font-medium">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Dashboard global</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Gestão de tenants</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Cadastro white label</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-info" /> Configurações base</li>
                  </ul>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-info font-bold group-hover:gap-4 transition-all">
                  <span>Visualizar Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/5 via-accent to-primary/5 border-primary/20 shadow-inner">
            <CardContent className="p-8">
              <h3 className="text-lg font-bold mb-2 text-foreground">Desenvolvido por DESENVOLVAINC</h3>
              <p className="text-muted-foreground font-medium">
                Protótipo de alta fidelidade pronto para demonstração comercial
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
