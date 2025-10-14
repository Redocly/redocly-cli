import { defineConfig } from 'vite';
import { bundleStats } from 'rollup-plugin-bundle-stats';

export default defineConfig({
  plugins: [bundleStats()],
  build: {
    lib: {
      entry: './resources/bundle.ts',
      name: 'core',
      formats: ['es'],
    },
    rollupOptions: {},
  },
});
