import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Firebase sign-in pages, served from the app's own origin (see
    // authDomain in src/firebase.js).
    proxy: {
      "/__/auth": {
        target: "https://pingus-money-pocket.firebaseapp.com",
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
})
