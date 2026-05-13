/**
 * Bookmark Drag & Drop Tests
 * Tests for dragging folders from filetree to bookmarks, and reordering bookmarks via drag.
 *
 * These tests validate the core array manipulation logic that runs on drop:
 * - External drop: inserting new bookmarks at a specific index from file-paths data
 * - Reorder drop: moving an existing bookmark from srcIdx to targetIdx
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';
import type { Bookmark } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mkBookmark = (id: string, name: string, path: string): Bookmark => ({
  id, name, path, icon: 'default',
});

/**
 * Simulates the external drop logic from Sidebar.handleExternalDrop:
 * Given existing bookmarks, dropped file paths, and an insert index,
 * returns the new bookmarks array.
 */
function applyExternalDrop(bookmarks: Bookmark[], droppedPaths: string[], insertIdx: number): Bookmark[] {
  const newEntries = droppedPaths
    .filter(p => !bookmarks.some(bm => bm.path === p))
    .map(p => ({
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: p.split('/').pop() || p,
      path: p,
      icon: 'default',
    }));
  if (!newEntries.length) return bookmarks;
  const nb = [...bookmarks];
  nb.splice(insertIdx, 0, ...newEntries);
  return nb;
}

/**
 * Simulates the reorder drop logic from Sidebar.handleReorderDrop:
 * Given existing bookmarks, source index, and target insert-line index,
 * returns the new bookmarks array (or the same array if no-op).
 */
function applyReorderDrop(bookmarks: Bookmark[], srcIdx: number, targetIdx: number): Bookmark[] {
  let adjustedTarget = targetIdx > srcIdx ? targetIdx - 1 : targetIdx;
  if (adjustedTarget === srcIdx) return bookmarks;
  const nb = [...bookmarks];
  const [moved] = nb.splice(srcIdx, 1);
  nb.splice(adjustedTarget, 0, moved);
  return nb;
}

// ─── External Drop: Dragging folders from filetree to bookmarks ─────────────

describe('Bookmark - External Drop (filetree → bookmarks)', () => {
  const initial: Bookmark[] = [
    mkBookmark('bm-1', 'Home', '/Users/john'),
    mkBookmark('bm-2', 'Desktop', '/Users/john/Desktop'),
    mkBookmark('bm-3', 'Downloads', '/Users/john/Downloads'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ bookmarks: [...initial] });
  });

  test('inserts a new folder at the beginning', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Documents'], 0);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe('/Users/john/Documents');
    expect(result[0].name).toBe('Documents');
    expect(result[1].path).toBe('/Users/john');
  });

  test('inserts a new folder in the middle', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Music'], 2);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe('/Users/john');
    expect(result[1].path).toBe('/Users/john/Desktop');
    expect(result[2].path).toBe('/Users/john/Music');
    expect(result[2].name).toBe('Music');
    expect(result[3].path).toBe('/Users/john/Downloads');
  });

  test('inserts a new folder at the end', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Pictures'], 3);
    expect(result).toHaveLength(4);
    expect(result[3].path).toBe('/Users/john/Pictures');
    expect(result[3].name).toBe('Pictures');
  });

  test('inserts multiple folders at once', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Music', '/Users/john/Movies'], 1);
    expect(result).toHaveLength(5);
    expect(result[0].path).toBe('/Users/john');
    expect(result[1].path).toBe('/Users/john/Music');
    expect(result[2].path).toBe('/Users/john/Movies');
    expect(result[3].path).toBe('/Users/john/Desktop');
    expect(result[4].path).toBe('/Users/john/Downloads');
  });

  test('skips duplicate paths that already exist in bookmarks', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Desktop'], 0);
    expect(result).toHaveLength(3);
    expect(result).toEqual(initial);
  });

  test('filters duplicates but inserts non-duplicates', () => {
    const result = applyExternalDrop(initial, ['/Users/john/Desktop', '/Users/john/Music'], 1);
    expect(result).toHaveLength(4);
    expect(result[1].path).toBe('/Users/john/Music');
  });

  test('handles drop into empty bookmarks list', () => {
    const result = applyExternalDrop([], ['/Users/john/Documents'], 0);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/Users/john/Documents');
    expect(result[0].name).toBe('Documents');
  });

  test('dropped entries get correct name from path', () => {
    const result = applyExternalDrop([], ['/deeply/nested/folder/MyFolder'], 0);
    expect(result[0].name).toBe('MyFolder');
  });

  test('persists to store via setBookmarks', () => {
    const newBookmarks = applyExternalDrop(initial, ['/Users/john/Documents'], 1);
    act(() => useStore.getState().setBookmarks(newBookmarks));

    expect(useStore.getState().bookmarks).toHaveLength(4);
    expect(useStore.getState().bookmarks[1].path).toBe('/Users/john/Documents');
    expect((window as any).electronAPI.saveBookmarks).toHaveBeenCalledWith(newBookmarks);
  });
});

// ─── Reorder Drop: Dragging existing bookmarks to reorder ───────────────────

