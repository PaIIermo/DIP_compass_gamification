const defaultConfig = require('@redwoodjs/testing/config/jest/api')

// Override the setupFilesAfterEnv to add our custom setup
module.exports = {
  ...defaultConfig,
  setupFilesAfterEnv: [
    ...defaultConfig.setupFilesAfterEnv,
    '<rootDir>/api/src/lib/jest-setup.js', // Include 'api' in the path
  ],
  // Skip database initialization during tests
  globalSetup: null,
}
