/**
 * Core Store Logic Tests
 * Tests for state management, navigation, breadcrumbs, column view, and file operations
 */

import { renderHook, act } from '@testing-library/react';
import { useStore, sortFiles, formatSize, formatDate, getFileIcon, isPreviewable } from '../store';

describe('Store - Pane Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/', label: 'Home' }],
          activeTab: 0,
          currentBreadcrumbPath: '/',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
        {
          id: 'right',
          path: '/',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-2', path: '/', label: 'Home' }],
          activeTab: 0,
          currentBreadcrumbPath: '/',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
      showRightPane: false,
    });
  });

  test('should initialize with two panes', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.panes).toHaveLength(2);
    expect(result.current.panes[0].id).toBe('left');
    expect(result.current.panes[1].id).toBe('right');
  });

  test('should set active pane', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setActivePane('right');
    });
    expect(result.current.activePane).toBe('right');
  });

  test('should toggle right pane visibility', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.showRightPane).toBe(false);
    act(() => {
      result.current.toggleRightPane();
    });
    expect(result.current.showRightPane).toBe(true);
    act(() => {
      result.current.toggleRightPane();
    });
    expect(result.current.showRightPane).toBe(false);
  });

  test('should update pane properties', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.updatePane('left', { sortBy: 'size', sortOrder: 'desc' });
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.sortBy).toBe('size');
    expect(leftPane.sortOrder).toBe('desc');
  });

  test('should set split ratio', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setSplitRatio(0.3);
    });
    expect(result.current.splitRatio).toBe(0.3);
  });
});

describe('Store - Navigation & Breadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/', label: 'Home' }],
          activeTab: 0,
          currentBreadcrumbPath: '/',
          basePath: '/',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
  });

  test('should generate breadcrumbs for root path', () => {
    const { result } = renderHook(() => useStore());
    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toEqual([{ name: '/', path: '/' }]);
  });

  test('should generate breadcrumbs relative to basePath in column view', () => {
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
          currentBreadcrumbPath: '/Users/john/Documents',
          basePath: '/Users/john',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
    const { result } = renderHook(() => useStore());
    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toHaveLength(2); // john, Documents
    expect(breadcrumbs[0]).toEqual({ name: 'john', path: '/Users/john' });
    expect(breadcrumbs[1]).toEqual({ name: 'Documents', path: '/Users/john/Documents' });
  });

  test('should generate breadcrumbs from root basePath showing full path', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users/john/Documents');
    });
    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toHaveLength(4); // /, Users, john, Documents
    expect(breadcrumbs[0]).toEqual({ name: '/', path: '/' });
    expect(breadcrumbs[1]).toEqual({ name: 'Users', path: '/Users' });
    expect(breadcrumbs[2]).toEqual({ name: 'john', path: '/Users/john' });
    expect(breadcrumbs[3]).toEqual({ name: 'Documents', path: '/Users/john/Documents' });
  });

  test('should show only basePath crumb when at basePath', () => {
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
          basePath: '/Users/john',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
    const { result } = renderHook(() => useStore());
    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toEqual({ name: 'john', path: '/Users/john' });
  });

  test('should update breadcrumb path', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/home/user');
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.currentBreadcrumbPath).toBe('/home/user');
  });

  test('should get active path based on view mode', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users/john');
      result.current.setViewMode('left', 'column');
    });
    const activePath = result.current.getActivePath('left');
    expect(activePath).toBe('/Users/john');
  });

  test('should navigate to directory and update files', async () => {
    const mockFiles = [
      { name: 'file1.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'folder1', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
    ];
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: mockFiles });

    const { result } = renderHook(() => useStore());
    await act(async () => {
      await result.current.navigateTo('left', '/Users/john');
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.path).toBe('/Users/john');
    expect(leftPane.files).toHaveLength(2);
    expect(leftPane.loading).toBe(false);
  });

  test('should handle navigation error', async () => {
    window.electronAPI.readdir.mockResolvedValue({ success: false, error: 'Permission denied' });

    const { result } = renderHook(() => useStore());
    await act(async () => {
      await result.current.navigateTo('left', '/restricted');
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.error).toBe('Permission denied');
    expect(leftPane.loading).toBe(false);
  });
});

