import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { appVersionPlugin } from '../../packages/config/vite-app-version-plugin'

export default defineConfig({
  plugins: [react(), tailwindcss(), appVersionPlugin()],
  server: {
    port: 5175,
    strictPort: true,
  },
})
