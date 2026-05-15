/**
 * RevealFileInTree Unit Tests
 * Tests the revealFileInTree utility function
 */

import { revealFileInTree } from '../helpers/revealFileInTree';
import type { FileItem } from '../types';

// Mock path-browserify to use Node's path module
jest.mock('path-browserify', () => ({
  resolve: (p: string) => p,
  default: {
    resolve: (p: string) => p,
  },
}));

const mkFile = (name: string, parentPath: string, size = 1024, modified?: string): FileItem => ({
  name,
  path: `${parentPath}/${name}`,
  isDirectory: false,
  size,
  modified: modified || new Date().toISOString(),
  extension: name.split('.').pop() || '',
});

const basePath = '/Users/test/Desktop';

const mockFiles = [
  mkFile('file1.txt', basePath, 1024),
  mkFile('file2.txt', basePath, 2048),
];

describe('revealFileInTree Utility', () => {
  const mockPane = {
    id: 'left',
    path: basePath,
    basePath,
    files: mockFiles,
    loading: false,
    error: null,
    selectedFiles: new Set(),
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'column',
    tabs: [{ id: 'tab-1', path: basePath, label: 'Desktop' }],
    activeTab: 0,
    currentBreadcrumbPath: basePath,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
  };

  const mockDeps = {
    getPane: jest.fn().mockReturnValue(mockPane),
    navigateTo: jest.fn().mockResolvedValue(undefined),
    updateColumnState: jest.fn(),
    setCurrentBreadcrumbPath: jest.fn(),
    setSelection: jest.fn(),
    setPreview: jest.fn(),
    pushNavHistory: jest.fn(),
    getDirSort: jest.fn().mockReturnValue('name'),
    readdir: jest.fn().mockResolvedValue({
      success: true,
      files: mockFiles,
    }),
    stat: jest.fn().mockResolvedValue({
      success: true,
      stat: { size: 1024, isDirectory: false, modified: new Date().toISOString() },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps.getPane.mockReturnValue(mockPane);
  });

  test('returns early if pane does not exist', async () => {
    mockDeps.getPane.mockReturnValue(null);

    await revealFileInTree('left', '/path/to/file.txt', '/path/to', false, mockDeps);

    expect(mockDeps.navigateTo).not.toHaveBeenCalled();
    expect(mockDeps.setSelection).not.toHaveBeenCalled();
  });

  test('navigates to reveal base and selects file when file is in base', async () => {
    await revealFileInTree('left', `${basePath}/file1.txt`, basePath, false, mockDeps);

    expect(mockDeps.navigateTo).toHaveBeenCalledWith('left', basePath, { skipHistory: true });
    expect(mockDeps.setSelection).toHaveBeenCalledWith('left', [`${basePath}/file1.txt`]);
  });

  test('builds column state when file is in subdirectory', async () => {
    const subDir = `${basePath}/subdir`;
    const filePath = `${subDir}/file.txt`;

    await revealFileInTree('left', filePath, subDir, false, mockDeps);

    expect(mockDeps.navigateTo).toHaveBeenCalledWith('left', basePath, { skipHistory: true });
    expect(mockDeps.readdir).toHaveBeenCalledWith(subDir);
    expect(mockDeps.updateColumnState).toHaveBeenCalled();
    expect(mockDeps.setCurrentBreadcrumbPath).toHaveBeenCalledWith('left', subDir);
    expect(mockDeps.setSelection).toHaveBeenCalledWith('left', [filePath]);
  });

  test('sets preview for files', async () => {
    await revealFileInTree('left', `${basePath}/file1.txt`, basePath, false, mockDeps);

    expect(mockDeps.stat).toHaveBeenCalledWith(`${basePath}/file1.txt`);
    expect(mockDeps.setPreview).toHaveBeenCalled();
  });

  test('does not set preview for directories', async () => {
    await revealFileInTree('left', basePath, basePath, true, mockDeps);

    expect(mockDeps.stat).not.toHaveBeenCalled();
    expect(mockDeps.setPreview).not.toHaveBeenCalled();
  });

  test('pushes navigation history', async () => {
    await revealFileInTree('left', `${basePath}/file1.txt`, basePath, false, mockDeps);

    expect(mockDeps.pushNavHistory).toHaveBeenCalledWith('left', {
      basePath: basePath,
      currentBreadcrumbPath: basePath,
      selectedFiles: [`${basePath}/file1.txt`],
      previewFilePath: `${basePath}/file1.txt`,
    });
  });
});
