/**
 * Column State Utility Tests
 * Tests for the buildColumnState helper function
 */

import { buildColumnState } from '../helpers/columnState';
import type { FileItem } from '../types';

const mkFile = (name: string, isDirectory: boolean = false, overrides: Record<string, any> = {}): FileItem => ({
  name,
  path: `/test/${name}`,
  isDirectory,
  size: 1024,
  modified: new Date().toISOString(),
  extension: name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '',
  ...overrides,
});

describe('buildColumnState', () => {
  const mockReaddir = jest.fn();
  const mockGetDirSort = jest.fn((path: string): 'name' | 'size' | 'modified' => 'name');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDirSort.mockReturnValue('name');
  });

  test('returns empty state when targetPath equals basePath', async () => {
    const result = await buildColumnState('/Users/john', '/Users/john', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual([]);
    expect(result.filesByPath).toEqual({});
    expect(result.selectedByColumn).toEqual({});
    expect(result.focusedIndex).toBe(0);
    expect(mockReaddir).not.toHaveBeenCalled();
  });

  test('returns empty state when targetPath does not start with basePath', async () => {
    const result = await buildColumnState('/Users/john', '/Users/jane', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual([]);
    expect(result.filesByPath).toEqual({});
    expect(result.selectedByColumn).toEqual({});
    expect(result.focusedIndex).toBe(0);
    expect(mockReaddir).not.toHaveBeenCalled();
  });

  test('builds single column for one level deep target', async () => {
    mockReaddir.mockResolvedValue({
      success: true,
      files: [mkFile('file.txt'), mkFile('folder', true)],
    });

    const result = await buildColumnState('/Users/john', '/Users/john/Documents', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual(['/Users/john/Documents']);
    expect(result.filesByPath['/Users/john/Documents']).toHaveLength(2);
    expect(result.selectedByColumn).toEqual({ 0: '/Users/john/Documents' });
    expect(result.focusedIndex).toBe(1);
    expect(mockReaddir).toHaveBeenCalledWith('/Users/john/Documents');
  });

  test('builds multiple columns for nested target', async () => {
    mockReaddir
      .mockResolvedValueOnce({
        success: true,
        files: [mkFile('file1.txt')],
      })
      .mockResolvedValueOnce({
        success: true,
        files: [mkFile('file2.txt')],
      });

    const result = await buildColumnState('/Users/john', '/Users/john/Documents/Projects', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual(['/Users/john/Documents', '/Users/john/Documents/Projects']);
    expect(result.filesByPath['/Users/john/Documents']).toHaveLength(1);
    expect(result.filesByPath['/Users/john/Documents/Projects']).toHaveLength(1);
    expect(result.selectedByColumn).toEqual({
      0: '/Users/john/Documents',
      1: '/Users/john/Documents/Projects',
    });
    expect(result.focusedIndex).toBe(2);
    expect(mockReaddir).toHaveBeenCalledWith('/Users/john/Documents');
    expect(mockReaddir).toHaveBeenCalledWith('/Users/john/Documents/Projects');
  });

  test('handles readdir failure gracefully', async () => {
    mockReaddir.mockResolvedValue({
      success: false,
      error: 'Permission denied',
    });

    const result = await buildColumnState('/Users/john', '/Users/john/Documents', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual(['/Users/john/Documents']);
    expect(result.filesByPath['/Users/john/Documents']).toBeUndefined();
    expect(result.selectedByColumn).toEqual({ 0: '/Users/john/Documents' });
    expect(result.focusedIndex).toBe(1);
  });

  test('uses getDirSort for each column path', async () => {
    mockReaddir.mockResolvedValue({
      success: true,
      files: [mkFile('file.txt')],
    });
    mockGetDirSort.mockImplementation((path: string) => {
      if (path.includes('Documents')) return 'modified' as const;
      if (path.includes('Projects')) return 'size' as const;
      return 'name' as const;
    });

    await buildColumnState('/Users/john', '/Users/john/Documents/Projects', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(mockGetDirSort).toHaveBeenCalledWith('/Users/john/Documents');
    expect(mockGetDirSort).toHaveBeenCalledWith('/Users/john/Documents/Projects');
  });

  test('handles root path as basePath', async () => {
    mockReaddir.mockResolvedValue({
      success: true,
      files: [mkFile('file.txt')],
    });

    const result = await buildColumnState('/', '/Users', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual(['/Users']);
    expect(result.selectedByColumn).toEqual({ 0: '/Users' });
    expect(result.focusedIndex).toBe(1);
  });

  test('returns empty state when targetPath is empty', async () => {
    const result = await buildColumnState('/Users/john', '', {
      readdir: mockReaddir,
      getDirSort: mockGetDirSort,
    });

    expect(result.paths).toEqual([]);
    expect(result.filesByPath).toEqual({});
    expect(result.selectedByColumn).toEqual({});
    expect(result.focusedIndex).toBe(0);
  });
});
