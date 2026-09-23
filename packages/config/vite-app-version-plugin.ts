import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Sem "import type { Plugin } from 'vite'" de proposito: este arquivo vive em
// packages/config (sem node_modules proprio), so' e' resolvido de verdade quando um
// vite.config.ts de algum app importa e empacota (esbuild) -- tipagem estrutural do
// objeto retornado ja basta pro array `plugins` de cada app aceitar sem erro.

// Plugin de build compartilhado pelos 3 apps Vite do monorepo (cliente/pizzaria/
// admin-pizzarias): grava a MESMA versao (SHA do commit, exposto pela Vercel via
// VERCEL_GIT_COMMIT_SHA; timestamp local como fallback fora da Vercel) tanto DENTRO
// do bundle (constante global __APP_VERSION__, ver vite.config.ts de cada app) quanto
// num arquivo estatico "version.txt" na raiz do dist. E' esse arquivo que uma aba ja
// aberta (rodando JS antigo em memoria, que nunca recarrega sozinha depois de um
// deploy) busca periodicamente pra descobrir que existe uma versao nova -- ver
// packages/ui/src/UpdateBanner.tsx, que faz a checagem em runtime.
//
// Os dois valores vem da MESMA variavel capturada no fechamento do plugin (calculada
// uma unica vez, no momento em que o plugin e' criado), entao nunca podem divergir
// entre si dentro do mesmo build.
export function appVersionPlugin() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());
  let outDir = 'dist';

  return {
    name: 'app-version',
    config(config) {
      config.define = { ...config.define, __APP_VERSION__: JSON.stringify(version) };
      if (config.build?.outDir) {
        outDir = config.build.outDir;
      }
    },
    writeBundle() {
      writeFileSync(resolve(process.cwd(), outDir, 'version.txt'), version, 'utf8');
    },
  };
}
