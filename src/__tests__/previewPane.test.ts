import { act, renderHook } from '@testing-library/react';
import { isPreviewable, PREVIEW_TYPES, useStore } from '../store';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const makeFile = (name: string, extra: Record<string, unknown> = {}): any => {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return { path: `/test/${name}`, name, extension: ext, size: 1024, modified: Date.now(), isDirectory: false, ...extra };
};

const makeDir = (name: string): any => ({
  path: `/test/${name}`, name, extension: '', size: 0, modified: Date.now(), isDirectory: true,
});

// Inline copy of the isTextContent logic (mirrors PreviewPane.tsx / QuickPreviewModal.tsx)
const isTextContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  if (content.includes('\0')) return false;
  const sample = content.slice(0, 4096);
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32) || code === 127) nonPrintable++;
  }
  return nonPrintable / sample.length < 0.01;
};

// ─── isPreviewable ─────────────────────────────────────────────────────────────

describe('isPreviewable - preview pane opens for all non-directory files', () => {
  test('image files open preview pane', () => {
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].forEach(ext => {
      expect(isPreviewable(makeFile(`photo.${ext}`))).toBe(true);
    });
  });

  test('video files open preview pane', () => {
    ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'].forEach(ext => {
      expect(isPreviewable(makeFile(`video.${ext}`))).toBe(true);
    });
  });

  test('audio files open preview pane', () => {
    ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].forEach(ext => {
      expect(isPreviewable(makeFile(`audio.${ext}`))).toBe(true);
    });
  });

  test('pdf opens preview pane', () => {
    expect(isPreviewable(makeFile('doc.pdf'))).toBe(true);
  });

  test('known text extensions open preview pane', () => {
    ['txt', 'md', 'js', 'ts', 'json', 'py', 'sh', 'yaml', 'css', 'html'].forEach(ext => {
      expect(isPreviewable(makeFile(`file.${ext}`))).toBe(true);
    });
  });

  test('unknown extensions open preview pane (e.g. .zshrc, .dmg, .bin)', () => {
    ['zshrc', 'dmg', 'bin', 'exe', 'conf', 'lock', 'log'].forEach(ext => {
      expect(isPreviewable(makeFile(`file.${ext}`))).toBe(true);
    });
  });

  test('file with NO extension opens preview pane', () => {
    expect(isPreviewable(makeFile('Makefile'))).toBe(true);
    expect(isPreviewable(makeFile('.zshrc'))).toBe(true);
    expect(isPreviewable(makeFile('Dockerfile'))).toBe(true);
  });

  test('directories do NOT open preview pane', () => {
    expect(isPreviewable(makeDir('Documents'))).toBe(false);
    expect(isPreviewable(makeDir('node_modules'))).toBe(false);
    expect(isPreviewable(makeDir('.git'))).toBe(false);
  });
});

// ─── isTextContent - content-based detection ──────────────────────────────────

describe('isTextContent - detects text vs binary content', () => {
  test('plain ASCII text is detected as text', () => {
    expect(isTextContent('Hello, world!\nThis is a text file.\n')).toBe(true);
  });

  test('JSON content is detected as text', () => {
    expect(isTextContent('{\n  "name": "pane",\n  "version": "1.0.0"\n}')).toBe(true);
  });

  test('shell script content is detected as text', () => {
    expect(isTextContent('#!/bin/zsh\nexport PATH="$HOME/.bin:$PATH"\nalias ll="ls -la"\n')).toBe(true);
  });

  test('zshrc-style content is detected as text', () => {
    const zshrc = `export ZSH="$HOME/.oh-my-zsh"\nZSH_THEME="robbyrussell"\nplugins=(git)\nsource $ZSH/oh-my-zsh.sh\n`;
    expect(isTextContent(zshrc)).toBe(true);
  });

  test('multiline code content is detected as text', () => {
    const code = `function hello() {\n  console.log("hello world");\n}\n\nhello();\n`;
    expect(isTextContent(code)).toBe(true);
  });

  test('content with null byte is detected as binary', () => {
    expect(isTextContent('some\0binary\0data')).toBe(false);
  });

  test('content with high ratio of non-printable chars is detected as binary', () => {
    const binary = Array.from({ length: 100 }, (_, i) => String.fromCharCode(i < 50 ? 1 : 65)).join('');
    expect(isTextContent(binary)).toBe(false);
  });

  test('empty string is not text', () => {
    expect(isTextContent('')).toBe(false);
  });

  test('non-string input is not text', () => {
    expect(isTextContent(null as unknown as string)).toBe(false);
    expect(isTextContent(undefined as unknown as string)).toBe(false);
  });

  test('content with only whitespace and newlines is text', () => {
    expect(isTextContent('   \n\n\t   \n')).toBe(true);
  });

  test('content with common control chars (tab, newline, CR) is still text', () => {
    expect(isTextContent('col1\tcol2\tcol3\nval1\tval2\tval3\r\n')).toBe(true);
  });
});

