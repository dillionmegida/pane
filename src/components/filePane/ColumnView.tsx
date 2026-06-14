import React from 'react';
import styled from 'styled-components';
import Column from './Column';
import type { FileItem } from '../../types';

const ColumnViewArea = styled.div`
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  position: relative;
`;

interface ColumnViewProps {
  paneId: string;
  pane: any;
  files: FileItem[];
  columnState: any;
  showHidden: boolean;
  columnViewRef: React.RefObject<HTMLDivElement | null>;
  columnWidths: number[];
  defaultColumnWidth: number;
  derivedSelections: Record<number, string | null>;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  dragOver: string | null;
  contextMenuFile: FileItem | null;
  fileTags: Record<string, any[]>;
  renaming: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  setRenaming: (path: string | null) => void;
  handleColumnItemClick: (e: React.MouseEvent, file: FileItem, colIndex: number, type: string) => void;
  handleFileDoubleClick: (file: FileItem) => void;
  handleContextMenu: (e: React.MouseEvent, file: FileItem | null) => void;
  handleDrop: (e: React.DragEvent, file: FileItem | null, path?: string) => void;
  handleColumnResizerMouseDown: (colIndex: number) => (e: React.MouseEvent) => void;
  setSelection: (paneId: string, files: string[], colIdx?: number | null) => void;
  setDraggedFiles: (f: string[]) => void;
  setIsDragging: (v: boolean) => void;
  setDragOver: (v: string | null) => void;
  updateColumnState: (paneId: string, update: any) => void;
  toggleSelection: (paneId: string, path: string, multi?: boolean, colIdx?: number) => void;
  onBaseEmptyClick: () => void;
  onColumnEmptyClick: (colIndex: number) => void;
}

export default function ColumnView({
  paneId, pane, files, columnState, showHidden,
  columnViewRef, columnWidths, defaultColumnWidth,
  derivedSelections, selectedFiles, draggedFiles, dragOver,
  contextMenuFile, fileTags,
  renaming, renameValue, setRenameValue, commitRename, setRenaming,
  handleColumnItemClick, handleFileDoubleClick, handleContextMenu,
  handleDrop, handleColumnResizerMouseDown,
  setSelection, setDraggedFiles, setIsDragging, setDragOver,
  updateColumnState, toggleSelection,
  onBaseEmptyClick, onColumnEmptyClick,
}: ColumnViewProps) {
  const paths = columnState?.paths || [];
  const filesByPath = columnState?.filesByPath || {};
  const base = pane.basePath || pane.path;
  const filterHidden = (arr: FileItem[]) => showHidden ? arr : arr.filter(f => !f.name.startsWith('.'));
  const baseDirFiles = filterHidden(filesByPath[base] || files);

  const sharedColumnProps = {
    paneId, fileTags, draggedFiles, dragOver, contextMenuFile,
    renamingPath: renaming, renameValue,
    onRenameValueChange: setRenameValue,
    onRenameCommit: commitRename,
    onRenameCancel: () => setRenaming(null),
    onItemClick: handleColumnItemClick,
    onItemDoubleClick: handleFileDoubleClick,
    onItemContextMenu: (e: React.MouseEvent, f: FileItem) => handleContextMenu(e, f),
    onDrop: handleDrop,
    setSelection, setDraggedFiles, setIsDragging, setDragOver,
    updateColumnState, toggleSelection,
    columnPaths: paths,
    derivedSelections,
    selectedFiles,
  };

  return (
    <ColumnViewArea ref={columnViewRef} onClick={() => setSelection(paneId, [])}>
      <Column
        key={base}
        colPath={base}
        columnIndex={0}
        colFiles={baseDirFiles}
        isFocused={(columnState?.focusedIndex ?? 0) === 0}
        width={`${columnWidths[0] ?? defaultColumnWidth}px`}
        onEmptyClick={onBaseEmptyClick}
        onResizerMouseDown={handleColumnResizerMouseDown(0)}
        {...sharedColumnProps}
      />
      {paths.map((colPath: string, idx: number) => {
        const colFiles = filterHidden(filesByPath[colPath] || []);
        const colIndex = idx + 1;
        const isLoading = columnState?.loadingPath === colPath;
        return (
          <Column
            key={colPath}
            colPath={colPath}
            columnIndex={colIndex}
            colFiles={colFiles}
            isFocused={(columnState?.focusedIndex ?? 0) === colIndex}
            width={`${columnWidths[colIndex] ?? defaultColumnWidth}px`}
            onEmptyClick={() => onColumnEmptyClick(colIndex)}
            onResizerMouseDown={handleColumnResizerMouseDown(colIndex)}
            isLoading={isLoading}
            {...sharedColumnProps}
          />
        );
      })}
    </ColumnViewArea>
  );
}
