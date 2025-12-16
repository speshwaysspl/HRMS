import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    allowedHosts: ['speshwayhrms.com'],
    port: 5173,
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/styled'],
          motion: ['framer-motion'],
          pdf: ['jspdf', 'jspdf-autotable'],
          excel: ['xlsx'],
          socket: ['socket.io-client'],
          maps: ['@googlemaps/react-wrapper'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['jspdf', 'xlsx', '@googlemaps/react-wrapper'],
  }
});
