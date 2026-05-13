/**
 * Jest Setup File
 * Runs before all tests to configure the test environment
 */

// Mock window.electronAPI globally for all tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).electronAPI = {
  readdir: jest.fn(),
  stat: jest.fn().mockResolvedValue({ success: false }),
  watcherStart: jest.fn(),
  onWatcherChange: jest.fn(),
  getHomeDir: jest.fn(),
  getBookmarks: jest.fn(),
  saveBookmarks: jest.fn(),
  getAllTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  addTag: jest.fn().mockResolvedValue({ success: true }),
  removeTag: jest.fn().mockResolvedValue({ success: true }),
  getTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  createTag: jest.fn().mockResolvedValue({ success: true }),
  deleteTag: jest.fn().mockResolvedValue({ success: true }),
  renameTag: jest.fn().mockResolvedValue({ success: true }),
  recolorTag: jest.fn().mockResolvedValue({ success: true }),
  getFilesForTag: jest.fn().mockResolvedValue({ success: true, files: [] }),
  searchByTag: jest.fn().mockResolvedValue({ success: true, files: [] }),
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
  console.error = (...args: unknown[]) => {
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
