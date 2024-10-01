import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => ({
  preset: 'ts-jest',
  testMatch: ['**.unit.ts'],
  rootDir: '.',
  transform: {
    '^.+\\.(ts)$': 'ts-jest'
  }
});
