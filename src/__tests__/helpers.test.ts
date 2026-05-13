/**
 * Helper Functions Tests
 * Tests for src/helpers/sort.ts and src/helpers/smartFolders.ts
 */

import { sortFiles, SORT_TYPES, DEFAULT_SORT } from '../helpers/sort';
import {
  createFilterDefinitions,
  parseFileSizeInput,
  DEFAULT_EXCLUDED_DIRECTORIES,
} from '../helpers/smartFolders';
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

// ─── sortFiles ────────────────────────────────────────────────────────────────

describe('sortFiles - directories always first', () => {
  const files: FileItem[] = [
    mkFile('zebra.txt', { size: 500 }),
    mkDir('alpha'),
    mkFile('apple.js', { size: 100 }),
    mkDir('zulu'),
  ];

  test('directories come first regardless of sort by name asc', () => {
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].isDirectory).toBe(true);
    expect(sorted[2].isDirectory).toBe(false);
    expect(sorted[3].isDirectory).toBe(false);
  });

  test('directories come first regardless of sort by name desc', () => {
    const sorted = sortFiles(files, 'name', 'desc');
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].isDirectory).toBe(true);
    expect(sorted[2].isDirectory).toBe(false);
    expect(sorted[3].isDirectory).toBe(false);
  });

  test('directories come first regardless of sort by size', () => {
    const sorted = sortFiles(files, 'size', 'asc');
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].isDirectory).toBe(true);
  });

  test('directories come first regardless of sort by modified', () => {
    const sorted = sortFiles(files, 'modified', 'desc');
    expect(sorted[0].isDirectory).toBe(true);
    expect(sorted[1].isDirectory).toBe(true);
  });
});

describe('sortFiles - name sort', () => {
  test('asc sorts alphabetically case-insensitive', () => {
    const files = [mkFile('Banana.txt'), mkFile('apple.txt'), mkFile('cherry.txt')];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted.map(f => f.name)).toEqual(['apple.txt', 'Banana.txt', 'cherry.txt']);
  });

  test('desc reverses alphabetical order', () => {
    const files = [mkFile('Banana.txt'), mkFile('apple.txt'), mkFile('cherry.txt')];
    const sorted = sortFiles(files, 'name', 'desc');
    expect(sorted.map(f => f.name)).toEqual(['cherry.txt', 'Banana.txt', 'apple.txt']);
  });

  test('numeric sort (file2 before file10)', () => {
    const files = [mkFile('file10.txt'), mkFile('file2.txt'), mkFile('file1.txt')];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted.map(f => f.name)).toEqual(['file1.txt', 'file2.txt', 'file10.txt']);
  });

  test('directories sorted by name among themselves', () => {
    const files = [mkDir('zoo'), mkDir('apple'), mkFile('middle.txt')];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted[0].name).toBe('apple');
    expect(sorted[1].name).toBe('zoo');
    expect(sorted[2].name).toBe('middle.txt');
  });
});

describe('sortFiles - size sort', () => {
  test('asc sorts smallest first', () => {
    const files = [mkFile('big.bin', { size: 9999 }), mkFile('tiny.txt', { size: 1 }), mkFile('med.js', { size: 500 })];
    const sorted = sortFiles(files, 'size', 'asc');
    expect(sorted.map(f => f.size)).toEqual([1, 500, 9999]);
  });

  test('desc sorts largest first', () => {
    const files = [mkFile('big.bin', { size: 9999 }), mkFile('tiny.txt', { size: 1 }), mkFile('med.js', { size: 500 })];
    const sorted = sortFiles(files, 'size', 'desc');
    expect(sorted.map(f => f.size)).toEqual([9999, 500, 1]);
  });

  test('handles zero-size files', () => {
    const files = [mkFile('empty.txt', { size: 0 }), mkFile('full.txt', { size: 100 })];
    const sorted = sortFiles(files, 'size', 'asc');
    expect(sorted[0].size).toBe(0);
    expect(sorted[1].size).toBe(100);
  });

  test('handles undefined size gracefully (treated as 0)', () => {
    const files = [mkFile('nosize.txt', { size: undefined as any }), mkFile('hassize.txt', { size: 50 })];
    const sorted = sortFiles(files, 'size', 'asc');
    expect(sorted[0].name).toBe('nosize.txt');
  });
});

