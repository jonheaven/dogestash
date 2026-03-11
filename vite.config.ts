import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externalPackages = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
];

const isExternal = (id: string) => {
  return externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
};

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Dogestash',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: isExternal,
      treeshake: {
        moduleSideEffects: false,
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/contexts/**', 'src/providers/**'],
    },
  },
});
