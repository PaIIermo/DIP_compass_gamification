// This file runs before Jest tests are executed
// and sets up any global configuration needed for tests

// Silence Prisma logging during tests
global.__PRISMA_CLIENT_NO_SCHEMA_VALIDATION__ = true

// Mock console methods if needed
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress specific Prisma errors during tests
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Prisma')) {
    return
  }
  originalConsoleError(...args)
}

// Other global test setup can go here