describe('sortFiles - modified sort', () => {
  const older = '2023-01-01T00:00:00Z';
  const newer = '2024-06-15T00:00:00Z';
  const middle = '2024-03-01T00:00:00Z';

  test('asc sorts oldest first', () => {
    const files = [mkFile('new.txt', { modified: newer }), mkFile('old.txt', { modified: older }), mkFile('mid.txt', { modified: middle })];
    const sorted = sortFiles(files, 'modified', 'asc');
    expect(sorted.map(f => f.name)).toEqual(['old.txt', 'mid.txt', 'new.txt']);
  });

  test('desc sorts newest first', () => {
    const files = [mkFile('new.txt', { modified: newer }), mkFile('old.txt', { modified: older }), mkFile('mid.txt', { modified: middle })];
    const sorted = sortFiles(files, 'modified', 'desc');
    expect(sorted.map(f => f.name)).toEqual(['new.txt', 'mid.txt', 'old.txt']);
  });

  test('handles undefined modified (treated as epoch 0)', () => {
    const files = [mkFile('nodate.txt', { modified: undefined }), mkFile('hasdate.txt', { modified: newer })];
    const sorted = sortFiles(files, 'modified', 'asc');
    expect(sorted[0].name).toBe('nodate.txt');
  });
});

describe('sortFiles - added sort', () => {
  const older = '2022-06-01T00:00:00Z';
  const newer = '2024-11-01T00:00:00Z';

  test('asc sorts oldest added first', () => {
    const files = [
      mkFile('new.txt', { added: newer, modified: '2024-01-01T00:00:00Z' }),
      mkFile('old.txt', { added: older, modified: '2024-01-01T00:00:00Z' }),
    ];
    const sorted = sortFiles(files, 'added', 'asc');
    expect(sorted[0].name).toBe('old.txt');
    expect(sorted[1].name).toBe('new.txt');
  });

  test('desc sorts newest added first', () => {
    const files = [
      mkFile('new.txt', { added: newer }),
      mkFile('old.txt', { added: older }),
    ];
    const sorted = sortFiles(files, 'added', 'desc');
    expect(sorted[0].name).toBe('new.txt');
    expect(sorted[1].name).toBe('old.txt');
  });

  test('falls back to birthtime when added is missing', () => {
    const files = [
      mkFile('new.txt', { birthtime: newer, added: undefined }),
      mkFile('old.txt', { birthtime: older, added: undefined }),
    ];
    const sorted = sortFiles(files, 'added', 'asc');
    expect(sorted[0].name).toBe('old.txt');
  });

  test('falls back to modified when both added and birthtime are missing', () => {
    const files = [
      mkFile('new.txt', { modified: newer, added: undefined, birthtime: undefined }),
      mkFile('old.txt', { modified: older, added: undefined, birthtime: undefined }),
    ];
    const sorted = sortFiles(files, 'added', 'asc');
    expect(sorted[0].name).toBe('old.txt');
  });
});

describe('sortFiles - extension sort', () => {
  test('asc sorts by extension alphabetically', () => {
    const files = [mkFile('b.txt', { extension: 'txt' }), mkFile('a.js', { extension: 'js' }), mkFile('c.css', { extension: 'css' })];
    const sorted = sortFiles(files, 'extension', 'asc');
    expect(sorted.map(f => f.extension)).toEqual(['css', 'js', 'txt']);
  });

  test('desc sorts by extension reverse', () => {
    const files = [mkFile('b.txt', { extension: 'txt' }), mkFile('a.js', { extension: 'js' }), mkFile('c.css', { extension: 'css' })];
    const sorted = sortFiles(files, 'extension', 'desc');
    expect(sorted.map(f => f.extension)).toEqual(['txt', 'js', 'css']);
  });

  test('empty extension sorts before others', () => {
    const files = [mkFile('Makefile', { extension: '' }), mkFile('code.ts', { extension: 'ts' })];
    const sorted = sortFiles(files, 'extension', 'asc');
    expect(sorted[0].extension).toBe('');
  });
});

