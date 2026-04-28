/**
 * Jest Setup File
 * Runs before all tests to configure the test environment
 */

// Mock window.electronAPI globally for all tests
window.electronAPI = {
  readdir: jest.fn(),
  stat: jest.fn().mockResolvedValue({ success: false }),
  watcherStart: jest.fn(),
  onWatcherChange: jest.fn(),
  getHomeDir: jest.fn(),
  getBookmarks: jest.fn(),
  saveBookmarks: jest.fn(),
  getAllTags: jest.fn(),
  search: jest.fn(),
  copy: jest.fn(),
  move: jest.fn(),
  getLog: jest.fn(),
  storeGet: jest.fn().mockResolvedValue(null),
  storeSet: jest.fn().mockResolvedValue(undefined),
};

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