describe('Store - File Selection & Sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/test',
          files: [
            { name: 'file1.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'file2.js', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'js' },
            { name: 'folder1', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/test', label: 'Test' }],
          activeTab: 0,
          currentBreadcrumbPath: '/test',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
  });

  test('should select single file', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.toggleSelection('left', '/test/file1.txt', false);
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.has('/test/file1.txt')).toBe(true);
    expect(leftPane.selectedFiles.size).toBe(1);
  });

  test('should deselect file when clicking same file', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.toggleSelection('left', '/test/file1.txt', false);
    });
    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(1);

    act(() => {
      result.current.toggleSelection('left', '/test/file1.txt', false);
    });
    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(0);
  });

  test('should multi-select files with Cmd/Ctrl', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.toggleSelection('left', '/test/file1.txt', true);
      result.current.toggleSelection('left', '/test/file2.js', true);
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(2);
    expect(leftPane.selectedFiles.has('/test/file1.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/file2.js')).toBe(true);
  });

  test('should set selection to specific files', () => {
    const { result } = renderHook(() => useStore());
    const filesToSelect = ['/test/file1.txt', '/test/folder1'];
    act(() => {
      result.current.setSelection('left', filesToSelect);
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(2);
    expect(leftPane.selectedFiles.has('/test/file1.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/folder1')).toBe(true);
  });

  test('should sort files by name ascending', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setSortBy('left', 'name', 'asc');
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    // Directories first, then by name
    expect(leftPane.files[0].name).toBe('folder1');
    expect(leftPane.files[1].name).toBe('file1.txt');
    expect(leftPane.files[2].name).toBe('file2.js');
  });

  test('should sort files by size descending', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setSortBy('left', 'size', 'desc');
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    // Directories first, then by size descending
    expect(leftPane.files[0].name).toBe('folder1');
    expect(leftPane.files[1].size).toBe(200);
    expect(leftPane.files[2].size).toBe(100);
  });
});

describe('Store - Column View State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/Users',
          files: [
            { name: 'john', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
            { name: 'jane', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/Users', label: 'Users' }],
          activeTab: 0,
          currentBreadcrumbPath: '/Users',
          columnState: { paths: ['/Users'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
  });

  test('should initialize column state', () => {
    const { result } = renderHook(() => useStore());
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(1);
    expect(leftPane.columnState.paths[0]).toBe('/Users');
  });

  test('should update column state', () => {
    const { result } = renderHook(() => useStore());
    const newColumnState = {
      paths: ['/Users', '/Users/john'],
      filesByPath: {
        '/Users': [{ name: 'john', isDirectory: true }],
        '/Users/john': [{ name: 'Documents', isDirectory: true }],
      },
      selectedByColumn: { 0: '/Users/john' },
      focusedIndex: 1,
    };
    act(() => {
      result.current.setColumnState('left', newColumnState);
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
    expect(leftPane.columnState.focusedIndex).toBe(1);
  });

  test('should update specific column state properties', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.updateColumnState('left', { focusedIndex: 2 });
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.focusedIndex).toBe(2);
    expect(leftPane.columnState.paths).toHaveLength(1); // Should preserve existing paths
  });

  test('should clear column state', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.clearColumnState('left');
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(0);
    expect(leftPane.columnState.filesByPath).toEqual({});
    expect(leftPane.columnState.selectedByColumn).toEqual({});
    expect(leftPane.columnState.focusedIndex).toBe(0);
  });

  test('should simulate column view navigation - selecting item adds column', () => {
    const { result } = renderHook(() => useStore());
    
    // Start with /Users column
    expect(result.current.panes[0].columnState.paths).toHaveLength(1);
    
    // Select 'john' folder - should add /Users/john column
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
      });
    });
    
    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
    expect(leftPane.columnState.selectedByColumn[0]).toBe('/Users/john');
    
    // Select 'Documents' in john folder - should add /Users/john/Documents column
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
      });
    });
    
    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);
  });

  test('should simulate column view navigation - clicking empty space removes columns', () => {
    const { result } = renderHook(() => useStore());
    
    // Start with 3 columns
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
      });
    });
    
    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);
    
    // Click empty space in column 1 - should remove columns after it
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
      });
    });
    
    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
  });
});

describe('Store - Tabs Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/', label: 'Home' }],
          activeTab: 0,
          currentBreadcrumbPath: '/',
          columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        },
      ],
      activePane: 'left',
    });
  });

  test('should add new tab', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addTab('left', '/Users');
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.tabs).toHaveLength(2);
    expect(leftPane.tabs[1].path).toBe('/Users');
    expect(leftPane.activeTab).toBe(1);
  });

  test('should close tab', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addTab('left', '/Users');
      result.current.addTab('left', '/Documents');
    });
    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.tabs).toHaveLength(3);

    act(() => {
      result.current.closeTab('left', 1);
    });
    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.tabs).toHaveLength(2);
  });

  test('should not close last tab', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.closeTab('left', 0);
    });
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.tabs).toHaveLength(1);
  });

  test('should switch to tab', async () => {
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addTab('left', '/Users');
    });
    
    await act(async () => {
      await result.current.switchTab('left', 1);
    });
    
    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.activeTab).toBe(1);
  });
});

