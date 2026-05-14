import { create } from 'zustand';
import path from 'path-browserify';
import { sortFiles, DEFAULT_SORT } from '../helpers/sort';
import type {
  FileItem, Pane, Tab, ColumnState, HistoryEntry,
  Bookmark, RevealTarget, LogEntry, Tag,
  ViewMode, SortBy, SortOrder, Breadcrumb,
} from '../types';

// ─── Helper ───────────────────────────────────────────────────────────────────
const DEFAULT_COLUMN_STATE: ColumnState = {
  paths: [],
  filesByPath: {},
  selectedByColumn: {},
  focusedIndex: 0,
};

const getTabLabel = (breadcrumb: string | undefined, previewFile: FileItem | null, basePath: string): string => {
  const labelPath = breadcrumb || (previewFile?.path ? previewFile.path.substring(0, previewFile.path.lastIndexOf('/')) : null) || basePath;
  return labelPath === '/' ? '/' : labelPath.split('/').pop() ?? labelPath;
};

const createTabState = (tabPath: string): Tab => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  path: tabPath,
  basePath: tabPath,
  currentBreadcrumbPath: tabPath,
  label: getTabLabel(tabPath, null, tabPath),
  files: [],
  selectedFiles: new Set(),
  activeBookmarkId: null,
  viewMode: 'column',
  sortBy: 'name',
  sortOrder: 'asc',
  columnState: { ...DEFAULT_COLUMN_STATE },
  previewFile: null,
  navigationHistory: [],
  navigationIndex: -1,
  _isRestoringHistory: false,
});

// Snapshot the current pane-level state into a tab object
const snapshotTab = (pane: Pane, globalPreviewFile: FileItem | null): Tab => {
  const base = pane.basePath || pane.path || '/';
  const existingTab = pane.tabs[pane.activeTab];
  return {
    id: existingTab?.id || `tab-${Date.now()}`,
    path: pane.path || '/',
    basePath: base,
    currentBreadcrumbPath: pane.currentBreadcrumbPath || base,
    label: getTabLabel(pane.currentBreadcrumbPath, globalPreviewFile, base),
    files: pane.files || [],
    selectedFiles: new Set(pane.selectedFiles || []),
    activeBookmarkId: pane.activeBookmarkId || null,
    viewMode: pane.viewMode || 'column',
    sortBy: pane.sortBy || 'name',
    sortOrder: pane.sortOrder || 'asc',
    columnState: pane.columnState ? { ...pane.columnState } : { ...DEFAULT_COLUMN_STATE },
    previewFile: globalPreviewFile || null,
    navigationHistory: pane.navigationHistory || existingTab?.navigationHistory || [],
    navigationIndex: pane.navigationIndex ?? existingTab?.navigationIndex ?? -1,
    _isRestoringHistory: pane._isRestoringHistory ?? existingTab?._isRestoringHistory ?? false,
  };
};

// Restore pane-level state from a tab object
const restoreFromTab = (tab: Tab): Partial<Pane> => ({
  path: tab.path,
  basePath: tab.basePath,
  currentBreadcrumbPath: tab.currentBreadcrumbPath,
  files: tab.files || [],
  selectedFiles: new Set(tab.selectedFiles || []),
  activeBookmarkId: tab.activeBookmarkId || null,
  viewMode: tab.viewMode || 'column',
  sortBy: tab.sortBy || 'name',
  sortOrder: tab.sortOrder || 'asc',
  columnState: tab.columnState || { ...DEFAULT_COLUMN_STATE },
  navigationHistory: tab.navigationHistory || [],
  navigationIndex: tab.navigationIndex ?? -1,
  _isRestoringHistory: false,
});

const createPane = (id: string, initialPath = '/'): Pane => {
  const firstTab = createTabState(initialPath);
  return {
    id,
    path: initialPath,
    files: [],
    loading: false,
    error: null,
    selectedFiles: new Set(),
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'column',
    tabs: [firstTab],
    activeTab: 0,
    currentBreadcrumbPath: initialPath,
    basePath: initialPath,
    activeBookmarkId: null,
    columnState: { ...DEFAULT_COLUMN_STATE },
    navigationHistory: [],
    navigationIndex: -1,
    _isRestoringHistory: false,
  };
};

// ─── Store State Type ─────────────────────────────────────────────────────────

interface NavigateOptions {
  skipHistory?: boolean;
}

interface StoreState {
  // ── Panes ──────────────────────────────────────────────────────────────────
  panes: Pane[];
  activePane: string;
  splitRatio: number;
  showRightPane: boolean;
  homeDir: string;

  setActivePane: (paneId: string) => void;
  setSplitRatio: (ratio: number) => void;
  toggleRightPane: () => void;

  updatePane: (paneId: string, updates: Partial<Pane>) => void;

  navigateTo: (paneId: string, dirPath: string, options?: NavigateOptions) => Promise<void>;
  navigateToReveal: (paneId: string, dirPath: string, revealBasePath: string, revealBreadcrumb: string) => Promise<void>;
  navigateToBookmark: (paneId: string, dirPath: string, bookmarkId: string, options?: NavigateOptions) => Promise<void>;

  setSelection: (paneId: string, files: string[]) => void;
  toggleSelection: (paneId: string, filePath: string, multi?: boolean) => void;

  // ── Directory-specific sorts ───────────────────────────────────────────────
  directorySorts: Record<string, SortBy>;
  getDirSort: (dirPath: string) => SortBy;
  setDirectorySort: (dirPath: string, sortBy: SortBy) => Promise<void>;

  setSortBy: (paneId: string, sortBy: SortBy, sortOrder?: SortOrder) => void;
  setCurrentBreadcrumbPath: (paneId: string, path: string) => void;
  pushNavHistory: (paneId: string, entry: HistoryEntry) => void;
  setViewMode: (paneId: string, viewMode: ViewMode) => void;

  // ── Column View State ──────────────────────────────────────────────────────
  setColumnState: (paneId: string, columnState: ColumnState) => void;
  updateColumnState: (paneId: string, updates: Partial<ColumnState>) => void;
  clearColumnState: (paneId: string) => void;

  // ── Navigation History ─────────────────────────────────────────────────────
  pushToHistory: (paneId: string, entry: HistoryEntry) => void;
  goBackInHistory: (paneId: string) => Promise<void>;
  goForwardInHistory: (paneId: string) => Promise<void>;
  _applyHistoryEntry: (paneId: string, historyEntry: HistoryEntry) => Promise<void>;

  // ── Pane Refresh ───────────────────────────────────────────────────────────
  refreshPane: (paneId: string) => Promise<void>;
  toggleHiddenFiles: () => Promise<void>;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  addTab: (paneId: string, tabPath?: string) => void;
  closeTab: (paneId: string, tabIndex: number) => void;
  switchTab: (paneId: string, tabIndex: number) => void;

