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
      panes: [
        {
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
        },
      ],
      activePane: 'left',
      showSearch: false,
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
    });
  });

  test('should toggle search overlay', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.showSearch).toBe(false);
    
    act(() => {
      result.current.toggleSearch();
    });
    expect(result.current.showSearch).toBe(true);
    
    act(() => {
      result.current.toggleSearch();
    });
    expect(result.current.showSearch).toBe(false);
  });

  test('should clear search state when toggling off', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleSearch();
    });
    
    // Simulate setting search state
    useStore.setState({
      searchQuery: 'test',
      searchResults: [{ name: 'test.txt', path: '/test.txt' }],
    });
    
    act(() => {
      result.current.toggleSearch();
    });
    
    expect(result.current.showSearch).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toHaveLength(0);
  });

  test('should search files with query', async () => {
    const mockResults = [
      { name: 'document.txt', path: '/Users/john/document.txt', isDirectory: false },
      { name: 'notes.txt', path: '/Users/john/Documents/notes.txt', isDirectory: false },
    ];
    window.electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    const { result } = renderHook(() => useStore());
    
    await act(async () => {
      await result.current.searchFiles('txt');
    });

    expect(result.current.searchResults).toHaveLength(2);
    expect(result.current.searchResults[0].name).toBe('document.txt');
    expect(result.current.searchLoading).toBe(false);
  });

  test('should handle search with no results', async () => {
    window.electronAPI.search.mockResolvedValue({ success: true, files: [] });

    const { result } = renderHook(() => useStore());
    
    await act(async () => {
      await result.current.searchFiles('nonexistent');
    });

    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchLoading).toBe(false);
  });

  test('should handle search error', async () => {
    window.electronAPI.search.mockResolvedValue({ success: false, error: 'Search failed' });

    const { result } = renderHook(() => useStore());
    
    await act(async () => {
      await result.current.searchFiles('test');
    });

    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchLoading).toBe(false);
  });

  test('should not search with empty query', async () => {
    const { result } = renderHook(() => useStore());
    
    await act(async () => {
      await result.current.searchFiles('   ');
    });

    expect(window.electronAPI.search).not.toHaveBeenCalled();
  });

  test('should set loading state during search', async () => {
    let resolveSearch;
    window.electronAPI.search.mockImplementation(() =>
      new Promise(resolve => { resolveSearch = resolve; })
    );

    const store = useStore.getState();
    const searchPromise = store.searchFiles('test');

    // Check loading state is true before search resolves
    expect(useStore.getState().searchLoading).toBe(true);

    resolveSearch({ success: true, files: [] });
    await searchPromise;

    // Check loading state is false after search completes
    expect(useStore.getState().searchLoading).toBe(false);
  });

  test('should search with options', async () => {
    const mockResults = [{ name: 'file.txt', path: '/file.txt' }];
    window.electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    const searchOptions = { caseSensitive: true, matchWholeWord: false };
    await act(async () => {
      await useStore.getState().searchFiles('test', searchOptions);
    });

    expect(window.electronAPI.search).toHaveBeenCalledWith(
      expect.objectContaining({
        rootPath: '/Users/john',
        query: 'test',
        options: searchOptions,
      })
    );
  });

  test('should search from active pane path', async () => {
    window.electronAPI.search.mockResolvedValue({ success: true, files: [] });

    await act(async () => {
      await useStore.getState().searchFiles('test');
    });

    expect(window.electronAPI.search).toHaveBeenCalledWith(
      expect.objectContaining({
        rootPath: '/Users/john',
      })
    );
  });
});

