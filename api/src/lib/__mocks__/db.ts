const mockDb = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([{ exists: true }, { count: 0n }]),
  $transaction: jest.fn((fn) => Promise.resolve(fn(mockDb))),

  // Add table-specific mocks
  publication: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },

  citation: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },

  // Add other tables as needed
}

module.exports = {
  db: mockDb,
}