describe('Bookmark - Reorder Drop', () => {
  const initial: Bookmark[] = [
    mkBookmark('bm-1', 'Home', '/Users/john'),
    mkBookmark('bm-2', 'Desktop', '/Users/john/Desktop'),
    mkBookmark('bm-3', 'Downloads', '/Users/john/Downloads'),
    mkBookmark('bm-4', 'Documents', '/Users/john/Documents'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ bookmarks: [...initial] });
  });

  test('moves first item to last position', () => {
    // Drop line after last item (targetIdx=4), src=0
    const result = applyReorderDrop(initial, 0, 4);
    expect(result.map(b => b.id)).toEqual(['bm-2', 'bm-3', 'bm-4', 'bm-1']);
  });

  test('moves last item to first position', () => {
    // Drop line before first item (targetIdx=0), src=3
    const result = applyReorderDrop(initial, 3, 0);
    expect(result.map(b => b.id)).toEqual(['bm-4', 'bm-1', 'bm-2', 'bm-3']);
  });

  test('moves item down by one position', () => {
    // src=1, drop line at idx=3 (after item at idx 2)
    const result = applyReorderDrop(initial, 1, 3);
    expect(result.map(b => b.id)).toEqual(['bm-1', 'bm-3', 'bm-2', 'bm-4']);
  });

  test('moves item up by one position', () => {
    // src=2, drop line at idx=1 (before item at idx 1)
    const result = applyReorderDrop(initial, 2, 1);
    expect(result.map(b => b.id)).toEqual(['bm-1', 'bm-3', 'bm-2', 'bm-4']);
  });

  test('no-op when dropping on same position (drop line before src)', () => {
    // src=1, targetIdx=1 → adjustedTarget=1 === srcIdx → no-op
    const result = applyReorderDrop(initial, 1, 1);
    expect(result).toBe(initial); // same reference
  });

  test('no-op when dropping on position right after src', () => {
    // src=1, targetIdx=2 → adjustedTarget = 2-1 = 1 === srcIdx → no-op
    const result = applyReorderDrop(initial, 1, 2);
    expect(result).toBe(initial); // same reference
  });

  test('moves middle item to beginning', () => {
    const result = applyReorderDrop(initial, 2, 0);
    expect(result.map(b => b.id)).toEqual(['bm-3', 'bm-1', 'bm-2', 'bm-4']);
  });

  test('moves middle item to end', () => {
    const result = applyReorderDrop(initial, 1, 4);
    expect(result.map(b => b.id)).toEqual(['bm-1', 'bm-3', 'bm-4', 'bm-2']);
  });

  test('reorder with two items - swap', () => {
    const twoItems = [mkBookmark('a', 'A', '/a'), mkBookmark('b', 'B', '/b')];
    const result = applyReorderDrop(twoItems, 0, 2);
    expect(result.map(b => b.id)).toEqual(['b', 'a']);
  });

  test('reorder with single item is always no-op', () => {
    const single = [mkBookmark('a', 'A', '/a')];
    expect(applyReorderDrop(single, 0, 0)).toBe(single);
    expect(applyReorderDrop(single, 0, 1)).toBe(single);
  });

  test('persists reorder to store via setBookmarks', () => {
    const reordered = applyReorderDrop(initial, 0, 4);
    act(() => useStore.getState().setBookmarks(reordered));

    expect(useStore.getState().bookmarks.map(b => b.id)).toEqual(['bm-2', 'bm-3', 'bm-4', 'bm-1']);
    expect((window as any).electronAPI.saveBookmarks).toHaveBeenCalledWith(reordered);
  });
});

// ─── Integration: Combined operations ────────────────────────────────────────

describe('Bookmark - Combined drag operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ bookmarks: [] });
  });

  test('drop external then reorder', () => {
    // Start empty, drop two folders
    let bookmarks = applyExternalDrop([], ['/Users/john/Desktop', '/Users/john/Downloads'], 0);
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0].path).toBe('/Users/john/Desktop');
    expect(bookmarks[1].path).toBe('/Users/john/Downloads');

    // Reorder: move first to end
    bookmarks = applyReorderDrop(bookmarks, 0, 2);
    expect(bookmarks[0].path).toBe('/Users/john/Downloads');
    expect(bookmarks[1].path).toBe('/Users/john/Desktop');

    // Drop another at position 1
    bookmarks = applyExternalDrop(bookmarks, ['/Users/john/Music'], 1);
    expect(bookmarks).toHaveLength(3);
    expect(bookmarks[0].path).toBe('/Users/john/Downloads');
    expect(bookmarks[1].path).toBe('/Users/john/Music');
    expect(bookmarks[2].path).toBe('/Users/john/Desktop');
  });

  test('external drop does not create entries with empty name', () => {
    const result = applyExternalDrop([], ['/Users/john/Docs'], 0);
    expect(result[0].name).toBeTruthy();
    expect(result[0].name).toBe('Docs');
  });

  test('each external drop entry gets a unique id', () => {
    const result = applyExternalDrop([], ['/a', '/b', '/c'], 0);
    const ids = result.map(b => b.id);
    expect(new Set(ids).size).toBe(3);
  });
});
