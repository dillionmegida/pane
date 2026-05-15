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
        fileDir: '/Users/john',
        isDirectory: false,
        triggerPreview: true,
      });
    });

    expect(useStore.getState().revealTarget).toEqual({
      paneId: 'left',
      filePath: '/Users/john/selected.txt',
      fileDir: '/Users/john',
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
        fileDir: '/Users/john/Documents',
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
          revealTarget.fileDir,
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
});
