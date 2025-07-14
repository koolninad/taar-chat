module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: [
    '**/e2e/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/e2e-setup.ts'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 60000,
  maxWorkers: 1,
  verbose: true,
  // E2E tests typically need longer timeouts and different setup
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts'
};