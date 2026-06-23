import { useState, useCallback } from 'react';
import type { FileItem } from '../../types';
import { getDraggedPaths } from './dragUtils';

interface UseDragDropParams {
  paneId: string;
  pane: any;
  columnState: any;
  refreshPane: (paneId: string) => void;
  readDirSorted: (dirPath: string, paneId: string) => Promise<any>;
  updateColumnState: (paneId: string, update: any) => void;
}

export function useDragDrop({
  paneId, pane, columnState, refreshPane, readDirSorted, updateColumnState,
}: UseDragDropParams) {
  const [draggedFiles, setDraggedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = useCallback(async (e: React.DragEvent, file: FileItem | null, path?: string) => {
    e.preventDefault();
    setDragOver(null);
    const srcPaths = getDraggedPaths(e);
    if (!srcPaths.length) return;
    const destDir = file?.isDirectory ? file.path : (path || pane.path);

    // Ignore drops where the source is already in the destination directory
    // (e.g. dropping a file back onto its own pane).
    const filteredPaths = srcPaths.filter(src => {
      const parent = src.substring(0, src.lastIndexOf('/'));
      return parent !== destDir;
    });
    if (!filteredPaths.length) return;

    const isCopy = e.altKey;
    const ops = filteredPaths.map(src => {
      const dest = `${destDir}/${src.split('/').pop()}`;
      return isCopy
        ? window.electronAPI.copy(src, dest)
        : window.electronAPI.move(src, dest);
    });
    await Promise.all(ops);
    refreshPane(paneId);
    const result = await readDirSorted(destDir, paneId);
    if (result.success) {
      updateColumnState(paneId, {
        filesByPath: { ...(columnState.filesByPath || {}), [destDir]: result.files },
      });
    }
  }, [pane, paneId, columnState]);

  return { draggedFiles, setDraggedFiles, isDragging, setIsDragging, dragOver, setDragOver, handleDrop };
}
