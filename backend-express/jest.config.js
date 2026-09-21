/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*.unit.test.ts',
    '**/*.integration.test.ts',
    '**/*.system.test.ts',
    '**/*.quality.test.ts',
  ],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/mocks/prisma-client.ts',
  },
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/modules/**/*.service.ts',
    'src/modules/**/*.dto.ts',
    'src/modules/books/books.utils.ts',
    'src/modules/books/digital-content.service.ts',
    'src/middlewares/**/*.ts',
    '!src/**/*.routes.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