describe('sortFiles - default/unknown sortBy falls back to name', () => {
  test('unknown sortBy value uses name sort', () => {
    const files = [mkFile('banana.txt'), mkFile('apple.txt')];
    const sorted = sortFiles(files, 'unknownSort' as any, 'asc');
    expect(sorted[0].name).toBe('apple.txt');
    expect(sorted[1].name).toBe('banana.txt');
  });
});

describe('sortFiles - does not mutate original array', () => {
  test('returns a new array, original unchanged', () => {
    const files = [mkFile('b.txt'), mkFile('a.txt')];
    const original = [...files];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(files).toEqual(original);
    expect(sorted).not.toBe(files);
  });
});

describe('sortFiles - empty array', () => {
  test('returns empty array for empty input', () => {
    expect(sortFiles([], 'name', 'asc')).toEqual([]);
  });

  test('single item returns same item', () => {
    const files = [mkFile('only.txt')];
    const sorted = sortFiles(files, 'name', 'asc');
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe('only.txt');
  });
});

// ─── SORT_TYPES constant ──────────────────────────────────────────────────────

describe('SORT_TYPES constant', () => {
  test('has 4 sort types defined', () => {
    expect(SORT_TYPES).toHaveLength(4);
  });

  test('each sort type has required fields', () => {
    SORT_TYPES.forEach(st => {
      expect(st.id).toBeDefined();
      expect(st.label).toBeDefined();
      expect(st.description).toBeDefined();
      expect(st.svgInner).toBeDefined();
    });
  });

  test('sort type IDs match expected values', () => {
    expect(SORT_TYPES.map(st => st.id)).toEqual(['name', 'added', 'modified', 'size']);
  });
});

describe('DEFAULT_SORT constant', () => {
  test('is "name"', () => {
    expect(DEFAULT_SORT).toBe('name');
  });
});

// ─── smartFolders.ts ──────────────────────────────────────────────────────────

describe('DEFAULT_EXCLUDED_DIRECTORIES', () => {
  test('includes common development directories', () => {
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('node_modules');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('.git');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('dist');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('build');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('.next');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('coverage');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('__pycache__');
    expect(DEFAULT_EXCLUDED_DIRECTORIES).toContain('vendor');
  });

  test('is a non-empty array of strings', () => {
    expect(Array.isArray(DEFAULT_EXCLUDED_DIRECTORIES)).toBe(true);
    expect(DEFAULT_EXCLUDED_DIRECTORIES.length).toBeGreaterThan(0);
    DEFAULT_EXCLUDED_DIRECTORIES.forEach(dir => {
      expect(typeof dir).toBe('string');
    });
  });
});