  // ── File Navigation ────────────────────────────────────────────────────────
  navigateToFile: (paneId: string, filePath: string) => Promise<void>;
  revealInTree: (paneId: string, filePath: string) => Promise<void>;

  // ── Preview ───────────────────────────────────────────────────────────────
  previewFile: FileItem | null;
  showPreview: boolean;
  previewWidth: number;
  setPreviewFile: (file: FileItem | null) => void;
  closePreview: () => void;
  setPreviewWidth: (w: number) => void;

  // ── Zoom ──────────────────────────────────────────────────────────────────
  zoom: number;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;

  // ── Theme ─────────────────────────────────────────────────────────────────
  currentTheme: string;
  setTheme: (themeName: string) => void;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
  loadBookmarks: () => Promise<void>;

  // ── Clipboard Queue ───────────────────────────────────────────────────────
  clipboardQueue: string[];
  clipboardMode: 'copy' | 'cut';
  addToClipboard: (files: string[], mode?: 'copy' | 'cut') => void;
  clearClipboard: () => void;
  removeFromClipboard: (filePath: string) => void;
  pasteClipboard: (destDir: string) => Promise<string[]>;

  // ── Tags ──────────────────────────────────────────────────────────────────
  allTags: Tag[];
  loadAllTags: () => Promise<void>;

  // ── Column View Reveal ─────────────────────────────────────────────────────
  revealTarget: RevealTarget | null;
  setRevealTarget: (target: RevealTarget) => void;
  clearRevealTarget: () => void;
  revealFileInTree: (paneId: string, filePath: string, fileDir: string, isDirectory?: boolean) => Promise<void>;

  // ── UI State ──────────────────────────────────────────────────────────────
  activeModal: string | null;
  modalData: unknown;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;

  showTerminal: boolean;
  terminalHeight: number;
  toggleTerminal: () => void;
  setTerminalHeight: (h: number) => void;

  showSidebar: boolean;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  toggleSidebar: () => void;

  showSearch: boolean;
  searchQuery: string;
  searchResults: FileItem[];
  searchLoading: boolean;
  searchInitContentMode: boolean;
  toggleSearch: (opts?: { contentMode?: boolean }) => void;

  showHidden: boolean;

  searchFiles: (query: string, opts?: Record<string, unknown>) => Promise<void>;

  // ── Smart Folders ──────────────────────────────────────────────────────────
  smartFolders: Array<{ id: string; name: string; icon: string; filter: (f: FileItem) => boolean }>;
  customSmartFolders: unknown[];

  // ── Activity Log ───────────────────────────────────────────────────────────
  activityLog: LogEntry[];
  loadLog: (params?: Record<string, unknown>) => Promise<void>;

  // ── Selectors ──────────────────────────────────────────────────────────────
  getActivePath: (paneId: string) => string;
  getBreadcrumbs: (paneId: string) => Breadcrumb[];
  getColumnPaths: (paneId: string) => string[];
  getActiveBookmark: (paneId: string) => Bookmark | null;
  readDirSorted: (dirPath: string, paneId: string) => Promise<{ success: boolean; files: FileItem[] }>;

  // ── Session ────────────────────────────────────────────────────────────────
  saveSession: () => void;
  initialized: boolean;
  init: () => Promise<void>;
}

// ─── Session types (used in init) ───────────────────────────────────────────
interface SessionTab {
  id: string;
  path: string;
  basePath?: string;
  currentBreadcrumbPath?: string;
  label?: string;
  activeBookmarkId?: string | null;
  viewMode?: ViewMode;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  selectedFiles?: string[];
  columnState?: ColumnState;
  previewFilePath?: string | null;
}

