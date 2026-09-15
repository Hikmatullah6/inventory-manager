// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  // Scratch git worktrees carry a second copy of package.json and every source
  // file, which collides with the real one and runs each test twice.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
};

export default config;