describe('createFilterDefinitions', () => {
  test('returns large, empty, and old filters', () => {
    const filters = createFilterDefinitions(100);
    expect(filters.large).toBeDefined();
    expect(filters.empty).toBeDefined();
    expect(filters.old).toBeDefined();
  });

  test('large filter: matches files over threshold', () => {
    const filters = createFilterDefinitions(10); // 10 MB
    const bigFile = mkFile('huge.bin', { size: 11 * 1024 * 1024 });
    const smallFile = mkFile('tiny.txt', { size: 1024 });
    expect(filters.large.test(bigFile)).toBe(true);
    expect(filters.large.test(smallFile)).toBe(false);
  });

  test('large filter: excludes directories regardless of size', () => {
    const filters = createFilterDefinitions(1);
    const bigDir = mkDir('bigfolder', { size: 999 * 1024 * 1024 });
    expect(filters.large.test(bigDir)).toBe(false);
  });

  test('large filter: boundary case (exactly threshold is NOT a match)', () => {
    const filters = createFilterDefinitions(5);
    const exactFile = mkFile('exact.bin', { size: 5 * 1024 * 1024 });
    expect(filters.large.test(exactFile)).toBe(false);
  });

  test('empty filter: matches directories with size 0', () => {
    const filters = createFilterDefinitions(10);
    const emptyDir = mkDir('empty', { size: 0 });
    const nonEmptyDir = mkDir('full', { size: 4096 });
    expect(filters.empty.test(emptyDir)).toBe(true);
    expect(filters.empty.test(nonEmptyDir)).toBe(false);
  });

  test('empty filter: does not match files', () => {
    const filters = createFilterDefinitions(10);
    const emptyFile = mkFile('zero.txt', { size: 0 });
    expect(filters.empty.test(emptyFile)).toBe(false);
  });

  test('old filter: matches files not modified in over 1 year', () => {
    const filters = createFilterDefinitions(10);
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 86400000).toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const oldFile = mkFile('ancient.txt', { modified: twoYearsAgo });
    const recentFile = mkFile('fresh.txt', { modified: yesterday });
    expect(filters.old.test(oldFile)).toBe(true);
    expect(filters.old.test(recentFile)).toBe(false);
  });

  test('old filter: excludes directories', () => {
    const filters = createFilterDefinitions(10);
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 86400000).toISOString();
    const oldDir = mkDir('legacy', { modified: twoYearsAgo });
    expect(filters.old.test(oldDir)).toBe(false);
  });

  test('accepts string input for fileSizeThresholdMB', () => {
    const filters = createFilterDefinitions('5' as any);
    const bigFile = mkFile('big.bin', { size: 6 * 1024 * 1024 });
    expect(filters.large.test(bigFile)).toBe(true);
  });

  test('handles invalid string input (defaults to 0)', () => {
    const filters = createFilterDefinitions('abc' as any);
    // 0 MB threshold means any non-zero file size matches
    const anyFile = mkFile('any.txt', { size: 1 });
    // size > 0 * 1024 * 1024 = size > 0
    expect(filters.large.test(anyFile)).toBe(true);
  });

  test('each filter has name, icon, and desc', () => {
    const filters = createFilterDefinitions(50);
    ['large', 'empty', 'old'].forEach(key => {
      expect(filters[key].name).toBeDefined();
      expect(filters[key].icon).toBeDefined();
      expect(filters[key].desc).toBeDefined();
      expect(typeof filters[key].test).toBe('function');
    });
  });

  test('large filter desc includes the threshold', () => {
    const filters = createFilterDefinitions(25);
    expect(filters.large.desc).toContain('25');
  });
});

describe('parseFileSizeInput', () => {
  test('parses valid integers', () => {
    expect(parseFileSizeInput('10')).toBe(10);
    expect(parseFileSizeInput('0')).toBe(0);
    expect(parseFileSizeInput('100')).toBe(100);
  });

  test('parses valid floats', () => {
    expect(parseFileSizeInput('2.5')).toBe(2.5);
    expect(parseFileSizeInput('0.1')).toBe(0.1);
  });

  test('handles comma as decimal separator', () => {
    expect(parseFileSizeInput('2,5')).toBe(2.5);
    expect(parseFileSizeInput('10,0')).toBe(10.0);
  });

  test('returns 0 for empty string', () => {
    expect(parseFileSizeInput('')).toBe(0);
    expect(parseFileSizeInput('   ')).toBe(0);
  });

  test('returns null for non-numeric strings', () => {
    expect(parseFileSizeInput('abc')).toBeNull();
    expect(parseFileSizeInput('--')).toBeNull();
    expect(parseFileSizeInput('12abc')).toBe(12); // parseFloat('12abc') = 12
  });

  test('returns null for negative numbers', () => {
    expect(parseFileSizeInput('-5')).toBeNull();
    expect(parseFileSizeInput('-0.1')).toBeNull();
  });

  test('handles zero correctly', () => {
    expect(parseFileSizeInput('0')).toBe(0);
    expect(parseFileSizeInput('0.0')).toBe(0);
  });
});