interface SessionPane {
  id: string;
  path: string;
  basePath?: string;
  currentBreadcrumbPath?: string;
  selectedFiles?: string[];
  viewMode?: ViewMode;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  activeTab?: number;
  tabs?: SessionTab[];
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create<StoreState>((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  panes: [createPane('left'), createPane('right')],
  activePane: 'left',
  splitRatio: 0.5,
  showRightPane: false,
  homeDir: '/',

  setActivePane: (paneId) => set({ activePane: paneId }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleRightPane: () => set(s => ({ showRightPane: !s.showRightPane })),

  updatePane: (paneId, updates) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, ...updates } : p),
  })),

  navigateTo: async (paneId, dirPath, { skipHistory = false } = {}) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, loading: true, error: null, currentBreadcrumbPath: dirPath, basePath: dirPath, activeBookmarkId: null } : p),
    }));

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error ?? null } : p),
      }));
      return;
    }

    const dirSort = get().getDirSort(dirPath);
    const files = sortFiles(result.files, dirSort, 'asc');

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId)!;
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set<string>() };
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, s.previewFile) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
      };
    });

    if (!skipHistory) {
      get().pushToHistory(paneId, {
        basePath: dirPath,
        currentBreadcrumbPath: dirPath,
        selectedFiles: [],
        previewFilePath: null,
      });
    }

    window.electronAPI.watcherStart(dirPath);
    get().saveSession();
  },

  navigateToReveal: async (paneId, dirPath, revealBasePath, revealBreadcrumb) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? {
        ...p,
        loading: true,
        error: null,
        currentBreadcrumbPath: revealBreadcrumb,
        basePath: revealBasePath,
        activeBookmarkId: null,
      } : p),
    }));

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error ?? null } : p),
      }));
      return;
    }

    const revealDirSort = get().getDirSort(dirPath);
    const files = sortFiles(result.files, revealDirSort, 'asc');

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId)!;
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set<string>() };
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, s.previewFile) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
      };
    });

    window.electronAPI.watcherStart(dirPath);
    get().saveSession();
  },

  navigateToBookmark: async (paneId, dirPath, bookmarkId, { skipHistory = false } = {}) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? {
        ...p,
        loading: true,
        error: null,
        currentBreadcrumbPath: dirPath,
        basePath: dirPath,
        activeBookmarkId: bookmarkId,
      } : p),
      previewFile: null,
      showPreview: false,
    }));

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error ?? null } : p),
      }));
      return;
    }

    const bmDirSort = get().getDirSort(dirPath);
    const files = sortFiles(result.files, bmDirSort, 'asc');

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId)!;
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set<string>() };
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, null) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
      };
    });

    if (!skipHistory) {
      get().pushToHistory(paneId, {
        basePath: dirPath,
        currentBreadcrumbPath: dirPath,
        selectedFiles: [],
        previewFilePath: null,
      });
    }

    window.electronAPI.watcherStart(dirPath);
    get().saveSession();
  },

  setSelection: (paneId, files) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, selectedFiles: new Set(files) } : p),
  })),

  toggleSelection: (paneId, filePath, multi = false) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const sel = new Set(p.selectedFiles);
      if (multi) {
        if (sel.has(filePath)) sel.delete(filePath);
        else sel.add(filePath);
      } else {
        if (sel.has(filePath) && sel.size === 1) sel.clear();
        else { sel.clear(); sel.add(filePath); }
      }
      return { ...p, selectedFiles: sel };
    }),
  })),

  // ── Directory-specific sorts ─────────────────────────────────────────────
  directorySorts: {},

  getDirSort: (dirPath) => {
    const { directorySorts } = get();
    return directorySorts[dirPath] || DEFAULT_SORT;
  },

  setDirectorySort: async (dirPath, sortBy) => {
    set(s => ({ directorySorts: { ...s.directorySorts, [dirPath]: sortBy } }));

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) return;
    const sorted = sortFiles(result.files, sortBy, 'asc');

    set(s => ({
      panes: s.panes.map(p => {
        let updated = { ...p };
        if (p.path === dirPath) {
          updated = { ...updated, files: sorted };
        }
        if (updated.columnState?.filesByPath?.[dirPath]) {
          updated = {
            ...updated,
            columnState: {
              ...updated.columnState,
              filesByPath: {
                ...updated.columnState.filesByPath,
                [dirPath]: sorted,
              },
            },
          };
        }
        const newTabs = updated.tabs.map((t, i) => {
          if (i !== updated.activeTab) return t;
          let updatedTab = { ...t };
          if (updatedTab.columnState?.filesByPath?.[dirPath]) {
            updatedTab = {
              ...updatedTab,
              columnState: {
                ...updatedTab.columnState,
                filesByPath: {
                  ...updatedTab.columnState.filesByPath,
                  [dirPath]: sorted,
                },
              },
            };
          }
          if (updatedTab.path === dirPath) {
            updatedTab = { ...updatedTab, files: sorted };
          }
          return updatedTab;
        });
        const allTabs = updated.tabs.map((t, i) => {
          if (i === updated.activeTab) return newTabs[i];
          let updatedTab = { ...t };
          if (updatedTab.columnState?.filesByPath?.[dirPath]) {
            updatedTab = {
              ...updatedTab,
              columnState: {
                ...updatedTab.columnState,
                filesByPath: {
                  ...updatedTab.columnState.filesByPath,
                  [dirPath]: sorted,
                },
              },
            };
          }
          if (updatedTab.path === dirPath) {
            updatedTab = { ...updatedTab, files: sorted };
          }
          return updatedTab;
        });
        return { ...updated, tabs: allTabs };
      }),
    }));
    get().saveSession();
  },

  setSortBy: (paneId, sortBy, sortOrder) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const files = sortFiles(p.files, sortBy, sortOrder || p.sortOrder);
      return { ...p, sortBy, sortOrder: sortOrder || p.sortOrder, files };
    }),
  })),

  setCurrentBreadcrumbPath: (paneId, path) => {
    set(s => ({
      panes: s.panes.map(p => {
        if (p.id !== paneId) return p;
        const updated = { ...p, currentBreadcrumbPath: path };
        const newTabs = p.tabs.map((t, i) =>
          i === p.activeTab ? snapshotTab(updated, s.previewFile) : t
        );
        return { ...updated, tabs: newTabs };
      }),
    }));
    get().saveSession();
  },

  pushNavHistory: (paneId, entry) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane || pane._isRestoringHistory) return;

    const currentIndex = pane.navigationIndex ?? -1;
    if (currentIndex >= 0 && pane.navigationHistory && pane.navigationHistory[currentIndex]) {
      const current = pane.navigationHistory[currentIndex];
      const sameBase = current.basePath === entry.basePath;
      const sameCrumb = current.currentBreadcrumbPath === entry.currentBreadcrumbPath;
      const samePreview = (current.previewFilePath ?? null) === (entry.previewFilePath ?? null);
      const currentSel = [...(current.selectedFiles || [])].sort().join('\0');
      const newSel = [...(entry.selectedFiles || [])].sort().join('\0');
      const sameSel = currentSel === newSel;
      if (sameBase && sameCrumb && samePreview && sameSel) return;
    }

    get().pushToHistory(paneId, entry);
  },

  setViewMode: (paneId, viewMode) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const updated = { ...p, viewMode };
      const newTabs = p.tabs.map((t, i) =>
        i === p.activeTab ? snapshotTab(updated, s.previewFile) : t
      );
      return { ...updated, tabs: newTabs };
    }),
  })),

  // ── Column View State ─────────────────────────────────────────────────────
  setColumnState: (paneId, columnState) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const updated = { ...p, columnState };
      const newTabs = p.tabs.map((t, i) =>
        i === p.activeTab ? snapshotTab(updated, s.previewFile) : t
      );
      return { ...updated, tabs: newTabs };
    }),
  })),

  updateColumnState: (paneId, updates) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const updated = { ...p, columnState: { ...p.columnState, ...updates } };
      const newTabs = p.tabs.map((t, i) =>
        i === p.activeTab ? snapshotTab(updated, s.previewFile) : t
      );
      return { ...updated, tabs: newTabs };
    }),
  })),

  clearColumnState: (paneId) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;
      const updated = { ...p, columnState: { ...DEFAULT_COLUMN_STATE } };
      const newTabs = p.tabs.map((t, i) =>
        i === p.activeTab ? snapshotTab(updated, s.previewFile) : t
      );
      return { ...updated, tabs: newTabs };
    }),
  })),

  // ── Navigation History ────────────────────────────────────────────────────
  pushToHistory: (paneId, entry) => set(s => ({
    panes: s.panes.map(p => {
      if (p.id !== paneId) return p;

      const currentHistory = p.navigationHistory || [];
      const currentIndex = p.navigationIndex ?? -1;

      const newHistory = currentIndex < currentHistory.length - 1
        ? currentHistory.slice(0, currentIndex + 1)
        : [...currentHistory];

      newHistory.push(entry);

      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        ...p,
        navigationHistory: newHistory,
        navigationIndex: newHistory.length - 1,
      };
    }),
  })),

  goBackInHistory: async (paneId) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane || (pane.navigationHistory || []).length === 0) return;
    const currentIndex = pane.navigationIndex ?? -1;
    if (currentIndex <= 0) return;

    const targetIndex = currentIndex - 1;
    const historyEntry = pane.navigationHistory[targetIndex];

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, navigationIndex: targetIndex, _isRestoringHistory: true }
        : p),
    }));

    await get()._applyHistoryEntry(paneId, historyEntry);

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, _isRestoringHistory: false } : p),
    }));
  },

  goForwardInHistory: async (paneId) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane) return;
    const history = pane.navigationHistory || [];
    const currentIndex = pane.navigationIndex ?? -1;
    if (currentIndex >= history.length - 1) return;

    const targetIndex = currentIndex + 1;
    const historyEntry = history[targetIndex];

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, navigationIndex: targetIndex, _isRestoringHistory: true }
        : p),
    }));

    await get()._applyHistoryEntry(paneId, historyEntry);

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, _isRestoringHistory: false } : p),
    }));
  },

  _applyHistoryEntry: async (paneId, historyEntry) => {
    const { basePath, currentBreadcrumbPath, selectedFiles, previewFilePath, selectedByColumn } = historyEntry;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? {
        ...p,
        error: null,
        basePath,
        currentBreadcrumbPath,
      } : p),
    }));

    const result = await window.electronAPI.readdir(basePath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, error: result.error ?? null } : p),
      }));
      return;
    }

    const histDirSort = get().getDirSort(basePath);
    const files = sortFiles(result.files, histDirSort, 'asc');

    // columnPaths holds child paths only (base column is rendered separately)
    const columnPaths: string[] = [];
    const filesByPath: Record<string, FileItem[]> = {};

    if (currentBreadcrumbPath && currentBreadcrumbPath !== basePath && currentBreadcrumbPath.startsWith(basePath)) {
      const fullParts = currentBreadcrumbPath.split('/');
      let current = '';
      for (let i = 0; i < fullParts.length; i++) {
        current += (i === 0 ? '' : '/') + fullParts[i];
        if (current.length > basePath.length && current.startsWith(basePath + '/')) {
          columnPaths.push(current);
        }
      }

      for (const colPath of columnPaths) {
        const colResult = await window.electronAPI.readdir(colPath);
        if (colResult.success) {
          const colDirSort = get().getDirSort(colPath);
          filesByPath[colPath] = sortFiles(colResult.files, colDirSort, 'asc');
        }
      }
    }

    // focusedIndex: 0 = base, 1+ = columnPaths[focusedIndex-1]
    const focusedIndex = columnPaths.length; // points to last child column

    let previewFile: FileItem | null = null;
    if (previewFilePath) {
      const statResult = await window.electronAPI.stat(previewFilePath);
      if (statResult.success && statResult.stat) {
        const fileName = previewFilePath.split('/').pop() ?? '';
        const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
        previewFile = {
          ...statResult.stat,
          path: previewFilePath,
          name: fileName,
          extension,
          isDirectory: statResult.stat.isDirectory,
        };
      }
    }

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId)!;
      const updatedPane: Pane = {
        ...currentPane,
        path: basePath,
        files,
        loading: false,
        selectedFiles: new Set(selectedFiles || []),
        basePath,
        currentBreadcrumbPath,
        columnState: {
          ...currentPane.columnState,
          paths: columnPaths,
          filesByPath,
          focusedIndex,
          selectedByColumn: selectedByColumn ?? {},
        },
      };
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, previewFile) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
        previewFile,
        showPreview: !!previewFile,
      };
    });

    window.electronAPI.watcherStart(basePath);
    get().saveSession();
  },

  // ── Pane Refresh ──────────────────────────────────────────────────────────
  refreshPane: async (paneId) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, loading: true, error: null } : p),
    }));

    const result = await window.electronAPI.readdir(pane.path);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error ?? null } : p),
      }));
      return;
    }

    const refreshDirSort = get().getDirSort(pane.path);
    const files = sortFiles(result.files, refreshDirSort, 'asc');
    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, files, loading: false } : p),
    }));
  },

  toggleHiddenFiles: async () => {
    const newValue = !get().showHidden;
    set({ showHidden: newValue });
    await window.electronAPI.storeSet('showHidden', newValue);

    const { panes, getDirSort } = get();
    await Promise.all(panes.map(async (pane) => {
      get().refreshPane(pane.id);

      const colPaths = Object.keys(pane.columnState?.filesByPath || {});
      if (colPaths.length === 0) return;
      const results = await Promise.all(
        colPaths.map(async (colPath) => {
          const r = await window.electronAPI.readdir(colPath);
          if (!r.success) return null;
          const colSort = getDirSort(colPath);
          return [colPath, sortFiles(r.files, colSort, 'asc')] as [string, FileItem[]];
        })
      );
      const newFilesByPath: Record<string, FileItem[]> = { ...pane.columnState.filesByPath };
      for (const entry of results) {
        if (entry) newFilesByPath[entry[0]] = entry[1];
      }
      set(s => ({
        panes: s.panes.map(p =>
          p.id === pane.id
            ? { ...p, columnState: { ...p.columnState, filesByPath: newFilesByPath } }
            : p
        ),
      }));
    }));
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────
  addTab: (paneId, tabPath) => {
    const { homeDir } = get();
    const desktopPath = tabPath || (homeDir + '/Desktop');

    set(s => {
      const pane = s.panes.find(p => p.id === paneId);
      if (!pane) return s;
      const savedTabs = pane.tabs.map((t, i) =>
        i === pane.activeTab ? snapshotTab(pane, s.previewFile) : t
      );
      const newTab = createTabState(desktopPath);
      return {
        panes: s.panes.map(p => p.id === paneId
          ? {
              ...p,
              ...restoreFromTab(newTab),
              tabs: [...savedTabs, newTab],
              activeTab: savedTabs.length,
              navigationHistory: [],
              navigationIndex: -1,
              _isRestoringHistory: false,
            }
          : p
        ),
        previewFile: null,
        showPreview: false,
      };
    });

    get().navigateTo(paneId, desktopPath);
  },

  closeTab: (paneId, tabIndex) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane || pane.tabs.length <= 1) return;

    const { previewFile } = get();
    const savedTabs = pane.tabs.map((t, i) =>
      i === pane.activeTab ? snapshotTab(pane, previewFile) : t
    );
    const newTabs = savedTabs.filter((_, i) => i !== tabIndex);
    let newActive = pane.activeTab;
    if (tabIndex < newActive) {
      newActive = newActive - 1;
    } else if (tabIndex === newActive) {
      newActive = Math.min(newActive, newTabs.length - 1);
    }
    const tabToRestore = newTabs[newActive];

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, tabs: newTabs, activeTab: newActive, ...restoreFromTab(tabToRestore) }
        : p
      ),
      previewFile: tabToRestore.previewFile || null,
      showPreview: !!tabToRestore.previewFile,
    }));
    get().saveSession();
  },

  switchTab: (paneId, tabIndex) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane || tabIndex === pane.activeTab) return;

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId)!;
      const savedTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(currentPane, s.previewFile) : t
      );
      const targetTab = savedTabs[tabIndex];
      return {
        panes: s.panes.map(p => p.id === paneId
          ? { ...p, tabs: savedTabs, activeTab: tabIndex, ...restoreFromTab(targetTab) }
          : p
        ),
        previewFile: targetTab.previewFile || null,
        showPreview: !!targetTab.previewFile,
      };
    });
    get().saveSession();
  },

  // ── File Navigation ───────────────────────────────────────────────────────
  navigateToFile: async (paneId, filePath) => {
    const { panes, navigateTo } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    const lastSlash = filePath.lastIndexOf('/');
    const dirPath = lastSlash <= 0 ? '/' : filePath.substring(0, lastSlash);

    await navigateTo(paneId, dirPath);

    const file = await window.electronAPI.stat(filePath);
    if (file.success && file.stat) {
      const fileInfo: FileItem = {
        ...file.stat,
        path: filePath,
        name: filePath.split('/').pop() ?? '',
        isDirectory: file.stat.isDirectory,
      };
      get().setPreviewFile(fileInfo);
    }
  },

  revealInTree: async (paneId, filePath) => {
    const { navigateTo } = get();

    const lastSlash = filePath.lastIndexOf('/');
    const dirPath = lastSlash <= 0 ? '/' : filePath.substring(0, lastSlash);

    await navigateTo(paneId, dirPath);
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewFile: null,
  showPreview: false,
  previewWidth: 300,
  setPreviewFile: (file) => {
    set(s => {
      const { activePane, panes } = s;
      const pane = panes.find(p => p.id === activePane);
      if (!pane) return { previewFile: file, showPreview: !!file };

      const updatedPane = { ...pane };
      const newTabs = pane.tabs.map((t, i) =>
        i === pane.activeTab ? snapshotTab(updatedPane, file) : t
      );

      return {
        previewFile: file,
        showPreview: !!file,
        panes: panes.map(p => p.id === activePane ? { ...p, tabs: newTabs } : p),
      };
    });
    setTimeout(() => get().saveSession(), 0);
  },
  closePreview: () => {
    set(s => {
      const { activePane, panes } = s;
      const pane = panes.find(p => p.id === activePane);
      if (!pane) return { previewFile: null, showPreview: false };

      const updatedPane = { ...pane };
      const newTabs = pane.tabs.map((t, i) =>
        i === pane.activeTab ? snapshotTab(updatedPane, null) : t
      );

      return {
        previewFile: null,
        showPreview: false,
        panes: panes.map(p => p.id === activePane ? { ...p, tabs: newTabs } : p),
      };
    });
    setTimeout(() => get().saveSession(), 0);
  },
  setPreviewWidth: (w) => {
    const maxW = Math.floor((window.innerWidth / get().zoom) * 0.5);
    const clamped = Math.max(200, Math.min(maxW, w));
    set({ previewWidth: clamped });
    window.electronAPI.storeSet('previewWidth', clamped);
  },

  // ── Zoom ─────────────────────────────────────────────────────────────────
  zoom: 1.6,
  setZoom: (z) => {
    const next = Math.max(0.7, Math.min(1.6, Math.round(z * 10) / 10));
    set({ zoom: next });
    window.electronAPI.storeSet('zoom', next);
  },
  zoomIn: () => {
    const next = Math.min(1.6, Math.round((get().zoom + 0.1) * 10) / 10);
    set({ zoom: next });
    window.electronAPI.storeSet('zoom', next);
  },
  zoomOut: () => {
    const next = Math.max(0.7, Math.round((get().zoom - 0.1) * 10) / 10);
    set({ zoom: next });
    window.electronAPI.storeSet('zoom', next);
  },
  zoomReset: () => {
    set({ zoom: 1.0 });
    window.electronAPI.storeSet('zoom', 1.0);
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  currentTheme: 'classicLight',
  setTheme: (themeName) => {
    set({ currentTheme: themeName });
    window.electronAPI.storeSet('theme', themeName);
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  bookmarks: [],
  setBookmarks: (bookmarks) => {
    set({ bookmarks });
    window.electronAPI.saveBookmarks(bookmarks);
  },
  loadBookmarks: async () => {
    const bookmarks = await window.electronAPI.getBookmarks();
    set({ bookmarks });
  },

  // ── Clipboard Queue ───────────────────────────────────────────────────────
  clipboardQueue: [],
  clipboardMode: 'copy',
  addToClipboard: (files, mode = 'copy') => set(s => ({
    clipboardQueue: [...s.clipboardQueue, ...files.filter(f => !s.clipboardQueue.includes(f))],
    clipboardMode: mode,
  })),
  clearClipboard: () => set({ clipboardQueue: [], clipboardMode: 'copy' }),
  removeFromClipboard: (filePath) => set(s => ({
    clipboardQueue: s.clipboardQueue.filter(f => f !== filePath),
  })),

  pasteClipboard: async (destDir) => {
    const { clipboardQueue, clipboardMode } = get();
    const errors: string[] = [];
    for (const src of clipboardQueue) {
      const dest = `${destDir}/${src.split('/').pop()}`;
      const result = clipboardMode === 'copy'
        ? await window.electronAPI.copy(src, dest)
        : await window.electronAPI.move(src, dest);
      if (result && !result.success) errors.push(src);
    }
    if (clipboardMode === 'cut') set({ clipboardQueue: [], clipboardMode: 'copy' });
    get().panes.forEach(p => get().refreshPane(p.id));
    return errors;
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  allTags: [],
  loadAllTags: async () => {
    const result = await window.electronAPI.getAllTags();
    if (result.success) set({ allTags: result.tags });
  },

  // ── Column View Reveal ───────────────────────────────────────────────────
  revealTarget: null,
  setRevealTarget: (target) => set({ revealTarget: target }),
  clearRevealTarget: () => set({ revealTarget: null }),

  revealFileInTree: async (paneId, filePath, fileDir, isDirectory = false) => {
    const state = get();
    const currentPane = state.panes.find(p => p.id === paneId);
    if (!currentPane) return;

    const existingBase = currentPane.basePath;

    const isUnderBase = existingBase && (
      fileDir === existingBase ||
      fileDir.startsWith(path.resolve(existingBase) + '/')
    );

    const revealBase = isUnderBase ? existingBase : fileDir;

    await state.navigateTo(paneId, revealBase, { skipHistory: true });

    if (fileDir !== revealBase) {
      const relativePath = fileDir.replace(revealBase, '').replace(/^\//, '');
      const segments = relativePath.split('/').filter(Boolean);

      let currentPath = revealBase;
      const columnPaths = [revealBase];
      const filesByPath: Record<string, FileItem[]> = {};

      for (const segment of segments) {
        currentPath = `${currentPath}/${segment}`;
        columnPaths.push(currentPath);

        const result = await window.electronAPI.readdir(currentPath);
        if (result.success) {
          filesByPath[currentPath] = result.files;
        }
      }

      state.updateColumnState(paneId, {
        paths: columnPaths,
        filesByPath,
        focusedIndex: columnPaths.length - 1
      });

      state.setCurrentBreadcrumbPath(paneId, fileDir);
    }

    state.setSelection(paneId, [filePath]);

    let previewFilePath: string | null = null;
    if (!isDirectory) {
      const file = await window.electronAPI.stat(filePath);
      if (file.success && file.stat) {
        const name = filePath.split('/').pop() ?? '';
        const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
        set({ previewFile: { ...file.stat, path: filePath, name, extension: ext, isDirectory: false } });
        previewFilePath = filePath;
      }
    }

    state.pushNavHistory(paneId, {
      basePath: revealBase,
      currentBreadcrumbPath: fileDir,
      selectedFiles: [filePath],
      previewFilePath,
    });
  },

  // ── UI State ──────────────────────────────────────────────────────────────
  activeModal: null,
  modalData: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  showTerminal: false,
  terminalHeight: 260,
  toggleTerminal: () => set(s => ({ showTerminal: !s.showTerminal })),
  setTerminalHeight: (h) => set({ terminalHeight: h }),

  showSidebar: true,
  sidebarWidth: 220,
  setSidebarWidth: (w) => {
    const clamped = Math.max(160, Math.min(500, w));
    set({ sidebarWidth: clamped });
    window.electronAPI.storeSet('sidebarWidth', clamped);
  },
  toggleSidebar: () => {
    const next = !get().showSidebar;
    set({ showSidebar: next });
    window.electronAPI.storeSet('showSidebar', next);
  },

  showSearch: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  searchInitContentMode: false,
  toggleSearch: (opts) => set(s => ({
    showSearch: !s.showSearch,
    searchQuery: '',
    searchResults: [],
    searchInitContentMode: !s.showSearch ? (opts?.contentMode ?? false) : false,
  })),

  showHidden: false,

  searchFiles: async (query, opts = {}) => {
    const { activePane, panes } = get();
    const pane = panes.find(p => p.id === activePane);
    if (!pane || !query.trim()) return;

    set({ searchLoading: true, searchResults: [] });
    const result = await window.electronAPI.search({ rootPath: pane.path, query, options: opts });
    set({ searchLoading: false, searchResults: result.success ? result.files : [] });
  },

  // ── Smart Folders ─────────────────────────────────────────────────────────
  smartFolders: [
    { id: 'large', name: 'Large Files', icon: '⚖️', filter: (f: FileItem) => f.size > 100 * 1024 * 1024 },
    { id: 'empty', name: 'Empty Folders', icon: '📭', filter: (f: FileItem) => f.isDirectory && f.size === 0 },
    { id: 'old', name: 'Old Files', icon: '🗓️', filter: (f: FileItem) => { const d = new Date(f.accessed || f.modified || 0); return Date.now() - d.getTime() > 365 * 86400000; } },
  ],
  customSmartFolders: [],

  // ── Activity Log ──────────────────────────────────────────────────────────
  activityLog: [],
  loadLog: async (params = {}) => {
    const result = await window.electronAPI.getLog(params);
    if (result.success) set({ activityLog: result.logs });
  },

  // ── Selectors ────────────────────────────────────────────────────────────────
  getActivePath: (paneId) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return '/';
    return pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path;
  },

  getBreadcrumbs: (paneId) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    const activePath = get().getActivePath(paneId);

    if (pane && pane.viewMode === 'column' && pane.basePath) {
      const base = pane.basePath;
      const baseName = base === '/' ? '/' : base.split('/').filter(Boolean).pop() ?? base;

      if (activePath === base || !activePath.startsWith(base)) {
        return [{ name: baseName, path: base }];
      }

      const relative = activePath.slice(base.length).replace(/^\//, '');
      const relativeParts = relative.split('/').filter(Boolean);

      return [
        { name: baseName, path: base },
        ...relativeParts.map((part, i) => ({
          name: part,
          path: base.replace(/\/$/, '') + '/' + relativeParts.slice(0, i + 1).join('/'),
        })),
      ];
    }

    if (activePath === '/') return [{ name: '/', path: '/' }];
    const parts = activePath.split('/').filter(Boolean);
    return [
      { name: '/', path: '/' },
      ...parts.map((part, i) => ({
        name: part,
        path: '/' + parts.slice(0, i + 1).join('/'),
      })),
    ];
  },

  getColumnPaths: (paneId) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane || pane.viewMode !== 'column') return [];

    const fullPath = pane.currentBreadcrumbPath;
    const base = pane.basePath;

    if (!fullPath.startsWith(base)) return [base];

    const fullParts = fullPath.split('/');

    const columnPaths: string[] = [];
    let current = '';
    for (let i = 0; i < fullParts.length; i++) {
      current += (i === 0 ? '' : '/') + fullParts[i];
      if (current.startsWith(base) && current.length >= base.length) {
        columnPaths.push(current);
      }
    }
    return columnPaths;
  },

  getActiveBookmark: (paneId) => {
    const { panes, bookmarks } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane || !pane.activeBookmarkId) return null;
    return bookmarks.find(bm => bm.id === pane.activeBookmarkId) || null;
  },

  readDirSorted: async (dirPath, paneId) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return { success: false, files: [] };

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) return result;

    const rdDirSort = get().getDirSort(dirPath);
    const files = sortFiles(result.files, rdDirSort, 'asc');
    return { success: true, files };
  },

  // ── Session persistence ───────────────────────────────────────────────────
  saveSession: () => {
    if (!get().initialized) return;
    const { panes, activePane, previewFile } = get();
    const session = panes.map(p => {
      const savedTabs = p.tabs.map((t, i) =>
        i === p.activeTab ? snapshotTab(p, p.id === activePane ? previewFile : t.previewFile) : t
      );
      return {
        id: p.id,
        path: p.path,
        basePath: p.basePath,
        currentBreadcrumbPath: p.currentBreadcrumbPath,
        selectedFiles: [...(p.selectedFiles || [])],
        viewMode: p.viewMode,
        sortBy: p.sortBy,
        sortOrder: p.sortOrder,
        activeTab: p.activeTab,
        tabs: savedTabs.map(t => ({
          id: t.id,
          path: t.path,
          basePath: t.basePath,
          currentBreadcrumbPath: t.currentBreadcrumbPath,
          label: t.label,
          activeBookmarkId: t.activeBookmarkId || null,
          viewMode: t.viewMode || 'column',
          sortBy: t.sortBy || 'name',
          sortOrder: t.sortOrder || 'asc',
          selectedFiles: [...(t.selectedFiles || [])],
          columnState: t.columnState || { ...DEFAULT_COLUMN_STATE },
          previewFilePath: t.previewFile?.path || null,
        })),
      };
    });
    window.electronAPI.storeSet('session', {
      panes: session,
      activePane,
      previewFilePath: previewFile?.path || null,
      directorySorts: get().directorySorts || {},
    });
  },

  // ── Init ─────────────────────────────────────────────────────────────────
  initialized: false,
  init: async () => {
    const homeDir = await window.electronAPI.getHomeDir();
    set({ homeDir });

    const [savedSidebar, savedSession, savedZoom, savedPreviewWidth, savedSidebarWidth, savedTheme, savedShowHidden] = await Promise.all([
      window.electronAPI.storeGet('showSidebar'),
      window.electronAPI.storeGet('session'),
      window.electronAPI.storeGet('zoom'),
      window.electronAPI.storeGet('previewWidth'),
      window.electronAPI.storeGet('sidebarWidth'),
      window.electronAPI.storeGet('theme'),
      window.electronAPI.storeGet('showHidden'),
    ]);

    if (savedSidebar != null) set({ showSidebar: savedSidebar as boolean });
    if (savedZoom != null) set({ zoom: savedZoom as number });
    if (savedPreviewWidth != null) set({ previewWidth: savedPreviewWidth as number });
    if (savedSidebarWidth != null) set({ sidebarWidth: savedSidebarWidth as number });
    if (savedTheme != null) set({ currentTheme: savedTheme as string });
    if (savedShowHidden != null) set({ showHidden: savedShowHidden as boolean });

    const session = savedSession as {
      panes?: Array<{
        id: string; path: string; basePath?: string; currentBreadcrumbPath?: string;
        selectedFiles?: string[]; viewMode?: ViewMode; sortBy?: SortBy; sortOrder?: SortOrder;
        activeTab?: number;
        tabs?: Array<{
          id: string; path: string; basePath?: string; currentBreadcrumbPath?: string;
          label?: string; activeBookmarkId?: string | null; viewMode?: ViewMode;
          sortBy?: SortBy; sortOrder?: SortOrder; selectedFiles?: string[];
          columnState?: ColumnState; previewFilePath?: string | null;
        }>;
      }>;
      activePane?: string;
      previewFilePath?: string | null;
      directorySorts?: Record<string, SortBy>;
    } | null;

    if (session?.directorySorts) set({ directorySorts: session.directorySorts });

    let savedActivePane = 'left';
    let leftSession: SessionPane | null = (session?.panes?.find(p => p.id === 'left') as SessionPane) ?? null;
    let rightSession: SessionPane | null = (session?.panes?.find(p => p.id === 'right') as SessionPane) ?? null;
    if (session?.activePane) savedActivePane = session.activePane;

    const hydrateTab = async (tab: SessionTab): Promise<Record<string, FileItem[]>> => {
      const breadcrumb = tab.currentBreadcrumbPath || tab.path;
      const base = tab.basePath || tab.path;
      const colPaths: string[] = [];
      if (breadcrumb.startsWith(base)) {
        const fullParts = breadcrumb.split('/');
        let current = '';
        for (let i = 0; i < fullParts.length; i++) {
          current += (i === 0 ? '' : '/') + fullParts[i];
          if (current.startsWith(base) && current.length >= base.length) {
            colPaths.push(current);
          }
        }
      } else {
        colPaths.push(base);
      }
      const entries = await Promise.all(
        colPaths.map(cp => window.electronAPI.readdir(cp).then(r => {
          if (!r.success) return [cp, []] as [string, FileItem[]];
          const dirSort = get().getDirSort(cp);
          const sorted = sortFiles(r.files, dirSort, 'asc');
          return [cp, sorted] as [string, FileItem[]];
        }))
      );
      return Object.fromEntries(entries);
    };

    const computeFocusedIndex = (base: string, breadcrumb: string): number => {
      if (!breadcrumb.startsWith(base)) return 0;
      const fullParts = breadcrumb.split('/');
      let count = 0;
      let current = '';
      for (let i = 0; i < fullParts.length; i++) {
        current += (i === 0 ? '' : '/') + fullParts[i];
        if (current.startsWith(base) && current.length >= base.length) count++;
      }
      return Math.max(0, count - 1);
    };

    const hydratePaneSession = async (ps: SessionPane | null): Promise<(Partial<Pane> & { activeTabPreviewFile: FileItem | null }) | null> => {
      if (!ps || !ps.tabs || ps.tabs.length === 0) return null;

      const hydratedTabs: Tab[] = await Promise.all(ps.tabs.map(async (tab) => {
        const filesByPath = await hydrateTab(tab);
        const base = tab.basePath || tab.path;
        const breadcrumb = tab.currentBreadcrumbPath || tab.path;
        const focusedIndex = computeFocusedIndex(base, breadcrumb);
        const baseDirResult = await window.electronAPI.readdir(base);
        let files: FileItem[] = [];
        if (baseDirResult.success) {
          const baseDirSort = get().getDirSort(base);
          files = sortFiles(baseDirResult.files, baseDirSort, 'asc');
        }
        let previewFile: FileItem | null = null;
        if (tab.previewFilePath) {
          const statResult = await window.electronAPI.stat(tab.previewFilePath);
          if (statResult.success && statResult.stat) {
            const fileName = tab.previewFilePath.split('/').pop() ?? '';
            const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
            previewFile = {
              ...statResult.stat,
              path: tab.previewFilePath,
              name: fileName,
              extension,
              isDirectory: statResult.stat.isDirectory,
            };
          }
        }
        return {
          id: tab.id,
          path: tab.path,
          basePath: tab.basePath || tab.path,
          currentBreadcrumbPath: tab.currentBreadcrumbPath || tab.path,
          label: tab.label || tab.path.split('/').pop() || '/',
          activeBookmarkId: tab.activeBookmarkId || null,
          viewMode: tab.viewMode || 'column',
          sortBy: tab.sortBy || 'name',
          sortOrder: tab.sortOrder || 'asc',
          files,
          selectedFiles: new Set<string>(tab.selectedFiles || []),
          columnState: {
            ...(tab.columnState || { ...DEFAULT_COLUMN_STATE }),
            filesByPath,
            focusedIndex,
          },
          previewFile,
          navigationHistory: [],
          navigationIndex: -1,
          _isRestoringHistory: false,
        } satisfies Tab;
      }));

      const activeTabIdx = ps.activeTab || 0;
      const activeTab = hydratedTabs[activeTabIdx];

      return {
        tabs: hydratedTabs,
        activeTab: activeTabIdx,
        ...restoreFromTab(activeTab),
        activeTabPreviewFile: activeTab.previewFile || null,
      };
    };

    if (leftSession?.tabs?.length || rightSession?.tabs?.length) {
      const [leftHydrated, rightHydrated] = await Promise.all([
        hydratePaneSession(leftSession),
        hydratePaneSession(rightSession),
      ]);

      await Promise.all([
        get().loadBookmarks(),
        get().loadAllTags(),
      ]);

      if (!leftHydrated) await get().navigateTo('left', homeDir);
      if (!rightHydrated) await get().navigateTo('right', homeDir);

      const activePaneHydrated = savedActivePane === 'left' ? leftHydrated : rightHydrated;
      const globalPreview = activePaneHydrated?.activeTabPreviewFile || null;

      set(s => ({
        activePane: savedActivePane,
        panes: s.panes.map(p => {
          const hydrated = p.id === 'left' ? leftHydrated : rightHydrated;
          if (!hydrated) return p;
          return { ...p, ...hydrated, loading: false, error: null };
        }),
        previewFile: globalPreview,
        showPreview: !!globalPreview,
      }));
    } else {
      let leftPath = homeDir;
      let rightPath = homeDir;

      if (leftSession?.path) leftPath = leftSession.basePath || leftSession.path;
      if (rightSession?.path) rightPath = rightSession.basePath || rightSession.path;

      await Promise.all([
        get().navigateTo('left', leftPath),
        get().navigateTo('right', rightPath),
        get().loadBookmarks(),
        get().loadAllTags(),
      ]);

      if (session?.panes) {
        const hydratePane = async (ps: SessionPane | null): Promise<Record<string, FileItem[]>> => {
          if (!ps) return {};
          return await hydrateTab(ps as SessionTab);
        };

        const [leftFilesRaw, rightFilesRaw] = await Promise.all([
          hydratePane(leftSession),
          hydratePane(rightSession),
        ]);
        const leftFiles: Record<string, FileItem[]> = {};
        for (const [dirPath, files] of Object.entries(leftFilesRaw)) {
          const dirSort = get().getDirSort(dirPath);
          leftFiles[dirPath] = sortFiles(files, dirSort, 'asc');
        }
        const rightFiles: Record<string, FileItem[]> = {};
        for (const [dirPath, files] of Object.entries(rightFilesRaw)) {
          const dirSort = get().getDirSort(dirPath);
          rightFiles[dirPath] = sortFiles(files, dirSort, 'asc');
        }

        set(s => ({
          activePane: savedActivePane,
          panes: s.panes.map(p => {
            const ps = session.panes!.find(sp => sp.id === p.id);
            if (!ps) return p;
            const filesByPath = p.id === 'left' ? leftFiles : rightFiles;
            const base = ps.basePath || p.path;
            const breadcrumb = ps.currentBreadcrumbPath || p.path;
            const focusedIndex = computeFocusedIndex(base, breadcrumb);
            return {
              ...p,
              currentBreadcrumbPath: breadcrumb,
              basePath: base,
              selectedFiles: new Set<string>(ps.selectedFiles || []),
              viewMode: ps.viewMode || p.viewMode,
              sortBy: ps.sortBy || p.sortBy,
              sortOrder: ps.sortOrder || p.sortOrder,
              columnState: {
                ...p.columnState,
                filesByPath,
                focusedIndex,
              },
            };
          }),
        }));
      }
    }

    if (session?.previewFilePath && !leftSession?.tabs?.length && !rightSession?.tabs?.length) {
      const statResult = await window.electronAPI.stat(session.previewFilePath);
      if (statResult.success && statResult.stat) {
        const fp = session.previewFilePath;
        const fileName = fp.split('/').pop() ?? '';
        const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
        set({
          previewFile: {
            ...statResult.stat,
            path: fp,
            name: fileName,
            extension,
            isDirectory: statResult.stat.isDirectory,
          },
          showPreview: true,
        });
      }
    }

    window.electronAPI.onWatcherChange((change) => {
      console.log('Watcher change received:', change);
      const { panes, refreshPane } = get();
      const normalizePath = (path: string) => path.replace(/\/$/, '');
      panes.forEach(p => {
        const currentTab = p.tabs[p.activeTab];
        const tabPath = currentTab?.path || p.path;
        console.log(`Pane ${p.id}: tabPath="${tabPath}" vs change.dir="${change.dir}"`);
        if (normalizePath(tabPath) === normalizePath(change.dir)) {
          console.log(`Match! Refreshing pane ${p.id}`);
          refreshPane(p.id);
        }
      });
    });

    set({ initialized: true });

    const state = get();
    state.panes.forEach(pane => {
      if (!pane.navigationHistory || pane.navigationHistory.length === 0) {
        state.pushToHistory(pane.id, {
          basePath: pane.basePath,
          currentBreadcrumbPath: pane.currentBreadcrumbPath,
          selectedFiles: [...pane.selectedFiles],
          previewFilePath: state.previewFile?.path || null,
        });
      }
    });
  },
}));