describe('Search Results Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
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
        },
      ],
      activePane: 'left',
      searchResults: [
        { name: 'file1.txt', path: '/Users/john/Documents/file1.txt', isDirectory: false },
        { name: 'file2.txt', path: '/Users/john/Downloads/file2.txt', isDirectory: false },
        { name: 'folder', path: '/Users/john/folder', isDirectory: true },
      ],
    });
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
  });

  test('should navigate to search result file', async () => {
    const filePath = '/Users/john/Documents/file1.txt';
    window.electronAPI.stat.mockResolvedValue({ success: false });

    await act(async () => {
      await useStore.getState().navigateToFile('left', filePath);
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/Users/john/Documents');
  });

  test('should reveal search result in tree', async () => {
    const filePath = '/Users/john/Documents/file1.txt';

    await act(async () => {
      await useStore.getState().revealInTree('left', filePath);
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/Users/john/Documents');
  });

  test('should handle root path navigation in search result', async () => {
    const filePath = '/file.txt';
    window.electronAPI.stat.mockResolvedValue({ success: false });

    await act(async () => {
      await useStore.getState().navigateToFile('left', filePath);
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/');
  });

  test('should preserve basePath when revealing file under base directory', async () => {
    // Setup: pane with Desktop as basePath
    useStore.setState({
      panes: [
        {
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
        },
      ],
      activePane: 'left',
    });

    // Mock readdir for navigateTo and column building
    window.electronAPI.readdir.mockResolvedValue({ 
      success: true, 
      files: [
        { name: 'directory', path: '/Users/dillion/Desktop/directory', isDirectory: true },
        { name: 'file.png', path: '/Users/dillion/Desktop/directory/file.png', isDirectory: false }
      ] 
    });
    
    window.electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 1024, modified: Date.now(), isDirectory: false }
    });

    // Set reveal target for a file under Desktop/directory/file.png
    const filePath = '/Users/dillion/Desktop/directory/file.png';
    const fileDir = '/Users/dillion/Desktop/directory';

    await act(async () => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath,
        fileDir,
        isDirectory: false,
      });
    });

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    
    // basePath should remain Desktop, not be overwritten to directory
    expect(leftPane.basePath).toBe('/Users/dillion/Desktop');
    // Column state should have both Desktop and directory paths
    expect(leftPane.columnState.paths).toContain('/Users/dillion/Desktop');
    expect(leftPane.columnState.paths).toContain('/Users/dillion/Desktop/directory');
  });

  test('should build proper column structure for deeply nested reveal', async () => {
    // Setup: pane with Desktop as basePath
    useStore.setState({
      panes: [
        {
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
        },
      ],
      activePane: 'left',
    });

    // Mock readdir to return success for all directory reads
    window.electronAPI.readdir.mockResolvedValue({ 
      success: true, 
      files: [
        { name: 'test', path: '/test', isDirectory: true }
      ] 
    });
    
    window.electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 2048, modified: Date.now(), isDirectory: false }
    });

    // Reveal a deeply nested file: Desktop/a/b/c/d/e/f/file.png
    const filePath = '/Users/dillion/Desktop/a/b/c/d/e/f/file.png';
    const fileDir = '/Users/dillion/Desktop/a/b/c/d/e/f';

    await act(async () => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath,
        fileDir,
        isDirectory: false,
      });
    });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    
    // basePath should remain Desktop
    expect(leftPane.basePath).toBe('/Users/dillion/Desktop');
    
    // Column paths should include all intermediate directories
    const expectedPaths = [
      '/Users/dillion/Desktop',
      '/Users/dillion/Desktop/a',
      '/Users/dillion/Desktop/a/b',
      '/Users/dillion/Desktop/a/b/c',
      '/Users/dillion/Desktop/a/b/c/d',
      '/Users/dillion/Desktop/a/b/c/d/e',
      '/Users/dillion/Desktop/a/b/c/d/e/f'
    ];
    
    expect(leftPane.columnState.paths).toEqual(expectedPaths);
    expect(leftPane.columnState.focusedIndex).toBe(6); // Last column (f)
    expect(leftPane.currentBreadcrumbPath).toBe(fileDir);
  });

  test('should update basePath when revealing file outside base directory', async () => {
    // Setup: pane with Desktop as basePath
    useStore.setState({
      panes: [
        {
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
        },
      ],
      activePane: 'left',
    });

    // Mock readdir
    window.electronAPI.readdir.mockResolvedValue({ 
      success: true, 
      files: [
        { name: 'file.txt', path: '/Users/dillion/Documents/file.txt', isDirectory: false }
      ] 
    });
    
    window.electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 512, modified: Date.now(), isDirectory: false }
    });

    // Set reveal target for a file outside Desktop (in Documents)
    const filePath = '/Users/dillion/Documents/file.txt';
    const fileDir = '/Users/dillion/Documents';

    await act(async () => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath,
        fileDir,
        isDirectory: false,
      });
    });

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const leftPane = useStore.getState().panes.find(p => p.id === 'left');
    
    // basePath should be updated to Documents since it's outside Desktop
    expect(leftPane.basePath).toBe('/Users/dillion/Documents');
    expect(leftPane.path).toBe('/Users/dillion/Documents');
  });
});
