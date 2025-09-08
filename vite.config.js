import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 保持兼容：前端若写了 /api/*，转发到后端根路径
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 精确代理后端实际挂载的六类路由
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/courses': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/materials': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/papers': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/stats': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})