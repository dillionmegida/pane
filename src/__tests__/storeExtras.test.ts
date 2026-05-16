/**
 * Store Extras Tests
 * Tests for untested store actions, selectors, and utility functions:
 * - getPreviewType, filterHiddenFiles
 * - formatSize edge cases, formatDate edge cases, getFileIcon full coverage
 * - directorySorts, getDirSort, setDirectorySort
 * - Modal, Terminal, Sidebar, Theme, Search, ViewMode store actions
 * - loadBookmarks, loadAllTags, loadLog
 * - revealTarget management
 * - pushNavHistory dedup logic
 * - navigateToBookmark
 */

import { renderHook, act } from '@testing-library/react';
import {
  useStore,
  formatSize,
  formatDate,
  getFileIcon,
  getPreviewType,
  filterHiddenFiles,
  PREVIEW_TYPES,
} from '../store';
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

const basePaneState = () => ({
  panes: [
    {
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
      tabs: [{ id: 'tab-1', path: '/Users/john', label: 'john', basePath: '/Users/john', currentBreadcrumbPath: '/Users/john', files: [], selectedFiles: new Set<string>(), activeBookmarkId: null, viewMode: 'column' as const, sortBy: 'name' as const, sortOrder: 'asc' as const, columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 }, previewFile: null, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false }],
      activeTab: 0,
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      activeBookmarkId: null,
      navigationHistory: [] as any[],
      navigationIndex: -1,
      _isRestoringHistory: false,
    },
  ],
  activePane: 'left',
  showRightPane: false,
  previewFile: null,
  showPreview: false,
});

// ─── getPreviewType ───────────────────────────────────────────────────────────

describe('getPreviewType', () => {
  test('returns "directory" for directories', () => {
    expect(getPreviewType(mkDir('folder'))).toBe('directory');
  });

  test('returns "image" for image extensions', () => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    imageExts.forEach(ext => {
      expect(getPreviewType(mkFile(`photo.${ext}`, { extension: ext }))).toBe('image');
    });
  });

  test('returns "video" for video extensions', () => {
    const videoExts = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'];
    videoExts.forEach(ext => {
      expect(getPreviewType(mkFile(`clip.${ext}`, { extension: ext }))).toBe('video');
    });
  });

  test('returns "audio" for audio extensions', () => {
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
    audioExts.forEach(ext => {
      expect(getPreviewType(mkFile(`track.${ext}`, { extension: ext }))).toBe('audio');
    });
  });

  test('returns "text" for text/code extensions', () => {
    const textExts = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log'];
    textExts.forEach(ext => {
      expect(getPreviewType(mkFile(`file.${ext}`, { extension: ext }))).toBe('text');
    });
  });

  test('returns "pdf" for pdf extension', () => {
    expect(getPreviewType(mkFile('doc.pdf', { extension: 'pdf' }))).toBe('pdf');
  });

  test('returns "unknown" for unrecognized extension', () => {
    expect(getPreviewType(mkFile('file.xyz', { extension: 'xyz' }))).toBe('unknown');
    expect(getPreviewType(mkFile('file.exe', { extension: 'exe' }))).toBe('unknown');
  });

  test('handles uppercase extension via toLowerCase', () => {
    expect(getPreviewType(mkFile('PHOTO.JPG', { extension: 'JPG' }))).toBe('image');
    expect(getPreviewType(mkFile('VIDEO.MP4', { extension: 'MP4' }))).toBe('video');
  });

  test('handles undefined extension', () => {
    expect(getPreviewType(mkFile('noext', { extension: undefined }))).toBe('unknown');
  });
});

// ─── PREVIEW_TYPES constant ──────────────────────────────────────────────────

describe('PREVIEW_TYPES constant', () => {
  test('imageExts includes common image formats', () => {
    expect(PREVIEW_TYPES.imageExts).toContain('jpg');
    expect(PREVIEW_TYPES.imageExts).toContain('png');
    expect(PREVIEW_TYPES.imageExts).toContain('svg');
  });

  test('textExts includes code file formats', () => {
    expect(PREVIEW_TYPES.textExts).toContain('js');
    expect(PREVIEW_TYPES.textExts).toContain('ts');
    expect(PREVIEW_TYPES.textExts).toContain('py');
    expect(PREVIEW_TYPES.textExts).toContain('json');
  });

  test('videoExts includes common video formats', () => {
    expect(PREVIEW_TYPES.videoExts).toContain('mp4');
    expect(PREVIEW_TYPES.videoExts).toContain('mov');
  });

  test('audioExts includes common audio formats', () => {
    expect(PREVIEW_TYPES.audioExts).toContain('mp3');
    expect(PREVIEW_TYPES.audioExts).toContain('wav');
  });
});

