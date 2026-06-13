import { useEffect } from 'react';
import type { FileItem, ViewMode } from '../../types';

interface UseKeyboardNavigationParams {
  isActive: boolean;
  paneId: string;
  selectedFiles: Set<string>;
  files: FileItem[];
  viewMode: ViewMode;
  columnState: any;
  pane: any;
  showHidden: boolean;
  getColumnPaths: (paneId: string) => string[];
  toggleHiddenFiles: () => void;
  setSelection: (paneId: string, files: string[], columnIndex?: number | null) => void;
  handleColumnItemClick: (e: React.MouseEvent, file: FileItem, columnIndex: number, clickType: string) => void;
  startRename: (file: FileItem) => void;
  createFolder: () => void;
  handleDelete: () => void;
  goBackInHistory: (paneId: string) => void;
  goForwardInHistory: (paneId: string) => void;
  typingBufferRef: React.MutableRefObject<string>;
  setTypingBuffer: (buf: string) => void;
  shiftAnchorPathRef: React.MutableRefObject<string | null>;
  shiftCursorPathRef: React.MutableRefObject<string | null>;
}

export function useKeyboardNavigation({
  isActive,
  paneId,
  selectedFiles,
  files,
  viewMode,
  columnState,
  pane,
  showHidden,
  getColumnPaths,
  toggleHiddenFiles,
  setSelection,
  handleColumnItemClick,
  startRename,
  createFolder,
  handleDelete,
  goBackInHistory,
  goForwardInHistory,
  typingBufferRef,
  setTypingBuffer,
  shiftAnchorPathRef,
  shiftCursorPathRef,
}: UseKeyboardNavigationParams) {
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Type-to-search: capture alphanumeric keystrokes, space, dot, underscore, and hyphen
      // Special case: if space is pressed and buffer is empty, let it fall through to quick preview
      if (e.key.length === 1 && /[a-zA-Z0-9 ._\-]/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // If space is pressed and buffer is empty, skip type-to-search (allow quick preview)
        if (e.key === ' ' && typingBufferRef.current === '') {
          return;
        }
        e.preventDefault();
        const newBuffer = typingBufferRef.current + e.key.toLowerCase();
        typingBufferRef.current = newBuffer;
        setTypingBuffer(newBuffer);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggleHiddenFiles();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        createFolder();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        goBackInHistory(paneId);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        goForwardInHistory(paneId);
        return;
      }

      if (e.key === 'Enter' && selectedFiles.size === 1) {
        const file = files.find(f => selectedFiles.has(f.path))
          || (Object.values(columnState?.filesByPath || {}).flat() as FileItem[]).find(f => selectedFiles.has(f.path));
        if (file) startRename(file);
        return;
      }

      const focusedIdx = columnState.focusedIndex ?? 0;
      const base = pane.basePath || pane.path;
      const columnPaths = getColumnPaths(paneId);
      const focusedColPath = columnPaths[focusedIdx] ?? base;
      const filterHiddenNav = (arr: FileItem[]) => showHidden ? arr : arr.filter((f: FileItem) => !f.name.startsWith('.'));
      const displayFiles = viewMode === 'column'
        ? filterHiddenNav(columnState.filesByPath?.[focusedColPath] || (focusedIdx === 0 ? files : []))
        : files;

      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        shiftAnchorPathRef.current = null;
        shiftCursorPathRef.current = null;
        if (displayFiles.length === 0) return;
        const firstFile = displayFiles[0];
        if (!firstFile) return;
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, firstFile, focusedIdx, 'keyboard');
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        shiftAnchorPathRef.current = null;
        shiftCursorPathRef.current = null;
        if (displayFiles.length === 0) return;
        const lastFile = displayFiles[displayFiles.length - 1];
        if (!lastFile) return;
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, lastFile, focusedIdx, 'keyboard');
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (displayFiles.length === 0) return;

        if (e.shiftKey) {
          // Initialize anchor on first shift+arrow press
          if (!shiftAnchorPathRef.current) {
            const curPath = [...selectedFiles].pop();
            const anchorIdx = curPath !== undefined ? displayFiles.findIndex((f: FileItem) => f.path === curPath) : -1;
            const effectiveAnchorIdx = anchorIdx >= 0 ? anchorIdx : 0;
            const anchorFile = displayFiles[effectiveAnchorIdx];
            if (!anchorFile) return;
            shiftAnchorPathRef.current = anchorFile.path;
            shiftCursorPathRef.current = anchorFile.path;
          }

          const anchorPath = shiftAnchorPathRef.current!;
          const anchorIdx = displayFiles.findIndex((f: FileItem) => f.path === anchorPath);
          if (anchorIdx === -1) {
            shiftAnchorPathRef.current = null;
            shiftCursorPathRef.current = null;
            return;
          }

          const cursorPath = shiftCursorPathRef.current ?? anchorPath;
          const rawCursorIdx = displayFiles.findIndex((f: FileItem) => f.path === cursorPath);
          const cursorIdx = rawCursorIdx >= 0 ? rawCursorIdx : anchorIdx;

          let newCursorIdx: number;
          if (e.key === 'ArrowDown') {
            newCursorIdx = Math.min(cursorIdx + 1, displayFiles.length - 1);
          } else {
            // ArrowUp: move cursor upward (selection always includes anchor, so never < 1 item)
            newCursorIdx = Math.max(cursorIdx - 1, 0);
          }

          shiftCursorPathRef.current = displayFiles[newCursorIdx]?.path ?? null;

          const lo = Math.min(anchorIdx, newCursorIdx);
          const hi = Math.max(anchorIdx, newCursorIdx);
          const rangeFiles = displayFiles.slice(lo, hi + 1).map((f: FileItem) => f.path);
          setSelection(paneId, rangeFiles, viewMode === 'column' ? focusedIdx : null);
          return;
        }

        // Non-shift: clear shift state and navigate normally
        shiftAnchorPathRef.current = null;
        shiftCursorPathRef.current = null;

        const curPath = [...selectedFiles].pop();
        const curIdx = displayFiles.findIndex((f: FileItem) => f.path === curPath);
        let nextIdx: number;
        if (e.key === 'ArrowDown') {
          nextIdx = curIdx < 0 || curIdx >= displayFiles.length - 1 ? 0 : curIdx + 1;
        } else {
          nextIdx = curIdx <= 0 ? displayFiles.length - 1 : curIdx - 1;
        }
        const nextFile = displayFiles[nextIdx];
        if (!nextFile) return;
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, nextFile, focusedIdx, 'keyboard');
        return;
      }

      if (e.key === 'ArrowRight' && viewMode === 'column') {
        e.preventDefault();
        shiftAnchorPathRef.current = null;
        shiftCursorPathRef.current = null;
        const selPath = [...selectedFiles].pop();
        const sel = displayFiles.find((f: FileItem) => f.path === selPath);
        if (!sel?.isDirectory) return;
        const childFiles = columnState.filesByPath?.[sel.path] || [];
        if (!childFiles.length) return;
        const firstChild = childFiles[0];
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, firstChild, focusedIdx + 1, 'keyboard');
        return;
      }

      if (e.key === 'ArrowLeft' && viewMode === 'column') {
        e.preventDefault();
        shiftAnchorPathRef.current = null;
        shiftCursorPathRef.current = null;
        if (focusedIdx <= 0) return;
        const newFocusedIdx = focusedIdx - 1;
        // Find what was selected in the target column, fall back to the column's path
        const targetSelPath = columnState.selectedByColumn?.[newFocusedIdx] ?? columnPaths[newFocusedIdx];
        if (!targetSelPath) return;
        const targetColPath = columnPaths[newFocusedIdx] ?? base;
        const targetColFiles = columnState.filesByPath?.[targetColPath] ?? (newFocusedIdx === 0 ? files : []);
        const targetFile = targetColFiles.find((f: FileItem) => f.path === targetSelPath);
        if (!targetFile) return;
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, targetFile, newFocusedIdx, 'keyboard');
        return;
      }

      if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
        e.preventDefault();
        handleDelete();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, paneId, selectedFiles, files, viewMode, columnState, pane, toggleHiddenFiles, getColumnPaths]);

}
