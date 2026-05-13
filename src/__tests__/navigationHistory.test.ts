import { act } from '@testing-library/react';
import { useStore } from '../store';

const mockElectronAPI = {
  readdir: jest.fn((dirPath: string) => Promise.resolve({
    success: true,
    files: [
      { name: 'fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt', path: `${dirPath}/fileA.txt` },
      { name: 'subdir',   isDirectory: true,  size: 0,   modified: new Date().toISOString(), extension: '',    path: `${dirPath}/subdir` },
    ],
  })),
  stat: jest.fn((_filePath: string) => Promise.resolve({
    success: true,
    stat: { isDirectory: false, size: 512, modified: new Date().toISOString() },
  })),
  watcherStart: jest.fn(),
  storeSet: jest.fn(),
  storeGet: jest.fn(() => Promise.resolve(null)),
  getHomeDir: jest.fn(() => Promise.resolve('/home')),
  saveBookmarks: jest.fn(),
  getBookmarks: jest.fn(() => Promise.resolve([])),
  getAllTags: jest.fn(() => Promise.resolve({ success: true, tags: [] })),
};
(global as any).window = { electronAPI: mockElectronAPI };
(window as any).electronAPI = mockElectronAPI;

const INITIAL_PANE: any = {
  id: 'left',
  path: '/Desktop',
  files: [],
  loading: false,
  error: null,
  selectedFiles: new Set(),
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'column',
  tabs: [{ id: 'tab-1', path: '/Desktop', basePath: '/Desktop', currentBreadcrumbPath: '/Desktop', label: 'Desktop', files: [], selectedFiles: new Set(), columnState: { paths: ['/Desktop'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 }, viewMode: 'column', sortBy: 'name', sortOrder: 'asc', activeBookmarkId: null }],
  activeTab: 0,
  currentBreadcrumbPath: '/Desktop',
  basePath: '/Desktop',
  columnState: { paths: ['/Desktop'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
  navigationHistory: [],
  navigationIndex: -1,
  _isRestoringHistory: false,
};

const resetStore = (overrides: Record<string, any> = {}): void => {
  useStore.setState({
    panes: [{ ...INITIAL_PANE, ...overrides }],
    activePane: 'left',
    previewFile: null,
    showPreview: false,
    initialized: true,
  } as any);
};

const getPane = (): any => useStore.getState().panes.find((p: any) => p.id === 'left');

describe('Navigation History – pushToHistory / pushNavHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('starts with empty history and index -1 (before init)', () => {
    const pane = getPane();
    expect(pane.navigationHistory).toEqual([]);
    expect(pane.navigationIndex).toBe(-1);
  });

  test('initial state is pushed to history after app loads (simulating init)', () => {
    act(() => {
      const state = useStore.getState();
      (state.panes as any[]).forEach(pane => {
        if (pane.navigationHistory.length === 0) {
          state.pushToHistory(pane.id, {
            basePath: pane.basePath,
            currentBreadcrumbPath: pane.currentBreadcrumbPath,
            selectedFiles: [...pane.selectedFiles],
            previewFilePath: null,
          });
        }
      });
    });

    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(1);
    expect(pane.navigationIndex).toBe(0);
    expect(pane.navigationHistory[0].basePath).toBe('/Desktop');
  });

  test('pushToHistory adds an entry and updates index', () => {
    act(() => {
      useStore.getState().pushToHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(1);
    expect(pane.navigationIndex).toBe(0);
  });

  test('pushNavHistory respects _isRestoringHistory flag and skips push', () => {
    useStore.setState({
      panes: [{ ...INITIAL_PANE, _isRestoringHistory: true }],
    } as any);
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    expect(getPane().navigationHistory).toHaveLength(0);
  });

  test('pushNavHistory adds entry when not restoring', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop/github',
        selectedFiles: ['/Desktop/github'],
        previewFilePath: null,
      });
    });
    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(1);
    expect(pane.navigationHistory[0].currentBreadcrumbPath).toBe('/Desktop/github');
  });

  test('stores selectedFiles and previewFilePath in each entry', () => {
    const selected = ['/Desktop/doc.pdf'];
    act(() => {
      useStore.getState().pushToHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop',
        selectedFiles: selected,
        previewFilePath: '/Desktop/doc.pdf',
      });
    });
    const entry = getPane().navigationHistory[0];
    expect(entry.selectedFiles).toEqual(selected);
    expect(entry.previewFilePath).toBe('/Desktop/doc.pdf');
  });

  test('stores different basePath for search-reveal navigations', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github/repo', selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Documents/work', currentBreadcrumbPath: '/Documents/work/notes', selectedFiles: ['/Documents/work/notes/todo.md'], previewFilePath: '/Documents/work/notes/todo.md' });
    });
    const { navigationHistory } = getPane();
    expect(navigationHistory[0].basePath).toBe('/Desktop');
    expect(navigationHistory[0].currentBreadcrumbPath).toBe('/Desktop/github/repo');
    expect(navigationHistory[1].basePath).toBe('/Documents/work');
    expect(navigationHistory[1].currentBreadcrumbPath).toBe('/Documents/work/notes');
  });

  test('caps history at 50 entries', () => {
    act(() => {
      for (let i = 0; i < 60; i++) {
        useStore.getState().pushToHistory('left', { basePath: `/p${i}`, currentBreadcrumbPath: `/p${i}`, selectedFiles: [], previewFilePath: null });
      }
    });
    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(50);
    expect(pane.navigationHistory[49].basePath).toBe('/p59');
    expect(pane.navigationIndex).toBe(49);
  });
});