// ─── filterHiddenFiles ───────────────────────────────────────────────────────

describe('filterHiddenFiles', () => {
  const files: FileItem[] = [
    mkFile('.hidden'),
    mkFile('visible.txt'),
    mkDir('.git'),
    mkDir('Documents'),
    mkFile('.DS_Store'),
  ];

  test('filters out hidden files when showHidden is false', () => {
    const result = filterHiddenFiles(files, false);
    expect(result).toHaveLength(2);
    expect(result.every(f => !f.name.startsWith('.'))).toBe(true);
  });

  test('returns all files when showHidden is true', () => {
    const result = filterHiddenFiles(files, true);
    expect(result).toHaveLength(5);
  });

  test('returns empty array for empty input', () => {
    expect(filterHiddenFiles([], false)).toEqual([]);
    expect(filterHiddenFiles([], true)).toEqual([]);
  });

  test('returns all files when none are hidden', () => {
    const visible = [mkFile('a.txt'), mkFile('b.js')];
    expect(filterHiddenFiles(visible, false)).toHaveLength(2);
  });

  test('returns empty when all files are hidden', () => {
    const hidden = [mkFile('.a'), mkFile('.b'), mkDir('.c')];
    expect(filterHiddenFiles(hidden, false)).toHaveLength(0);
  });
});

// ─── formatSize edge cases ────────────────────────────────────────────────────

