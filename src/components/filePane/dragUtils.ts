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

  e.dataTransfer.effectAllowed = 'copyMove';
  e.dataTransfer.setData('file-paths', JSON.stringify(filesToDrag));

  const img = createDragImage(file, selectedFiles.has(file.path) ? selectedFiles : new Set([file.path]));
  e.dataTransfer.setDragImage(img, 0, 0);
  setTimeout(() => document.body.removeChild(img), 0);

  setDraggedFiles(filesToDrag);
  setIsDragging(true);
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
