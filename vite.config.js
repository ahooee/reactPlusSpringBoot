import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@react-page/editor',
      '@react-page/plugins-slate',
      '@react-page/plugins-image',
      '@react-page/plugins-background',
      '@react-page/plugins-divider',
      '@react-page/plugins-spacer',
    ],
  },
  resolve: {
    conditions: ['module', 'browser', 'production', 'import', 'default'],
    alias: {
      'react/jsx-runtime.js': 'react/jsx-runtime',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // Uploaded media is served by Spring Boot from ./uploads.
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
