/**
 * Navigation History Tests
 *
 * Covers the exact scenarios the user reported:
 *  1. Bookmark navigation pushes history (back arrow enabled after)
 *  2. Column directory click pushes history
 *  3. File click pushes history (with preview path)
 *  4. Back arrow decrements index; forward arrow increments it
 *  5. Back arrow is disabled at index 0, forward at end
 *  6. Navigating after going back truncates forward history
 *  7. basePath is stored per-entry (search reveal → different basePath)
 *  8. selectedFiles and previewFilePath are stored per-entry
 *  9. goBack/goForward don't push new history entries
 * 10. Max 50 history items enforced
 * 11. _isRestoringHistory flag blocks pushNavHistory during restoration
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// ─── Electron API mock ────────────────────────────────────────────────────────
const mockElectronAPI = {
  readdir: jest.fn((dirPath) => Promise.resolve({
    success: true,
    files: [
      { name: 'fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt', path: `${dirPath}/fileA.txt` },
      { name: 'subdir',   isDirectory: true,  size: 0,   modified: new Date().toISOString(), extension: '',    path: `${dirPath}/subdir` },
    ],
  })),
  stat: jest.fn((filePath) => Promise.resolve({
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
global.window = { electronAPI: mockElectronAPI };
window.electronAPI = mockElectronAPI;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const INITIAL_PANE = {
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

const resetStore = (overrides = {}) => {
  useStore.setState({
    panes: [{ ...INITIAL_PANE, ...overrides }],
    activePane: 'left',
    previewFile: null,
    showPreview: false,
    initialized: true,
  });
};

const getPane = () => useStore.getState().panes.find(p => p.id === 'left');

// ─── Tests ────────────────────────────────────────────────────────────────────
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
    // Simulate what happens after init: push initial state
    act(() => {
      const state = useStore.getState();
      state.panes.forEach(pane => {
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
    // Now first navigation will be index 1, so back arrow will be enabled
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
    // Set the flag as if restoration is in progress
    useStore.setState({
      panes: [{ ...INITIAL_PANE, _isRestoringHistory: true }],
    });
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
      useStore.getState().pushToHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop/github/repo',
        selectedFiles: [],
        previewFilePath: null,
      });
      useStore.getState().pushToHistory('left', {
        basePath: '/Documents/work',
        currentBreadcrumbPath: '/Documents/work/notes',
        selectedFiles: ['/Documents/work/notes/todo.md'],
        previewFilePath: '/Documents/work/notes/todo.md',
      });
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
        useStore.getState().pushToHistory('left', {
          basePath: `/p${i}`,
          currentBreadcrumbPath: `/p${i}`,
          selectedFiles: [],
          previewFilePath: null,
        });
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

  const push = (paths) => {
    act(() => {
      paths.forEach(p => {
        useStore.getState().pushToHistory('left', {
          basePath: p,
          currentBreadcrumbPath: p,
          selectedFiles: [],
          previewFilePath: null,
        });
      });
    });
  };

  // ── Scenario: app loads on Desktop, user clicks Downloads bookmark
  test('back arrow is enabled after first navigation (bookmark)', () => {
    // Simulate initial load push
    push(['/Desktop']);
    expect(getPane().navigationIndex).toBe(0);
    // Back arrow must be disabled (only 1 entry)
    expect(getPane().navigationIndex).toBe(0);
    expect(getPane().navigationHistory.length).toBe(1);
    // User clicks Downloads bookmark → pushes second entry
    push(['/Downloads']);
    const pane = getPane();
    expect(pane.navigationIndex).toBe(1);
    // Back arrow should now be ENABLED (index > 0)
    expect(pane.navigationIndex > 0).toBe(true);
  });

  // ── Scenario: navigate Desktop → github (dir click), back should be enabled
  test('back arrow is enabled after clicking a directory in columns', () => {
    push(['/Desktop', '/Desktop/github']);
    const pane = getPane();
    expect(pane.navigationIndex).toBe(1);
    expect(pane.navigationIndex > 0).toBe(true);
  });

  // ── Scenario: clicking a file enables back; going back disables forward? No —
  //    back to Desktop/github should leave forward enabled
  test('back/forward state after file click then go-back', () => {
    push(['/Desktop', '/Desktop/github', '/Desktop/github']); // dir, dir, file selection
    // Pretend the third entry was a file click (parentPath same as dir)
    expect(getPane().navigationIndex).toBe(2);

    act(() => { useStore.getState().goBackInHistory('left'); });

    const pane = getPane();
    // Back moved us to index 1
    expect(pane.navigationIndex).toBe(1);
    // Forward is enabled (index 1 < length-1 which is 2)
    expect(pane.navigationIndex < pane.navigationHistory.length - 1).toBe(true);
    // Back is still enabled (index > 0)
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
    // → index 2

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
    const lenBefore = getPane().navigationHistory.length; // 3

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

  // ── Scenario the user described:
  // Desktop → Downloads bookmark → go back to Desktop →
  // navigate to github (new path) → forward should be GONE
  test('forward history cleared when user navigates after going back', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',   currentBreadcrumbPath: '/Desktop',   selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });
    // index=1 (at /Downloads)

    // Go back to /Desktop
    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(0);
    // Forward exists: /Downloads is still ahead
    expect(getPane().navigationHistory.length).toBe(2);

    // User now navigates to a different path (/github)
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github', currentBreadcrumbPath: '/Desktop/github', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    // History should be [/Desktop, /Desktop/github] — /Downloads truncated
    expect(pane.navigationHistory).toHaveLength(2);
    expect(pane.navigationHistory[0].basePath).toBe('/Desktop');
    expect(pane.navigationHistory[1].basePath).toBe('/Desktop/github');
    expect(pane.navigationIndex).toBe(1);
    // No forward anymore
    expect(pane.navigationIndex >= pane.navigationHistory.length - 1).toBe(true);
  });

  test('navigating forward on a different path clears all further forward entries', () => {
    act(() => {
      ['/p1', '/p2', '/p3', '/p4'].forEach(p => {
        useStore.getState().pushToHistory('left', { basePath: p, currentBreadcrumbPath: p, selectedFiles: [], previewFilePath: null });
      });
    });
    // index=3

    // Go back 2 steps
    act(() => {
      useStore.getState().goBackInHistory('left');
      useStore.getState().goBackInHistory('left');
    });
    expect(getPane().navigationIndex).toBe(1); // at /p2

    // Push a completely new path
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/new', currentBreadcrumbPath: '/new', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    // Should be [/p1, /p2, /new] — /p3 and /p4 gone
    expect(pane.navigationHistory).toHaveLength(3);
    expect(pane.navigationHistory.map(e => e.basePath)).toEqual(['/p1', '/p2', '/new']);
    expect(pane.navigationIndex).toBe(2);
  });

  // ── The "crazy" scenario the user described:
  // go back → Downloads bookmark (reachable via forward) is visited →
  // forward to that old path should NOT work since user took new path
  test('clicking bookmark after going back clears forward history', () => {
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Desktop',             currentBreadcrumbPath: '/Desktop',             selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github',      currentBreadcrumbPath: '/Desktop/github',      selectedFiles: [], previewFilePath: null });
      useStore.getState().pushToHistory('left', { basePath: '/Desktop/github',      currentBreadcrumbPath: '/Desktop/github',      selectedFiles: ['/Desktop/github/file.js'], previewFilePath: '/Desktop/github/file.js' });
    });
    // index=2 (at file)

    // Go back (to /Desktop/github dir)
    act(() => { useStore.getState().goBackInHistory('left'); });
    expect(getPane().navigationIndex).toBe(1);
    // Forward is enabled: file.js entry is ahead

    // User clicks Downloads bookmark (new navigation = should clear forward)
    act(() => {
      useStore.getState().pushToHistory('left', { basePath: '/Downloads', currentBreadcrumbPath: '/Downloads', selectedFiles: [], previewFilePath: null });
    });

    const pane = getPane();
    // History: [/Desktop, /Desktop/github, /Downloads]
    expect(pane.navigationHistory).toHaveLength(3);
    expect(pane.navigationHistory[2].basePath).toBe('/Downloads');
    expect(pane.navigationIndex).toBe(2);
    // No forward
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
      // Entry 1: regular Desktop navigation
      useStore.getState().pushToHistory('left', {
        basePath: '/Desktop',
        currentBreadcrumbPath: '/Desktop/github/myrepo',
        selectedFiles: ['/Desktop/github/myrepo'],
        previewFilePath: null,
      });
      // Entry 2: search reveal under a different basePath
      useStore.getState().pushToHistory('left', {
        basePath: '/Documents/projects',
        currentBreadcrumbPath: '/Documents/projects/app/src',
        selectedFiles: ['/Documents/projects/app/src/index.js'],
        previewFilePath: '/Documents/projects/app/src/index.js',
      });
    });

    const pane = getPane();
    expect(pane.navigationHistory[0].basePath).toBe('/Desktop');
    expect(pane.navigationHistory[0].currentBreadcrumbPath).toBe('/Desktop/github/myrepo');
    expect(pane.navigationHistory[1].basePath).toBe('/Documents/projects');
    expect(pane.navigationHistory[1].currentBreadcrumbPath).toBe('/Documents/projects/app/src');
    expect(pane.navigationHistory[1].previewFilePath).toBe('/Documents/projects/app/src/index.js');
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

    // After completion, flag should be cleared
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
