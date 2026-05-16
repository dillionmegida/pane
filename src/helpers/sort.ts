import type { FileItem, SortBy, SortOrder, SortType } from '../types';

// ─── Sort Cache ───────────────────────────────────────────────────────────────
interface SortCacheKey {
  checksum: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

const sortCache = new Map<string, FileItem[]>();

// Generate a checksum for a files array
function generateFilesChecksum(files: FileItem[]): string {
  // Use a simple but effective checksum based on file paths and key properties
  const parts = files.map(f => `${f.path}|${f.size}|${f.modified}|${f.isDirectory}`);
  return parts.join('\x00');
}

// Generate cache key
function getCacheKey(files: FileItem[], sortBy: SortBy, sortOrder: SortOrder): string {
  const checksum = generateFilesChecksum(files);
  return `${checksum}|${sortBy}|${sortOrder}`;
}

// Clear cache (call when files or sort settings change)
export function clearSortCache(): void {
  sortCache.clear();
}

// ─── Sort Definitions ─────────────────────────────────────────────────────────
// Each sort has: id, label, icon (SVG path data), description
export const SORT_TYPES: SortType[] = [
  {
    id: 'name',
    label: 'Name',
    description: 'Sort alphabetically by name',
    // svgInner: the inner markup of a 20x20 SVG, used with dangerouslySetInnerHTML
    svgInner: `<text x="1" y="13" font-size="9" font-family="system-ui,sans-serif" font-weight="700" fill="currentColor">A</text><text x="10" y="13" font-size="9" font-family="system-ui,sans-serif" font-weight="700" fill="currentColor">Z</text><line x1="8" y1="10" x2="8" y2="16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><polyline points="5.5,13.5 8,16 10.5,13.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'added',
    label: 'Date Added',
    description: 'Sort by date added (newest first)',
    svgInner: `<rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="2" x2="7" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13" y1="2" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="11" x2="10" y2="15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><polyline points="7.5,12.5 10,11 12.5,12.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'modified',
    label: 'Date Modified',
    description: 'Sort by last modified date (newest first)',
    svgInner: `<rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="7" y1="2" x2="7" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13" y1="2" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 11 L10 13.2 L11.5 14.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
  {
    id: 'size',
    label: 'Size',
    description: 'Sort by file size (largest first)',
    svgInner: `<rect x="2" y="13" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.9"/><rect x="8" y="9" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.7"/><rect x="14" y="4" width="4" height="13" rx="0.5" fill="currentColor" opacity="0.5"/><line x1="2" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="1.1"/>`,
  },
];

export const DEFAULT_SORT: SortBy = 'name';

// ─── Core Sort Function ────────────────────────────────────────────────────────
// Directories always come before files (except in search/smart folder contexts).
// sortBy: 'name' | 'added' | 'modified' | 'size'
// sortOrder: 'asc' | 'desc'
export function sortFiles(files: FileItem[], sortBy: SortBy = 'name', sortOrder: SortOrder = 'asc'): FileItem[] {
  const cacheKey = getCacheKey(files, sortBy, sortOrder);
  const cached = sortCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const sorted = [...files].sort((a, b) => {
    // Directories always first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let cmp = 0;
    switch (sortBy) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'size':
        cmp = (a.size || 0) - (b.size || 0);
        break;
      case 'added':
        cmp = new Date(a.added || a.birthtime || a.modified || 0).getTime() - new Date(b.added || b.birthtime || b.modified || 0).getTime();
        break;
      case 'modified':
        cmp = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
        break;
      // Legacy compatibility
      case 'extension':
        cmp = (a.extension || '').localeCompare(b.extension || '');
        break;
      default:
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  sortCache.set(cacheKey, sorted);
  return sorted;
}
