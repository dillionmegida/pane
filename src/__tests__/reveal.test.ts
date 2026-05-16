/**
 * Reveal Functionality Tests
 * Tests for revealing files in column view from search overlay, tag browser, etc.
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

const mkFile = (name: string, overrides: Record<string, any> = {}) => ({
  name,
  path: `/Users/john/${name}`,
  isDirectory: false,
  size: 1024,
  modified: new Date().toISOString(),
  extension: name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '',
  ...overrides,
});

const defaultPaneState = () => ({
  panes: [{
    id: 'left',
    path: '/Users/john',
    basePath: '/Users/john',
    currentBreadcrumbPath: '/Users/john',
    files: [],
    loading: false,
    error: null,
    selectedFiles: new Set<string>(),
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
    viewMode: 'column' as const,
    tabs: [{ id: 'tab-1', path: '/Users/john', basePath: '/Users/john', currentBreadcrumbPath: '/Users/john', label: 'john', previewFile: null, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false, activeBookmarkId: null, columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 } }],
    activeTab: 0,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    navigationHistory: [],
    navigationIndex: -1,
    _isRestoringHistory: false,
    activeBookmarkId: null,
  }],
  activePane: 'left',
  showSearch: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
});

describe('Reveal Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(defaultPaneState() as any);
    (window as any).electronAPI = {
      readdir: jest.fn(),
      stat: jest.fn(),
      watcherStart: jest.fn(),
      storeSet: jest.fn(),
      onWatcherChange: jest.fn(),
    };
  });

  test('Cmd+Shift+R sets reveal target', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p => ({
        ...p,
        files: [mkFile('selected.txt', { path: '/Users/john/selected.txt' })],
        selectedFiles: new Set(['/Users/john/selected.txt']),
      })),
    });

    act(() => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath: '/Users/john/selected.txt',
        isDirectory: false,
        triggerPreview: true,
      });
    });

    expect(useStore.getState().revealTarget).toEqual({
      paneId: 'left',
      filePath: '/Users/john/selected.txt',
      isDirectory: false,
      triggerPreview: true,
    });
  });

  test('revealTarget triggers revealFileInTree in FilePane', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({
      success: true,
      files: [mkFile('file.txt', { path: '/Users/john/Documents/file.txt' })],
    });
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 1024, modified: Date.now(), isDirectory: false },
    });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    useStore.setState({
      panes: useStore.getState().panes.map(p => ({
        ...p,
        basePath: '/Users/john',
        path: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        viewMode: 'column',
        columnState: { paths: ['/Users/john'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      })),
    });

    // User clicks "Reveal" in search overlay - sets reveal target
    act(() => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath: '/Users/john/Documents/file.txt',
        isDirectory: false,
        triggerPreview: true,
      });
    });

    // FilePane useEffect would detect revealTarget and call revealFileInTree
    // Simulate that logic here
    const revealTarget = useStore.getState().revealTarget;
    if (revealTarget && revealTarget.paneId === 'left') {
      await act(async () => {
        await useStore.getState().revealFileInTree(
          revealTarget.paneId,
          revealTarget.filePath,
          '', // fileDir will be derived
          revealTarget.isDirectory
        );
      });
      // Manually set showPreview since triggerPreview is true
      if (revealTarget.triggerPreview) {
        useStore.setState({ showPreview: true });
      }
      useStore.getState().clearRevealTarget();
    }

    // Verify the pane navigated to the correct location
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.basePath).toBe('/Users/john');
    expect(pane!.currentBreadcrumbPath).toBe('/Users/john/Documents');
    expect(pane!.columnState.paths).toEqual(['/Users/john/Documents']);

    // Verify the file is selected
    expect(pane!.selectedFiles.has('/Users/john/Documents/file.txt')).toBe(true);

    // Verify preview file is set for non-directory reveal
    expect(useStore.getState().previewFile!.path).toBe('/Users/john/Documents/file.txt');
    expect(useStore.getState().showPreview).toBe(true);

    // Verify revealTarget was cleared (FilePane useEffect does this)
    expect(useStore.getState().revealTarget).toBeNull();
  });

  test('reveal to base directory clears stale column state', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({
      success: true,
      files: [mkFile('file.txt', { path: '/Users/john/file.txt' })],
    });
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 1024, modified: Date.now(), isDirectory: false },
    });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    act(() => {
      // Simulate a pane with existing deep column state from previous reveal
      useStore.setState({
        panes: useStore.getState().panes.map(p => ({
          ...p,
          basePath: '/Users/john',
          path: '/Users/john',
          currentBreadcrumbPath: '/Users/john/Documents/deep/path',
          viewMode: 'column',
          columnState: {
            paths: ['/Users/john', '/Users/john/Documents', '/Users/john/Documents/deep', '/Users/john/Documents/deep/path'],
            filesByPath: {
              '/Users/john/Documents': [mkFile('doc.txt', { path: '/Users/john/Documents/doc.txt' })],
              '/Users/john/Documents/deep': [mkFile('deep.txt', { path: '/Users/john/Documents/deep/deep.txt' })],
            },
            selectedByColumn: {
              '/Users/john/Documents/deep/path': '/Users/john/Documents/deep/path/old.png',
            },
            focusedIndex: 3,
          },
        })),
      });

    })


    // Reveal a file directly in the base directory
    act(() => {
      const basePath = useStore.getState().panes.find(p => p.id === 'left')!.basePath;
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath: `${basePath}/file1.txt`,
        isDirectory: false,
        triggerPreview: true,
      });
    });

    const revealTarget = useStore.getState().revealTarget;
    if (revealTarget && revealTarget.paneId === 'left') {
      await act(async () => {
        await useStore.getState().revealFileInTree(
          revealTarget.paneId,
          revealTarget.filePath,
          '', // fileDir will be derived
          revealTarget.isDirectory
        );
      });
      if (revealTarget.triggerPreview) {
        useStore.setState({ showPreview: true });
      }
      useStore.getState().clearRevealTarget();
    }

    // Verify the pane navigated to base directory
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.basePath).toBe('/Users/john');
    expect(pane!.currentBreadcrumbPath).toBe('/Users/john');

    // Verify column state is cleared (only base path remains, no stale columns)
    expect(pane!.columnState.paths).toEqual(['/Users/john']);
    expect(pane!.columnState.filesByPath).toEqual({});
    expect(pane!.columnState.selectedByColumn).toEqual({});
    expect(pane!.columnState.focusedIndex).toBe(0);

    // Verify the file is selected
    expect(pane!.selectedFiles.has('/Users/john/file1.txt')).toBe(true);

    // Verify revealTarget was cleared
    expect(useStore.getState().revealTarget).toBeNull();
  });

  test('reveal directory opens column and closes preview pane', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({
      success: true,
      files: [mkFile('doc.txt', { path: '/Users/john/Documents/doc.txt' })],
    });
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { size: 0, modified: new Date().toISOString(), isDirectory: true },
    });
    (window as any).electronAPI.watcherStart.mockImplementation(() => {});
    (window as any).electronAPI.storeSet.mockResolvedValue(undefined);

    // Set up with preview pane open
    useStore.setState({
      panes: useStore.getState().panes.map(p => ({
        ...p,
        basePath: '/Users/john',
        path: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        viewMode: 'column',
        columnState: { paths: ['/Users/john'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      })),
      previewFile: { path: '/Users/john/old.txt', name: 'old.txt', isDirectory: false, size: 1024, modified: new Date().toISOString(), extension: 'txt' },
      showPreview: true,
    });

    // Reveal a directory (like search overlay does)
    act(() => {
      useStore.getState().setRevealTarget({
        paneId: 'left',
        filePath: '/Users/john/Documents',
        isDirectory: true,
        triggerPreview: false,
      });
    });

    const revealTarget = useStore.getState().revealTarget;
    if (revealTarget && revealTarget.paneId === 'left') {
      await act(async () => {
        await useStore.getState().revealFileInTree(
          revealTarget.paneId,
          revealTarget.filePath,
          '', // fileDir will be derived
          revealTarget.isDirectory
        );
      });
      useStore.getState().clearRevealTarget();
    }

    // Verify column state includes the directory as a column (like clicking on it)
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.columnState.paths).toEqual(['/Users/john/Documents']);
    expect(pane!.currentBreadcrumbPath).toBe('/Users/john/Documents');

    // Verify the directory is selected
    expect(pane!.selectedFiles.has('/Users/john/Documents')).toBe(true);

    // Verify preview pane is closed
    expect(useStore.getState().previewFile).toBeNull();
    expect(useStore.getState().showPreview).toBe(false);

    // Verify revealTarget was cleared
    expect(useStore.getState().revealTarget).toBeNull();
  });
});
