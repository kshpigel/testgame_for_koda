import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [
    viteSingleFile()
  ],
  base: './',
  server: {
    port: 3000,
    open: false,
    strictPort: false,
    hmr: false,
    watch: null
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: ['pixi.js']
  }
})
