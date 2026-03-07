import { create } from 'zustand';
import path from 'path-browserify';

const api = window.electronAPI;

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
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // ── Panes ────────────────────────────────────────────────────────────────
  panes: [createPane('left'), createPane('right')],
  activePane: 'left',
  splitRatio: 0.5,
  showRightPane: false,

  setActivePane: (paneId) => set({ activePane: paneId }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleRightPane: () => set(s => ({ showRightPane: !s.showRightPane })),

  setViewMode: (paneId, mode) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, viewMode: mode } : p),
  })),

  updatePane: (paneId, updates) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, ...updates } : p),
  })),

  navigateTo: async (paneId, dirPath) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? { ...p, loading: true, error: null } : p),
    }));

    const result = await api.readdir(dirPath);
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
    api.watcherStart(dirPath);
  },

  navigateToBookmark: async (paneId, dirPath) => {
    const { panes } = get();
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    set(s => ({
      panes: s.panes.map(p => p.id === paneId ? {
        ...p,
        loading: true,
        error: null,
        // Reset column view state for bookmarks
        currentBreadcrumbPath: dirPath,
      } : p),
    }));

    const result = await api.readdir(dirPath);
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
    api.watcherStart(dirPath);
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

  setViewMode: (paneId, viewMode) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, viewMode } : p),
  })),

  setCurrentBreadcrumbPath: (paneId, path) => set(s => ({
    panes: s.panes.map(p => p.id === paneId ? { ...p, currentBreadcrumbPath: path } : p),
  })),

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
    const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
    
    // Navigate to the directory first
    await navigateTo(paneId, dirPath);
    
    // Set the file as preview
    const file = await api.stat(filePath);
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
    const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
    
    // Navigate to the directory
    await navigateTo(paneId, dirPath);
  },

  navigateToDirectoryAndSelect: async (paneId, filePath) => {
    const { navigateTo } = get();
    
    // Extract directory path from file path
    const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
    
    // Navigate to the directory first
    await navigateTo(paneId, dirPath);
    
    // Then select the file
    get().setSelection(paneId, [filePath]);
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewFile: null,
  showPreview: false,
  previewWidth: 300,
  setPreviewFile: (file) => set({ previewFile: file, showPreview: !!file }),
  closePreview: () => set({ previewFile: null, showPreview: false }),
  setPreviewWidth: (w) => set({ previewWidth: Math.max(200, Math.min(800, w)) }),

  // ── Zoom ─────────────────────────────────────────────────────────────────
  zoom: 1.0,
  setZoom: (z) => set({ zoom: Math.max(0.7, Math.min(1.6, Math.round(z * 10) / 10)) }),
  zoomIn: () => set(s => ({ zoom: Math.min(1.6, Math.round((s.zoom + 0.1) * 10) / 10) })),
  zoomOut: () => set(s => ({ zoom: Math.max(0.7, Math.round((s.zoom - 0.1) * 10) / 10) })),
  zoomReset: () => set({ zoom: 1.0 }),

  // ── Sidebar ───────────────────────────────────────────────────────────────
  bookmarks: [],
  setBookmarks: (bookmarks) => {
    set({ bookmarks });
    api.saveBookmarks(bookmarks);
  },
  loadBookmarks: async () => {
    const bookmarks = await api.getBookmarks();
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
      if (clipboardMode === 'copy') await api.copy(src, dest);
      else await api.move(src, dest);
    }
    if (clipboardMode === 'cut') set({ clipboardQueue: [] });
    get().panes.forEach(p => get().refreshPane(p.id));
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  allTags: [],
  loadAllTags: async () => {
    const result = await api.getAllTags();
    if (result.success) set({ allTags: result.tags });
  },

  // ── UI State ──────────────────────────────────────────────────────────────
  activeModal: null, // 'batchRename' | 'rules' | 'duplicates' | 'smartFolders' | 'log' | 'settings' | 'tags' | 'sizeViz' | 'permissions'
  modalData: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  showTerminal: false,
  terminalHeight: 260,
  toggleTerminal: () => set(s => ({ showTerminal: !s.showTerminal })),
  setTerminalHeight: (h) => set({ terminalHeight: h }),

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
    const result = await api.search({ rootPath: pane.path, query, options: opts });
    set({ searchLoading: false, searchResults: result.success ? result.files : [] });
  },

  // ── Smart Folders ─────────────────────────────────────────────────────────
  smartFolders: [
    { id: 'large', name: 'Large Files', icon: '⚖️', filter: f => f.size > 100 * 1024 * 1024 },
    { id: 'recent', name: 'Recent Downloads', icon: '⬇️', filter: f => { const d = new Date(f.modified); return Date.now() - d.getTime() < 7 * 86400000; } },
    { id: 'empty', name: 'Empty Folders', icon: '📭', filter: f => f.isDirectory && f.size === 0 },
    { id: 'old', name: 'Old Files', icon: '🗓️', filter: f => { const d = new Date(f.accessed || f.modified); return Date.now() - d.getTime() > 365 * 86400000; } },
  ],
  customSmartFolders: [],

  // ── Activity Log ──────────────────────────────────────────────────────────
  activityLog: [],
  loadLog: async (params = {}) => {
    const result = await api.getLog(params);
    if (result.success) set({ activityLog: result.logs });
  },

  // ── Init ─────────────────────────────────────────────────────────────────
  initialized: false,
  init: async () => {
    const homeDir = await api.getHomeDir();
    const { panes } = get();

    await Promise.all([
      get().navigateTo('left', homeDir),
      get().navigateTo('right', homeDir),
      get().loadBookmarks(),
      get().loadAllTags(),
    ]);

    // Set up watcher listener
    api.onWatcherChange((change) => {
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
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
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
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
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
  const videoExts = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
  const pdfExts = ['pdf'];
  const ext = file.extension?.toLowerCase();
  return imageExts.includes(ext) || textExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext) || pdfExts.includes(ext);
}