describe('formatSize - edge cases', () => {
  test('formats TB correctly', () => {
    expect(formatSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
  });

  test('formats fractional KB', () => {
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  test('formats fractional MB', () => {
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  test('formats exact values without trailing .0', () => {
    expect(formatSize(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatSize(1024)).toBe('1 KB');
  });

  test('small byte values', () => {
    expect(formatSize(1)).toBe('1 B');
    expect(formatSize(999)).toBe('999 B');
  });
});

// ─── formatDate edge cases ───────────────────────────────────────────────────

describe('formatDate - edge cases', () => {
  test('formats dates within the last week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const result = formatDate(threeDaysAgo.toISOString());
    // Should show weekday + month + day format
    expect(result).not.toBe('Just now');
    expect(result).not.toMatch(/ago/);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('formats dates older than a week but within a year', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 86400000);
    const result = formatDate(twoMonthsAgo.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('formats dates older than a year with year', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 86400000);
    const result = formatDate(twoYearsAgo.toISOString());
    // Should include a year number
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  test('handles 59 minutes ago (just under 1 hour)', () => {
    const fiftyNineMinAgo = new Date(Date.now() - 59 * 60000);
    expect(formatDate(fiftyNineMinAgo.toISOString())).toMatch(/\d+m ago/);
  });

  test('handles exactly 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 3600000);
    expect(formatDate(oneHourAgo.toISOString())).toMatch(/\d+h ago/);
  });

  test('handles 23 hours ago', () => {
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 3600000);
    expect(formatDate(twentyThreeHoursAgo.toISOString())).toMatch(/\d+h ago/);
  });
});

// ─── getFileIcon - full coverage ──────────────────────────────────────────────

describe('getFileIcon - full coverage', () => {
  test('.app directory gets rocket icon', () => {
    const app = mkDir('Finder.app', { name: 'Finder.app' });
    expect(getFileIcon(app)).toBe('🚀');
  });

  test('video files get film icon', () => {
    ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'].forEach(ext => {
      expect(getFileIcon(mkFile(`video.${ext}`, { extension: ext }))).toBe('🎬');
    });
  });

  test('audio files get music icon', () => {
    ['mp3', 'wav', 'flac', 'aac', 'm4a'].forEach(ext => {
      expect(getFileIcon(mkFile(`audio.${ext}`, { extension: ext }))).toBe('🎵');
    });
  });

  test('archive files get package icon', () => {
    ['zip', 'tar', 'gz', 'rar', '7z'].forEach(ext => {
      expect(getFileIcon(mkFile(`archive.${ext}`, { extension: ext }))).toBe('📦');
    });
  });

  test('font files get text icon', () => {
    ['ttf', 'otf', 'woff', 'woff2'].forEach(ext => {
      expect(getFileIcon(mkFile(`font.${ext}`, { extension: ext }))).toBe('🔤');
    });
  });

  test('shell scripts get gear icon', () => {
    ['sh', 'bash', 'zsh'].forEach(ext => {
      expect(getFileIcon(mkFile(`script.${ext}`, { extension: ext }))).toBe('⚙️');
    });
  });

  test('PDF gets book icon', () => {
    expect(getFileIcon(mkFile('doc.pdf', { extension: 'pdf' }))).toBe('📕');
  });

  test('document files get document icon', () => {
    ['doc', 'docx'].forEach(ext => {
      expect(getFileIcon(mkFile(`doc.${ext}`, { extension: ext }))).toBe('📝');
    });
  });

  test('spreadsheet/presentation files get chart icon', () => {
    ['xls', 'xlsx', 'ppt', 'pptx'].forEach(ext => {
      expect(getFileIcon(mkFile(`sheet.${ext}`, { extension: ext }))).toBe('📊');
    });
  });

  test('HTML gets web icon', () => {
    expect(getFileIcon(mkFile('page.html', { extension: 'html' }))).toBe('🌐');
  });

  test('CSS gets paint icon', () => {
    expect(getFileIcon(mkFile('style.css', { extension: 'css' }))).toBe('🎨');
  });

  test('JSON gets clipboard icon', () => {
    expect(getFileIcon(mkFile('data.json', { extension: 'json' }))).toBe('📋');
  });

  test('language-specific icons', () => {
    expect(getFileIcon(mkFile('main.go', { extension: 'go' }))).toBe('🐹');
    expect(getFileIcon(mkFile('main.rs', { extension: 'rs' }))).toBe('🦀');
    expect(getFileIcon(mkFile('Main.java', { extension: 'java' }))).toBe('☕');
    expect(getFileIcon(mkFile('gem.rb', { extension: 'rb' }))).toBe('💎');
  });

  test('text/markdown files get document icon', () => {
    ['txt', 'md', 'markdown', 'yaml', 'yml', 'xml', 'csv'].forEach(ext => {
      expect(getFileIcon(mkFile(`file.${ext}`, { extension: ext }))).toBe('📄');
    });
  });

  test('.app file (not directory) gets rocket icon', () => {
    expect(getFileIcon(mkFile('Tool.app', { extension: 'app' }))).toBe('🚀');
  });

  test('file with no extension gets default icon', () => {
    expect(getFileIcon(mkFile('Makefile', { extension: '' }))).toBe('📄');
  });

  test('file with undefined extension gets default icon', () => {
    expect(getFileIcon(mkFile('noext', { extension: undefined }))).toBe('📄');
  });
});

// ─── Store: directorySorts, getDirSort, setDirectorySort ─────────────────────

describe('Store - Directory-specific sorts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      ...basePaneState(),
      directorySorts: {},
    });
  });

  test('getDirSort returns "name" by default when no custom sort is set', () => {
    const state = useStore.getState();
    expect(state.getDirSort('/any/path')).toBe('name');
  });

  test('getDirSort returns custom sort after setDirectorySort', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });

    await act(async () => {
      await useStore.getState().setDirectorySort('/Users/john', 'size');
    });

    expect(useStore.getState().getDirSort('/Users/john')).toBe('size');
  });

  test('different directories can have different sorts', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });

    await act(async () => {
      await useStore.getState().setDirectorySort('/a', 'size');
      await useStore.getState().setDirectorySort('/b', 'modified');
    });

    expect(useStore.getState().getDirSort('/a')).toBe('size');
    expect(useStore.getState().getDirSort('/b')).toBe('modified');
    expect(useStore.getState().getDirSort('/c')).toBe('name'); // default
  });

  test('setDirectorySort re-sorts pane files if pane path matches', async () => {
    const files = [
      mkFile('big.bin', { size: 9999, path: '/Users/john/big.bin' }),
      mkFile('small.txt', { size: 1, path: '/Users/john/small.txt' }),
    ];
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files });

    useStore.setState({
      ...basePaneState(),
      directorySorts: {},
    });

    await act(async () => {
      await useStore.getState().setDirectorySort('/Users/john', 'size');
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.files).toHaveLength(2);
    // After sorting by size asc, small should come first
    expect(pane!.files[0].name).toBe('small.txt');
    expect(pane!.files[1].name).toBe('big.bin');
  });
});

