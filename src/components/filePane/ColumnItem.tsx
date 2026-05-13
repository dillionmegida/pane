import React from 'react';
import styled from 'styled-components';
import { FileIcon as FileIconComponent } from '../FileIcons';
import { startDrag, endDrag } from './dragUtils';
import type { FileItem, ColumnState } from '../../types';

const Item = styled.div<{ selected: boolean; dragOver: boolean; contextMenuSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
  color: ${p => p.theme.text.secondary};
  background: ${p =>
    p.contextMenuSelected ? p.theme.bg.hover :
    p.selected ? p.theme.bg.selection :
    'transparent'};
  border-radius: ${p => p.theme.radius.sm};
  margin: 0 3px;
  position: relative;
  scroll-margin-bottom: 40px;
  transition: background 0.07s;

  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }

  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1.5px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.sm};
    pointer-events: none;
  }
`;

const ItemIcon = styled.span`
  font-size: 13px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const ItemName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.theme.text.primary};
`;

const ItemArrow = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
  flex-shrink: 0;
`;

const SymlinkIndicator = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  flex-shrink: 0;
`;

const TagDots = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`;

const TagDot = styled.span<{ color: string; offset: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
`;

interface ColumnItemProps {
  file: FileItem;
  isSelected: boolean;
  isDragOver: boolean;
  isContextMenuSelected: boolean;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  paneId: string;
  fileTags: Record<string, Array<{ tag_name: string; color: string }>>;
  columnIndex: number;
  onItemClick: (e: React.MouseEvent, file: FileItem, columnIndex: number, clickType: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  onDrop: (e: React.DragEvent, file: FileItem | null, path?: string) => void;
  setSelection: (paneId: string, files: string[]) => void;
  setDraggedFiles: (files: string[]) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragOver: (path: string | null) => void;
  updateColumnState: (paneId: string, updates: Partial<ColumnState>) => void;
  toggleSelection: (paneId: string, filePath: string, multi?: boolean) => void;
}

export default function ColumnItem({
  file,
  isSelected,
  isDragOver,
  isContextMenuSelected,
  selectedFiles,
  draggedFiles,
  paneId,
  fileTags,
  columnIndex,
  onItemClick,
  onContextMenu,
  onDrop,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
  updateColumnState,
  toggleSelection,
}: ColumnItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clickType = e.shiftKey ? 'shift' : e.metaKey || e.ctrlKey ? 'meta' : 'normal';
    if (clickType === 'meta') {
      toggleSelection(paneId, file.path, true);
    } else {
      updateColumnState(paneId, { focusedIndex: columnIndex });
      onItemClick(e, file, columnIndex, clickType);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    startDrag(e, file, selectedFiles, setSelection, setDraggedFiles, setIsDragging, paneId);
  };

  const handleDragEnd = () => endDrag(setIsDragging, setDraggedFiles, setDragOver);

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      setDragOver(file.path);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target || !(e.currentTarget as Node).contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  };

  const tags = fileTags[file.path] || [];

  return (
    <Item
      selected={isSelected}
      dragOver={isDragOver}
      contextMenuSelected={isContextMenuSelected}
      className={`${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleClick}
      onContextMenu={e => onContextMenu(e, file)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={e => onDrop(e, file)}
    >
      <ItemIcon>
        {file.isDirectory ? (
          file.name && file.name.endsWith('.app') ? (
            <FileIconComponent ext="app" size={16} />
          ) : (
            '📁'
          )
        ) : (
          <FileIconComponent ext={file.extension ?? ''} size={16} />
        )}
      </ItemIcon>
      <ItemName>
        {file.name}
        {file.isSymlink && (
          <SymlinkIndicator title={file.symlinkTarget ? `→ ${file.symlinkTarget}` : 'Symlink'}>
            {' '}↗
          </SymlinkIndicator>
        )}
      </ItemName>
      {tags.length > 0 && (
        <TagDots>
          {tags.map((t, i) => (
            <TagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3 : 0} />
          ))}
        </TagDots>
      )}
      {file.isDirectory && <ItemArrow>›</ItemArrow>}
    </Item>
  );
}
