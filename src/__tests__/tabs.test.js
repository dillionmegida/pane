/**
 * Tab Management Tests
 * Tests for independent tab state: creating, switching, closing tabs,
 * state isolation between tabs, tab label updates, and session persistence.
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// Helper: create a full tab object matching the new tab state shape
const makeTab = (overrides = {}) => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  path: '/',
  basePath: '/',
  currentBreadcrumbPath: '/',
  label: '/',
  files: [],
  selectedFiles: new Set(),
  activeBookmarkId: null,
  viewMode: 'column',
  sortBy: 'name',
  sortOrder: 'asc',
  columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
  previewFile: null,
  ...overrides,
});

// Helper: create a pane with full tab state
const makePane = (id, overrides = {}) => {
  const basePath = overrides.basePath || overrides.path || '/';
  const tab = makeTab({
    id: 'tab-1',
    path: overrides.path || '/',
    basePath,
    currentBreadcrumbPath: overrides.currentBreadcrumbPath || basePath,
    label: basePath === '/' ? '/' : basePath.split('/').pop(),
    files: overrides.files || [],
    viewMode: overrides.viewMode || 'column',
    sortBy: overrides.sortBy || 'name',
    sortOrder: overrides.sortOrder || 'asc',
    columnState: overrides.columnState || { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
  });
  return {
    id,
    path: overrides.path || '/',
    files: overrides.files || [],
    loading: false,
    error: null,
    selectedFiles: new Set(),
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'column',
    tabs: [tab],
    activeTab: 0,
    currentBreadcrumbPath: overrides.currentBreadcrumbPath || basePath,
    basePath,
    activeBookmarkId: null,
    columnState: overrides.columnState || { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    ...overrides,
    // Ensure tabs is not accidentally overridden unless explicitly provided
    tabs: overrides.tabs || [tab],
  };
};

describe('Tabs - Creating New Tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [
        makePane('left', { path: '/Users/john/Documents', basePath: '/Users/john/Documents' }),
      ],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('new tab should start from Desktop (homeDir/Desktop), not current directory', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      result.current.addTab('left');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    expect(pane.activeTab).toBe(1);
    // New tab should point to Desktop
    expect(pane.basePath).toBe('/Users/john/Desktop');
    expect(pane.path).toBe('/Users/john/Desktop');
  });

  test('new tab should have correct label (Desktop)', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      result.current.addTab('left');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[1].label).toBe('Desktop');
  });

  test('new tab with custom path should use that path', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      result.current.addTab('left', '/Users/john/Downloads');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    expect(pane.tabs[1].basePath).toBe('/Users/john/Downloads');
    expect(pane.tabs[1].label).toBe('Downloads');
  });

  test('previous tab state should be saved when creating new tab', async () => {
    const { result } = renderHook(() => useStore());

    // Set some state on the first tab
    act(() => {
      result.current.setViewMode('left', 'list');
    });

    await act(async () => {
      result.current.addTab('left');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    // First tab should have saved state with list viewMode
    expect(pane.tabs[0].viewMode).toBe('list');
    // New tab should have column viewMode (default)
    expect(pane.tabs[1].viewMode).toBe('column');
  });
});

describe('Tabs - Switching Tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    const tab1 = makeTab({
      id: 'tab-1',
      path: '/Users/john/Documents',
      basePath: '/Users/john/Documents',
      currentBreadcrumbPath: '/Users/john/Documents',
      label: 'Documents',
      files: [{ name: 'file1.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' }],
      viewMode: 'list',
      sortBy: 'size',
      columnState: { paths: ['/Users/john/Documents'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    });

    const tab2 = makeTab({
      id: 'tab-2',
      path: '/Users/john/Downloads',
      basePath: '/Users/john/Downloads',
      currentBreadcrumbPath: '/Users/john/Downloads',
      label: 'Downloads',
      files: [{ name: 'archive.zip', isDirectory: false, size: 5000, modified: new Date().toISOString(), extension: 'zip' }],
      viewMode: 'column',
      sortBy: 'name',
      columnState: { paths: ['/Users/john/Downloads'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    });

    useStore.setState({
      panes: [{
        id: 'left',
        // Current pane state matches tab1 (active)
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        currentBreadcrumbPath: '/Users/john/Documents',
        files: tab1.files,
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'size',
        sortOrder: 'asc',
        viewMode: 'list',
        tabs: [tab1, tab2],
        activeTab: 0,
        activeBookmarkId: null,
        columnState: { paths: ['/Users/john/Documents'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('switching to tab 2 should restore its state', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.switchTab('left', 1);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.activeTab).toBe(1);
    expect(pane.path).toBe('/Users/john/Downloads');
    expect(pane.basePath).toBe('/Users/john/Downloads');
    expect(pane.viewMode).toBe('column');
    expect(pane.sortBy).toBe('name');
  });

  test('switching tabs should save current tab state', () => {
    const { result } = renderHook(() => useStore());

    // Switch from tab1 (list/size) to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    // Tab1 should have been saved with its state
    expect(pane.tabs[0].viewMode).toBe('list');
    expect(pane.tabs[0].sortBy).toBe('size');
    expect(pane.tabs[0].basePath).toBe('/Users/john/Documents');
  });

  test('switching back to tab 1 should restore its state', () => {
    const { result } = renderHook(() => useStore());

    // Switch to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    // Switch back to tab1
    act(() => {
      result.current.switchTab('left', 0);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.activeTab).toBe(0);
    expect(pane.path).toBe('/Users/john/Documents');
    expect(pane.viewMode).toBe('list');
    expect(pane.sortBy).toBe('size');
  });

  test('switching to same tab should be a no-op', () => {
    const { result } = renderHook(() => useStore());

    const paneBefore = result.current.panes.find(p => p.id === 'left');
    const pathBefore = paneBefore.path;

    act(() => {
      result.current.switchTab('left', 0); // Same tab
    });

    const paneAfter = result.current.panes.find(p => p.id === 'left');
    expect(paneAfter.path).toBe(pathBefore);
    expect(paneAfter.activeTab).toBe(0);
  });
});

describe('Tabs - Closing Tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    const tab1 = makeTab({
      id: 'tab-1',
      path: '/Users/john/Documents',
      basePath: '/Users/john/Documents',
      currentBreadcrumbPath: '/Users/john/Documents',
      label: 'Documents',
      files: [],
      viewMode: 'list',
    });

    const tab2 = makeTab({
      id: 'tab-2',
      path: '/Users/john/Downloads',
      basePath: '/Users/john/Downloads',
      currentBreadcrumbPath: '/Users/john/Downloads',
      label: 'Downloads',
      files: [],
      viewMode: 'column',
    });

    const tab3 = makeTab({
      id: 'tab-3',
      path: '/Users/john/Desktop',
      basePath: '/Users/john/Desktop',
      currentBreadcrumbPath: '/Users/john/Desktop',
      label: 'Desktop',
      files: [],
      viewMode: 'column',
    });

    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john/Downloads',
        basePath: '/Users/john/Downloads',
        currentBreadcrumbPath: '/Users/john/Downloads',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [tab1, tab2, tab3],
        activeTab: 1, // tab2 is active
        activeBookmarkId: null,
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('closing active tab should switch to adjacent tab', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.closeTab('left', 1); // Close active tab2
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    // Should switch to the tab that's now at index 1 (was tab3)
    expect(pane.activeTab).toBe(1);
    expect(pane.basePath).toBe('/Users/john/Desktop');
  });

  test('closing non-active tab before active should adjust activeTab index', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.closeTab('left', 0); // Close tab1 (before active)
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    expect(pane.activeTab).toBe(0); // Shifted down by 1
    expect(pane.basePath).toBe('/Users/john/Downloads'); // Still on tab2
  });

  test('closing non-active tab after active should not change activeTab', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.closeTab('left', 2); // Close tab3 (after active)
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    expect(pane.activeTab).toBe(1); // Unchanged
    expect(pane.basePath).toBe('/Users/john/Downloads');
  });

  test('should not close last remaining tab', () => {
    const { result } = renderHook(() => useStore());

    // Close two tabs
    act(() => {
      result.current.closeTab('left', 2);
    });
    act(() => {
      result.current.closeTab('left', 1);
    });

    let pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(1);

    // Try to close the last one
    act(() => {
      result.current.closeTab('left', 0);
    });

    pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(1); // Still 1
  });
});

describe('Tabs - State Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    const tab1 = makeTab({
      id: 'tab-1',
      path: '/Users/john/Documents',
      basePath: '/Users/john/Documents',
      currentBreadcrumbPath: '/Users/john/Documents',
      label: 'Documents',
      viewMode: 'column',
      sortBy: 'name',
      columnState: {
        paths: ['/Users/john/Documents'],
        filesByPath: { '/Users/john/Documents': [{ name: 'readme.md', isDirectory: false }] },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    });

    const tab2 = makeTab({
      id: 'tab-2',
      path: '/Users/john/Downloads',
      basePath: '/Users/john/Downloads',
      currentBreadcrumbPath: '/Users/john/Downloads',
      label: 'Downloads',
      viewMode: 'list',
      sortBy: 'size',
      columnState: {
        paths: ['/Users/john/Downloads'],
        filesByPath: { '/Users/john/Downloads': [{ name: 'file.zip', isDirectory: false }] },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    });

    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        currentBreadcrumbPath: '/Users/john/Documents',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [tab1, tab2],
        activeTab: 0,
        activeBookmarkId: null,
        columnState: tab1.columnState,
      }],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('changing viewMode on tab1 should not affect tab2', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setViewMode('left', 'list');
    });

    // Switch to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    // Tab2 should still have its own viewMode
    expect(pane.viewMode).toBe('list');
    expect(pane.sortBy).toBe('size');
  });

  test('navigating in tab1 should not affect tab2 state', async () => {
    const { result } = renderHook(() => useStore());

    // Navigate tab1 to a different directory
    await act(async () => {
      await result.current.navigateTo('left', '/Users/john/Projects');
    });

    // Switch to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.basePath).toBe('/Users/john/Downloads');
    expect(pane.path).toBe('/Users/john/Downloads');
  });

  test('column state should be independent per tab', () => {
    const { result } = renderHook(() => useStore());

    // Update column state on tab1
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john/Documents', '/Users/john/Documents/Projects'],
        selectedByColumn: { 0: '/Users/john/Documents/Projects' },
        focusedIndex: 1,
      });
    });

    // Switch to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    // Tab2 should have its own column state
    expect(pane.columnState.paths).toEqual(['/Users/john/Downloads']);

    // Switch back to tab1
    act(() => {
      result.current.switchTab('left', 0);
    });

    const pane2 = result.current.panes.find(p => p.id === 'left');
    expect(pane2.columnState.paths).toEqual(['/Users/john/Documents', '/Users/john/Documents/Projects']);
    expect(pane2.columnState.focusedIndex).toBe(1);
  });
});

describe('Tabs - Label Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [
        makePane('left', { path: '/Users/john/Documents', basePath: '/Users/john/Documents' }),
      ],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('tab label should be the base directory name', () => {
    const { result } = renderHook(() => useStore());
    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].label).toBe('Documents');
  });

  test('tab label should update when navigating to a new directory', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.navigateTo('left', '/Users/john/Downloads');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].label).toBe('Downloads');
  });

  test('tab label should update when navigating to bookmark', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.navigateToBookmark('left', '/Users/john/Projects', 'bm-1');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].label).toBe('Projects');
  });

  test('root path should have / as label', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.navigateTo('left', '/');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].label).toBe('/');
  });
});

describe('Tabs - Session Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    const tab1 = makeTab({
      id: 'tab-1',
      path: '/Users/john/Documents',
      basePath: '/Users/john/Documents',
      currentBreadcrumbPath: '/Users/john/Documents',
      label: 'Documents',
      viewMode: 'list',
      sortBy: 'size',
    });

    const tab2 = makeTab({
      id: 'tab-2',
      path: '/Users/john/Downloads',
      basePath: '/Users/john/Downloads',
      currentBreadcrumbPath: '/Users/john/Downloads',
      label: 'Downloads',
      viewMode: 'column',
      sortBy: 'name',
    });

    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        currentBreadcrumbPath: '/Users/john/Documents',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'size',
        sortOrder: 'asc',
        viewMode: 'list',
        tabs: [tab1, tab2],
        activeTab: 0,
        activeBookmarkId: null,
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('saveSession should include full tab state', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.saveSession();
    });

    expect(window.electronAPI.storeSet).toHaveBeenCalledWith('session', expect.objectContaining({
      panes: expect.arrayContaining([
        expect.objectContaining({
          tabs: expect.arrayContaining([
            expect.objectContaining({
              id: 'tab-1',
              basePath: '/Users/john/Documents',
              viewMode: 'list',
              sortBy: 'size',
            }),
            expect.objectContaining({
              id: 'tab-2',
              basePath: '/Users/john/Downloads',
              viewMode: 'column',
              sortBy: 'name',
            }),
          ]),
          activeTab: 0,
        }),
      ]),
    }));
  });

  test('saveSession should include tab columnState', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.saveSession();
    });

    const savedCall = window.electronAPI.storeSet.mock.calls.find(c => c[0] === 'session');
    expect(savedCall).toBeTruthy();
    const session = savedCall[1];
    const leftPane = session.panes.find(p => p.id === 'left');
    expect(leftPane.tabs[0]).toHaveProperty('columnState');
    expect(leftPane.tabs[1]).toHaveProperty('columnState');
  });

  test('saveSession should serialize selectedFiles as arrays', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.saveSession();
    });

    const savedCall = window.electronAPI.storeSet.mock.calls.find(c => c[0] === 'session');
    const session = savedCall[1];
    const leftPane = session.panes.find(p => p.id === 'left');
    // selectedFiles should be serialized as array, not Set
    expect(Array.isArray(leftPane.tabs[0].selectedFiles)).toBe(true);
  });
});

describe('Tabs - Navigation Updates Active Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({
      success: true,
      files: [
        { name: 'file1.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
      ],
    });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [
        makePane('left', { path: '/Users/john', basePath: '/Users/john' }),
      ],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
    });
  });

  test('navigateTo should update the active tab snapshot', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.navigateTo('left', '/Users/john/Projects');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].path).toBe('/Users/john/Projects');
    expect(pane.tabs[0].basePath).toBe('/Users/john/Projects');
    expect(pane.tabs[0].label).toBe('Projects');
  });

  test('navigateToBookmark should update active tab with bookmark info', async () => {
    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.navigateToBookmark('left', '/Users/john/Work', 'bm-work');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].basePath).toBe('/Users/john/Work');
    expect(pane.tabs[0].label).toBe('Work');
  });

  test('setCurrentBreadcrumbPath should update active tab snapshot', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users/john/Documents/Projects');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].currentBreadcrumbPath).toBe('/Users/john/Documents/Projects');
  });

  test('setViewMode should update active tab snapshot', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.setViewMode('left', 'list');
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].viewMode).toBe('list');
  });

  test('updateColumnState should update active tab snapshot', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents'],
        focusedIndex: 1,
      });
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].columnState.paths).toEqual(['/Users/john', '/Users/john/Documents']);
    expect(pane.tabs[0].columnState.focusedIndex).toBe(1);
  });
});

describe('Tabs - Session Restore (init)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});
    window.electronAPI.storeSet.mockResolvedValue(undefined);
    window.electronAPI.stat.mockResolvedValue({ success: false });
    window.electronAPI.getHomeDir.mockResolvedValue('/Users/john');
    window.electronAPI.getBookmarks.mockResolvedValue([]);
    window.electronAPI.getAllTags.mockResolvedValue({ success: true, tags: [] });
    window.electronAPI.onWatcherChange.mockImplementation(() => {});
  });

  test('init should restore tabs from saved session', async () => {
    const savedSession = {
      panes: [{
        id: 'left',
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        currentBreadcrumbPath: '/Users/john/Documents',
        viewMode: 'list',
        sortBy: 'size',
        sortOrder: 'asc',
        selectedFiles: [],
        activeTab: 1,
        tabs: [
          {
            id: 'tab-1',
            path: '/Users/john/Documents',
            basePath: '/Users/john/Documents',
            currentBreadcrumbPath: '/Users/john/Documents',
            label: 'Documents',
            viewMode: 'list',
            sortBy: 'size',
            sortOrder: 'asc',
            selectedFiles: [],
            columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
          },
          {
            id: 'tab-2',
            path: '/Users/john/Downloads',
            basePath: '/Users/john/Downloads',
            currentBreadcrumbPath: '/Users/john/Downloads',
            label: 'Downloads',
            viewMode: 'column',
            sortBy: 'name',
            sortOrder: 'asc',
            selectedFiles: [],
            columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
          },
        ],
      }],
      activePane: 'left',
    };

    window.electronAPI.storeGet.mockImplementation((key) => {
      if (key === 'session') return Promise.resolve(savedSession);
      return Promise.resolve(null);
    });

    // Reset store state
    useStore.setState({
      panes: [makePane('left'), makePane('right')],
      initialized: false,
    });

    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.init();
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(2);
    expect(pane.activeTab).toBe(1);
    // Active tab state should be restored to pane level
    expect(pane.basePath).toBe('/Users/john/Downloads');
    expect(pane.viewMode).toBe('column');
    expect(pane.sortBy).toBe('name');
  });

  test('init with no saved session should create single default tab', async () => {
    window.electronAPI.storeGet.mockResolvedValue(null);

    useStore.setState({
      panes: [makePane('left'), makePane('right')],
      initialized: false,
    });

    const { result } = renderHook(() => useStore());

    await act(async () => {
      await result.current.init();
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs).toHaveLength(1);
    expect(pane.activeTab).toBe(0);
  });
});

describe('Tabs - Preview File Per Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.storeSet.mockResolvedValue(undefined);

    const file1 = { name: 'doc.txt', path: '/Users/john/Documents/doc.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' };
    const file2 = { name: 'image.png', path: '/Users/john/Downloads/image.png', isDirectory: false, size: 2000, modified: new Date().toISOString(), extension: 'png' };

    const tab1 = makeTab({
      id: 'tab-1',
      path: '/Users/john/Documents',
      basePath: '/Users/john/Documents',
      label: 'Documents',
      previewFile: file1,
    });

    const tab2 = makeTab({
      id: 'tab-2',
      path: '/Users/john/Downloads',
      basePath: '/Users/john/Downloads',
      label: 'Downloads',
      previewFile: file2,
    });

    useStore.setState({
      panes: [{
        id: 'left',
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        files: [],
        loading: false,
        error: null,
        selectedFiles: new Set(),
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'column',
        tabs: [tab1, tab2],
        activeTab: 0,
        activeBookmarkId: null,
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      }],
      activePane: 'left',
      homeDir: '/Users/john',
      initialized: true,
      previewFile: file1,
      showPreview: true,
    });
  });

  test('switching tabs should restore preview file from target tab', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.switchTab('left', 1);
    });

    expect(result.current.previewFile.name).toBe('image.png');
    expect(result.current.showPreview).toBe(true);
  });

  test('switching to tab with no preview should close preview pane', () => {
    const { result } = renderHook(() => useStore());

    // Update tab2 to have no preview
    act(() => {
      useStore.setState(s => ({
        panes: s.panes.map(p => ({
          ...p,
          tabs: p.tabs.map((t, i) => i === 1 ? { ...t, previewFile: null } : t),
        })),
      }));
    });

    act(() => {
      result.current.switchTab('left', 1);
    });

    expect(result.current.previewFile).toBe(null);
    expect(result.current.showPreview).toBe(false);
  });

  test('setPreviewFile should save to active tab', () => {
    const { result } = renderHook(() => useStore());

    const newFile = { name: 'new.pdf', path: '/Users/john/Documents/new.pdf', isDirectory: false };

    act(() => {
      result.current.setPreviewFile(newFile);
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].previewFile.name).toBe('new.pdf');
    expect(result.current.previewFile.name).toBe('new.pdf');
  });

  test('closePreview should clear preview in active tab', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.closePreview();
    });

    const pane = result.current.panes.find(p => p.id === 'left');
    expect(pane.tabs[0].previewFile).toBe(null);
    expect(result.current.previewFile).toBe(null);
    expect(result.current.showPreview).toBe(false);
  });

  test('switching back to tab1 should restore its preview', () => {
    const { result } = renderHook(() => useStore());

    // Switch to tab2
    act(() => {
      result.current.switchTab('left', 1);
    });

    expect(result.current.previewFile.name).toBe('image.png');

    // Switch back to tab1
    act(() => {
      result.current.switchTab('left', 0);
    });

    expect(result.current.previewFile.name).toBe('doc.txt');
    expect(result.current.showPreview).toBe(true);
  });

  test('creating new tab should clear preview', async () => {
    const { result } = renderHook(() => useStore());
    window.electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    window.electronAPI.watcherStart.mockImplementation(() => {});

    await act(async () => {
      result.current.addTab('left');
    });

    expect(result.current.previewFile).toBe(null);
    expect(result.current.showPreview).toBe(false);
  });

  test('closing active tab should restore preview from new active tab', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.closeTab('left', 0);
    });

    // Tab2 becomes active
    expect(result.current.previewFile.name).toBe('image.png');
    expect(result.current.showPreview).toBe(true);
  });

  test('session persistence should save per-tab preview', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.saveSession();
    });

    const savedCall = window.electronAPI.storeSet.mock.calls.find(c => c[0] === 'session');
    const session = savedCall[1];
    const leftPane = session.panes.find(p => p.id === 'left');
    
    expect(leftPane.tabs[0].previewFilePath).toBe('/Users/john/Documents/doc.txt');
    expect(leftPane.tabs[1].previewFilePath).toBe('/Users/john/Downloads/image.png');
  });
});
