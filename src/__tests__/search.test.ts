/**
 * Search Functionality Tests
 * Tests for file search, filtering, and search state management
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Search Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [{ id: 'tab-1', path: '/Users/john', label: 'john' }],
        activeTab: 0,
        currentBreadcrumbPath: '/Users/john',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      showSearch: false,
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
    } as any);
  });

  test('should toggle search overlay', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.showSearch).toBe(false);
    act(() => { result.current.toggleSearch(); });
    expect(result.current.showSearch).toBe(true);
    act(() => { result.current.toggleSearch(); });
    expect(result.current.showSearch).toBe(false);
  });

  test('should clear search state when toggling off', () => {
    const { result } = renderHook(() => useStore());
    act(() => { result.current.toggleSearch(); });
    act(() => { useStore.setState({ searchQuery: 'test', searchResults: [{ name: 'test.txt', path: '/test.txt' }] } as any); });
    act(() => { result.current.toggleSearch(); });
    expect(result.current.showSearch).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toHaveLength(0);
  });

  test('should search files with query', async () => {
    const mockResults = [
      { name: 'document.txt', path: '/Users/john/document.txt', isDirectory: false },
      { name: 'notes.txt', path: '/Users/john/Documents/notes.txt', isDirectory: false },
    ];
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.searchFiles('txt'); });

    expect(result.current.searchResults).toHaveLength(2);
    expect(result.current.searchResults[0].name).toBe('document.txt');
    expect(result.current.searchLoading).toBe(false);
  });

  test('should handle search with no results', async () => {
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: [] });
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.searchFiles('nonexistent'); });
    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchLoading).toBe(false);
  });

  test('should handle search error', async () => {
    (window as any).electronAPI.search.mockResolvedValue({ success: false, error: 'Search failed' });
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.searchFiles('test'); });
    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchLoading).toBe(false);
  });

  test('should not search with empty query', async () => {
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.searchFiles('   '); });
    expect((window as any).electronAPI.search).not.toHaveBeenCalled();
  });

  test('should set loading state during search', async () => {
    let resolveSearch: (v: any) => void;
    (window as any).electronAPI.search.mockImplementation(() =>
      new Promise(resolve => { resolveSearch = resolve; })
    );

    const store = useStore.getState();
    const searchPromise = store.searchFiles('test');
    expect(useStore.getState().searchLoading).toBe(true);

    resolveSearch!({ success: true, files: [] });
    await searchPromise;
    expect(useStore.getState().searchLoading).toBe(false);
  });

  test('should search with options', async () => {
    const mockResults = [{ name: 'file.txt', path: '/file.txt' }];
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    const searchOptions = { caseSensitive: true, matchWholeWord: false };
    await act(async () => { await useStore.getState().searchFiles('test', searchOptions); });

    expect((window as any).electronAPI.search).toHaveBeenCalledWith(
      expect.objectContaining({ rootPath: '/Users/john', query: 'test', options: searchOptions })
    );
  });

  test('should search from active pane path', async () => {
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: [] });
    await act(async () => { await useStore.getState().searchFiles('test'); });
    expect((window as any).electronAPI.search).toHaveBeenCalledWith(
      expect.objectContaining({ rootPath: '/Users/john' })
    );
  });
});

describe('Search Results Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [{ id: 'tab-1', path: '/Users/john', label: 'john' }],
        activeTab: 0,
        currentBreadcrumbPath: '/Users/john',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      searchResults: [
        { name: 'file1.txt', path: '/Users/john/Documents/file1.txt', isDirectory: false },
        { name: 'file2.txt', path: '/Users/john/Downloads/file2.txt', isDirectory: false },
        { name: 'folder', path: '/Users/john/folder', isDirectory: true },
      ],
    } as any);
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
  });

  test('should navigate to search result file', async () => {
    const filePath = '/Users/john/Documents/file1.txt';
    (window as any).electronAPI.stat.mockResolvedValue({ success: false });

    await act(async () => { await useStore.getState().navigateToFile('left', filePath); });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.path).toBe('/Users/john/Documents');
  });

  test('should reveal search result in tree', async () => {
    const filePath = '/Users/john/Documents/file1.txt';
    await act(async () => { await useStore.getState().revealInTree('left', filePath); });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.path).toBe('/Users/john/Documents');
  });

  test('should handle root path navigation in search result', async () => {
    const filePath = '/file.txt';
    (window as any).electronAPI.stat.mockResolvedValue({ success: false });

    await act(async () => { await useStore.getState().navigateToFile('left', filePath); });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.path).toBe('/');
  });

  test('should preserve basePath when revealing file under base directory', async () => {
    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/dillion/Desktop',
        basePath: '/Users/dillion/Desktop',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [{ id: 'tab-1', path: '/Users/dillion/Desktop', basePath: '/Users/dillion/Desktop', label: 'Desktop' }],
        activeTab: 0,
        currentBreadcrumbPath: '/Users/dillion/Desktop',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
    } as any);

    (window as any).electronAPI.readdir.mockResolvedValue({
      success: true,
      files: [
        { name: 'directory', path: '/Users/dillion/Desktop/directory', isDirectory: true },
        { name: 'file.png', path: '/Users/dillion/Desktop/directory/file.png', isDirectory: false },
      ],
    });
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 1024, modified: Date.now(), isDirectory: false },
    });

    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/dillion/Desktop/directory/file.png', '/Users/dillion/Desktop/directory', false);
    });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.basePath).toBe('/Users/dillion/Desktop');
    expect(leftPane!.columnState.paths).not.toContain('/Users/dillion/Desktop');
    expect(leftPane!.columnState.paths).toContain('/Users/dillion/Desktop/directory');
  });

  test('should build proper column structure for deeply nested reveal', async () => {
    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/dillion/Desktop',
        basePath: '/Users/dillion/Desktop',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [{ id: 'tab-1', path: '/Users/dillion/Desktop', basePath: '/Users/dillion/Desktop', label: 'Desktop' }],
        activeTab: 0,
        currentBreadcrumbPath: '/Users/dillion/Desktop',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
    } as any);

    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [{ name: 'test', path: '/test', isDirectory: true }] });
    (window as any).electronAPI.stat.mockResolvedValue({ success: true, stat: { size: 2048, modified: Date.now(), isDirectory: false } });

    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/dillion/Desktop/a/b/c/d/e/f/file.png', '/Users/dillion/Desktop/a/b/c/d/e/f', false);
    });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.basePath).toBe('/Users/dillion/Desktop');
    expect(leftPane!.columnState.paths).toEqual([
      '/Users/dillion/Desktop/a',
      '/Users/dillion/Desktop/a/b',
      '/Users/dillion/Desktop/a/b/c',
      '/Users/dillion/Desktop/a/b/c/d',
      '/Users/dillion/Desktop/a/b/c/d/e',
      '/Users/dillion/Desktop/a/b/c/d/e/f',
    ]);
    expect(leftPane!.columnState.focusedIndex).toBe(6);
    expect(leftPane!.currentBreadcrumbPath).toBe('/Users/dillion/Desktop/a/b/c/d/e/f');
  });

  test('should update basePath when revealing file outside base directory', async () => {
    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/dillion/Desktop',
        basePath: '/Users/dillion/Desktop',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [{ id: 'tab-1', path: '/Users/dillion/Desktop', basePath: '/Users/dillion/Desktop', label: 'Desktop' }],
        activeTab: 0,
        currentBreadcrumbPath: '/Users/dillion/Desktop',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
    } as any);

    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [{ name: 'file.txt', path: '/Users/dillion/Documents/file.txt', isDirectory: false }] });
    (window as any).electronAPI.stat.mockResolvedValue({ success: true, stat: { size: 512, modified: Date.now(), isDirectory: false } });

    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/dillion/Documents/file.txt', '/Users/dillion/Documents', false);
    });

    const leftPane = useStore.getState().panes.find((p: any) => p.id === 'left');
    expect(leftPane!.basePath).toBe('/Users/dillion/Documents');
    expect(leftPane!.path).toBe('/Users/dillion/Documents');
  });
});