describe('Navigation History – back / forward arrows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  const push = (paths: string[]): void => {
    act(() => {
      paths.forEach(p => {
        useStore.getState().pushToHistory('left', { basePath: p, currentBreadcrumbPath: p, selectedFiles: [], previewFilePath: null });
      });
    });
  };

  test('back arrow is enabled after first navigation (bookmark)', () => {
    push(['/Desktop']);
    expect(getPane().navigationIndex).toBe(0);
    expect(getPane().navigationHistory.length).toBe(1);
    push(['/Downloads']);
    const pane = getPane();
    expect(pane.navigationIndex).toBe(1);
    expect(pane.navigationIndex > 0).toBe(true);
  });

  test('back arrow is enabled after clicking a directory in columns', () => {
    push(['/Desktop', '/Desktop/github']);
    const pane = getPane();
    expect(pane.navigationIndex).toBe(1);
    expect(pane.navigationIndex > 0).toBe(true);
  });

  test('back/forward state after file click then go-back', () => {
    push(['/Desktop', '/Desktop/github', '/Desktop/github']);
    expect(getPane().navigationIndex).toBe(2);

    act(() => { useStore.getState().goBackInHistory('left'); });

    const pane = getPane();
    expect(pane.navigationIndex).toBe(1);
    expect(pane.navigationIndex < pane.navigationHistory.length - 1).toBe(true);
    expect(pane.navigationIndex > 0).toBe(true);
  });

  test('goBackInHistory decrements navigationIndex', () => {
    push(['/Desktop', '/Downloads', '/Documents']);
    expect(getPane().navigationIndex).toBe(2);

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);
  });

  test('goForwardInHistory increments navigationIndex', () => {
    push(['/Desktop', '/Downloads', '/Documents']);

    act(() => { useStore.getState().goBackInHistory('left'); });
    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);

    act(() => { useStore.getState().goForwardInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);

    act(() => { useStore.getState().goForwardInHistory('left'); });
    expect(getPane().navigationIndex).toBe(2);
  });

  test('goBackInHistory does nothing at index 0', () => {
    push(['/Desktop']);
    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);
  });

  test('goForwardInHistory does nothing at end', () => {
    push(['/Desktop', '/Downloads']);
    expect(getPane().navigationIndex).toBe(1);
    act(() => { useStore.getState().goForwardInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);
  });

  test('full back-forward-back sequence', () => {
    push(['/p1', '/p2', '/p3']);

    act(() => { useStore.getState().goBackInHistory('left'); });
    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);

    act(() => { useStore.getState().goForwardInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);
  });

  test('goBack/goForward do NOT push new history entries', () => {
    push(['/p1', '/p2', '/p3']);
    const lenBefore = getPane().navigationHistory.length;

    act(() => { useStore.getState().goBackInHistory('left'); });
    act(() => { useStore.getState().goForwardInHistory('left'); });
    act(() => { useStore.getState().goBackInHistory('left'); });

    expect(getPane().navigationHistory.length).toBe(lenBefore);
  });
});

