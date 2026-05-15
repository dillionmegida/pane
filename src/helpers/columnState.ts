import type { FileItem, SortBy } from '../types';
import { sortFiles } from './sort';

export interface BuildColumnStateResult {
  paths: string[];
  filesByPath: Record<string, FileItem[]>;
  selectedByColumn: Record<number, string>;
  focusedIndex: number;
}

export interface BuildColumnStateDeps {
  readdir: (path: string) => Promise<{ success: boolean; files: FileItem[]; error?: string }>;
  getDirSort: (dirPath: string) => SortBy;
}

/**
 * Build column state from base path and target path.
 * This is used by both history restoration and file reveal functionality.
 * 
 * @param basePath - The starting/base directory (rendered as first column)
 * @param targetPath - The target directory to navigate to
 * @param deps - Dependencies (readdir, getDirSort)
 * @returns Column state with paths, files, selections, and focus index
 */
export async function buildColumnState(
  basePath: string,
  targetPath: string,
  deps: BuildColumnStateDeps
): Promise<BuildColumnStateResult> {
  const columnPaths: string[] = [];
  const filesByPath: Record<string, FileItem[]> = {};
  const selectedByColumn: Record<number, string> = {};

  if (targetPath && targetPath !== basePath && targetPath.startsWith(basePath)) {
    const fullParts = targetPath.split('/');
    let current = '';
    for (let i = 0; i < fullParts.length; i++) {
      current += (i === 0 ? '' : '/') + fullParts[i];
      // Handle root path case: if basePath is '/', just check if current starts with '/'
      // Otherwise, check if current starts with basePath + '/'
      const isChild = basePath === '/' 
        ? current.length > 1 && current.startsWith('/') 
        : current.length > basePath.length && current.startsWith(basePath + '/');
      if (isChild) {
        columnPaths.push(current);
      }
    }

    for (const colPath of columnPaths) {
      const colResult = await deps.readdir(colPath);
      if (colResult.success) {
        const colDirSort = deps.getDirSort(colPath);
        filesByPath[colPath] = sortFiles(colResult.files, colDirSort, 'asc');
      }
    }

    // Build selectedByColumn: column index 0 selects columnPaths[0], index 1 selects columnPaths[1], etc.
    columnPaths.forEach((path, i) => {
      selectedByColumn[i] = path;
    });
  }

  const focusedIndex = columnPaths.length;

  return { paths: columnPaths, filesByPath, selectedByColumn, focusedIndex };
}