describe('Store - Preview & Zoom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      previewFile: null,
      showPreview: false,
      previewWidth: 300,
      zoom: 1.0,
    });
  });

  test('should set preview file', () => {
    const { result } = renderHook(() => useStore());
    const mockFile = { name: 'test.txt', path: '/test.txt', isDirectory: false };
    act(() => {
      result.current.setPreviewFile(mockFile);
    });
    expect(result.current.previewFile).toEqual(mockFile);
    expect(result.current.showPreview).toBe(true);
  });

  test('should close preview', () => {
    const { result } = renderHook(() => useStore());
    const mockFile = { name: 'test.txt', path: '/test.txt', isDirectory: false };
    act(() => {
      result.current.setPreviewFile(mockFile);
      result.current.closePreview();
    });
    expect(result.current.previewFile).toBeNull();
    expect(result.current.showPreview).toBe(false);
  });

  test('should set preview width within bounds', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setPreviewWidth(500);
    });
    expect(result.current.previewWidth).toBe(500);

    act(() => {
      result.current.setPreviewWidth(100); // Below min
    });
    expect(result.current.previewWidth).toBe(200); // Min is 200

    act(() => {
      result.current.setPreviewWidth(10000); // Above max
    });
    // Max is 50% of viewport / zoom (dynamic), just verify it was clamped below 10000
    expect(result.current.previewWidth).toBeLessThan(10000);
    expect(result.current.previewWidth).toBeGreaterThanOrEqual(200);
  });

  test('should zoom in and out', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setZoom(1.0);
    });
    expect(result.current.zoom).toBe(1.0);

    act(() => {
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBe(1.1);

    act(() => {
      result.current.zoomOut();
    });
    expect(result.current.zoom).toBe(1.0);
  });

  test('should respect zoom bounds', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setZoom(0.5); // Below min
    });
    expect(result.current.zoom).toBe(0.7); // Min is 0.7

    act(() => {
      result.current.setZoom(2.0); // Above max
    });
    expect(result.current.zoom).toBe(1.6); // Max is 1.6
  });

  test('should reset zoom', () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.setZoom(1.5);
      result.current.zoomReset();
    });
    expect(result.current.zoom).toBe(1.0);
  });
});

describe('Store - Clipboard Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      clipboardQueue: [],
      clipboardMode: 'copy',
    });
  });

  test('should add files to clipboard', () => {
    const { result } = renderHook(() => useStore());
    const files = ['/test/file1.txt', '/test/file2.js'];
    act(() => {
      result.current.addToClipboard(files, 'copy');
    });
    expect(result.current.clipboardQueue).toEqual(files);
    expect(result.current.clipboardMode).toBe('copy');
  });

  test('should add files with cut mode', () => {
    const { result } = renderHook(() => useStore());
    const files = ['/test/file1.txt'];
    act(() => {
      result.current.addToClipboard(files, 'cut');
    });
    expect(result.current.clipboardQueue).toEqual(files);
    expect(result.current.clipboardMode).toBe('cut');
  });

  test('should not add duplicate files to clipboard', () => {
    const { result } = renderHook(() => useStore());
    const files = ['/test/file1.txt'];
    act(() => {
      result.current.addToClipboard(files, 'copy');
      result.current.addToClipboard(files, 'copy');
    });
    expect(result.current.clipboardQueue).toHaveLength(1);
  });

  test('should remove file from clipboard', () => {
    const { result } = renderHook(() => useStore());
    const files = ['/test/file1.txt', '/test/file2.js'];
    act(() => {
      result.current.addToClipboard(files, 'copy');
      result.current.removeFromClipboard('/test/file1.txt');
    });
    expect(result.current.clipboardQueue).toEqual(['/test/file2.js']);
  });

  test('should clear clipboard', () => {
    const { result } = renderHook(() => useStore());
    const files = ['/test/file1.txt', '/test/file2.js'];
    act(() => {
      result.current.addToClipboard(files, 'copy');
      result.current.clearClipboard();
    });
    expect(result.current.clipboardQueue).toHaveLength(0);
    expect(result.current.clipboardMode).toBe('copy');
  });
});

