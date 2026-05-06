import { create } from 'zustand';
import path from 'path-browserify';

// ─── Helper ───────────────────────────────────────────────────────────────────
const createPane = (id, initialPath = '/') => ({
  id,
  path: initialPath,
  files: [],
  loading: false,
  error: null,
  selectedFiles: new Set(),
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'column', // Column view as default
  tabs: [{ id: `tab-${Date.now()}`, path: initialPath, label: 'Home' }],
  activeTab: 0,
  currentBreadcrumbPath: initialPath,
  basePath: initialPath, // New: starting point for column navigation
  activeBookmarkId: null, // New: ID of active bookmark for visual indication
  // Column view state
  columnState: {
    paths: [],
    filesByPath: {},
    selectedByColumn: {},
    focusedIndex: 0,
  },
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  panes: [createPane('left'), createPane('right')],
  activePane: 'left',
  splitRatio: 0.5,
  showRightPane: false,

  setActivePane: (paneId) => set({ activePane: paneId }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleRightPane: () => set(s => ({ showRightPane: !s.showRightPane })),

  updatePane: (paneId, updates) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, ...updates } : p),
  })),

  navigateTo: async (paneId, dirPath) => {
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
    const newTabs = pane.tabs.map((t, i) =>
      i === pane.activeTab ? { ...t, path: dirPath, label: dirPath === '/' ? '/' : dirPath.split('/').pop() } : t
    );

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, path: dirPath, files, loading: false, selectedFiles: new Set(), tabs: newTabs }
        : p
      ),
    }));

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
    const newTabs = pane.tabs.map((t, i) =>
      i === pane.activeTab ? { ...t, path: dirPath, label: dirPath === '/' ? '/' : dirPath.split('/').pop() } : t
    );

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, path: dirPath, files, loading: false, selectedFiles: new Set(), tabs: newTabs }
        : p
      ),
    }));

    window.electronAPI.watcherStart(dirPath);
    get().saveSession();
  },

  navigateToBookmark: async (paneId, dirPath, bookmarkId) => {
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
    const newTabs = pane.tabs.map((t, i) =>
      i === pane.activeTab ? { ...t, path: dirPath, label: dirPath === '/' ? '/' : dirPath.split('/').pop() } : t
    );

    set(s => ({
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, path: dirPath, files, loading: false, selectedFiles: new Set(), tabs: newTabs }
        : p
      ),
    }));

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
      panes: s.panes.map(p => p.id === paneId ? { ...p, currentBreadcrumbPath: path } : p),
    }));
    get().saveSession();
  },

  setViewMode: (paneId, viewMode) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, viewMode } : p),
  })),

  // ── Column View State ─────────────────────────────────────────────────────
  setColumnState: (paneId, columnState) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, columnState } : p),
  })),

  updateColumnState: (paneId, updates) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, columnState: { ...p.columnState, ...updates } } : p),
  })),

  clearColumnState: (paneId) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 } } : p),
  })),

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
  addTab: (paneId, tabPath) => set(s => {
    const pane = s.panes.find(p => p.id === paneId);
    if (!pane) return s;
    const newTab = { id: `tab-${Date.now()}`, path: tabPath || pane.path, label: tabPath ? tabPath.split('/').pop() || '/' : pane.path.split('/').pop() || '/' };
    return {
      panes: s.panes.map(p => p.id === paneId
        ? { ...p, tabs: [...p.tabs, newTab], activeTab: p.tabs.length }
        : p
      ),
    };
  }),

  closeTab: (paneId, tabIndex) => set(s => {
    const pane = s.panes.find(p => p.id === paneId);
    if (!pane || pane.tabs.length <= 1) return s;
    const newTabs = pane.tabs.filter((_, i) => i !== tabIndex);
    const newActive = Math.min(pane.activeTab, newTabs.length - 1);
    return {
      panes: s.panes.map(p => p.id === paneId ? { ...p, tabs: newTabs, activeTab: newActive } : p),
    };
  }),

  switchTab: (paneId, tabIndex) => {
    const { panes, navigateTo } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;
    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, activeTab: tabIndex } : p),
    }));
    navigateTo(paneId, pane.tabs[tabIndex].path);
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
    set({ previewFile: file, showPreview: !!file });
    // Persist after state is updated
    setTimeout(() => get().saveSession(), 0);
  },
  closePreview: () => {
    set({ previewFile: null, showPreview: false });
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
    const { clipboardQueue, clipboardMode, activePane, refreshPane } = get();
    for (const src of clipboardQueue) {
      const dest = `${destDir}/${src.split('/').pop()}`;
      if (clipboardMode === 'copy') await window.electronAPI.copy(src, dest);
      else await window.electronAPI.move(src, dest);
    }
    if (clipboardMode === 'cut') set({ clipboardQueue: [] });
    get().panes.forEach(p => get().refreshPane(p.id));
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
    const session = panes.map(p => ({
      id: p.id,
      path: p.path,
      basePath: p.basePath,
      currentBreadcrumbPath: p.currentBreadcrumbPath,
      selectedFiles: [...(p.selectedFiles || [])],
      viewMode: p.viewMode,
      sortBy: p.sortBy,
      sortOrder: p.sortOrder,
    }));
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
    let leftPath = homeDir;
    let rightPath = homeDir;
    let savedActivePane = 'left';
    let leftSession = null;
    let rightSession = null;

    if (savedSession?.panes) {
      leftSession = savedSession.panes.find(p => p.id === 'left') || null;
      rightSession = savedSession.panes.find(p => p.id === 'right') || null;
      if (leftSession?.path) leftPath = leftSession.basePath || leftSession.path;
      if (rightSession?.path) rightPath = rightSession.basePath || rightSession.path;
      if (savedSession.activePane) savedActivePane = savedSession.activePane;
    }

    await Promise.all([
      get().navigateTo('left', leftPath),
      get().navigateTo('right', rightPath),
      get().loadBookmarks(),
      get().loadAllTags(),
    ]);

    // Restore breadcrumb/column state and re-hydrate filesByPath for all column paths
    if (savedSession?.panes) {
      // Compute which paths need to be fetched for each pane
      const hydratePane = async (ps) => {
        if (!ps) return {};
        const breadcrumb = ps.currentBreadcrumbPath || ps.path;
        const base = ps.basePath || ps.path;
        // Compute column paths from base + breadcrumb
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
        // Fetch files for each column path
        const entries = await Promise.all(
          colPaths.map(cp => window.electronAPI.readdir(cp).then(r => [cp, r.success ? r.files : []]))
        );
        return Object.fromEntries(entries);
      };

      const [leftFiles, rightFiles] = await Promise.all([
        hydratePane(leftSession),
        hydratePane(rightSession),
      ]);

      // Helper: compute focusedIndex from basePath + currentBreadcrumbPath
      const computeFocusedIndex = (base, breadcrumb) => {
        if (!breadcrumb.startsWith(base)) return 0;
        const fullParts = breadcrumb.split('/');
        const baseParts = base.split('/');
        let count = 0;
        let current = '';
        for (let i = 0; i < fullParts.length; i++) {
          current += (i === 0 ? '' : '/') + fullParts[i];
          if (current.startsWith(base) && current.length >= base.length) count++;
        }
        return Math.max(0, count - 1);
      };

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

      // Restore preview file if one was open
      if (savedSession.previewFilePath) {
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
    }

    // Set up watcher listener
    window.electronAPI.onWatcherChange((change) => {
      const { panes, refreshPane } = get();
      panes.forEach(p => {
        if (p.path === change.dir) refreshPane(p.id);
      });
    });

    set({ initialized: true });
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