describe('Navigation History – forward history truncation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('forward history cleared when user navigates after going back', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',   currentBreadcrumbPath: '/Desktop',   selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);
    expect(getPane().navigationHistory.length).toBe(2);

    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github', currentBreadcrumbPath: '/Desktop/github', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(2);
    expect(pane.navigationHistory[0].basePath).toBe('/Desktop');
    expect(pane.navigationHistory[1].basePath).toBe('/Desktop/github');
    expect(pane.navigationIndex).toBe(1);
    expect(pane.navigationIndex >= pane.navigationHistory.length - 1).toBe(true);
  });

  test('navigating forward on a different path clears all further forward entries', () => {
    act(() => {
      ['/p1', '/p2', '/p3', '/p4'].forEach(p => {
        useStore.getState().pushToHistory('left', { basePath: p, currentBreadcrumbPath: p, selectedFiles: [], previewFilePath: null });
      });
    });

    act(() => {
      useStore.getState().goBackInHistory('left');
      useStore.getState().goBackInHistory('left');
    });
    expect(getPane().navigationIndex).toBe(1);

    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/new', currentBreadcrumbPath: '/new', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(3);
    expect(pane.navigationHistory.map((e: any) => e.basePath)).toEqual(['/p1', '/p2', '/new']);
    expect(pane.navigationIndex).toBe(2);
  });

  test('clicking bookmark after going back clears forward history', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',        currentBreadcrumbPath: '/Desktop',        selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github', currentBreadcrumbPath: '/Desktop/github', selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github/file.js'], previewFilePath: '/Desktop/github/file.js' });
    });

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);

    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    expect(pane.navigationHistory).toHaveLength(3);
    expect(pane.navigationHistory[2].basePath).toBe('/Downloads');
    expect(pane.navigationIndex).toBe(2);
    expect(pane.navigationIndex >= pane.navigationHistory.length - 1).toBe(true);
  });
});

describe('Navigation History – column state & basePath restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('each entry records the correct basePath independently', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github/myrepo', selectedFiles: ['/Desktop/github/myrepo'], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Documents/projects', currentBreadcrumbPath: '/Documents/projects/app/src', selectedFiles: ['/Documents/projects/app/src/index.js'], previewFilePath: '/Documents/projects/app/src/index.js' });
    });

    const pane = getPane();
    expect(pane.navigationHistory[0].basePath).toBe('/Desktop');
    expect(pane.navigationHistory[0].currentBreadcrumbPath).toBe('/Desktop/github/myrepo');
    expect(pane.navigationHistory[1].basePath).toBe('/Documents/projects');
    expect(pane.navigationHistory[1].currentBreadcrumbPath).toBe('/Documents/projects/app/src');
    expect(pane.navigationHistory[1].previewFilePath).toBe('/Documents/projects/app/src/index.js');
  });
});