describe('Utility Functions - Sorting', () => {
  test('should sort files with directories first', () => {
    const files = [
      { name: 'file.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'folder', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
      { name: 'another.js', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'js' },
    ];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].name).toBe('another.js');
    expect(sorted[2].name).toBe('file.txt');
  });

  test('should sort by name case-insensitive', () => {
    const files = [
      { name: 'Zebra.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'apple.js', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'js' },
      { name: 'Banana.md', isDirectory: false, size: 150, modified: new Date().toISOString(), extension: 'md' },
    ];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted[0].name).toBe('apple.js');
    expect(sorted[1].name).toBe('Banana.md');
    expect(sorted[2].name).toBe('Zebra.txt');
  });

  test('should sort by size', () => {
    const files = [
      { name: 'large.bin', isDirectory: false, size: 1000, modified: new Date().toISOString(), extension: 'bin' },
      { name: 'small.txt', isDirectory: false, size: 10, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'medium.js', isDirectory: false, size: 500, modified: new Date().toISOString(), extension: 'js' },
    ];
    const sorted = sortFiles(files, 'size', 'asc');
    expect(sorted[0].size).toBe(10);
    expect(sorted[1].size).toBe(500);
    expect(sorted[2].size).toBe(1000);
  });

  test('should sort by size descending', () => {
    const files = [
      { name: 'small.txt', isDirectory: false, size: 10, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'large.bin', isDirectory: false, size: 1000, modified: new Date().toISOString(), extension: 'bin' },
    ];
    const sorted = sortFiles(files, 'size', 'desc');
    expect(sorted[0].size).toBe(1000);
    expect(sorted[1].size).toBe(10);
  });

  test('should sort by modified date', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const files = [
      { name: 'new.txt', isDirectory: false, size: 100, modified: now.toISOString(), extension: 'txt' },
      { name: 'old.js', isDirectory: false, size: 200, modified: yesterday.toISOString(), extension: 'js' },
    ];
    const sorted = sortFiles(files, 'modified', 'asc');
    expect(sorted[0].name).toBe('old.js');
    expect(sorted[1].name).toBe('new.txt');
  });

  test('should sort by extension', () => {
    const files = [
      { name: 'script.js', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'js' },
      { name: 'doc.txt', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'txt' },
      { name: 'image.png', isDirectory: false, size: 150, modified: new Date().toISOString(), extension: 'png' },
    ];
    const sorted = sortFiles(files, 'extension', 'asc');
    expect(sorted[0].extension).toBe('js');
    expect(sorted[1].extension).toBe('png');
    expect(sorted[2].extension).toBe('txt');
  });
});

describe('Utility Functions - Formatting', () => {
  test('should format file size correctly', () => {
    expect(formatSize(0)).toBe('—');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1024)).toBe('1 KB');
    expect(formatSize(1024 * 1024)).toBe('1 MB');
    expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  test('should format date correctly', () => {
    const now = new Date();
    expect(formatDate(now.toISOString())).toBe('Just now');

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    expect(formatDate(fiveMinutesAgo.toISOString())).toMatch(/\dm ago/);

    const oneHourAgo = new Date(now.getTime() - 3600000);
    expect(formatDate(oneHourAgo.toISOString())).toMatch(/\dh ago/);

    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('Utility Functions - File Icons & Preview', () => {
  test('should get correct icon for directory', () => {
    const dir = { isDirectory: true, extension: '' };
    expect(getFileIcon(dir)).toBe('📁');
  });

  test('should get correct icon for image files', () => {
    const imageFile = { isDirectory: false, extension: 'png' };
    expect(getFileIcon(imageFile)).toBe('🖼️');
  });

  test('should get correct icon for code files', () => {
    const jsFile = { isDirectory: false, extension: 'js' };
    expect(getFileIcon(jsFile)).toBe('📜');

    const pyFile = { isDirectory: false, extension: 'py' };
    expect(getFileIcon(pyFile)).toBe('🐍');
  });

  test('should get default icon for unknown extension', () => {
    const unknownFile = { isDirectory: false, extension: 'xyz' };
    expect(getFileIcon(unknownFile)).toBe('📄');
  });

  test('should identify previewable files', () => {
    expect(isPreviewable({ isDirectory: false, extension: 'txt' })).toBe(true);
    expect(isPreviewable({ isDirectory: false, extension: 'png' })).toBe(true);
    expect(isPreviewable({ isDirectory: false, extension: 'mp4' })).toBe(true);
    expect(isPreviewable({ isDirectory: false, extension: 'mp3' })).toBe(true);
    expect(isPreviewable({ isDirectory: false, extension: 'pdf' })).toBe(true);
    expect(isPreviewable({ isDirectory: false, extension: 'bin' })).toBe(false);
    expect(isPreviewable({ isDirectory: true, extension: '' })).toBe(false);
  });
});
