import { useEffect, useState } from 'react';

// Gravada pelo plugin de build compartilhado (packages/config/vite-app-version-plugin.ts)
// via `define` -- existe em tempo de execucao mesmo sem import explicito.
declare const __APP_VERSION__: string;

// Intervalo longo de proposito (estudo de impacto de performance feito com o usuario
// antes de implementar): deploys nao acontecem a cada minuto, um intervalo curto so'
// geraria requisicao a toa contra o arquivo estatico. `visibilitychange`/`focus`/`online`
// cobrem o caso real (dono volta pra aba, ou a rede caiu e voltou) de forma orientada a
// evento, sem custo nenhum em segundo plano. `visibilitychange` sozinho nao basta pra
// quem testa com 2 janelas lado a lado (nao abas da mesma janela) -- as duas ficam
// "visiveis" ao mesmo tempo, so' o foco muda, e visibilityState nunca vira "hidden" pra
// nenhuma delas (bug real encontrado testando o mesmo padrao no cliente/App.tsx).
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function fetchLatestVersion(): Promise<string | null> {
  try {
    // cache: 'no-store' descarta o cache do proprio navegador; o query param descarta
    // qualquer cache intermediario (CDN/proxy) que ignore o header -- version.txt
    // precisa ser sempre buscado fresco, senao o check nunca detecta nada de novo.
    const res = await fetch(`/version.txt?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    // Rede fora do ar, ou "version.txt" nem existe (ex.: `vite dev` local, sem build)
    // -- silencioso de proposito, nunca deve aparecer como erro pro usuario.
    return null;
  }
}

// Aviso discreto de que a aba esta rodando uma versao antiga do app (JS carregado em
// memoria antes do ultimo deploy -- uma SPA nunca atualiza sozinha sem reload). Nunca
// forca o reload sozinho: o dono pode estar no meio de um formulario, quem decide a
// hora e' ele, clicando em "Atualizar".
export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const latest = await fetchLatestVersion();
      if (!cancelled && latest && latest !== __APP_VERSION__) {
        setUpdateAvailable(true);
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-lg bg-foreground text-background px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">Nova versão disponível</span>
      <button
        onClick={() => window.location.reload()}
        className="text-sm font-semibold underline underline-offset-2"
      >
        Atualizar
      </button>
    </div>
  );
}
