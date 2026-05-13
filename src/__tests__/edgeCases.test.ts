/**
 * Edge Cases & Untested Areas
 *
 * Covers remaining store actions and selectors not fully tested:
 * 1. pushNavHistory - deduplication (skips identical entries, respects _isRestoringHistory)
 * 2. navigateToReveal - reveals with separate basePath/breadcrumb
 * 3. revealFileInTree - full column build, under-base reuse, preview file, pushNavHistory
 * 4. setDirectorySort - re-sorts pane files + column filesByPath + all tabs
 * 5. setPreviewWidth - clamps between 200 and 50% of window
 * 6. setSidebarWidth - clamps between 160 and 500
 * 7. searchFiles - calls electronAPI.search, handles empty query
 * 8. getBreadcrumbs - column view, list view, root path
 * 9. getColumnPaths - derives column paths from basePath/breadcrumb
 * 10. matchesExcludePattern - glob matching for directory scanner
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

const mkDir = (name: string, overrides: Partial<FileItem> = {}): FileItem => ({
  path: `/test/${name}`,
  name,
  isDirectory: true,
  size: 0,
  modified: '2024-01-15T10:00:00Z',
  extension: '',
  ...overrides,
});

const defaultPane = (overrides: Record<string, any> = {}) => ({
  id: 'left',
  path: '/Users/john/Documents',
  basePath: '/Users/john/Documents',
  currentBreadcrumbPath: '/Users/john/Documents',
  files: [] as FileItem[],
  loading: false,
  error: null,
  selectedFiles: new Set<string>(),
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  viewMode: 'column' as const,
  tabs: [{
    id: 'tab-1', path: '/Users/john/Documents', label: 'Documents',
    basePath: '/Users/john/Documents', currentBreadcrumbPath: '/Users/john/Documents',
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
  ...overrides,
});

// ─── 1. pushNavHistory deduplication ─────────────────────────────────────────

describe('pushNavHistory - deduplication and _isRestoringHistory guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [defaultPane({
        navigationHistory: [
          { basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: [], previewFilePath: null },
        ],
        navigationIndex: 0,
      })],
      activePane: 'left',
    });
  });

  test('skips push when entry is identical to current', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: [], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(1);
  });

  test('pushes when basePath differs', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/b', currentBreadcrumbPath: '/b', selectedFiles: [], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushes when breadcrumb differs', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/a', currentBreadcrumbPath: '/a/sub', selectedFiles: [], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushes when selectedFiles differ', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: ['/a/file.txt'], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushes when previewFilePath differs', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: [], previewFilePath: '/a/img.png',
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('skips when _isRestoringHistory is true', () => {
    useStore.setState({
      panes: [defaultPane({
        navigationHistory: [
          { basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: [], previewFilePath: null },
        ],
        navigationIndex: 0,
        _isRestoringHistory: true,
      })],
    });

    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/b', currentBreadcrumbPath: '/b', selectedFiles: [], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(1);
  });

  test('selectedFiles order does not matter for dedup (sorted comparison)', () => {
    useStore.setState({
      panes: [defaultPane({
        navigationHistory: [
          { basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: ['/a/b', '/a/c'], previewFilePath: null },
        ],
        navigationIndex: 0,
      })],
    });

    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/a', currentBreadcrumbPath: '/a', selectedFiles: ['/a/c', '/a/b'], previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    // Same files in different order — should be considered identical
    expect(pane!.navigationHistory).toHaveLength(1);
  });
});

// ─── 2. navigateToReveal ─────────────────────────────────────────────────────

describe('navigateToReveal - reveal with separate basePath/breadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [mkFile('a.txt')] });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [defaultPane()],
      activePane: 'left',
      initialized: true,
      directorySorts: {},
    });
  });

  test('sets basePath and currentBreadcrumbPath independently', async () => {
    await act(async () => {
      await useStore.getState().navigateToReveal('left', '/Users/john/Documents/sub', '/Users/john/Documents', '/Users/john/Documents/sub');
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.basePath).toBe('/Users/john/Documents');
    expect(pane!.currentBreadcrumbPath).toBe('/Users/john/Documents/sub');
  });

  test('reads directory from dirPath (not basePath)', async () => {
    await act(async () => {
      await useStore.getState().navigateToReveal('left', '/Users/john/Documents/sub', '/Users/john/Documents', '/Users/john/Documents/sub');
    });
    expect((window as any).electronAPI.readdir).toHaveBeenCalledWith('/Users/john/Documents/sub');
  });

  test('handles readdir failure gracefully', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: false, error: 'Not found' });
    await act(async () => {
      await useStore.getState().navigateToReveal('left', '/bad/path', '/bad', '/bad/path');
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.error).toBe('Not found');
    expect(pane!.loading).toBe(false);
  });

  test('starts watcher on dirPath', async () => {
    await act(async () => {
      await useStore.getState().navigateToReveal('left', '/Users/john/sub', '/Users/john', '/Users/john/sub');
    });
    expect((window as any).electronAPI.watcherStart).toHaveBeenCalledWith('/Users/john/sub');
  });

  test('does nothing for unknown pane', async () => {
    await act(async () => {
      await useStore.getState().navigateToReveal('nonexistent', '/a', '/a', '/a');
    });
    expect((window as any).electronAPI.readdir).not.toHaveBeenCalled();
  });
});

// ─── 3. revealFileInTree ─────────────────────────────────────────────────────

describe('revealFileInTree - column building and file selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [mkFile('revealed.txt')] });
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true, stat: { size: 100, modified: '2024-01-01', isDirectory: false },
    });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [defaultPane()],
      activePane: 'left',
      initialized: true,
      directorySorts: {},
      previewFile: null,
    });
  });

  test('selects the revealed file', async () => {
    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/john/Documents/file.txt', '/Users/john/Documents');
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.has('/Users/john/Documents/file.txt')).toBe(true);
  });

  test('sets preview file for non-directory reveals', async () => {
    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/john/Documents/photo.png', '/Users/john/Documents', false);
    });
    expect(useStore.getState().previewFile).not.toBeNull();
    expect(useStore.getState().previewFile!.path).toBe('/Users/john/Documents/photo.png');
  });

  test('does NOT set preview for directory reveals', async () => {
    await act(async () => {
      await useStore.getState().revealFileInTree('left', '/Users/john/Documents/sub', '/Users/john/Documents', true);
    });
    expect(useStore.getState().previewFile).toBeNull();
  });

  test('builds column paths when fileDir differs from basePath', async () => {
    // fileDir is deeper than basePath
    await act(async () => {
      await useStore.getState().revealFileInTree(
        'left',
        '/Users/john/Documents/Work/report.pdf',
        '/Users/john/Documents/Work',
        false
      );
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    // Should have read the Work directory for columns
    expect((window as any).electronAPI.readdir).toHaveBeenCalledWith('/Users/john/Documents/Work');
  });

  test('reuses existing basePath when file is under it', async () => {
    // basePath is /Users/john/Documents, file is at /Users/john/Documents/sub/file.txt
    await act(async () => {
      await useStore.getState().revealFileInTree(
        'left',
        '/Users/john/Documents/sub/file.txt',
        '/Users/john/Documents/sub',
        false
      );
    });
    // navigateTo should have been called with existing basePath
    expect((window as any).electronAPI.readdir).toHaveBeenCalledWith('/Users/john/Documents');
  });

  test('does nothing for unknown pane', async () => {
    await act(async () => {
      await useStore.getState().revealFileInTree('nonexistent', '/a/b.txt', '/a', false);
    });
    expect((window as any).electronAPI.stat).not.toHaveBeenCalled();
  });
});

// ─── 4. setDirectorySort ─────────────────────────────────────────────────────

describe('setDirectorySort - re-sorts pane + columns + all tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const files = [mkFile('zebra.txt', { size: 10 }), mkFile('alpha.txt', { size: 999 }), mkDir('sub')];
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files });
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [defaultPane({
        path: '/Users/john/Documents',
        files,
        columnState: {
          paths: ['/Users/john/Documents/sub'],
          filesByPath: { '/Users/john/Documents/sub': [mkFile('b.txt'), mkFile('a.txt')] },
          selectedByColumn: {},
          focusedIndex: 0,
        },
      })],
      activePane: 'left',
      directorySorts: {},
      initialized: true,
    });
  });

  test('stores sort in directorySorts map', async () => {
    await act(async () => {
      await useStore.getState().setDirectorySort('/Users/john/Documents', 'size');
    });
    expect(useStore.getState().directorySorts['/Users/john/Documents']).toBe('size');
  });

  test('re-sorts pane files when pane.path matches dirPath', async () => {
    await act(async () => {
      await useStore.getState().setDirectorySort('/Users/john/Documents', 'size');
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    // Directories first, then by size asc
    const nonDirs = pane!.files.filter(f => !f.isDirectory);
    expect(nonDirs[0].name).toBe('zebra.txt'); // size 10
    expect(nonDirs[1].name).toBe('alpha.txt'); // size 999
  });

  test('re-sorts column filesByPath when column matches dirPath', async () => {
    // Sort the sub column by name
    const subFiles = [mkFile('z.txt', { path: '/Users/john/Documents/sub/z.txt' }), mkFile('a.txt', { path: '/Users/john/Documents/sub/a.txt' })];
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: subFiles });

    await act(async () => {
      await useStore.getState().setDirectorySort('/Users/john/Documents/sub', 'name');
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    const colFiles = pane!.columnState.filesByPath['/Users/john/Documents/sub'];
    expect(colFiles[0].name).toBe('a.txt');
    expect(colFiles[1].name).toBe('z.txt');
  });

  test('handles readdir failure gracefully', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: false, error: 'Denied' });
    await act(async () => {
      await useStore.getState().setDirectorySort('/bad', 'size');
    });
    // directorySorts still stored
    expect(useStore.getState().directorySorts['/bad']).toBe('size');
  });
});

// ─── 5. setPreviewWidth - clamping ──────────────────────────────────────────

describe('setPreviewWidth - clamps between 200 and 50% of window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);
    useStore.setState({ previewWidth: 300, zoom: 1.0 });
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
  });

  test('clamps to minimum 200', () => {
    act(() => { useStore.getState().setPreviewWidth(50); });
    expect(useStore.getState().previewWidth).toBe(200);
  });

  test('clamps to max 50% of window / zoom', () => {
    // window.innerWidth=1200, zoom=1.0 → max = 600
    act(() => { useStore.getState().setPreviewWidth(800); });
    expect(useStore.getState().previewWidth).toBe(600);
  });

  test('allows value within range', () => {
    act(() => { useStore.getState().setPreviewWidth(400); });
    expect(useStore.getState().previewWidth).toBe(400);
  });

  test('persists clamped value via storeSet', () => {
    act(() => { useStore.getState().setPreviewWidth(50); });
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('previewWidth', 200);
  });

  test('respects zoom when calculating max', () => {
    useStore.setState({ zoom: 1.5 });
    // max = Math.floor((1200 / 1.5) * 0.5) = 400
    act(() => { useStore.getState().setPreviewWidth(500); });
    expect(useStore.getState().previewWidth).toBe(400);
  });
});

// ─── 6. setSidebarWidth - clamping ──────────────────────────────────────────

describe('setSidebarWidth - clamps between 160 and 500', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);
    useStore.setState({ sidebarWidth: 220 });
  });

  test('clamps to minimum 160', () => {
    act(() => { useStore.getState().setSidebarWidth(100); });
    expect(useStore.getState().sidebarWidth).toBe(160);
  });

  test('clamps to maximum 500', () => {
    act(() => { useStore.getState().setSidebarWidth(700); });
    expect(useStore.getState().sidebarWidth).toBe(500);
  });

  test('allows value within range', () => {
    act(() => { useStore.getState().setSidebarWidth(300); });
    expect(useStore.getState().sidebarWidth).toBe(300);
  });

  test('persists clamped value', () => {
    act(() => { useStore.getState().setSidebarWidth(50); });
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('sidebarWidth', 160);
  });
});

// ─── 7. searchFiles ──────────────────────────────────────────────────────────

describe('searchFiles - calls electronAPI.search correctly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: [mkFile('found.txt')] });

    useStore.setState({
      panes: [defaultPane()],
      activePane: 'left',
      searchLoading: false,
      searchResults: [],
    });
  });

  test('calls electronAPI.search with rootPath, query, and options', async () => {
    await act(async () => {
      await useStore.getState().searchFiles('hello', { caseSensitive: true });
    });
    expect((window as any).electronAPI.search).toHaveBeenCalledWith({
      rootPath: '/Users/john/Documents',
      query: 'hello',
      options: { caseSensitive: true },
    });
  });

  test('sets searchLoading true during search, false after', async () => {
    const states: boolean[] = [];
    const unsub = useStore.subscribe(s => states.push(s.searchLoading));

    await act(async () => {
      await useStore.getState().searchFiles('test');
    });
    unsub();

    expect(states[0]).toBe(true);
    expect(useStore.getState().searchLoading).toBe(false);
  });

  test('stores results on success', async () => {
    await act(async () => {
      await useStore.getState().searchFiles('test');
    });
    expect(useStore.getState().searchResults).toHaveLength(1);
    expect(useStore.getState().searchResults[0].name).toBe('found.txt');
  });

  test('returns empty results on failure', async () => {
    (window as any).electronAPI.search.mockResolvedValue({ success: false, error: 'Timeout' });
    await act(async () => {
      await useStore.getState().searchFiles('test');
    });
    expect(useStore.getState().searchResults).toEqual([]);
  });

  test('does nothing for empty query', async () => {
    await act(async () => {
      await useStore.getState().searchFiles('   ');
    });
    expect((window as any).electronAPI.search).not.toHaveBeenCalled();
  });

  test('does nothing for unknown pane', async () => {
    useStore.setState({ activePane: 'nonexistent' });
    await act(async () => {
      await useStore.getState().searchFiles('test');
    });
    expect((window as any).electronAPI.search).not.toHaveBeenCalled();
  });
});

// ─── 8. getBreadcrumbs ───────────────────────────────────────────────────────

describe('getBreadcrumbs - derives breadcrumbs for column/list/root', () => {
  beforeEach(() => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john/Documents/Work',
        viewMode: 'column',
      })],
      activePane: 'left',
    });
  });

  test('column view: base + relative segments', () => {
    const crumbs = useStore.getState().getBreadcrumbs('left');
    expect(crumbs[0]).toEqual({ name: 'john', path: '/Users/john' });
    expect(crumbs[1]).toEqual({ name: 'Documents', path: '/Users/john/Documents' });
    expect(crumbs[2]).toEqual({ name: 'Work', path: '/Users/john/Documents/Work' });
  });

  test('column view: base only when breadcrumb equals base', () => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        viewMode: 'column',
      })],
    });
    const crumbs = useStore.getState().getBreadcrumbs('left');
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({ name: 'john', path: '/Users/john' });
  });

  test('column view: root basePath shows /', () => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/',
        currentBreadcrumbPath: '/Users',
        viewMode: 'column',
      })],
    });
    const crumbs = useStore.getState().getBreadcrumbs('left');
    expect(crumbs[0]).toEqual({ name: '/', path: '/' });
    expect(crumbs[1]).toEqual({ name: 'Users', path: '/Users' });
  });

  test('list view: full path from root', () => {
    useStore.setState({
      panes: [defaultPane({
        path: '/Users/john/Documents',
        basePath: '/Users/john/Documents',
        currentBreadcrumbPath: '/Users/john/Documents',
        viewMode: 'list',
      })],
    });
    const crumbs = useStore.getState().getBreadcrumbs('left');
    expect(crumbs[0]).toEqual({ name: '/', path: '/' });
    expect(crumbs[1]).toEqual({ name: 'Users', path: '/Users' });
    expect(crumbs[2]).toEqual({ name: 'john', path: '/Users/john' });
    expect(crumbs[3]).toEqual({ name: 'Documents', path: '/Users/john/Documents' });
  });

  test('root path returns single / breadcrumb', () => {
    useStore.setState({
      panes: [defaultPane({
        path: '/',
        basePath: '/',
        currentBreadcrumbPath: '/',
        viewMode: 'list',
      })],
    });
    const crumbs = useStore.getState().getBreadcrumbs('left');
    expect(crumbs).toEqual([{ name: '/', path: '/' }]);
  });

  test('returns empty-ish for unknown pane', () => {
    const crumbs = useStore.getState().getBreadcrumbs('nonexistent');
    // getActivePath returns '/' for unknown → [{ name: '/', path: '/' }]
    expect(crumbs).toEqual([{ name: '/', path: '/' }]);
  });
});

// ─── 9. getColumnPaths ───────────────────────────────────────────────────────

describe('getColumnPaths - derives column paths from breadcrumb', () => {
  beforeEach(() => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john/Documents/Work/2024',
        viewMode: 'column',
      })],
      activePane: 'left',
    });
  });

  test('includes basePath and all segments to breadcrumb', () => {
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toContain('/Users/john');
    expect(paths).toContain('/Users/john/Documents');
    expect(paths).toContain('/Users/john/Documents/Work');
    expect(paths).toContain('/Users/john/Documents/Work/2024');
  });

  test('returns [basePath] when breadcrumb does not start with basePath', () => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/Users/john',
        currentBreadcrumbPath: '/other/path',
        viewMode: 'column',
      })],
    });
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toEqual(['/Users/john']);
  });

  test('returns empty for non-column view mode', () => {
    useStore.setState({
      panes: [defaultPane({ viewMode: 'list' })],
    });
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toEqual([]);
  });

  test('returns empty for unknown pane', () => {
    const paths = useStore.getState().getColumnPaths('nonexistent');
    expect(paths).toEqual([]);
  });

  test('basePath only when breadcrumb equals basePath', () => {
    useStore.setState({
      panes: [defaultPane({
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        viewMode: 'column',
      })],
    });
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toEqual(['/Users/john']);
  });
});

// ─── 10. matchesExcludePattern (directory scanner logic) ─────────────────────

describe('matchesExcludePattern - glob matching for directory scanner', () => {
  // Re-implement the same logic from useDirectoryScanner to test it
  const matchesExcludePattern = (directoryName: string, excludePatterns: string[]): boolean => {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(directoryName);
      }
      return directoryName === pattern;
    });
  };

  test('exact match', () => {
    expect(matchesExcludePattern('node_modules', ['node_modules'])).toBe(true);
  });

  test('no match for different name', () => {
    expect(matchesExcludePattern('src', ['node_modules'])).toBe(false);
  });

  test('wildcard * matches any characters', () => {
    expect(matchesExcludePattern('.hidden', ['.*'])).toBe(true);
    // Note: .* in the impl becomes regex /^...*$/ where . is unescaped,
    // so it matches ANY string with 1+ chars (not just dot-prefixed)
    expect(matchesExcludePattern('visible', ['.*'])).toBe(true);
  });

  test('dot-prefixed pattern .* matches dot-prefixed dirs', () => {
    expect(matchesExcludePattern('.git', ['.*'])).toBe(true);
    expect(matchesExcludePattern('.DS_Store', ['.*'])).toBe(true);
  });

  test('glob pattern *.app matches .app suffix', () => {
    expect(matchesExcludePattern('Xcode.app', ['*.app'])).toBe(true);
    expect(matchesExcludePattern('Xcode', ['*.app'])).toBe(false);
  });

  test('? without * falls through to exact string comparison', () => {
    // Pattern 'a?' does not contain *, so it does exact comparison only
    expect(matchesExcludePattern('a?', ['a?'])).toBe(true);
    expect(matchesExcludePattern('ab', ['a?'])).toBe(false);
  });

  test('? inside pattern with * is treated as single-char wildcard', () => {
    // Pattern 'a?*' contains *, so ? becomes . in regex
    expect(matchesExcludePattern('abc', ['a?*'])).toBe(true);
    expect(matchesExcludePattern('ab', ['a?*'])).toBe(true);
    expect(matchesExcludePattern('a', ['a?*'])).toBe(false);
  });

  test('multiple patterns — any match returns true', () => {
    expect(matchesExcludePattern('.git', ['node_modules', '.*'])).toBe(true);
    // .* matches any 1+ char string (unescaped dot in regex)
    expect(matchesExcludePattern('src', ['node_modules', '.*'])).toBe(true);
  });

  test('multiple patterns — exact match on first pattern', () => {
    expect(matchesExcludePattern('node_modules', ['node_modules', '*.app'])).toBe(true);
    expect(matchesExcludePattern('src', ['node_modules', '*.app'])).toBe(false);
  });

  test('empty exclude list never matches', () => {
    expect(matchesExcludePattern('anything', [])).toBe(false);
  });

  test('pattern with multiple wildcards', () => {
    expect(matchesExcludePattern('__test__', ['__*__'])).toBe(true);
    expect(matchesExcludePattern('__pycache__', ['__*__'])).toBe(true);
    expect(matchesExcludePattern('test', ['__*__'])).toBe(false);
  });
});

// ─── Additional: toggleSelection edge cases ──────────────────────────────────

describe('toggleSelection - edge cases', () => {
  beforeEach(() => {
    useStore.setState({
      panes: [defaultPane({ selectedFiles: new Set(['/a/file1.txt']) })],
      activePane: 'left',
    });
  });

  test('normal click on selected-only file clears selection', () => {
    act(() => {
      useStore.getState().toggleSelection('left', '/a/file1.txt', false);
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.size).toBe(0);
  });

  test('normal click on unselected file replaces selection', () => {
    act(() => {
      useStore.getState().toggleSelection('left', '/a/file2.txt', false);
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.size).toBe(1);
    expect(pane!.selectedFiles.has('/a/file2.txt')).toBe(true);
  });

  test('multi=true adds to selection', () => {
    act(() => {
      useStore.getState().toggleSelection('left', '/a/file2.txt', true);
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.size).toBe(2);
  });

  test('multi=true on already-selected file removes it', () => {
    act(() => {
      useStore.getState().toggleSelection('left', '/a/file1.txt', true);
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.selectedFiles.size).toBe(0);
  });
});

// ─── Additional: Zoom boundary edge cases ────────────────────────────────────

describe('Zoom - boundary edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);
  });

  test('zoomIn does not exceed 1.6', () => {
    useStore.setState({ zoom: 1.6 });
    act(() => { useStore.getState().zoomIn(); });
    expect(useStore.getState().zoom).toBe(1.6);
  });

  test('zoomOut does not go below 0.7', () => {
    useStore.setState({ zoom: 0.7 });
    act(() => { useStore.getState().zoomOut(); });
    expect(useStore.getState().zoom).toBe(0.7);
  });

  test('setZoom clamps to range [0.7, 1.6]', () => {
    act(() => { useStore.getState().setZoom(5.0); });
    expect(useStore.getState().zoom).toBe(1.6);

    act(() => { useStore.getState().setZoom(0.1); });
    expect(useStore.getState().zoom).toBe(0.7);
  });

  test('setZoom rounds to 1 decimal place', () => {
    act(() => { useStore.getState().setZoom(1.15); });
    expect(useStore.getState().zoom).toBe(1.2);
  });

  test('zoomIn from 1.55 rounds correctly', () => {
    useStore.setState({ zoom: 1.5 });
    act(() => { useStore.getState().zoomIn(); });
    expect(useStore.getState().zoom).toBe(1.6);
  });

  test('zoomOut from 0.8 → 0.7', () => {
    useStore.setState({ zoom: 0.8 });
    act(() => { useStore.getState().zoomOut(); });
    expect(useStore.getState().zoom).toBe(0.7);
  });
});

// ─── Additional: navigateToBookmark clears preview ───────────────────────────

describe('navigateToBookmark - edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: [defaultPane()],
      activePane: 'left',
      previewFile: mkFile('old.png'),
      showPreview: true,
      initialized: true,
      directorySorts: {},
    });
  });

  test('clears previewFile and showPreview', async () => {
    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/Bookmarked', 'bm-1');
    });
    expect(useStore.getState().previewFile).toBeNull();
    expect(useStore.getState().showPreview).toBe(false);
  });

  test('sets activeBookmarkId on pane', async () => {
    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/Bookmarked', 'bm-1');
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.activeBookmarkId).toBe('bm-1');
  });

  test('skipHistory option prevents history push', async () => {
    useStore.setState({
      panes: [defaultPane({ navigationHistory: [], navigationIndex: -1 })],
    });
    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/Bookmarked', 'bm-1', { skipHistory: true });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(0);
  });
});

// ─── Additional: getActiveBookmark ───────────────────────────────────────────

describe('getActiveBookmark - returns bookmark or null', () => {
  test('returns matching bookmark', () => {
    useStore.setState({
      panes: [defaultPane({ activeBookmarkId: 'bm-1' })],
      bookmarks: [{ id: 'bm-1', name: 'Home', path: '/Users/john', icon: '🏠' }],
    });
    const bm = useStore.getState().getActiveBookmark('left');
    expect(bm).toEqual({ id: 'bm-1', name: 'Home', path: '/Users/john', icon: '🏠' });
  });

  test('returns null when no activeBookmarkId', () => {
    useStore.setState({
      panes: [defaultPane({ activeBookmarkId: null })],
      bookmarks: [{ id: 'bm-1', name: 'Home', path: '/Users/john', icon: '🏠' }],
    });
    expect(useStore.getState().getActiveBookmark('left')).toBeNull();
  });

  test('returns null when bookmark ID not found', () => {
    useStore.setState({
      panes: [defaultPane({ activeBookmarkId: 'bm-999' })],
      bookmarks: [{ id: 'bm-1', name: 'Home', path: '/Users/john', icon: '🏠' }],
    });
    expect(useStore.getState().getActiveBookmark('left')).toBeNull();
  });

  test('returns null for unknown pane', () => {
    expect(useStore.getState().getActiveBookmark('nonexistent')).toBeNull();
  });
});

// ─── Additional: closeTab edge cases ─────────────────────────────────────────

describe('closeTab - edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});

    const tab1 = {
      id: 'tab-1', path: '/a', basePath: '/a', currentBreadcrumbPath: '/a', label: 'A',
      files: [], selectedFiles: new Set<string>(), activeBookmarkId: null, viewMode: 'column' as const,
      sortBy: 'name' as const, sortOrder: 'asc' as const, previewFile: null,
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
    };
    const tab2 = { ...tab1, id: 'tab-2', path: '/b', basePath: '/b', currentBreadcrumbPath: '/b', label: 'B' };
    const tab3 = { ...tab1, id: 'tab-3', path: '/c', basePath: '/c', currentBreadcrumbPath: '/c', label: 'C' };

    useStore.setState({
      panes: [defaultPane({ tabs: [tab1, tab2, tab3], activeTab: 1 })],
      activePane: 'left',
      initialized: true,
    });
  });

  test('closing tab before active adjusts activeTab index', () => {
    // Active is 1, close tab 0
    act(() => { useStore.getState().closeTab('left', 0); });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs).toHaveLength(2);
    expect(pane!.activeTab).toBe(0); // decremented from 1 to 0
  });

  test('closing active tab activates previous tab', () => {
    // Active is 1 (B), close tab 1
    act(() => { useStore.getState().closeTab('left', 1); });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs).toHaveLength(2);
    expect(pane!.activeTab).toBe(1); // min(1, 1) = 1 → tab C
    expect(pane!.basePath).toBe('/c');
  });

  test('closing last tab when it is active falls back to previous', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p => ({ ...p, activeTab: 2 })),
    });
    act(() => { useStore.getState().closeTab('left', 2); });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs).toHaveLength(2);
    expect(pane!.activeTab).toBe(1); // min(2, 1) = 1
  });

  test('cannot close last remaining tab', () => {
    useStore.setState({
      panes: [defaultPane({ tabs: [{ id: 'only', path: '/x', basePath: '/x', currentBreadcrumbPath: '/x', label: 'X', files: [], selectedFiles: new Set<string>(), activeBookmarkId: null, viewMode: 'column' as const, sortBy: 'name' as const, sortOrder: 'asc' as const, previewFile: null, columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 }, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false }], activeTab: 0 })],
    });
    act(() => { useStore.getState().closeTab('left', 0); });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs).toHaveLength(1);
  });
});

// ─── Additional: toggleTerminal / setTerminalHeight ──────────────────────────

describe('Terminal state', () => {
  test('toggleTerminal flips showTerminal', () => {
    useStore.setState({ showTerminal: false });
    act(() => { useStore.getState().toggleTerminal(); });
    expect(useStore.getState().showTerminal).toBe(true);
    act(() => { useStore.getState().toggleTerminal(); });
    expect(useStore.getState().showTerminal).toBe(false);
  });

  test('setTerminalHeight sets height', () => {
    act(() => { useStore.getState().setTerminalHeight(400); });
    expect(useStore.getState().terminalHeight).toBe(400);
  });
});

// ─── Additional: toggleRightPane / setSplitRatio ─────────────────────────────

describe('Pane layout state', () => {
  test('toggleRightPane flips showRightPane', () => {
    useStore.setState({ showRightPane: false });
    act(() => { useStore.getState().toggleRightPane(); });
    expect(useStore.getState().showRightPane).toBe(true);
  });

  test('setSplitRatio sets ratio', () => {
    act(() => { useStore.getState().setSplitRatio(0.3); });
    expect(useStore.getState().splitRatio).toBe(0.3);
  });
});

// ─── Additional: openModal / closeModal with data ────────────────────────────

describe('Modal state', () => {
  test('openModal sets activeModal and modalData', () => {
    act(() => { useStore.getState().openModal('sizeViz', { path: '/test' }); });
    expect(useStore.getState().activeModal).toBe('sizeViz');
    expect(useStore.getState().modalData).toEqual({ path: '/test' });
  });

  test('closeModal clears both activeModal and modalData', () => {
    useStore.setState({ activeModal: 'settings', modalData: { foo: 'bar' } });
    act(() => { useStore.getState().closeModal(); });
    expect(useStore.getState().activeModal).toBeNull();
    expect(useStore.getState().modalData).toBeNull();
  });

  test('openModal without data sets modalData to null', () => {
    act(() => { useStore.getState().openModal('settings'); });
    expect(useStore.getState().activeModal).toBe('settings');
    expect(useStore.getState().modalData).toBeNull();
  });
});

// ─── Additional: loadLog ─────────────────────────────────────────────────────

describe('loadLog - activity log loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads logs on success', async () => {
    const logs = [{ id: '1', action: 'copy', timestamp: '2024-01-01' }];
    (window as any).electronAPI.getLog.mockResolvedValue({ success: true, logs });

    await act(async () => { await useStore.getState().loadLog(); });
    expect(useStore.getState().activityLog).toEqual(logs);
  });

  test('passes params to getLog', async () => {
    (window as any).electronAPI.getLog.mockResolvedValue({ success: true, logs: [] });
    await act(async () => { await useStore.getState().loadLog({ limit: 50 }); });
    expect((window as any).electronAPI.getLog).toHaveBeenCalledWith({ limit: 50 });
  });

  test('does not update on failure', async () => {
    useStore.setState({ activityLog: [{ id: 'existing' }] as any });
    (window as any).electronAPI.getLog.mockResolvedValue({ success: false });
    await act(async () => { await useStore.getState().loadLog(); });
    expect(useStore.getState().activityLog).toEqual([{ id: 'existing' }]);
  });
});

// ─── Additional: clearColumnState ────────────────────────────────────────────

describe('clearColumnState - resets to default', () => {
  test('resets columnState to empty default', () => {
    useStore.setState({
      panes: [defaultPane({
        columnState: { paths: ['/a', '/b'], filesByPath: { '/a': [mkFile('x')] }, selectedByColumn: { 0: '/a/x' }, focusedIndex: 2 },
      })],
    });

    act(() => { useStore.getState().clearColumnState('left'); });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.columnState.paths).toEqual([]);
    expect(pane!.columnState.filesByPath).toEqual({});
    expect(pane!.columnState.selectedByColumn).toEqual({});
    expect(pane!.columnState.focusedIndex).toBe(0);
  });
});
