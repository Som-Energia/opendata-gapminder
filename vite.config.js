import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import viteyaml from '@modyfi/vite-plugin-yaml'
import dsv from '@rollup/plugin-dsv'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), 'BASE_URL') }
  return {
    base: process.env.BASE_URL,
    resolve: {
      dedupe: Object.keys(pkg.dependencies),
    },
    plugins: [react(), viteyaml(), dsv()],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    server: {
      port: 8001,
    },
  }
})
