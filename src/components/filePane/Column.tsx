import React from 'react';
import styled from 'styled-components';
import ColumnItem from './ColumnItem';
import type { FileItem, ColumnState } from '../../types';

const ColumnWrap = styled.div<{ width: string; $isFocused: boolean }>`
  width: ${p => p.width};
  min-width: ${p => p.width};
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
  position: relative;
  background: ${p => p.$isFocused ? `${p.theme.bg.hover}66` : 'transparent'};
  transition: background 0.1s;
`;

const ColumnList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2px 0 48px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { width: 1px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${p => p.theme.border.subtle}; border-radius: 1px; }
`;

const ColumnResizer = styled.div`
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  &:hover { background: ${p => p.theme.accent.blue}40; }
`;

interface ColumnProps {
  colPath: string;
  columnIndex: number;
  colFiles: FileItem[];
  isFocused: boolean;
  width: string;
  columnPaths: string[];
  derivedSelections: Record<number, string | null>;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  dragOver: string | null;
  contextMenuFile: FileItem | null;
  paneId: string;
  fileTags: Record<string, Array<{ tag_name: string; color: string }>>;
  renamingPath: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onItemClick: (e: React.MouseEvent, file: FileItem, columnIndex: number, clickType: string) => void;
  onItemContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  onDrop: (e: React.DragEvent, file: FileItem | null, path?: string) => void;
  onEmptyClick: (columnIndex: number) => void;
  setSelection: (paneId: string, files: string[]) => void;
  setDraggedFiles: (files: string[]) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragOver: (path: string | null) => void;
  updateColumnState: (paneId: string, updates: Partial<ColumnState>) => void;
  toggleSelection: (paneId: string, filePath: string, multi?: boolean) => void;
  onResizerMouseDown: (e: React.MouseEvent) => void;
}

export default function Column({
  colPath,
  columnIndex,
  colFiles,
  isFocused,
  width,
  columnPaths,
  derivedSelections,
  selectedFiles,
  draggedFiles,
  dragOver,
  contextMenuFile,
  paneId,
  fileTags,
  renamingPath,
  renameValue,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onItemClick,
  onItemContextMenu,
  onDrop,
  onEmptyClick,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
  updateColumnState,
  toggleSelection,
  onResizerMouseDown,
}: ColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    onDrop(e, null, colPath);
  };

  return (
    <ColumnWrap
      width={width}
      $isFocused={isFocused}
      data-column-index={columnIndex}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ColumnList data-column-list onClick={() => onEmptyClick(columnIndex)}>
        {colFiles.map(file => {
          const isSelected = selectedFiles.has(file.path);
          const isDerived = derivedSelections[columnIndex] === file.path;
          const isDragOver = dragOver === file.path;
          const isContextMenu = contextMenuFile?.path === file.path;

          return (
            <ColumnItem
              key={file.path}
              file={file}
              isSelected={isSelected}
              isDerived={isDerived}
              isDragOver={isDragOver}
              isContextMenuSelected={isContextMenu}
              selectedFiles={selectedFiles}
              draggedFiles={draggedFiles}
              paneId={paneId}
              fileTags={fileTags}
              columnIndex={columnIndex}
              isRenaming={renamingPath === file.path}
              renameValue={renamingPath === file.path ? renameValue : ''}
              onRenameValueChange={onRenameValueChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              onItemClick={onItemClick}
              onContextMenu={onItemContextMenu}
              onDrop={onDrop}
              setSelection={setSelection}
              setDraggedFiles={setDraggedFiles}
              setIsDragging={setIsDragging}
              setDragOver={setDragOver}
              updateColumnState={updateColumnState}
              toggleSelection={toggleSelection}
            />
          );
        })}
      </ColumnList>
      <ColumnResizer onMouseDown={onResizerMouseDown} />
    </ColumnWrap>
  );
}
