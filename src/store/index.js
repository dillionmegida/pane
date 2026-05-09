import { create } from 'zustand';
import path from 'path-browserify';

// ─── Helper ───────────────────────────────────────────────────────────────────
const DEFAULT_COLUMN_STATE = {
  paths: [],
  filesByPath: {},
  selectedByColumn: {},
  focusedIndex: 0,
};

const createTabState = (tabPath) => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  path: tabPath,
  basePath: tabPath,
  currentBreadcrumbPath: tabPath,
  label: tabPath === '/' ? '/' : tabPath.split('/').pop(),
  files: [],
  selectedFiles: new Set(),
  activeBookmarkId: null,
  viewMode: 'column',
  sortBy: 'name',
  sortOrder: 'asc',
  columnState: { ...DEFAULT_COLUMN_STATE },
  previewFile: null,
  // Per-tab navigation history
  navigationHistory: [],
  navigationIndex: -1,
  _isRestoringHistory: false,
});

// Snapshot the current pane-level state into a tab object
const snapshotTab = (pane, globalPreviewFile) => {
  const base = pane.basePath || pane.path || '/';
  const existingTab = pane.tabs[pane.activeTab];
  return {
    id: existingTab?.id || `tab-${Date.now()}`,
    path: pane.path || '/',
    basePath: base,
    currentBreadcrumbPath: pane.currentBreadcrumbPath || base,
    label: base === '/' ? '/' : base.split('/').pop(),
    files: pane.files || [],
    selectedFiles: new Set(pane.selectedFiles || []),
    activeBookmarkId: pane.activeBookmarkId || null,
    viewMode: pane.viewMode || 'column',
    sortBy: pane.sortBy || 'name',
    sortOrder: pane.sortOrder || 'asc',
    columnState: pane.columnState ? { ...pane.columnState } : { ...DEFAULT_COLUMN_STATE },
    previewFile: globalPreviewFile || null,
    // Preserve per-tab navigation history from pane state
    navigationHistory: pane.navigationHistory || existingTab?.navigationHistory || [],
    navigationIndex: pane.navigationIndex ?? existingTab?.navigationIndex ?? -1,
    _isRestoringHistory: pane._isRestoringHistory ?? existingTab?._isRestoringHistory ?? false,
  };
};

// Restore pane-level state from a tab object
const restoreFromTab = (tab) => ({
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
  // Note: previewFile is restored separately in global state
  // Restore per-tab navigation history
  navigationHistory: tab.navigationHistory || [],
  navigationIndex: tab.navigationIndex ?? -1,
  _isRestoringHistory: false,
});