describe('Navigation History – per-tab isolation', () => {
  const makeTabWithHistory = (tabPath: string, historyPaths: string[]): any => {
    const history = historyPaths.map(p => ({ basePath: p, currentBreadcrumbPath: p, selectedFiles: [], previewFilePath: null }));
    return {
      id: `tab-${tabPath.replace(/\//g, '-')}`,
      path: tabPath,
      basePath: tabPath,
      currentBreadcrumbPath: tabPath,
      label: tabPath.split('/').pop() || '/',
      files: [],
      selectedFiles: new Set(),
      activeBookmarkId: null,
      viewMode: 'column',
      sortBy: 'name',
      sortOrder: 'asc',
      columnState: { paths: [tabPath], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      previewFile: null,
      navigationHistory: history,
      navigationIndex: history.length - 1,
      _isRestoringHistory: false,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('each tab carries its own independent navigation history', () => {
    const tab1 = makeTabWithHistory('/Desktop', ['/Desktop', '/Desktop/github', '/Desktop/github/repo']);
    const tab2 = makeTabWithHistory('/Downloads', ['/Downloads', '/Downloads/movies']);

    useStore.setState({
      panes: [{
        ...INITIAL_PANE,
        tabs: [tab1, tab2],
        activeTab: 0,
        navigationHistory: tab1.navigationHistory,
        navigationIndex: tab1.navigationIndex,
        _isRestoringHistory: false,
        basePath: tab1.basePath,
        currentBreadcrumbPath: tab1.currentBreadcrumbPath,
      }],
      activePane: 'left',
      previewFile: null,
      showPreview: false,
      initialized: true,
    } as any);

    expect(getPane().navigationHistory).toHaveLength(3);
    expect(getPane().navigationIndex).toBe(2);

    act(() => { useStore.getState().switchTab('left', 1); });

    const paneAfterSwitch = getPane();
    expect(paneAfterSwitch.navigationHistory).toHaveLength(2);
    expect(paneAfterSwitch.navigationIndex).toBe(1);
    expect(paneAfterSwitch.navigationHistory[0].basePath).toBe('/Downloads');
    expect(paneAfterSwitch.navigationHistory[1].basePath).toBe('/Downloads/movies');

    const hasTab1Entry = paneAfterSwitch.navigationHistory.some((e: any) => e.basePath.startsWith('/Desktop'));
    expect(hasTab1Entry).toBe(false);
  });

  test('navigating in one tab does not affect another tab\'s history', () => {
    const tab1 = makeTabWithHistory('/Desktop', ['/Desktop']);
    const tab2 = makeTabWithHistory('/Downloads', ['/Downloads']);

    useStore.setState({
      panes: [{
        ...INITIAL_PANE,
        tabs: [tab1, tab2],
        activeTab: 0,
        navigationHistory: tab1.navigationHistory,
        navigationIndex: tab1.navigationIndex,
        _isRestoringHistory: false,
        basePath: tab1.basePath,
        currentBreadcrumbPath: tab1.currentBreadcrumbPath,
      }],
      activePane: 'left',
      previewFile: null,
      showPreview: false,
      initialized: true,
    } as any);

    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github/repo', selectedFiles: [], previewFilePath: null });
    });
    expect(getPane().navigationHistory).toHaveLength(3);

    act(() => { useStore.getState().switchTab('left', 1); });
    expect(getPane().navigationHistory).toHaveLength(1);
    expect(getPane().navigationHistory[0].basePath).toBe('/Downloads');

    act(() => { useStore.getState().switchTab('left', 0); });
    expect(getPane().navigationHistory).toHaveLength(3);
    expect(getPane().navigationHistory[2].currentBreadcrumbPath).toBe('/Desktop/github/repo');
  });

  test('going back in tab 1 does not alter tab 2 history', () => {
    const tab1 = makeTabWithHistory('/Desktop', ['/Desktop', '/Desktop/a', '/Desktop/b']);
    const tab2 = makeTabWithHistory('/Downloads', ['/Downloads', '/Downloads/x']);

    useStore.setState({
      panes: [{
        ...INITIAL_PANE,
        tabs: [tab1, tab2],
        activeTab: 0,
        navigationHistory: tab1.navigationHistory,
        navigationIndex: tab1.navigationIndex,
        _isRestoringHistory: false,
        basePath: tab1.basePath,
        currentBreadcrumbPath: tab1.currentBreadcrumbPath,
      }],
      activePane: 'left',
      previewFile: null,
      showPreview: false,
      initialized: true,
    } as any);

    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);

    act(() => { useStore.getState().switchTab('left', 1); });
    expect(getPane().navigationHistory).toHaveLength(2);
    expect(getPane().navigationIndex).toBe(1);

    act(() => { useStore.getState().switchTab('left', 0); });
    expect(getPane().navigationIndex).toBe(1);
    expect(getPane().navigationHistory).toHaveLength(3);
  });
});

