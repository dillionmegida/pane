// ─── File System Types ────────────────────────────────────────────────────────

export interface FileItem {
  path: string;
  name: string;
  isDirectory: boolean;
  isSymlink?: boolean;
  symlinkTarget?: string;
  size: number;
  modified?: string;
  birthtime?: string;
  added?: string;
  accessed?: string;
  extension?: string;
  permissions?: string;
  tags?: Tag[];
}

export interface Tag {
  tag_name: string;
  color: string;
}

// ─── Column View ──────────────────────────────────────────────────────────────

export interface ColumnState {
  paths: string[];
  filesByPath: Record<string, FileItem[]>;
  selectedByColumn: Record<number, string>;
  focusedIndex: number;
}

// ─── Navigation History ───────────────────────────────────────────────────────

export interface HistoryEntry {
  basePath: string;
  currentBreadcrumbPath: string;
  selectedFiles: string[];
  previewFilePath: string | null;
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  path: string;
  basePath: string;
  currentBreadcrumbPath: string;
  label: string;
  files: FileItem[];
  selectedFiles: Set<string>;
  activeBookmarkId: string | null;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  columnState: ColumnState;
  previewFile: FileItem | null;
  navigationHistory: HistoryEntry[];
  navigationIndex: number;
  _isRestoringHistory: boolean;
}

// ─── Pane ─────────────────────────────────────────────────────────────────────

export type ViewMode = 'list' | 'grid' | 'column';
export type SortBy = 'name' | 'size' | 'modified' | 'added' | 'extension';
export type SortOrder = 'asc' | 'desc';

export interface Pane {
  id: string;
  path: string;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  selectedFiles: Set<string>;
  sortBy: SortBy;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  tabs: Tab[];
  activeTab: number;
  currentBreadcrumbPath: string;
  basePath: string;
  activeBookmarkId: string | null;
  columnState: ColumnState;
  navigationHistory: HistoryEntry[];
  navigationIndex: number;
  _isRestoringHistory: boolean;
}

// ─── Bookmark ─────────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  name: string;
  path: string;
  icon: string;
}

// ─── Smart Folder ─────────────────────────────────────────────────────────────

export interface SmartFolder {
  id: string;
  name: string;
  icon: string;
  filter: (file: FileItem) => boolean;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  action: string;
  path: string;
  timestamp: string;
  description?: string;
  source?: string;
  destination?: string;
  files_json?: string;
}

// ─── Reveal Target ────────────────────────────────────────────────────────────

export interface RevealTarget {
  paneId: string;
  filePath: string;
  fileDir: string;
  isDirectory: boolean;
  triggerPreview?: boolean;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export interface Breadcrumb {
  name: string;
  path: string;
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

export interface SortType {
  id: SortBy;
  label: string;
  description: string;
  svgInner: string;
}

// ─── Electron API ─────────────────────────────────────────────────────────────

export interface FolderSizeNode {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children?: FolderSizeNode[];
}

export interface DuplicateGroup {
  type: 'exact' | 'near';
  files: Array<{ path: string; size: number; name: string }>;
}

export interface ReadDirResult {
  success: boolean;
  files: FileItem[];
  error?: string;
}

export interface StatResult {
  success: boolean;
  stat: FileItem | null;
  error?: string;
}

export interface GenericResult {
  success: boolean;
  error?: string;
}

export interface TagsResult {
  success: boolean;
  tags: Tag[];
  error?: string;
}

export interface SearchResult {
  success: boolean;
  files: FileItem[];
  error?: string;
}

export interface LogResult {
  success: boolean;
  logs: LogEntry[];
  error?: string;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface WatcherChange {
  dir: string;
  type: string;
  path: string;
}

declare global {
  interface Window {
    electronAPI: {
      readdir: (path: string) => Promise<ReadDirResult>;
      stat: (path: string) => Promise<StatResult>;
      watcherStart: (path: string) => void;
      onWatcherChange: (cb: (change: WatcherChange) => void) => void;
      getHomeDir: () => Promise<string>;
      getBookmarks: () => Promise<Bookmark[]>;
      saveBookmarks: (bookmarks: Bookmark[]) => void;
      getAllTags: () => Promise<TagsResult>;
      addTag: (args: { filePath: string; tagName: string; color?: string | null }) => Promise<GenericResult>;
      removeTag: (args: { filePath: string; tagName: string }) => Promise<GenericResult>;
      getTags: (filePath: string) => Promise<TagsResult>;
      createTag: (args: { tagName: string; color: string }) => Promise<GenericResult>;
      deleteTag: (tagName: string) => Promise<GenericResult>;
      renameTag: (args: { oldName: string; newName: string }) => Promise<GenericResult>;
      recolorTag: (args: { tagName: string; color: string }) => Promise<GenericResult>;
      getFilesForTag: (tagName: string) => Promise<SearchResult>;
      searchByTag: (tagName: string) => Promise<SearchResult>;
      search: (args: { rootPath: string; query: string; options?: Record<string, unknown>; searchId?: number }) => Promise<SearchResult>;
      onSearchComplete?: (cb: (data: { searchId: number; results: FileItem[] }) => void) => void;
      offSearchComplete?: () => void;
      copy: (src: string, dest: string) => Promise<GenericResult>;
      move: (src: string, dest: string) => Promise<GenericResult>;
      delete: (path: string) => Promise<GenericResult>;
      rename: (oldPath: string, newPath: string) => Promise<GenericResult>;
      mkdir: (path: string) => Promise<GenericResult>;
      writeFile: (path: string, content: string) => Promise<GenericResult>;
      openPath: (path: string) => void;
      zip: (args: { files: string[]; destPath: string }) => Promise<GenericResult>;
      unzip: (args: { filePath: string; destDir: string }) => Promise<GenericResult>;
      undo: () => Promise<GenericResult>;
      getLog: (params?: { search?: string; actionType?: string }) => Promise<LogResult>;
      clearLog: () => Promise<GenericResult>;
      chmod: (path: string, mode: string) => Promise<GenericResult>;
      folderSize: (path: string) => Promise<{ success: boolean; tree: FolderSizeNode }>;
      findDuplicates: (path: string) => Promise<{ success: boolean; exact?: DuplicateGroup[]; near?: DuplicateGroup[] }>;
      moveDuplicates: (args: { files: string[]; baseDir: string }) => Promise<GenericResult>;
      batchRename: (renames: Array<{ oldPath: string; newPath: string }>) => Promise<GenericResult>;
      storeGet: (key: string) => Promise<unknown>;
      storeSet: (key: string, value: unknown) => Promise<void>;
      showOpenDialog: (options: Record<string, unknown>) => Promise<OpenDialogResult>;
      getPermissions?: (path: string) => Promise<{ success: boolean; permissions: string }>;
      setPermissions?: (args: { path: string; permissions: string }) => Promise<GenericResult>;
      getDuplicates?: (path: string) => Promise<{ success: boolean; groups: FileItem[][] }>;
    };
  }
}
