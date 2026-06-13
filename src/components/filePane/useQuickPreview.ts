import { useState, useEffect } from 'react';
import { useStore, PREVIEW_TYPES } from '../../store';
import type { FileItem } from '../../types';

interface UseQuickPreviewParams {
  paneId: string;
  activePane: string | null;
  selectedFiles: Set<string>;
  files: FileItem[];
  columnState: any;
  activeModal: string | null;
  showSearch: boolean;
}

export function useQuickPreview({
  paneId, activePane, selectedFiles, files, columnState, activeModal, showSearch,
}: UseQuickPreviewParams) {
  const [quickPreviewFile, setQuickPreviewFile] = useState<FileItem | null>(null);

  useEffect(() => {
    if (activePane !== paneId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (activeModal || showSearch) return;
      if (useStore.getState().activePane !== paneId) return;
      const selArray = [...selectedFiles];
      if (selArray.length === 0) return;
      const filePath = selArray[0];
      let fileObj: FileItem | undefined = files.find(f => f.path === filePath);
      if (!fileObj) {
        for (const colFiles of Object.values(columnState?.filesByPath || {})) {
          const found = (colFiles as FileItem[]).find(f => f.path === filePath);
          if (found) { fileObj = found; break; }
        }
      }
      if (!fileObj || fileObj.isDirectory) return;
      const ext = fileObj.extension || '';
      const canPreview =
        (PREVIEW_TYPES.imageExts as unknown as string[]).includes(ext) ||
        (PREVIEW_TYPES.videoExts as unknown as string[]).includes(ext) ||
        (PREVIEW_TYPES.audioExts as unknown as string[]).includes(ext) ||
        ext === 'pdf';
      if (!canPreview) return;
      e.preventDefault();
      setQuickPreviewFile(fileObj);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activePane, paneId, selectedFiles, files, columnState, activeModal, showSearch]);

  return { quickPreviewFile, setQuickPreviewFile };
}
