import React from 'react';
import styled from 'styled-components';
import { FileIcon as FileIconComponent } from '../FileIcons';
import { startDrag, endDrag } from './dragUtils';
import type { FileItem, Tag } from '../../types';

const GridItem = styled.div<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: ${p => p.theme.radius.md};
  cursor: pointer;
  background: ${p => p.selected ? p.theme.bg.selection : 'transparent'};
  transition: background 0.07s;
  position: relative;
  scroll-margin-bottom: 72px;
  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }

  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.md};
    background: ${p => p.theme.accent.blue}15;
    pointer-events: none;
  }
`;

const GridIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
`;

const GridName = styled.span`
  font-size: 10px;
  text-align: center;
  color: ${p => p.theme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 72px;
`;

const SymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  &:hover { opacity: 1; color: ${p => p.theme.accent.blue}; }
`;

const TagDots = styled.span`
  display: flex;
  justify-content: center;
  margin-top: 2px;
`;

const TagDot = styled.span<{ color: string; offset: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
`;

interface FileGridItemProps {
  file: FileItem;
  isSelected: boolean;
  isDragOver: boolean;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  paneId: string;
  fileTags: Record<string, Tag[]>;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDrop: (e: React.DragEvent, file: FileItem) => void;
  setSelection: (paneId: string, files: string[]) => void;
  setDraggedFiles: (files: string[]) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragOver: (path: string | null) => void;
}

export default function FileGridItem({
  file,
  isSelected,
  isDragOver,
  selectedFiles,
  draggedFiles,
  paneId,
  fileTags,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDrop,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
}: FileGridItemProps) {
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
    <GridItem
      selected={isSelected}
      className={isDragOver ? 'drag-over' : ''}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={e => onDrop(e, file)}
    >
      <GridIcon>
        {file.isDirectory ? (
          file.name && file.name.endsWith('.app') ? (
            <FileIconComponent ext="app" size={24} />
          ) : (
            '📁'
          )
        ) : (
          <FileIconComponent ext={file.extension ?? ''} size={24} />
        )}
      </GridIcon>
      <GridName>{file.name}</GridName>
      {file.isSymlink && file.symlinkTarget && (
        <SymlinkIndicator
          data-tooltip-id="symlink-tooltip"
          data-tooltip-content={`→ ${file.symlinkTarget}`}
        >
          ↗
        </SymlinkIndicator>
      )}
      {tags.length > 0 && (
        <TagDots>
          {tags.map((t, i) => (
            <TagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3 : 0} />
          ))}
        </TagDots>
      )}
    </GridItem>
  );
}