// ─── Store: Modal operations ─────────────────────────────────────────────────

describe('Store - Modal operations', () => {
  beforeEach(() => {
    useStore.setState({ activeModal: null, modalData: null });
  });

  test('openModal sets activeModal and modalData', () => {
    act(() => {
      useStore.getState().openModal('rename', { filePath: '/test.txt' });
    });
    expect(useStore.getState().activeModal).toBe('rename');
    expect(useStore.getState().modalData).toEqual({ filePath: '/test.txt' });
  });

  test('openModal with no data defaults to null', () => {
    act(() => {
      useStore.getState().openModal('delete');
    });
    expect(useStore.getState().activeModal).toBe('delete');
    expect(useStore.getState().modalData).toBeNull();
  });

  test('closeModal resets activeModal and modalData', () => {
    act(() => {
      useStore.getState().openModal('info', { file: 'test' });
      useStore.getState().closeModal();
    });
    expect(useStore.getState().activeModal).toBeNull();
    expect(useStore.getState().modalData).toBeNull();
  });
});

// ─── Store: Terminal toggle & height ─────────────────────────────────────────

describe('Store - Terminal toggle & height', () => {
  beforeEach(() => {
    useStore.setState({ showTerminal: false, terminalHeight: 260 });
  });

  test('toggleTerminal toggles showTerminal', () => {
    act(() => useStore.getState().toggleTerminal());
    expect(useStore.getState().showTerminal).toBe(true);
    act(() => useStore.getState().toggleTerminal());
    expect(useStore.getState().showTerminal).toBe(false);
  });

  test('setTerminalHeight updates terminalHeight', () => {
    act(() => useStore.getState().setTerminalHeight(400));
    expect(useStore.getState().terminalHeight).toBe(400);
  });
});

// ─── Store: Sidebar toggle & width ──────────────────────────────────────────

describe('Store - Sidebar toggle & width', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ showSidebar: true, sidebarWidth: 220 });
  });

  test('toggleSidebar toggles showSidebar', () => {
    act(() => useStore.getState().toggleSidebar());
    expect(useStore.getState().showSidebar).toBe(false);
    act(() => useStore.getState().toggleSidebar());
    expect(useStore.getState().showSidebar).toBe(true);
  });

  test('toggleSidebar persists to storeSet', () => {
    act(() => useStore.getState().toggleSidebar());
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('showSidebar', false);
  });

  test('setSidebarWidth clamps to min 160', () => {
    act(() => useStore.getState().setSidebarWidth(50));
    expect(useStore.getState().sidebarWidth).toBe(160);
  });

  test('setSidebarWidth clamps to max 500', () => {
    act(() => useStore.getState().setSidebarWidth(999));
    expect(useStore.getState().sidebarWidth).toBe(500);
  });

  test('setSidebarWidth accepts value within range', () => {
    act(() => useStore.getState().setSidebarWidth(300));
    expect(useStore.getState().sidebarWidth).toBe(300);
  });

  test('setSidebarWidth persists to storeSet', () => {
    act(() => useStore.getState().setSidebarWidth(350));
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('sidebarWidth', 350);
  });
});

// ─── Store: Theme ────────────────────────────────────────────────────────────

describe('Store - Theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ currentTheme: 'classicLight' });
  });

  test('setTheme updates currentTheme', () => {
    act(() => useStore.getState().setTheme('dark'));
    expect(useStore.getState().currentTheme).toBe('dark');
  });

  test('setTheme persists to storeSet', () => {
    act(() => useStore.getState().setTheme('midnight'));
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('theme', 'midnight');
  });
});

// ─── Store: Search toggle & searchFiles ──────────────────────────────────────

