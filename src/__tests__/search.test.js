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
    window.electronAPI.search.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, files: [] }), 100))
    );

    const { result } = renderHook(() => useStore());
    
    const searchPromise = act(async () => {
      await result.current.searchFiles('test');
    });

    // Check loading state is true immediately
    expect(result.current.searchLoading).toBe(true);
    
    await searchPromise;
    
    // Check loading state is false after search completes
    expect(result.current.searchLoading).toBe(false);
  });

  test('should search with options', async () => {
    const mockResults = [{ name: 'file.txt', path: '/file.txt' }];
    window.electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    const { result } = renderHook(() => useStore());
    
    const searchOptions = { caseSensitive: true, matchWholeWord: false };
    await act(async () => {
      await result.current.searchFiles('test', searchOptions);
    });

    expect(window.electronAPI.search).toHaveBeenCalledWith({
      rootPath: '/Users/john',
      query: 'test',
      options: searchOptions,
    });
  });

  test('should search from active pane path', async () => {
    window.electronAPI.search.mockResolvedValue({ success: true, files: [] });

    const { result } = renderHook(() => useStore());
    
    await act(async () => {
      await result.current.searchFiles('test');
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
    const { result } = renderHook(() => useStore());
    
    const filePath = '/Users/john/Documents/file1.txt';
    await act(async () => {
      await result.current.navigateToFile('left', filePath);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/Users/john/Documents');
  });

  test('should reveal search result in tree', async () => {
    const { result } = renderHook(() => useStore());
    
    const filePath = '/Users/john/Documents/file1.txt';
    await act(async () => {
      await result.current.revealInTree('left', filePath);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/Users/john/Documents');
  });

  test('should handle root path navigation in search result', async () => {
    const { result } = renderHook(() => useStore());
    
    const filePath = '/file.txt';
    await act(async () => {
      await result.current.navigateToFile('left', filePath);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/');
  });
});