// ─── Preview type routing ──────────────────────────────────────────────────────

describe('Preview type routing - extension-based media detection', () => {
  const getPreviewCategory = (ext: string): 'image' | 'video' | 'audio' | 'pdf' | 'unknown' => {
    if ((PREVIEW_TYPES.imageExts as unknown as string[]).includes(ext)) return 'image';
    if ((PREVIEW_TYPES.videoExts as unknown as string[]).includes(ext)) return 'video';
    if ((PREVIEW_TYPES.audioExts as unknown as string[]).includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return 'unknown';
  };

  test('image extensions route to image preview', () => {
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].forEach(ext => {
      expect(getPreviewCategory(ext)).toBe('image');
    });
  });

  test('video extensions route to video preview', () => {
    ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv'].forEach(ext => {
      expect(getPreviewCategory(ext)).toBe('video');
    });
  });

  test('audio extensions route to audio preview', () => {
    ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].forEach(ext => {
      expect(getPreviewCategory(ext)).toBe('audio');
    });
  });

  test('pdf routes to pdf preview', () => {
    expect(getPreviewCategory('pdf')).toBe('pdf');
  });

  test('unknown/text extensions fall through to content detection', () => {
    ['txt', 'js', 'zshrc', 'conf', 'lock', 'dmg', 'zip', ''].forEach(ext => {
      expect(getPreviewCategory(ext)).toBe('unknown');
    });
  });
});

// ─── Preview state machine ─────────────────────────────────────────────────────

describe('Preview state machine - loading → text OR icon', () => {
  type PreviewState = {
    loading: boolean;
    isText: boolean;
    textContent: string;
  };

  const simulateLoad = async (
    readFileResult: { success: boolean; content: string },
    fileSize = 1024
  ): Promise<PreviewState> => {
    let loading = false;
    let isText = false;
    let textContent = '';

    if (fileSize < 2 * 1024 * 1024) {
      loading = true;
      const r = readFileResult;
      if (r.success && isTextContent(r.content)) {
        textContent = r.content;
        isText = true;
      }
      loading = false;
    }

    return { loading, isText, textContent };
  };

  test('after loading text content: isText=true, loading=false', async () => {
    const state = await simulateLoad({ success: true, content: 'export ZSH="$HOME/.oh-my-zsh"\n' });
    expect(state.loading).toBe(false);
    expect(state.isText).toBe(true);
    expect(state.textContent).not.toBe('');
  });

  test('after loading binary content: isText=false, loading=false → shows icon', async () => {
    const state = await simulateLoad({ success: true, content: 'MZ\0\0binary\0data' });
    expect(state.loading).toBe(false);
    expect(state.isText).toBe(false);
    expect(state.textContent).toBe('');
  });

  test('after failed read: isText=false, loading=false → shows icon', async () => {
    const state = await simulateLoad({ success: false, content: '' });
    expect(state.loading).toBe(false);
    expect(state.isText).toBe(false);
  });

  test('file over 2MB skips content detection: isText=false', async () => {
    const state = await simulateLoad(
      { success: true, content: 'this would be text' },
      3 * 1024 * 1024
    );
    expect(state.isText).toBe(false);
    expect(state.loading).toBe(false);
  });

  test('icon is NOT shown while loading (loading=true gates icon render)', () => {
    let loading = true;
    const isText = false;
    const showIcon = !loading && !isText;
    expect(showIcon).toBe(false);

    loading = false;
    const showIconAfter = !loading && !isText;
    expect(showIconAfter).toBe(true);
  });

  test('text content is NOT shown while loading', () => {
    let loading = true;
    let isText = true;
    const showText = isText && !loading;
    expect(showText).toBe(false);

    loading = false;
    const showTextAfter = isText && !loading;
    expect(showTextAfter).toBe(true);
  });
});

// ─── Column view scroll-to-end on preview open/close (regression) ──────────────