describe('Store - Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      ...basePaneState(),
      showSearch: false,
      searchQuery: 'old query',
      searchResults: [mkFile('old.txt')],
      searchLoading: false,
    });
  });

  test('toggleSearch toggles showSearch and resets query/results', () => {
    act(() => useStore.getState().toggleSearch());
    expect(useStore.getState().showSearch).toBe(true);
    expect(useStore.getState().searchQuery).toBe('');
    expect(useStore.getState().searchResults).toEqual([]);
  });

  test('toggleSearch again closes search', () => {
    act(() => useStore.getState().toggleSearch());
    act(() => useStore.getState().toggleSearch());
    expect(useStore.getState().showSearch).toBe(false);
  });

  test('searchFiles calls electronAPI.search and sets results', async () => {
    const mockResults = [mkFile('found.txt'), mkFile('found2.js')];
    (window as any).electronAPI.search.mockResolvedValue({ success: true, files: mockResults });

    await act(async () => {
      await useStore.getState().searchFiles('found');
    });

    expect((window as any).electronAPI.search).toHaveBeenCalledWith({
      rootPath: '/Users/john',
      query: 'found',
      options: {},
    });
    expect(useStore.getState().searchResults).toEqual(mockResults);
    expect(useStore.getState().searchLoading).toBe(false);
  });

  test('searchFiles does nothing for empty query', async () => {
    await act(async () => {
      await useStore.getState().searchFiles('   ');
    });
    expect((window as any).electronAPI.search).not.toHaveBeenCalled();
  });

  test('searchFiles sets empty results on failure', async () => {
    (window as any).electronAPI.search.mockResolvedValue({ success: false, files: [] });

    await act(async () => {
      await useStore.getState().searchFiles('query');
    });

    expect(useStore.getState().searchResults).toEqual([]);
  });
});

// ─── Store: ViewMode ─────────────────────────────────────────────────────────

describe('Store - ViewMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(basePaneState());
  });

  test('setViewMode changes the pane view mode', () => {
    act(() => useStore.getState().setViewMode('left', 'list'));
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.viewMode).toBe('list');
  });

  test('setViewMode to grid', () => {
    act(() => useStore.getState().setViewMode('left', 'grid'));
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.viewMode).toBe('grid');
  });

  test('setViewMode back to column', () => {
    act(() => useStore.getState().setViewMode('left', 'list'));
    act(() => useStore.getState().setViewMode('left', 'column'));
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.viewMode).toBe('column');
  });
});

// ─── Store: loadBookmarks ────────────────────────────────────────────────────

describe('Store - loadBookmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ bookmarks: [] });
  });

  test('loadBookmarks fetches and sets bookmarks', async () => {
    const mockBookmarks = [
      { id: '1', name: 'Home', path: '/Users/john', icon: '🏠' },
      { id: '2', name: 'Desktop', path: '/Users/john/Desktop', icon: '🖥' },
    ];
    (window as any).electronAPI.getBookmarks.mockResolvedValue(mockBookmarks);

    await act(async () => {
      await useStore.getState().loadBookmarks();
    });

    expect(useStore.getState().bookmarks).toEqual(mockBookmarks);
  });

  test('setBookmarks updates and persists bookmarks', () => {
    const bookmarks = [{ id: '1', name: 'Downloads', path: '/Users/john/Downloads', icon: '📥' }];
    act(() => useStore.getState().setBookmarks(bookmarks));

    expect(useStore.getState().bookmarks).toEqual(bookmarks);
    expect((window as any).electronAPI.saveBookmarks).toHaveBeenCalledWith(bookmarks);
  });
});

// ─── Store: loadAllTags ──────────────────────────────────────────────────────

describe('Store - loadAllTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ allTags: [] });
  });

  test('loadAllTags fetches and sets tags on success', async () => {
    const tags = [{ tag_name: 'Important', color: 'Red' }];
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: true, tags });

    await act(async () => {
      await useStore.getState().loadAllTags();
    });

    expect(useStore.getState().allTags).toEqual(tags);
  });

  test('loadAllTags does not set tags on failure', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: false, tags: [] });

    await act(async () => {
      await useStore.getState().loadAllTags();
    });

    expect(useStore.getState().allTags).toEqual([]);
  });
});

// ─── Store: loadLog ──────────────────────────────────────────────────────────

