import { useState } from 'react';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { login, register } from '../data/repository';
import { Button, Input } from '@pizza/ui';

interface AuthProps {
  onBack: () => void;
  onAuthenticated: () => void;
}

type AuthMode = 'login' | 'cadastro';

// Tela de Cadastro + Login do cliente final (Sprint 7, MVP.md item 3) -- nao existia
// nenhuma tela de autenticacao antes desta sprint, o app abria direto no Menu. So' e'
// exigida ao chegar no Checkout (navegar cardapio/montar carrinho continua livre, sem
// login -- mesma UX de qualquer app de delivery).
export function Auth({ onBack, onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim() || (mode === 'cadastro' && !name.trim())) {
      setError('Preencha todos os campos.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel continuar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-card rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-xl text-foreground">{mode === 'login' ? 'Entrar' : 'Criar Conta'}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-2 p-1 bg-card rounded-lg border border-border">
          <button
            onClick={() => setMode('login')}
            className={`py-2 rounded-md text-sm font-semibold transition-colors ${
              mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode('cadastro')}
            className={`py-2 rounded-md text-sm font-semibold transition-colors ${
              mode === 'cadastro' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {mode === 'cadastro' && (
          <Input label="Nome completo" placeholder="Digite seu nome" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <Input
          label="Email"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting} className="h-14 rounded-lg text-base font-semibold">
          {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          {submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
        </Button>
      </div>
    </div>
  );
}
