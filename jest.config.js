module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main/**',
    '!src/**/*.jsx',
    '!src/__tests__/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  moduleNameMapper: {
    '^path-browserify$': '<rootDir>/node_modules/path-browserify',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(zustand)/)',
  ],
};