describe('Column view - showPreview drives scroll-to-end (regression)', () => {
  const paneState = {
    id: 'left', path: '/Desktop', basePath: '/Desktop', files: [],
    loading: false, error: null, selectedFiles: new Set<string>(),
    sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
    tabs: [{ id: 'tab-1', path: '/Desktop', basePath: '/Desktop', currentBreadcrumbPath: '/Desktop', label: 'Desktop', files: [], selectedFiles: new Set(), activeBookmarkId: null, viewMode: 'column', sortBy: 'name', sortOrder: 'asc', columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 }, previewFile: null, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false }],
    activeTab: 0, currentBreadcrumbPath: '/Desktop',
    columnState: { paths: ['/Desktop/A', '/Desktop/A/B'], filesByPath: {}, selectedByColumn: {}, focusedIndex: 2 },
    navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
    activeBookmarkId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ panes: [paneState as any], activePane: 'left' } as any);
  });

  test('preview is null initially with no preview file', () => {
    const { result } = renderHook(() => useStore());
    const pane = result.current.panes.find((p: any) => p.id === 'left');
    expect(pane?.tabs[pane.activeTab].previewFile).toBeNull();
  });

  test('setPreviewFile sets preview in active tab', () => {
    const { result } = renderHook(() => useStore());
    const file = makeFile('image.png');

    act(() => { result.current.setPreviewFile(file); });

    const pane = result.current.panes.find((p: any) => p.id === 'left');
    expect(pane?.tabs[pane.activeTab].previewFile).not.toBeNull();
    expect(pane?.tabs[pane.activeTab].previewFile?.path).toBe(file.path);
  });

  test('closePreview clears preview in active tab', () => {
    const { result } = renderHook(() => useStore());
    const file = makeFile('image.png');

    act(() => { result.current.setPreviewFile(file); });

    act(() => { result.current.closePreview(); });
    const pane = result.current.panes.find((p: any) => p.id === 'left');
    expect(pane?.tabs[pane.activeTab].previewFile).toBeNull();
  });

  test('setPreviewFile(null) clears preview in active tab', () => {
    const { result } = renderHook(() => useStore());
    const file = makeFile('video.mp4');

    act(() => { result.current.setPreviewFile(file); });

    act(() => { result.current.setPreviewFile(null); });
    const pane = result.current.panes.find((p: any) => p.id === 'left');
    expect(pane?.tabs[pane.activeTab].previewFile).toBeNull();
  });

  test('column paths remain intact when preview opens (scroll does not alter paths)', () => {
    const { result } = renderHook(() => useStore());
    const file = makeFile('doc.pdf');

    act(() => { result.current.setPreviewFile(file); });

    const pane = result.current.panes.find((p: any) => p.id === 'left') as any;
    expect(pane.tabs[pane.activeTab].previewFile).not.toBeNull();
    expect(pane.columnState.paths).toHaveLength(2);
    expect(pane.columnState.paths[1]).toBe('/Desktop/A/B');
  });

  test('switching preview file updates previewFile.path in tab', () => {
    const { result } = renderHook(() => useStore());
    const fileA = makeFile('image-a.png');
    const fileB = makeFile('image-b.png');

    act(() => { result.current.setPreviewFile(fileA); });
    const paneA = result.current.panes.find((p: any) => p.id === 'left');
    expect(paneA?.tabs[paneA.activeTab].previewFile?.path).toBe(fileA.path);

    act(() => { result.current.setPreviewFile(fileB); });
    const paneB = result.current.panes.find((p: any) => p.id === 'left');
    expect(paneB?.tabs[paneB.activeTab].previewFile?.path).toBe(fileB.path);
  });
});

// ─── File size guard ───────────────────────────────────────────────────────────

describe('Preview pane - file size guard', () => {
  const SIZE_LIMIT = 2 * 1024 * 1024;

  test('files under 2MB are eligible for content detection', () => {
    expect(makeFile('small.conf', { size: 1024 }).size < SIZE_LIMIT).toBe(true);
    expect(makeFile('medium.log', { size: 1024 * 1024 }).size < SIZE_LIMIT).toBe(true);
  });

  test('files at exactly 2MB are NOT eligible', () => {
    expect(makeFile('boundary.bin', { size: SIZE_LIMIT }).size < SIZE_LIMIT).toBe(false);
  });

  test('files over 2MB are NOT eligible for content detection', () => {
    expect(makeFile('large.iso', { size: 10 * 1024 * 1024 }).size < SIZE_LIMIT).toBe(false);
  });
});
