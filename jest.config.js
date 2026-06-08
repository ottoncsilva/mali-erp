const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Caminho do app Next para carregar next.config e .env nos testes
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  // Apenas os testes em lib/__tests__ (cálculos puros, sem DOM)
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