// ─── Sort Helper (re-exported from helpers/sort.ts) ──────────────────────────
export { sortFiles } from '../helpers/sort';

// ─── File Utils ───────────────────────────────────────────────────────────────
export function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  const formatted = i > 0 ? value.toFixed(1) : value.toFixed(0);
  return formatted.replace(/\.0$/, '') + ' ' + units[i];
}

export function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diff > 31536000000 ? 'numeric' : undefined });
}

export function getFileIcon(file: FileItem): string {
  if (file.isDirectory) {
    if (file.name && file.name.endsWith('.app')) {
      return '🚀';
    }
    return '📁';
  }
  const iconMap: Record<string, string> = {
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️', ico: '🖼️',
    mp4: '🎬', mov: '🎬', m4v: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', m4a: '🎵',
    js: '📜', jsx: '📜', ts: '📜', tsx: '📜', py: '🐍', rb: '💎', go: '🐹', rs: '🦀', java: '☕',
    html: '🌐', css: '🎨', json: '📋',
    pdf: '📕', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📊', pptx: '📊',
    txt: '📄', md: '📄', markdown: '📄', yaml: '📄', yml: '📄', xml: '📄', csv: '📄',
    zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦',
    sh: '⚙️', bash: '⚙️', zsh: '⚙️',
    ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
    app: '🚀',
  };
  return iconMap[file.extension ?? ''] || '📄';
}

export function isPreviewable(file: FileItem): boolean {
  return !file.isDirectory;
}

// ─── Preview Type Helpers ──────────────────────────────────────────────────────
export const PREVIEW_TYPES = {
  imageExts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  textExts: ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log'],
  videoExts: ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'],
  audioExts: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'],
} as const;

export type PreviewType = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'directory' | 'unknown';

export function getPreviewType(file: FileItem): PreviewType {
  if (file.isDirectory) return 'directory';
  const ext = file.extension?.toLowerCase();
  if (PREVIEW_TYPES.imageExts.includes(ext as typeof PREVIEW_TYPES.imageExts[number])) return 'image';
  if (PREVIEW_TYPES.videoExts.includes(ext as typeof PREVIEW_TYPES.videoExts[number])) return 'video';
  if (PREVIEW_TYPES.audioExts.includes(ext as typeof PREVIEW_TYPES.audioExts[number])) return 'audio';
  if (PREVIEW_TYPES.textExts.includes(ext as typeof PREVIEW_TYPES.textExts[number])) return 'text';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}

export function filterHiddenFiles(files: FileItem[], showHidden: boolean): FileItem[] {
  if (showHidden) return files;
  return files.filter(f => !f.name.startsWith('.'));
}
