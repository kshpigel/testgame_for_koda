import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { viteObfuscateFile } from 'vite-plugin-obfuscator'

export default defineConfig({
  plugins: [
    viteSingleFile(),
    viteObfuscateFile({
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        stringArrayThreshold: 0.8,
        renameVariables: true,
      }
    })
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