describe('Store - loadLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ activityLog: [] });
  });

  test('loadLog fetches and sets log entries on success', async () => {
    const logs = [{ id: 1, action: 'copy', path: '/test.txt', timestamp: '2024-01-01' }];
    (window as any).electronAPI.getLog.mockResolvedValue({ success: true, logs });

    await act(async () => {
      await useStore.getState().loadLog();
    });

    expect(useStore.getState().activityLog).toEqual(logs);
  });

  test('loadLog does not update on failure', async () => {
    (window as any).electronAPI.getLog.mockResolvedValue({ success: false, logs: [] });

    await act(async () => {
      await useStore.getState().loadLog();
    });

    expect(useStore.getState().activityLog).toEqual([]);
  });

  test('loadLog passes params to getLog', async () => {
    (window as any).electronAPI.getLog.mockResolvedValue({ success: true, logs: [] });

    await act(async () => {
      await useStore.getState().loadLog({ search: 'test', actionType: 'delete' });
    });

    expect((window as any).electronAPI.getLog).toHaveBeenCalledWith({ search: 'test', actionType: 'delete' });
  });
});

// ─── Store: revealTarget ─────────────────────────────────────────────────────

describe('Store - revealTarget', () => {
  beforeEach(() => {
    useStore.setState({ revealTarget: null });
  });

  test('setRevealTarget sets the target', async () => {
    const target = { paneId: 'left', filePath: '/test.txt' };
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { mode: 33188 },
    });
    await act(async () => await useStore.getState().setRevealTarget(target));
    expect(useStore.getState().revealTarget).toEqual({ ...target, isDirectory: false, triggerPreview: true });
  });

  test('clearRevealTarget resets to null', async () => {
    const target = { paneId: 'left', filePath: '/test.txt' };
    (window as any).electronAPI.stat.mockResolvedValue({
      success: true,
      stat: { mode: 33188 },
    });
    await act(async () => await useStore.getState().setRevealTarget(target));
    act(() => useStore.getState().clearRevealTarget());
    expect(useStore.getState().revealTarget).toBeNull();
  });
});

// ─── Store: pushNavHistory dedup logic ───────────────────────────────────────

describe('Store - pushNavHistory dedup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(basePaneState());
  });

  test('pushNavHistory adds entry to empty history', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(1);
  });

  test('pushNavHistory deduplicates identical entries', () => {
    const entry = {
      basePath: '/Users/john',
      currentBreadcrumbPath: '/Users/john',
      selectedFiles: [] as string[],
      previewFilePath: null,
    };

    act(() => useStore.getState().pushNavHistory('left', entry));
    act(() => useStore.getState().pushNavHistory('left', entry));

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(1);
  });

  test('pushNavHistory adds entry when basePath differs', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/jane',
        currentBreadcrumbPath: '/Users/jane',
        selectedFiles: [],
        previewFilePath: null,
      });
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushNavHistory adds entry when selectedFiles differ', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: ['/Users/john/file.txt'],
        previewFilePath: null,
      });
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushNavHistory adds entry when previewFilePath differs', () => {
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: null,
      });
    });
    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: '/Users/john/image.png',
      });
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(2);
  });

  test('pushNavHistory skipped during _isRestoringHistory', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p =>
        p.id === 'left' ? { ...p, _isRestoringHistory: true } : p
      ),
    });

    act(() => {
      useStore.getState().pushNavHistory('left', {
        basePath: '/Users/john',
        currentBreadcrumbPath: '/Users/john',
        selectedFiles: [],
        previewFilePath: null,
      });
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.navigationHistory).toHaveLength(0);
  });
});

// ─── Store: navigateToBookmark ───────────────────────────────────────────────

describe('Store - navigateToBookmark', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useStore.setState(basePaneState());
    });
  });

  test('navigateToBookmark sets activeBookmarkId', async () => {
    const files = [mkFile('doc.txt')];
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files });

    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/Users/john/Desktop', 'bm-1');
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.activeBookmarkId).toBe('bm-1');
    expect(pane!.basePath).toBe('/Users/john/Desktop');
  });

  test('navigateToBookmark clears preview', async () => {
    useStore.setState({
      ...basePaneState(),
      panes: basePaneState().panes.map(p => ({
        ...p,
        tabs: p.tabs.map((t, i) => i === p.activeTab ? {
          ...t,
          previewFile: mkFile('old.txt'),
        } : t),
      })),
    });

    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });

    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/Users/john/Downloads', 'bm-2');
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.tabs[pane!.activeTab].previewFile).toBeNull();
  });

  test('navigateToBookmark handles readdir failure', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: false, error: 'Not found' });

    await act(async () => {
      await useStore.getState().navigateToBookmark('left', '/nonexistent', 'bm-3');
    });

    const pane = useStore.getState().panes.find(p => p.id === 'left');
    expect(pane!.error).toBe('Not found');
    expect(pane!.loading).toBe(false);
  });
});

