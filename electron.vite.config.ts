import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig((): object => {
  const IS_TEST: boolean = process.env.TEST === 'true';

  return {
    main: {
      entry: { main: IS_TEST ? resolve('src/main/test/main.test.unit.ts') : resolve('src/main/main.ts') },
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@src': resolve('src')
        }
      },
      plugins: [externalizeDepsPlugin()]
    },
    preload: {
      entry: { preload: IS_TEST ? resolve('src/preload/test/index.test.unit.ts') : resolve('src/preload/index.ts') },
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@components': resolve('src/renderer/src/components'),
          '@src': resolve('src'),
          '@assets': resolve('src/renderer/src/assets')
        }
      },
      plugins: [react()]
    }
  };
});
