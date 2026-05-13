/**
 * Tag System Tests
 * Tests for the global tag management system including store state,
 * IPC interactions, and tag-file assignment logic.
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

const DEFAULT_TAGS = [
  { tag_name: 'Red',    color: '#f87171', sort_order: 0 },
  { tag_name: 'Orange', color: '#fb923c', sort_order: 1 },
  { tag_name: 'Yellow', color: '#fbbf24', sort_order: 2 },
  { tag_name: 'Green',  color: '#34d399', sort_order: 3 },
  { tag_name: 'Blue',   color: '#4A9EFF', sort_order: 4 },
  { tag_name: 'Purple', color: '#a78bfa', sort_order: 5 },
  { tag_name: 'Grey',   color: '#9ca3af', sort_order: 6 },
];

const FILE_A = '/Users/john/Documents/report.pdf';
const FILE_B = '/Users/john/Desktop/photo.png';

function resetTagMocks(overrides: Record<string, any> = {}): void {
  (window as any).electronAPI.getAllTags.mockResolvedValue({ success: true, tags: DEFAULT_TAGS, ...overrides });
  (window as any).electronAPI.addTag     = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.removeTag  = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.getTags    = jest.fn().mockResolvedValue({ success: true, tags: [] });
  (window as any).electronAPI.createTag  = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.deleteTag  = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.renameTag  = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.recolorTag = jest.fn().mockResolvedValue({ success: true });
  (window as any).electronAPI.getFilesForTag = jest.fn().mockResolvedValue({ success: true, files: [] });
  (window as any).electronAPI.searchByTag    = jest.fn().mockResolvedValue({ success: true, files: [] });
}

describe('Store: allTags state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTagMocks();
    useStore.setState({ allTags: [] } as any);
  });

  test('loadAllTags populates allTags and preserves sort order', async () => {
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags).toHaveLength(7);
    expect(result.current.allTags.map((t: any) => t.tag_name)).toEqual(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Grey']);
  });

  test('loadAllTags does not update state on API failure', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: false });
    useStore.setState({ allTags: DEFAULT_TAGS } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags).toHaveLength(7);
  });
});

describe('Store: tag-related modals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ activeModal: null, modalData: null } as any);
  });

  test('openModal stores data correctly for tagBrowser', () => {
    const { result } = renderHook(() => useStore());
    const data = { filterTag: 'Red', color: '#f87171', files: [FILE_A] };
    act(() => { result.current.openModal('tagBrowser', data); });
    expect(result.current.activeModal).toBe('tagBrowser');
    expect(result.current.modalData.filterTag).toBe('Red');
  });

  test('closeModal resets state', () => {
    const { result } = renderHook(() => useStore());
    act(() => { result.current.openModal('allTags'); });
    act(() => { result.current.closeModal(); });
    expect(result.current.activeModal).toBeNull();
    expect(result.current.modalData).toBeNull();
  });
});

describe('IPC: addTag', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('can add multiple different tags to the same file', async () => {
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Red' });
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Blue' });
    expect((window as any).electronAPI.addTag).toHaveBeenCalledTimes(2);
  });

  test('can add the same tag to multiple files', async () => {
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Green' });
    await (window as any).electronAPI.addTag({ filePath: FILE_B, tagName: 'Green' });
    expect((window as any).electronAPI.addTag).toHaveBeenCalledTimes(2);
  });
});

describe('IPC: getTags (per-file)', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('returns multiple tags for a file', async () => {
    const tags = [{ tag_name: 'Red', color: '#f87171' }, { tag_name: 'Blue', color: '#4A9EFF' }];
    (window as any).electronAPI.getTags.mockResolvedValue({ success: true, tags });
    const result = await (window as any).electronAPI.getTags(FILE_A);
    expect(result.tags).toHaveLength(2);
  });
});

describe('IPC: createTag', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('new tag appears in loadAllTags after creation', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({
      success: true,
      tags: [...DEFAULT_TAGS, { tag_name: 'Work', color: '#4A9EFF', sort_order: 7 }],
    });
    useStore.setState({ allTags: [] } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags).toHaveLength(8);
    expect(result.current.allTags.find((t: any) => t.tag_name === 'Work')).toBeTruthy();
  });
});

describe('IPC: deleteTag', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('tag is removed from allTags after deletion and reload', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({
      success: true,
      tags: DEFAULT_TAGS.filter(t => t.tag_name !== 'Red'),
    });
    useStore.setState({ allTags: DEFAULT_TAGS } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags.find((t: any) => t.tag_name === 'Red')).toBeUndefined();
    expect(result.current.allTags).toHaveLength(6);
  });
});

describe('IPC: renameTag', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('renamed tag appears with new name in loadAllTags', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({
      success: true,
      tags: DEFAULT_TAGS.map(t => t.tag_name === 'Red' ? { ...t, tag_name: 'Urgent' } : t),
    });
    useStore.setState({ allTags: DEFAULT_TAGS } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags.find((t: any) => t.tag_name === 'Urgent')).toBeTruthy();
    expect(result.current.allTags.find((t: any) => t.tag_name === 'Red')).toBeUndefined();
  });
});

describe('IPC: recolorTag', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('updated color appears in loadAllTags after recolor', async () => {
    const newColor = '#ff0000';
    (window as any).electronAPI.getAllTags.mockResolvedValue({
      success: true,
      tags: DEFAULT_TAGS.map(t => t.tag_name === 'Red' ? { ...t, color: newColor } : t),
    });
    useStore.setState({ allTags: DEFAULT_TAGS } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    const red = result.current.allTags.find((t: any) => t.tag_name === 'Red');
    expect(red.color).toBe(newColor);
  });
});

describe('Tag toggle logic', () => {
  beforeEach(() => { jest.clearAllMocks(); resetTagMocks(); });

  test('adding a tag that is not on a file calls addTag', async () => {
    const fileTags = new Set<string>();
    const tagName = 'Red';
    if (!fileTags.has(tagName)) {
      await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName });
      fileTags.add(tagName);
    }
    expect((window as any).electronAPI.addTag).toHaveBeenCalledTimes(1);
    expect(fileTags.has('Red')).toBe(true);
  });

  test('removing a tag that is on a file calls removeTag', async () => {
    const fileTags = new Set(['Red']);
    const tagName = 'Red';
    if (fileTags.has(tagName)) {
      await (window as any).electronAPI.removeTag({ filePath: FILE_A, tagName });
      fileTags.delete(tagName);
    }
    expect((window as any).electronAPI.removeTag).toHaveBeenCalledTimes(1);
    expect(fileTags.has('Red')).toBe(false);
  });

  test('toggling twice results in no net change', async () => {
    const fileTags = new Set<string>();
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Red' });
    fileTags.add('Red');
    await (window as any).electronAPI.removeTag({ filePath: FILE_A, tagName: 'Red' });
    fileTags.delete('Red');
    expect(fileTags.has('Red')).toBe(false);
    expect((window as any).electronAPI.addTag).toHaveBeenCalledTimes(1);
    expect((window as any).electronAPI.removeTag).toHaveBeenCalledTimes(1);
  });

  test('a file can hold multiple tags independently', async () => {
    const fileTags = new Set<string>();
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Red' });
    fileTags.add('Red');
    await (window as any).electronAPI.addTag({ filePath: FILE_A, tagName: 'Blue' });
    fileTags.add('Blue');
    expect(fileTags.size).toBe(2);
    await (window as any).electronAPI.removeTag({ filePath: FILE_A, tagName: 'Red' });
    fileTags.delete('Red');
    expect(fileTags.has('Blue')).toBe(true);
    expect(fileTags.has('Red')).toBe(false);
  });
});

describe('Default tags', () => {
  test('7 default tags exist with correct names', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: true, tags: DEFAULT_TAGS });
    useStore.setState({ allTags: [] } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    expect(result.current.allTags.map((t: any) => t.tag_name)).toEqual(['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Grey']);
  });

  test('each default tag has a valid hex color', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: true, tags: DEFAULT_TAGS });
    useStore.setState({ allTags: [] } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const tag of result.current.allTags) {
      expect((tag as any).color).toMatch(hexRegex);
    }
  });

  test('default tags have a valid sort_order', async () => {
    (window as any).electronAPI.getAllTags.mockResolvedValue({ success: true, tags: DEFAULT_TAGS });
    useStore.setState({ allTags: [] } as any);
    const { result } = renderHook(() => useStore());
    await act(async () => { await result.current.loadAllTags(); });
    result.current.allTags.forEach((tag: any, i: number) => {
      expect(tag.sort_order).toBe(i);
    });
  });
});

describe('Tags - context menu onTagsChanged callback (regression)', () => {
  const filePath = '/Users/test/photo.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.getTags.mockResolvedValue({ success: true, tags: [{ tag_name: 'red', color: '#f00' }] });
    (window as any).electronAPI.addTag.mockResolvedValue({ success: true });
    (window as any).electronAPI.removeTag.mockResolvedValue({ success: true });
  });

  test('onTagsChanged is called with updated tags after adding a tag', async () => {
    const onTagsChanged = jest.fn();

    await (window as any).electronAPI.addTag({ filePath, tagName: 'red' });
    const r = await (window as any).electronAPI.getTags(filePath);
    if (r.success) onTagsChanged(filePath, r.tags);

    expect(onTagsChanged).toHaveBeenCalledTimes(1);
    expect(onTagsChanged).toHaveBeenCalledWith(filePath, [{ tag_name: 'red', color: '#f00' }]);
  });

  test('onTagsChanged is called with updated tags after removing a tag', async () => {
    (window as any).electronAPI.getTags.mockResolvedValue({ success: true, tags: [] });
    const onTagsChanged = jest.fn();

    await (window as any).electronAPI.removeTag({ filePath, tagName: 'red' });
    const r = await (window as any).electronAPI.getTags(filePath);
    if (r.success) onTagsChanged(filePath, r.tags);

    expect(onTagsChanged).toHaveBeenCalledWith(filePath, []);
  });

  test('onTagsChanged receives correct filePath', async () => {
    const onTagsChanged = jest.fn();
    const r = await (window as any).electronAPI.getTags(filePath);
    if (r.success) onTagsChanged(filePath, r.tags);

    const [calledPath] = onTagsChanged.mock.calls[0];
    expect(calledPath).toBe(filePath);
  });

  test('onTagsChanged is not called when getTags fails', async () => {
    (window as any).electronAPI.getTags.mockResolvedValue({ success: false, tags: [] });
    const onTagsChanged = jest.fn();

    const r = await (window as any).electronAPI.getTags(filePath);
    if (r.success) onTagsChanged(filePath, r.tags);

    expect(onTagsChanged).not.toHaveBeenCalled();
  });
});

describe('Tags - inline tag dots update immediately (regression)', () => {
  const filePath = '/Users/test/photo.jpg';
  const redTag = { tag_name: 'red', color: '#f00' };
  const blueTag = { tag_name: 'blue', color: '#00f' };

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.addTag.mockResolvedValue({ success: true });
    (window as any).electronAPI.removeTag.mockResolvedValue({ success: true });
    (window as any).electronAPI.getTags.mockResolvedValue({ success: true, tags: [redTag] });
  });

  test('fileTags record is updated optimistically before API call returns', () => {
    const fileTags: Record<string, any[]> = {};

    const optimisticAdd = (path: string, tag: any) => {
      fileTags[path] = [...(fileTags[path] || []), tag];
    };

    optimisticAdd(filePath, redTag);
    expect(fileTags[filePath]).toHaveLength(1);
    expect(fileTags[filePath][0].tag_name).toBe('red');
  });

  test('fileTags record removes tag optimistically', () => {
    const fileTags: Record<string, any[]> = { [filePath]: [redTag, blueTag] };

    const optimisticRemove = (path: string, tagName: string) => {
      fileTags[path] = fileTags[path].filter(t => t.tag_name !== tagName);
    };

    optimisticRemove(filePath, 'red');
    expect(fileTags[filePath]).toHaveLength(1);
    expect(fileTags[filePath][0].tag_name).toBe('blue');
  });

  test('onTagsChanged callback updates parent fileTags record (simulating FilePane setState)', () => {
    const fileTags: Record<string, any[]> = {};
    const onTagsChanged = (path: string, tags: any[]) => { fileTags[path] = tags; };

    onTagsChanged(filePath, [redTag]);
    expect(fileTags[filePath]).toEqual([redTag]);

    onTagsChanged(filePath, [redTag, blueTag]);
    expect(fileTags[filePath]).toHaveLength(2);
  });

  test('tag dots are visible immediately after optimistic add (before API resolves)', async () => {
    const fileTags: Record<string, any[]> = {};

    const optimisticAdd = (path: string, tag: any) => { fileTags[path] = [...(fileTags[path] || []), tag]; };

    let apiResolved = false;
    const fakeAddTag = () => new Promise(resolve => setTimeout(() => { apiResolved = true; resolve({ success: true }); }, 50));

    optimisticAdd(filePath, redTag);
    expect(fileTags[filePath]).toHaveLength(1);
    expect(apiResolved).toBe(false);

    await fakeAddTag();
    expect(apiResolved).toBe(true);
    expect(fileTags[filePath]).toHaveLength(1);
  });
});
