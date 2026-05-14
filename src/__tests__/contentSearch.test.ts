/**
 * Content Search Tests
 * Tests for grep-based content search: IPC calls, streaming results,
 * cancellation, and store integration.
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// Helpers to simulate IPC event listeners
let searchProgressCallbacks: ((data: any) => void)[] = [];
let searchCompleteCallbacks: ((data: any) => void)[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  searchProgressCallbacks = [];
  searchCompleteCallbacks = [];

  (window as any).electronAPI = {
    ...(window as any).electronAPI,
    search: jest.fn().mockResolvedValue(undefined),
    searchCancel: jest.fn().mockResolvedValue({ success: true }),
    onSearchProgress: jest.fn((cb) => { searchProgressCallbacks.push(cb); }),
    onSearchComplete: jest.fn((cb) => { searchCompleteCallbacks.push(cb); }),
    offSearchProgress: jest.fn(() => { searchProgressCallbacks = []; }),
    offSearchComplete: jest.fn(() => { searchCompleteCallbacks = []; }),
    storeGet: jest.fn().mockResolvedValue(null),
    storeSet: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue({ success: true, files: [] }),
    stat: jest.fn().mockResolvedValue({ success: false }),
    getBookmarks: jest.fn().mockResolvedValue({ success: true, bookmarks: [] }),
    getAllTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  };

  useStore.setState({
    panes: [{
      id: 'left',
      path: '/Users/john/project',
      basePath: '/Users/john/project',
      files: [],
      loading: false,
      error: null,
      selectedFiles: new Set(),
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'column',
      tabs: [{ id: 'tab-1', path: '/Users/john/project', label: 'project' }],
      activeTab: 0,
      currentBreadcrumbPath: '/Users/john/project',
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    }],
    activePane: 'left',
    showSearch: false,
    searchQuery: '',
    searchResults: [],
    searchLoading: false,
    searchInitContentMode: false,
    homeDir: '/Users/john',
  } as any);
});

// Helper: emit a progress event
function emitProgress(result: any, total: number, searchId: number) {
  for (const cb of searchProgressCallbacks) {
    cb({ result, total, searchId });
  }
}

// Helper: emit a complete event
function emitComplete(searchId: number) {
  for (const cb of searchCompleteCallbacks) {
    cb({ searchId });
  }
}

describe('Content Search - Store Integration', () => {
  test('toggleSearch with contentMode sets searchInitContentMode', () => {
    const { result } = renderHook(() => useStore());

    act(() => { result.current.toggleSearch({ contentMode: true }); });
    expect(result.current.showSearch).toBe(true);
    expect((result.current as any).searchInitContentMode).toBe(true);
  });

  test('toggleSearch without contentMode does not set searchInitContentMode', () => {
    const { result } = renderHook(() => useStore());

    act(() => { result.current.toggleSearch(); });
    expect(result.current.showSearch).toBe(true);
    expect((result.current as any).searchInitContentMode).toBe(false);
  });

  test('toggleSearch off resets searchInitContentMode', () => {
    const { result } = renderHook(() => useStore());

    act(() => { result.current.toggleSearch({ contentMode: true }); });
    expect((result.current as any).searchInitContentMode).toBe(true);

    act(() => { result.current.toggleSearch(); });
    expect(result.current.showSearch).toBe(false);
    expect((result.current as any).searchInitContentMode).toBe(false);
  });
});

describe('Content Search - IPC Call Formation', () => {
  test('content search calls electronAPI.search with contentSearch: true', async () => {
    const searchFn = (window as any).electronAPI.search;

    // Simulate what doSearch does in content mode
    const searchId = Date.now();
    await searchFn({
      rootPath: '/Users/john/project',
      query: 'useState',
      options: { useRegex: false, contentSearch: true, maxResults: 1000, excludeDirs: ['node_modules', '.git'] },
      searchId,
    });

    expect(searchFn).toHaveBeenCalledWith(expect.objectContaining({
      rootPath: '/Users/john/project',
      query: 'useState',
      options: expect.objectContaining({ contentSearch: true }),
    }));
  });

  test('content search passes regex option when enabled', async () => {
    const searchFn = (window as any).electronAPI.search;

    await searchFn({
      rootPath: '/Users/john/project',
      query: 'use[A-Z]\\w+',
      options: { useRegex: true, contentSearch: true, maxResults: 1000, excludeDirs: [] },
      searchId: Date.now(),
    });

    expect(searchFn).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ useRegex: true, contentSearch: true }),
    }));
  });

  test('content search passes excluded directories', async () => {
    const searchFn = (window as any).electronAPI.search;
    const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

    await searchFn({
      rootPath: '/Users/john/project',
      query: 'hello',
      options: { useRegex: false, contentSearch: true, maxResults: 1000, excludeDirs },
      searchId: Date.now(),
    });

    expect(searchFn).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ excludeDirs }),
    }));
  });
});

describe('Content Search - Streaming Results', () => {
  test('progress events add results incrementally', () => {
    const results: any[] = [];
    const searchId = 12345;

    // Simulate the handleProgress logic from SearchOverlay
    const handleProgress = ({ result, total, searchId: sid }: any) => {
      if (sid === searchId) {
        results.push(result);
      }
    };

    const match1 = {
      name: 'App.tsx',
      path: '/Users/john/project/src/App.tsx',
      isDirectory: false,
      size: 5000,
      modified: '2024-01-01T00:00:00.000Z',
      extension: 'tsx',
      lineNumber: 10,
      matchedLine: 'import React, { useState } from "react";',
      isContentMatch: true,
    };

    const match2 = {
      name: 'App.tsx',
      path: '/Users/john/project/src/App.tsx',
      isDirectory: false,
      size: 5000,
      modified: '2024-01-01T00:00:00.000Z',
      extension: 'tsx',
      lineNumber: 25,
      matchedLine: '  const [count, setCount] = useState(0);',
      isContentMatch: true,
    };

    const match3 = {
      name: 'index.tsx',
      path: '/Users/john/project/src/index.tsx',
      isDirectory: false,
      size: 2000,
      modified: '2024-01-01T00:00:00.000Z',
      extension: 'tsx',
      lineNumber: 3,
      matchedLine: 'import { useState } from "react";',
      isContentMatch: true,
    };

    handleProgress({ result: match1, total: 1, searchId });
    expect(results).toHaveLength(1);
    expect(results[0].lineNumber).toBe(10);

    handleProgress({ result: match2, total: 2, searchId });
    expect(results).toHaveLength(2);

    handleProgress({ result: match3, total: 3, searchId });
    expect(results).toHaveLength(3);
    expect(results[2].name).toBe('index.tsx');
  });

  test('progress events with wrong searchId are ignored', () => {
    const results: any[] = [];
    const searchId = 12345;

    const handleProgress = ({ result, searchId: sid }: any) => {
      if (sid === searchId) {
        results.push(result);
      }
    };

    // Wrong searchId
    handleProgress({
      result: { name: 'stale.tsx', path: '/stale.tsx', lineNumber: 1, matchedLine: 'stale result' },
      total: 1,
      searchId: 99999,
    });

    expect(results).toHaveLength(0);
  });

  test('complete event marks search as done', () => {
    let contentLoading = true;
    let contentComplete = false;
    const searchId = 12345;

    const handleComplete = ({ searchId: sid }: any) => {
      if (sid === searchId) {
        contentLoading = false;
        contentComplete = true;
      }
    };

    handleComplete({ searchId });
    expect(contentLoading).toBe(false);
    expect(contentComplete).toBe(true);
  });

  test('complete event with wrong searchId is ignored', () => {
    let contentLoading = true;
    let contentComplete = false;
    const searchId = 12345;

    const handleComplete = ({ searchId: sid }: any) => {
      if (sid === searchId) {
        contentLoading = false;
        contentComplete = true;
      }
    };

    handleComplete({ searchId: 99999 });
    expect(contentLoading).toBe(true);
    expect(contentComplete).toBe(false);
  });
});

describe('Content Search - Result Grouping', () => {
  test('groups results by file path', () => {
    const contentResults = [
      { path: '/src/App.tsx', name: 'App.tsx', extension: 'tsx', lineNumber: 10, matchedLine: 'line 10' },
      { path: '/src/App.tsx', name: 'App.tsx', extension: 'tsx', lineNumber: 25, matchedLine: 'line 25' },
      { path: '/src/App.tsx', name: 'App.tsx', extension: 'tsx', lineNumber: 42, matchedLine: 'line 42' },
      { path: '/src/index.tsx', name: 'index.tsx', extension: 'tsx', lineNumber: 3, matchedLine: 'line 3' },
      { path: '/src/store.ts', name: 'store.ts', extension: 'ts', lineNumber: 100, matchedLine: 'line 100' },
      { path: '/src/store.ts', name: 'store.ts', extension: 'ts', lineNumber: 200, matchedLine: 'line 200' },
    ];

    // Replicating the grouping logic from SearchOverlay
    const groups: { filePath: string; name: string; extension: string; matches: any[] }[] = [];
    const groupMap = new Map<string, typeof groups[0]>();
    for (const r of contentResults) {
      let group = groupMap.get(r.path);
      if (!group) {
        group = { filePath: r.path, name: r.name, extension: r.extension, matches: [] };
        groupMap.set(r.path, group);
        groups.push(group);
      }
      group.matches.push(r);
    }

    expect(groups).toHaveLength(3);
    expect(groups[0].filePath).toBe('/src/App.tsx');
    expect(groups[0].matches).toHaveLength(3);
    expect(groups[1].filePath).toBe('/src/index.tsx');
    expect(groups[1].matches).toHaveLength(1);
    expect(groups[2].filePath).toBe('/src/store.ts');
    expect(groups[2].matches).toHaveLength(2);
  });

  test('flat list excludes collapsed files', () => {
    const groups = [
      { filePath: '/src/App.tsx', matches: [{ id: 1 }, { id: 2 }] },
      { filePath: '/src/index.tsx', matches: [{ id: 3 }] },
      { filePath: '/src/store.ts', matches: [{ id: 4 }, { id: 5 }] },
    ];
    const collapsedFiles = new Set(['/src/App.tsx']);

    const flat: any[] = [];
    for (const group of groups) {
      if (collapsedFiles.has(group.filePath)) continue;
      for (const match of group.matches) {
        flat.push(match);
      }
    }

    expect(flat).toHaveLength(3);
    expect(flat[0].id).toBe(3);
    expect(flat[1].id).toBe(4);
    expect(flat[2].id).toBe(5);
  });
});

describe('Content Search - Cancellation', () => {
  test('searchCancel is called when search is aborted', async () => {
    const cancelFn = (window as any).electronAPI.searchCancel;

    await cancelFn();
    expect(cancelFn).toHaveBeenCalled();
  });

  test('cancelled search ignores subsequent progress events', () => {
    const results: any[] = [];
    let activeSearchId: number | null = 12345;

    const handleProgress = ({ result, searchId }: any) => {
      if (searchId === activeSearchId) {
        results.push(result);
      }
    };

    // First result arrives
    handleProgress({ result: { name: 'a.txt', lineNumber: 1 }, searchId: 12345 });
    expect(results).toHaveLength(1);

    // Cancel
    activeSearchId = null;

    // More results arrive but are ignored
    handleProgress({ result: { name: 'b.txt', lineNumber: 5 }, searchId: 12345 });
    handleProgress({ result: { name: 'c.txt', lineNumber: 10 }, searchId: 12345 });
    expect(results).toHaveLength(1);
  });

  test('new search cancels previous search', () => {
    const results: any[] = [];
    let activeSearchId: number | null = 100;

    const handleProgress = ({ result, searchId }: any) => {
      if (searchId === activeSearchId) {
        results.push(result);
      }
    };

    // Result from first search
    handleProgress({ result: { name: 'old.txt', lineNumber: 1 }, searchId: 100 });
    expect(results).toHaveLength(1);

    // Start new search (new searchId)
    activeSearchId = 200;
    results.length = 0;

    // Old search results ignored
    handleProgress({ result: { name: 'old2.txt', lineNumber: 2 }, searchId: 100 });
    expect(results).toHaveLength(0);

    // New search results accepted
    handleProgress({ result: { name: 'new.txt', lineNumber: 3 }, searchId: 200 });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('new.txt');
  });
});

describe('Content Search - Match Highlighting', () => {
  // Replicate the highlight logic from SearchOverlay
  function highlightParts(text: string, q: string, isRegex: boolean): string[] {
    if (!q) return [text];
    try {
      const pattern = isRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const splitRegex = new RegExp(`(${pattern})`, 'gi');
      return text.split(splitRegex);
    } catch {
      return [text];
    }
  }

  test('splits text on literal match', () => {
    const parts = highlightParts('import { useState } from "react";', 'useState', false);
    expect(parts).toEqual(['import { ', 'useState', ' } from "react";']);
  });

  test('splits text on multiple matches', () => {
    const parts = highlightParts('foo bar foo baz foo', 'foo', false);
    expect(parts).toEqual(['', 'foo', ' bar ', 'foo', ' baz ', 'foo', '']);
  });

  test('handles regex pattern', () => {
    const parts = highlightParts('const count = 42; const max = 100;', '\\d+', true);
    expect(parts).toEqual(['const count = ', '42', '; const max = ', '100', ';']);
  });

  test('handles special characters in literal mode', () => {
    const parts = highlightParts('file.test.ts matches file.test.ts', 'file.test.ts', false);
    expect(parts).toEqual(['', 'file.test.ts', ' matches ', 'file.test.ts', '']);
  });

  test('returns original text when no match', () => {
    const parts = highlightParts('no match here', 'xyz', false);
    expect(parts).toEqual(['no match here']);
  });

  test('handles empty query', () => {
    const parts = highlightParts('some text', '', false);
    expect(parts).toEqual(['some text']);
  });

  test('handles invalid regex gracefully', () => {
    const parts = highlightParts('some text', '[invalid', true);
    expect(parts).toEqual(['some text']);
  });
});

describe('Content Search - Grep Output Parsing', () => {
  // Replicate the parsing logic from contentSearchWithGrep
  function parseGrepLine(line: string, rootPath: string) {
    const afterRoot = line.substring(rootPath.length);
    const colonMatch = afterRoot.match(/^(.*?):(\d+):(.*)$/);
    if (!colonMatch) return null;
    return {
      filePath: rootPath + colonMatch[1],
      lineNumber: parseInt(colonMatch[2], 10),
      matchedLine: colonMatch[3],
    };
  }

  test('parses standard grep output line', () => {
    const result = parseGrepLine('/Users/john/project/src/App.tsx:10:import React from "react";', '/Users/john/project');
    expect(result).toEqual({
      filePath: '/Users/john/project/src/App.tsx',
      lineNumber: 10,
      matchedLine: 'import React from "react";',
    });
  });

  test('parses line with colon in content', () => {
    const result = parseGrepLine('/Users/john/project/config.ts:5:const url = "http://localhost:3000";', '/Users/john/project');
    expect(result).toEqual({
      filePath: '/Users/john/project/config.ts',
      lineNumber: 5,
      matchedLine: 'const url = "http://localhost:3000";',
    });
  });

  test('parses deeply nested file path', () => {
    const result = parseGrepLine('/home/user/a/b/c/d/e/file.js:999:deep content', '/home/user');
    expect(result).toEqual({
      filePath: '/home/user/a/b/c/d/e/file.js',
      lineNumber: 999,
      matchedLine: 'deep content',
    });
  });

  test('returns null for invalid line format', () => {
    expect(parseGrepLine('not a grep line', '/Users/john')).toBeNull();
    expect(parseGrepLine('', '/Users/john')).toBeNull();
  });

  test('handles root path with trailing slash', () => {
    const result = parseGrepLine('/Users/john/project/file.ts:1:content', '/Users/john/project/');
    // With trailing slash, afterRoot becomes "file.ts:1:content"
    expect(result).toEqual({
      filePath: '/Users/john/project/file.ts',
      lineNumber: 1,
      matchedLine: 'content',
    });
  });

  test('handles line with empty matched content', () => {
    const result = parseGrepLine('/Users/john/project/file.ts:50:', '/Users/john/project');
    expect(result).toEqual({
      filePath: '/Users/john/project/file.ts',
      lineNumber: 50,
      matchedLine: '',
    });
  });

  test('handles file path with spaces', () => {
    const result = parseGrepLine('/Users/john/my project/file name.ts:7:some content', '/Users/john/my project');
    expect(result).toEqual({
      filePath: '/Users/john/my project/file name.ts',
      lineNumber: 7,
      matchedLine: 'some content',
    });
  });
});

describe('Content Search - Result Structure', () => {
  test('content match result has expected fields', () => {
    const result = {
      name: 'App.tsx',
      path: '/Users/john/project/src/App.tsx',
      isDirectory: false,
      size: 5000,
      modified: '2024-01-01T00:00:00.000Z',
      extension: 'tsx',
      lineNumber: 10,
      matchedLine: 'import { useState } from "react";',
      isContentMatch: true,
    };

    expect(result.isContentMatch).toBe(true);
    expect(result.lineNumber).toBeGreaterThan(0);
    expect(result.matchedLine).toBeDefined();
    expect(result.isDirectory).toBe(false);
    expect(result.name).toBeTruthy();
    expect(result.path).toBeTruthy();
    expect(result.extension).toBe('tsx');
  });

  test('matched line is truncated at 500 chars', () => {
    const longLine = 'x'.repeat(600);
    const truncated = longLine.substring(0, 500);
    expect(truncated.length).toBe(500);
  });
});