const createPane = (id, initialPath = '/') => {
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
    viewMode: 'column', // Column view as default
    tabs: [firstTab],
    activeTab: 0,
    currentBreadcrumbPath: initialPath,
    basePath: initialPath, // New: starting point for column navigation
    activeBookmarkId: null, // New: ID of active bookmark for visual indication
    // Column view state
    columnState: { ...DEFAULT_COLUMN_STATE },
    // Navigation history (mirrored from active tab for convenience)
    navigationHistory: [],
    navigationIndex: -1,
    _isRestoringHistory: false,
  };
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  panes: [createPane('left'), createPane('right')],
  activePane: 'left',
  splitRatio: 0.5,
  showRightPane: false,
  homeDir: '/', // Will be set during init

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
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error } : p),
      }));
      return;
    }

    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId);
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set() };
      // Snapshot into active tab
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, s.previewFile) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
      };
    });

    // Push to history unless explicitly skipping (e.g. during history restoration)
    if (!skipHistory) {
      get().pushToHistory(paneId, {
        basePath: dirPath,
        currentBreadcrumbPath: dirPath,
        selectedFiles: [],
        previewFilePath: null,
      });
    }

    // Start watching this directory
    window.electronAPI.watcherStart(dirPath);
    // Persist session after navigation completes
    get().saveSession();
  },

  // Like navigateTo but does NOT reset basePath or currentBreadcrumbPath.
  // Used by reveal so we can set those separately before calling this.
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
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error } : p),
      }));
      return;
    }

    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId);
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set() };
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
        // Set bookmark navigation state
        currentBreadcrumbPath: dirPath,
        basePath: dirPath, // Bookmark becomes the starting point
        activeBookmarkId: bookmarkId,
      } : p),
      // Close preview pane when navigating to bookmark
      previewFile: null,
      showPreview: false,
    }));

    const result = await window.electronAPI.readdir(dirPath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error } : p),
      }));
      return;
    }

    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);

    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId);
      const updatedPane = { ...currentPane, path: dirPath, files, loading: false, selectedFiles: new Set() };
      const newTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(updatedPane, null) : t
      );
      return {
        panes: s.panes.map(p => p.id === paneId ? { ...updatedPane, tabs: newTabs } : p),
      };
    });

    // Push to history unless explicitly skipping
    if (!skipHistory) {
      get().pushToHistory(paneId, {
        basePath: dirPath,
        currentBreadcrumbPath: dirPath,
        selectedFiles: [],
        previewFilePath: null,
      });
    }

    // Start watching this directory
    window.electronAPI.watcherStart(dirPath);
    // Persist session after navigation completes
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

  // Call this explicitly whenever a user-initiated navigation happens
  // (column click on dir, breadcrumb click, bookmark, reveal, etc.)
  // Pass the full state at the time of navigation.
  pushNavHistory: (paneId, entry) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane || pane._isRestoringHistory) return;
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

      // Initialize history if it doesn't exist (for legacy panes)
      const currentHistory = p.navigationHistory || [];
      const currentIndex = p.navigationIndex ?? -1;

      // If we're not at the end of history, truncate forward history
      // (user navigated away from a back position → clear forward path)
      const newHistory = currentIndex < currentHistory.length - 1
        ? currentHistory.slice(0, currentIndex + 1)
        : [...currentHistory];

      newHistory.push(entry);

      // Keep max 50 items
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

    // Mark restoring + update index atomically
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

    // Mark restoring + update index atomically
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
    const { basePath, currentBreadcrumbPath, selectedFiles, previewFilePath } = historyEntry;

    // Set loading state
    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? {
        ...p,
        loading: true,
        error: null,
        basePath,
        currentBreadcrumbPath,
      } : p),
    }));

    // Load the base directory
    const result = await window.electronAPI.readdir(basePath);
    if (!result.success) {
      set(s => ({
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error } : p),
      }));
      return;
    }

    const pane = get().panes.find(p => p.id === paneId);
    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);

    // Build column structure from basePath → currentBreadcrumbPath
    const columnPaths = [];
    const filesByPath = {};

    if (currentBreadcrumbPath && currentBreadcrumbPath.startsWith(basePath)) {
      const fullParts = currentBreadcrumbPath.split('/');
      let current = '';
      for (let i = 0; i < fullParts.length; i++) {
        current += (i === 0 ? '' : '/') + fullParts[i];
        if (current.length >= basePath.length && current.startsWith(basePath)) {
          columnPaths.push(current);
        }
      }

      // Load files for each intermediate column path
      for (const colPath of columnPaths) {
        if (colPath !== basePath) {
          const colResult = await window.electronAPI.readdir(colPath);
          if (colResult.success) {
            filesByPath[colPath] = sortFiles(colResult.files, pane.sortBy, pane.sortOrder);
          }
        }
      }
    } else {
      columnPaths.push(basePath);
    }

    const focusedIndex = Math.max(0, columnPaths.length - 1);

    // Restore preview file if saved
    let previewFile = null;
    if (previewFilePath) {
      const statResult = await window.electronAPI.stat(previewFilePath);
      if (statResult.success && statResult.stat) {
        const fileName = previewFilePath.split('/').pop();
        const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
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
      const currentPane = s.panes.find(p => p.id === paneId);
      const updatedPane = {
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
        panes: s.panes.map(p => p.id === paneId ? { ...p, loading: false, error: result.error } : p),
      }));
      return;
    }

    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);
    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, files, loading: false } : p),
    }));
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────
  addTab: (paneId, tabPath) => {
    const { homeDir } = get();
    const desktopPath = tabPath || (homeDir + '/Desktop');

    // Snapshot current tab state before switching, and apply new tab defaults to pane
    set(s => {
      const pane = s.panes.find(p => p.id === paneId);
      if (!pane) return s;
      // Save current pane state into the current active tab
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
              // New tab starts with its own empty history
              navigationHistory: [],
              navigationIndex: -1,
              _isRestoringHistory: false,
            }
          : p
        ),
        // New tab has no preview
        previewFile: null,
        showPreview: false,
      };
    });

    // Navigate the new tab to Desktop to load files (this pushes index 0 to the new tab's history)
    get().navigateTo(paneId, desktopPath);
  },

  closeTab: (paneId, tabIndex) => {
    const pane = get().panes.find(p => p.id === paneId);
    if (!pane || pane.tabs.length <= 1) return;

    const { previewFile } = get();
    // Save current state into active tab first
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
      // Restore preview from the new active tab
      previewFile: tabToRestore.previewFile || null,
      showPreview: !!tabToRestore.previewFile,
    }));
    get().saveSession();
  },

  switchTab: (paneId, tabIndex) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane || tabIndex === pane.activeTab) return;

    // Snapshot current tab, then restore target tab
    set(s => {
      const currentPane = s.panes.find(p => p.id === paneId);
      // Save current pane state into the currently active tab
      const savedTabs = currentPane.tabs.map((t, i) =>
        i === currentPane.activeTab ? snapshotTab(currentPane, s.previewFile) : t
      );
      const targetTab = savedTabs[tabIndex];
      return {
        panes: s.panes.map(p => p.id === paneId
          ? { ...p, tabs: savedTabs, activeTab: tabIndex, ...restoreFromTab(targetTab) }
          : p
        ),
        // Restore preview from target tab
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

    // Extract directory path from file path
    const lastSlash = filePath.lastIndexOf('/');
    const dirPath = lastSlash <= 0 ? '/' : filePath.substring(0, lastSlash);
    
    // Navigate to the directory first
    await navigateTo(paneId, dirPath);
    
    // Set the file as preview
    const file = await window.electronAPI.stat(filePath);
    if (file.success) {
      const fileInfo = {
        ...file.stat,
        path: filePath,
        name: filePath.split('/').pop(),
        isDirectory: file.stat.isDirectory,
      };
      get().setPreviewFile(fileInfo);
    }
  },

  revealInTree: async (paneId, filePath) => {
    const { navigateTo } = get();
    
    // Extract directory path from file path
    const lastSlash = filePath.lastIndexOf('/');
    const dirPath = lastSlash <= 0 ? '/' : filePath.substring(0, lastSlash);
    
    // Navigate to the directory
    await navigateTo(paneId, dirPath);
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewFile: null,
  showPreview: false,
  previewWidth: 300,
  setPreviewFile: (file) => {
    set(s => {
      // Update global preview and snapshot into active tab of active pane
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
    // Persist after state is updated
    setTimeout(() => get().saveSession(), 0);
  },
  closePreview: () => {
    set(s => {
      // Clear global preview and snapshot into active tab of active pane
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
  clipboardMode: 'copy', // 'copy' | 'cut'
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
    const errors = [];
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
  revealTarget: null, // { paneId, filePath, columnPaths, fileDir, basePath }
  setRevealTarget: (target) => set({ revealTarget: target }),
  clearRevealTarget: () => set({ revealTarget: null }),

  // ── UI State ──────────────────────────────────────────────────────────────
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
  toggleSearch: () => set(s => ({ showSearch: !s.showSearch, searchQuery: '', searchResults: [] })),

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
    { id: 'large', name: 'Large Files', icon: '⚖️', filter: f => f.size > 100 * 1024 * 1024 },
    { id: 'empty', name: 'Empty Folders', icon: '📭', filter: f => f.isDirectory && f.size === 0 },
    { id: 'old', name: 'Old Files', icon: '🗓️', filter: f => { const d = new Date(f.accessed || f.modified); return Date.now() - d.getTime() > 365 * 86400000; } },
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
      const baseName = base === '/' ? '/' : base.split('/').filter(Boolean).pop();

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

    if (!fullPath.startsWith(base)) return [base]; // Fallback

    const fullParts = fullPath.split('/');
    const baseParts = base.split('/');

    const columnPaths = [];
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

    const files = sortFiles(result.files, pane.sortBy, pane.sortOrder);
    return { success: true, files };
  },

  // ── Session persistence ───────────────────────────────────────────────────
  saveSession: () => {
    if (!get().initialized) return; // Don't overwrite storage during init
    const { panes, activePane, previewFile } = get();
    const session = panes.map(p => {
      // Snapshot current pane state into active tab before saving
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
    });
  },

  // ── Init ─────────────────────────────────────────────────────────────────
  initialized: false,
  init: async () => {
    const homeDir = await window.electronAPI.getHomeDir();
    set({ homeDir });

    // Restore persisted UI state
    const [savedSidebar, savedSession, savedZoom, savedPreviewWidth, savedSidebarWidth, savedTheme] = await Promise.all([
      window.electronAPI.storeGet('showSidebar'),
      window.electronAPI.storeGet('session'),
      window.electronAPI.storeGet('zoom'),
      window.electronAPI.storeGet('previewWidth'),
      window.electronAPI.storeGet('sidebarWidth'),
      window.electronAPI.storeGet('theme'),
    ]);

    if (savedSidebar != null) set({ showSidebar: savedSidebar });
    if (savedZoom != null) set({ zoom: savedZoom });
    if (savedPreviewWidth != null) set({ previewWidth: savedPreviewWidth });
    if (savedSidebarWidth != null) set({ sidebarWidth: savedSidebarWidth });
    if (savedTheme != null) set({ currentTheme: savedTheme });

    // Determine starting paths from session or fallback to homeDir
    let savedActivePane = 'left';
    let leftSession = null;
    let rightSession = null;

    if (savedSession?.panes) {
      leftSession = savedSession.panes.find(p => p.id === 'left') || null;
      rightSession = savedSession.panes.find(p => p.id === 'right') || null;
      if (savedSession.activePane) savedActivePane = savedSession.activePane;
    }

    // Helper: hydrate a single tab's column filesByPath from disk
    const hydrateTab = async (tab) => {
      if (!tab) return {};
      const breadcrumb = tab.currentBreadcrumbPath || tab.path;
      const base = tab.basePath || tab.path;
      const colPaths = [];
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
        colPaths.map(cp => window.electronAPI.readdir(cp).then(r => [cp, r.success ? r.files : []]))
      );
      return Object.fromEntries(entries);
    };

    const computeFocusedIndex = (base, breadcrumb) => {
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

    // Helper: fully hydrate all tabs for a pane session
    const hydratePaneSession = async (ps) => {
      if (!ps || !ps.tabs || ps.tabs.length === 0) return null;

      const hydratedTabs = await Promise.all(ps.tabs.map(async (tab) => {
        const filesByPath = await hydrateTab(tab);
        const base = tab.basePath || tab.path;
        const breadcrumb = tab.currentBreadcrumbPath || tab.path;
        const focusedIndex = computeFocusedIndex(base, breadcrumb);
        // Also load the base directory files for the tab
        const baseDirResult = await window.electronAPI.readdir(base);
        const files = baseDirResult.success ? baseDirResult.files : [];
        // Restore preview file if saved
        let previewFile = null;
        if (tab.previewFilePath) {
          const statResult = await window.electronAPI.stat(tab.previewFilePath);
          if (statResult.success && statResult.stat) {
            const fileName = tab.previewFilePath.split('/').pop();
            const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
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
          ...tab,
          files,
          selectedFiles: new Set(tab.selectedFiles || []),
          columnState: {
            ...(tab.columnState || { ...DEFAULT_COLUMN_STATE }),
            filesByPath,
            focusedIndex,
          },
          previewFile,
        };
      }));

      const activeTabIdx = ps.activeTab || 0;
      const activeTab = hydratedTabs[activeTabIdx];

      return {
        tabs: hydratedTabs,
        activeTab: activeTabIdx,
        ...restoreFromTab(activeTab),
        // Also return the preview file from active tab to set globally
        activeTabPreviewFile: activeTab.previewFile || null,
      };
    };

    // If we have saved session with tabs, restore them fully
    if (leftSession?.tabs?.length || rightSession?.tabs?.length) {
      const [leftHydrated, rightHydrated] = await Promise.all([
        hydratePaneSession(leftSession),
        hydratePaneSession(rightSession),
      ]);

      await Promise.all([
        get().loadBookmarks(),
        get().loadAllTags(),
      ]);

      // For panes without saved tabs, navigate to homeDir
      if (!leftHydrated) await get().navigateTo('left', homeDir);
      if (!rightHydrated) await get().navigateTo('right', homeDir);

      // Determine which preview to show (from active pane's active tab)
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
      // Legacy session or fresh start
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

      // Restore breadcrumb/column state for legacy sessions
      if (savedSession?.panes) {
        const hydratePane = async (ps) => {
          if (!ps) return {};
          return await hydrateTab(ps);
        };

        const [leftFiles, rightFiles] = await Promise.all([
          hydratePane(leftSession),
          hydratePane(rightSession),
        ]);

        set(s => ({
          activePane: savedActivePane,
          panes: s.panes.map(p => {
            const ps = savedSession.panes.find(sp => sp.id === p.id);
            if (!ps) return p;
            const filesByPath = p.id === 'left' ? leftFiles : rightFiles;
            const base = ps.basePath || p.path;
            const breadcrumb = ps.currentBreadcrumbPath || p.path;
            const focusedIndex = computeFocusedIndex(base, breadcrumb);
            return {
              ...p,
              currentBreadcrumbPath: breadcrumb,
              basePath: base,
              selectedFiles: new Set(ps.selectedFiles || []),
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

    // Legacy: Restore preview file if one was open (for old sessions without per-tab preview)
    if (savedSession?.previewFilePath && !leftSession?.tabs?.length && !rightSession?.tabs?.length) {
      const statResult = await window.electronAPI.stat(savedSession.previewFilePath);
      if (statResult.success && statResult.stat) {
        const fp = savedSession.previewFilePath;
        const fileName = fp.split('/').pop();
        const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
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

    // Set up watcher listener
    window.electronAPI.onWatcherChange((change) => {
      const { panes, refreshPane } = get();
      panes.forEach(p => {
        if (p.path === change.dir) refreshPane(p.id);
      });
    });

    set({ initialized: true });

    // Push initial state to history for each pane so back arrow works after first navigation
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

// ─── Sort Helper ──────────────────────────────────────────────────────────────
export function sortFiles(files, sortBy = 'name', sortOrder = 'asc') {
  const sorted = [...files].sort((a, b) => {
    // Directories always first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let cmp = 0;
    switch (sortBy) {
      case 'name': cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); break;
      case 'size': cmp = a.size - b.size; break;
      case 'modified': cmp = new Date(a.modified) - new Date(b.modified); break;
      case 'extension': cmp = a.extension.localeCompare(b.extension); break;
      default: cmp = a.name.localeCompare(b.name);
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

// ─── File Utils ───────────────────────────────────────────────────────────────
export function formatSize(bytes) {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  const formatted = i > 0 ? value.toFixed(1) : value.toFixed(0);
  // Remove .0 when the decimal is 0
  return formatted.replace(/\.0$/, '') + ' ' + units[i];
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diff > 31536000000 ? 'numeric' : undefined });
}

export function getFileIcon(file) {
  if (file.isDirectory) return '📁';
  const iconMap = {
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️', ico: '🖼️',
    // Video
    mp4: '🎬', mov: '🎬', m4v: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
    // Audio
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵', m4a: '🎵',
    // Code
    js: '📜', jsx: '📜', ts: '📜', tsx: '📜', py: '🐍', rb: '💎', go: '🐹', rs: '🦀', java: '☕',
    // Web
    html: '🌐', css: '🎨', json: '📋',
    // Docs
    pdf: '📕', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📊', pptx: '📊',
    // Text
    txt: '📄', md: '📄', markdown: '📄', yaml: '📄', yml: '📄', xml: '📄', csv: '📄',
    // Archives
    zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦',
    // System
    sh: '⚙️', bash: '⚙️', zsh: '⚙️',
    // Fonts
    ttf: '🔤', otf: '🔤', woff: '🔤', woff2: '🔤',
  };
  return iconMap[file.extension] || '📄';
}

export function isPreviewable(file) {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const textExts = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log', 'conf', 'go', 'rs', 'java', 'c', 'cpp', 'h'];
  const videoExts = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
  const pdfExts = ['pdf'];
  const ext = file.extension?.toLowerCase();
  return imageExts.includes(ext) || textExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext) || pdfExts.includes(ext);
}

// ─── Preview Type Helpers ──────────────────────────────────────────────────────
export const PREVIEW_TYPES = {
  imageExts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  textExts: ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log'],
  videoExts: ['mp4', 'mov', 'm4v', 'webm'],
  audioExts: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'],
};

export function getPreviewType(file) {
  if (file.isDirectory) return 'directory';
  const ext = file.extension?.toLowerCase();
  if (PREVIEW_TYPES.imageExts.includes(ext)) return 'image';
  if (PREVIEW_TYPES.videoExts.includes(ext)) return 'video';
  if (PREVIEW_TYPES.audioExts.includes(ext)) return 'audio';
  if (PREVIEW_TYPES.textExts.includes(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}