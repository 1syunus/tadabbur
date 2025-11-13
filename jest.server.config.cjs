const path = require('path')
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env.test')
console.log('🧪 Loading environment from:', envPath);

dotenv.config({ path: '.env.test' });

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ["<rootDir>/jest.env.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.json',
    },
  },
  testMatch: [
    '<rootDir>/app/api/**/*.test.@(ts|js)',
    '<rootDir>/lib/**/*.test.@(ts|js)'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
};