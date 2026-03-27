// vite.config.js
import { defineConfig } from "file:///mnt/d/dev/testgame_for_koda/pixi/node_modules/vite/dist/node/index.js";
import { viteSingleFile } from "file:///mnt/d/dev/testgame_for_koda/pixi/node_modules/vite-plugin-singlefile/dist/esm/index.js";
import { viteObfuscateFile } from "file:///mnt/d/dev/testgame_for_koda/pixi/node_modules/vite-plugin-obfuscator/index.js";
var vite_config_default = defineConfig({
  plugins: [
    viteSingleFile(),
    viteObfuscateFile({
      options: {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        stringArrayThreshold: 0.8,
        renameVariables: true
      }
    })
  ],
  base: "./",
  server: {
    port: 3e3,
    open: false,
    strictPort: false,
    hmr: false,
    watch: null
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: void 0
      }
    }
  },
  optimizeDeps: {
    include: ["pixi.js"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2QvZGV2L3Rlc3RnYW1lX2Zvcl9rb2RhL3BpeGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvZC9kZXYvdGVzdGdhbWVfZm9yX2tvZGEvcGl4aS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2QvZGV2L3Rlc3RnYW1lX2Zvcl9rb2RhL3BpeGkvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgdml0ZVNpbmdsZUZpbGUgfSBmcm9tICd2aXRlLXBsdWdpbi1zaW5nbGVmaWxlJ1xuaW1wb3J0IHsgdml0ZU9iZnVzY2F0ZUZpbGUgfSBmcm9tICd2aXRlLXBsdWdpbi1vYmZ1c2NhdG9yJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgdml0ZVNpbmdsZUZpbGUoKSxcbiAgICB2aXRlT2JmdXNjYXRlRmlsZSh7XG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGNvbXBhY3Q6IHRydWUsXG4gICAgICAgIGNvbnRyb2xGbG93RmxhdHRlbmluZzogdHJ1ZSxcbiAgICAgICAgZGVhZENvZGVJbmplY3Rpb246IHRydWUsXG4gICAgICAgIHN0cmluZ0FycmF5OiB0cnVlLFxuICAgICAgICBzdHJpbmdBcnJheVRocmVzaG9sZDogMC44LFxuICAgICAgICByZW5hbWVWYXJpYWJsZXM6IHRydWUsXG4gICAgICB9XG4gICAgfSlcbiAgXSxcbiAgYmFzZTogJy4vJyxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiBmYWxzZSxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICBobXI6IGZhbHNlLFxuICAgIHdhdGNoOiBudWxsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB1bmRlZmluZWRcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFsncGl4aS5qcyddXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFSLFNBQVMsb0JBQW9CO0FBQ2xULFNBQVMsc0JBQXNCO0FBQy9CLFNBQVMseUJBQXlCO0FBRWxDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLGVBQWU7QUFBQSxJQUNmLGtCQUFrQjtBQUFBLE1BQ2hCLFNBQVM7QUFBQSxRQUNQLFNBQVM7QUFBQSxRQUNULHVCQUF1QjtBQUFBLFFBQ3ZCLG1CQUFtQjtBQUFBLFFBQ25CLGFBQWE7QUFBQSxRQUNiLHNCQUFzQjtBQUFBLFFBQ3RCLGlCQUFpQjtBQUFBLE1BQ25CO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsTUFBTTtBQUFBLEVBQ04sUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUztBQUFBLEVBQ3JCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