describe('Navigation History – _isRestoringHistory flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('goBackInHistory sets _isRestoringHistory to true then clears it', async () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',   currentBreadcrumbPath: '/Desktop',   selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });

    await act(async () => {
      await useStore.getState().goBackInHistory('left');
    });

    expect(getPane()._isRestoringHistory).toBe(false);
    expect(getPane().navigationIndex).toBe(0);
  });

  test('goForwardInHistory sets _isRestoringHistory to true then clears it', async () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',   currentBreadcrumbPath: '/Desktop',   selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });

    act(() => { useStore.getState().goBackInHistory('left'); });

    await act(async () => {
      await useStore.getState().goForwardInHistory('left');
    });

    expect(getPane()._isRestoringHistory).toBe(false);
    expect(getPane().navigationIndex).toBe(1);
  });
});

describe('Navigation History – no-op when clicking already-active item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  test('clicking the already-active directory does not push a new history entry', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github'], previewFilePath: null });
    });
    expect(getPane().navigationHistory).toHaveLength(1);
    expect(getPane().navigationIndex).toBe(0);

    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github'], previewFilePath: null });
    });

    expect(getPane().navigationHistory).toHaveLength(1);
    expect(getPane().navigationIndex).toBe(0);
  });

  test('clicking the already-active file does not push a new history entry', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github/index.js'], previewFilePath: '/Desktop/github/index.js' });
    });
    expect(getPane().navigationHistory).toHaveLength(1);

    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github/index.js'], previewFilePath: '/Desktop/github/index.js' });
    });

    expect(getPane().navigationHistory).toHaveLength(1);
    expect(getPane().navigationIndex).toBe(0);
  });

  test('clicking a different directory after the active one does push a new entry', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github'], previewFilePath: null });
    });

    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/projects', selectedFiles: ['/Desktop/projects'], previewFilePath: null });
    });

    expect(getPane().navigationHistory).toHaveLength(2);
    expect(getPane().navigationIndex).toBe(1);
    expect(getPane().navigationHistory[1].currentBreadcrumbPath).toBe('/Desktop/projects');
  });

  test('clicking the same directory with different selectedFiles does push a new entry', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github/a.js'], previewFilePath: '/Desktop/github/a.js' });
    });

    act(() => {
      useStore.getState().pushNavHistory('left', { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github/b.js'], previewFilePath: '/Desktop/github/b.js' });
    });

    expect(getPane().navigationHistory).toHaveLength(2);
    expect(getPane().navigationIndex).toBe(1);
  });

  test('repeated clicks on the active directory accumulate no extra entries', () => {
    const entry = { basePath: '/Desktop', currentBreadcrumbPath: '/Desktop/github', selectedFiles: ['/Desktop/github'], previewFilePath: null };

    act(() => {
      for (let i = 0; i < 5; i++) {
        useStore.getState().pushNavHistory('left', entry);
      }
    });

    expect(getPane().navigationHistory).toHaveLength(1);
    expect(getPane().navigationIndex).toBe(0);
  });
});
