import type { FileItem } from '../../types';

export function createDragImage(file: FileItem, selectedFiles: Set<string>): HTMLElement {
  const el = document.createElement('div');
  const count = selectedFiles.size > 1 ? selectedFiles.size : 1;
  el.textContent = count > 1 ? `${count} items` : file.name;
  el.style.cssText = `
    position: fixed;
    top: -100px;
    left: -100px;
    background: rgba(30,30,40,0.9);
    color: #e8e8ed;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
  `;
  document.body.appendChild(el);
  return el;
}

export function startDrag(
  e: React.DragEvent,
  file: FileItem,
  selectedFiles: Set<string>,
  setSelection: (paneId: string, files: string[]) => void,
  setDraggedFiles: (files: string[]) => void,
  setIsDragging: (dragging: boolean) => void,
  paneId: string,
): void {
  const filesToDrag = selectedFiles.has(file.path)
    ? [...selectedFiles]
    : [file.path];

  if (!selectedFiles.has(file.path)) {
    setSelection(paneId, [file.path]);
  }

  setDraggedFiles(filesToDrag);
  setIsDragging(true);

  // Cancel Chromium's HTML5 drag. On macOS the native OS drag (started below
  // via the main process) only engages if the default drag is prevented;
  // otherwise the two conflict and external drops silently fail.
  e.preventDefault();

  // Start a native OS drag session so files can be dropped onto external apps
  // (Finder, Mail, etc.). Internal drops read the file paths back from
  // `dataTransfer.files` via getDraggedPaths().
  window.electronAPI?.startDrag?.(filesToDrag);

  // Native drags don't emit an HTML5 'dragend', so reset drag state manually.
  const cleanup = () => {
    setIsDragging(false);
    setDraggedFiles([]);
    window.removeEventListener('mouseup', cleanup);
    window.removeEventListener('dragend', cleanup);
  };
  window.addEventListener('mouseup', cleanup);
  window.addEventListener('dragend', cleanup);
}

// Resolve the dragged file paths from a drop event. Internal drags carry the
// custom 'file-paths' payload; native/external drags expose OS file paths on
// `dataTransfer.files` instead.
export function getDraggedPaths(e: React.DragEvent): string[] {
  const raw = e.dataTransfer.getData('file-paths');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through to native files
    }
  }
  const files = e.dataTransfer.files;
  if (files && files.length) {
    return Array.from(files)
      .map(f => (f as File & { path?: string }).path || '')
      .filter(Boolean);
  }
  return [];
}

export function endDrag(
  setIsDragging: (dragging: boolean) => void,
  setDraggedFiles: (files: string[]) => void,
  setDragOver: (path: string | null) => void,
): void {
  setIsDragging(false);
  setDraggedFiles([]);
  setDragOver(null);
}
