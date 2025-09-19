module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/app'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/renderer/**/*', // Exclude React components from coverage
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@main/(.*)$': '<rootDir>/app/main/$1',
    '^@preload/(.*)$': '<rootDir>/app/preload/$1',
    '^@renderer/(.*)$': '<rootDir>/app/renderer/$1',
    '^@services/(.*)$': '<rootDir>/app/services/$1',
  },
};