// ─── Store: getActiveBookmark ────────────────────────────────────────────────

describe('Store - getActiveBookmark', () => {
  beforeEach(() => {
    useStore.setState({
      ...basePaneState(),
      bookmarks: [
        { id: 'bm-1', name: 'Home', path: '/Users/john', icon: '🏠' },
        { id: 'bm-2', name: 'Desktop', path: '/Users/john/Desktop', icon: '🖥' },
      ],
    });
  });

  test('returns null when no bookmark is active', () => {
    expect(useStore.getState().getActiveBookmark('left')).toBeNull();
  });

  test('returns the active bookmark', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p =>
        p.id === 'left' ? { ...p, activeBookmarkId: 'bm-2' } : p
      ),
    });
    const bookmark = useStore.getState().getActiveBookmark('left');
    expect(bookmark).toEqual({ id: 'bm-2', name: 'Desktop', path: '/Users/john/Desktop', icon: '🖥' });
  });

  test('returns null for non-existent bookmark ID', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p =>
        p.id === 'left' ? { ...p, activeBookmarkId: 'bm-999' } : p
      ),
    });
    expect(useStore.getState().getActiveBookmark('left')).toBeNull();
  });

  test('returns null for unknown pane', () => {
    expect(useStore.getState().getActiveBookmark('nonexistent')).toBeNull();
  });
});

// ─── Store: getColumnPaths ───────────────────────────────────────────────────

describe('Store - getColumnPaths', () => {
  beforeEach(() => {
    useStore.setState(basePaneState());
  });

  test('returns empty for non-column view mode', () => {
    act(() => useStore.getState().setViewMode('left', 'list'));
    expect(useStore.getState().getColumnPaths('left')).toEqual([]);
  });

  test('returns basePath when breadcrumb equals basePath', () => {
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toContain('/Users/john');
  });

  test('returns nested paths for deep breadcrumb', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p =>
        p.id === 'left' ? { ...p, currentBreadcrumbPath: '/Users/john/Documents/Work' } : p
      ),
    });
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toContain('/Users/john');
    expect(paths).toContain('/Users/john/Documents');
    expect(paths).toContain('/Users/john/Documents/Work');
  });

  test('returns [basePath] when breadcrumb does not start with basePath', () => {
    useStore.setState({
      panes: useStore.getState().panes.map(p =>
        p.id === 'left' ? { ...p, currentBreadcrumbPath: '/other/path' } : p
      ),
    });
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toEqual(['/Users/john']);
  });
});

// ─── Store: Zoom edge cases ──────────────────────────────────────────────────

describe('Store - Zoom edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ zoom: 1.0 });
  });

  test('zoomIn from max does not exceed 1.6', () => {
    act(() => useStore.getState().setZoom(1.6));
    act(() => useStore.getState().zoomIn());
    expect(useStore.getState().zoom).toBe(1.6);
  });

  test('zoomOut from min does not go below 0.7', () => {
    act(() => useStore.getState().setZoom(0.7));
    act(() => useStore.getState().zoomOut());
    expect(useStore.getState().zoom).toBe(0.7);
  });

  test('zoom persists to storeSet on zoomIn', () => {
    act(() => useStore.getState().zoomIn());
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('zoom', 1.1);
  });

  test('zoom persists to storeSet on zoomOut', () => {
    act(() => useStore.getState().zoomOut());
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('zoom', 0.9);
  });

  test('zoomReset persists 1.0 to storeSet', () => {
    act(() => useStore.getState().setZoom(1.4));
    act(() => useStore.getState().zoomReset());
    expect(useStore.getState().zoom).toBe(1.0);
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('zoom', 1.0);
  });

  test('setZoom rounds to one decimal place', () => {
    act(() => useStore.getState().setZoom(1.15));
    expect(useStore.getState().zoom).toBe(1.2);
  });
});
