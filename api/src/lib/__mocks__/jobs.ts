export const jobs = {
  createJob: jest.fn((config) => config),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}

export const later = jest.fn()
