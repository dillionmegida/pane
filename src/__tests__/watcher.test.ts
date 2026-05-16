/**
 * File Watcher Tests
 *
 * Tests the file system watcher functionality:
 * - Deselects deleted files
 * - Closes preview when deleted file was previewed
 * - Trims columns when deleted directory was in column view
 * - Refreshes pane when file changes in watched directory
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';
import type { FileItem } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mkFile = (name: string, overrides: Partial<FileItem> = {}): FileItem => ({
  path: `/test/${name}`,
  name,
  isDirectory: false,
  size: 100,
  modified: '2024-01-15T10:00:00Z',
  extension: name.includes('.') ? name.split('.').pop() || '' : '',
  ...overrides,
});

const defaultPaneState = (overrides: Record<string, any> = {}) => ({
  panes: [
    {
      id: 'left',
      path: '/Users/john',
      basePath: '/Users/john',
      currentBreadcrumbPath: '/Users/john',
      files: [] as FileItem[],
      loading: false,
      error: null,
      selectedFiles: new Set<string>(),
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      viewMode: 'column' as const,
      tabs: [{
        id: 'tab-1', path: '/Users/john', label: 'john',
        basePath: '/Users/john', currentBreadcrumbPath: '/Users/john',
        files: [] as FileItem[], selectedFiles: new Set<string>(),
        activeBookmarkId: null, viewMode: 'column' as const,
        sortBy: 'name' as const, sortOrder: 'asc' as const,
        columnState: { paths: [] as string[], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        previewFile: null, navigationHistory: [] as any[], navigationIndex: -1, _isRestoringHistory: false,
      }],
      activeTab: 0,
      columnState: { paths: [] as string[], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      activeBookmarkId: null,
      navigationHistory: [] as any[],
      navigationIndex: -1,
      _isRestoringHistory: false,
    },
  ],
  activePane: 'left',
  showRightPane: false,
  previewFile: null,
  showPreview: false,
  ...overrides,
});

// ─── Watcher Tests ─────────────────────────────────────────────────────────────

describe('File Watcher - file system change detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState(defaultPaneState());
  });

  test('watcher deselects deleted file', async () => {
    useStore.setState({
      ...defaultPaneState(),
      panes: [{
        ...defaultPaneState().panes[0],
        selectedFiles: new Set(['/Users/john/file.txt']),
        path: '/Users/john',
      }],
    });

    // Manually simulate the watcher callback logic (from init)
    const change = { type: 'unlink', path: '/Users/john/file.txt', dir: '/Users/john' };
    const { panes, setSelection } = useStore.getState();
    panes.forEach(p => {
      if (p.selectedFiles.has(change.path)) {
        setSelection(p.id, []);
      }
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.has('/Users/john/file.txt')).toBe(false);
  });

  test('watcher closes preview when deleted file was previewed', async () => {
    useStore.setState({
      ...defaultPaneState(),
      panes: [{
        ...defaultPaneState().panes[0],
        selectedFiles: new Set(['/Users/john/photo.png']),
        path: '/Users/john',
        tabs: defaultPaneState().panes[0].tabs.map((t, i) => i === defaultPaneState().panes[0].activeTab ? {
          ...t,
          previewFile: mkFile('photo.png', { path: '/Users/john/photo.png' }),
        } : t),
      }],
    });

    // Manually simulate the watcher callback logic (from init)
    const change = { type: 'unlink', path: '/Users/john/photo.png', dir: '/Users/john' };
    const { panes, setSelection, closePreview } = useStore.getState();
    panes.forEach(p => {
      if (p.selectedFiles.has(change.path)) {
        setSelection(p.id, []);
        const currentTab = p.tabs[p.activeTab];
        if (currentTab?.previewFile?.path === change.path && !currentTab.previewFile.isDirectory) {
          closePreview();
        }
      }
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs[pane!.activeTab].previewFile).toBeNull();
  });

  test('watcher trims columns when deleted directory was in column view', async () => {
    useStore.setState({
      ...defaultPaneState(),
      panes: [{
        ...defaultPaneState().panes[0],
        viewMode: 'column',
        path: '/Users/john',
        columnState: {
          paths: ['/Users/john', '/Users/john/Documents', '/Users/john/Documents/Projects'],
          filesByPath: {},
          selectedByColumn: {},
          focusedIndex: 2,
        },
        selectedFiles: new Set(['/Users/john/Documents']),
      }],
    });

    // Manually simulate the watcher callback logic (from init)
    const change = { type: 'unlinkDir', path: '/Users/john/Documents', dir: '/Users/john' };
    const { panes, setSelection, updateColumnState } = useStore.getState();
    panes.forEach(p => {
      if (p.selectedFiles.has(change.path)) {
        setSelection(p.id, []);
        if (p.viewMode === 'column' && p.columnState?.paths) {
          const dirIndex = p.columnState.paths.indexOf(change.path);
          if (dirIndex !== -1) {
            updateColumnState(p.id, {
              paths: p.columnState.paths.slice(0, dirIndex),
              focusedIndex: dirIndex - 1,
            });
          }
        }
      }
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.columnState.paths).toEqual(['/Users/john']);
    expect(pane!.columnState.focusedIndex).toBe(0);
  });

  test('watcher refreshes pane when file changes in watched directory', async () => {
    const newFiles = [mkFile('new.txt')];
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: newFiles });

    useStore.setState({
      ...defaultPaneState(),
      panes: [{
        ...defaultPaneState().panes[0],
        path: '/Users/john',
        files: [mkFile('old.txt')],
      }],
    });

    // Manually simulate the watcher callback logic (from init)
    const change = { type: 'add', path: '/Users/john/new.txt', dir: '/Users/john' };
    const { panes, refreshPane } = useStore.getState();
    const normalizePath = (path: string) => path.replace(/\/$/, '');
    panes.forEach(p => {
      const currentTab = p.tabs[p.activeTab];
      const tabPath = currentTab?.path || p.path;
      if (normalizePath(tabPath) === normalizePath(change.dir)) {
        refreshPane(p.id);
      }
    });

    // Wait for async refreshPane to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.files).toEqual(newFiles);
  });
});
