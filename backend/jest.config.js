/** @type {import('ts-jest').JestConfigWithTsJest} */
process.env.USE_MOCK_AI = process.env.USE_MOCK_AI ?? 'true';
process.env.JWT_SECRET = 'unit-test-only-secret-never-use-in-production-12345';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: '.' } }],
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
