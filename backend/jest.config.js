module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        skipLibCheck: true,
        noEmit: true
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Exclude main server file
    '!src/config/**', // Exclude config files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  verbose: true
};