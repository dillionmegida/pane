import React from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import { FileIcon as FileIconComponent } from '../FileIcons';
import { startDrag, endDrag } from './dragUtils';

const Styled = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: ${p => p.theme.text.primary};
  background: ${p => p.contextMenuSelected ? p.theme.bg.hover : 'transparent'};
  position: relative;
  scroll-margin-bottom: 72px;
  
  &:hover {
    background: ${p => p.theme.bg.hover};
  }
  
  &.selected {
    background: ${p => p.theme.bg.selection};
    color: ${p => p.theme.accent.blue};
  }

  &.selected-dim {
    background: ${p => p.theme.bg.active};
    color: ${p => p.theme.text.primary};
  }
  
  &.drag-over {
    background: ${p => p.theme.accent.blue}15;
    border-left: 3px solid ${p => p.theme.accent.blue};
    padding-left: 7px;
  }
  
  .icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
  }
  
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const SymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  flex-shrink: 0;
  
  &:hover {
    opacity: 1;
    color: ${p => p.theme.accent.blue};
  }
`;

const TagDots = styled.span`
  display: flex;
  flex-shrink: 0;
`;

const TagDot = styled.span.withConfig({ shouldForwardProp: p => p !== 'offset' })`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
  border: 1px solid white;
`;

export default function ColumnItem({
  file,
  columnIndex,
  columnPaths,
  derivedSelections,
  selectedFiles,
  draggedFiles,
  dragOver,
  contextMenuFile,
  paneId,
  fileTags,
  onClick,
  onContextMenu,
  onDrop,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
  updateColumnState,
  toggleSelection,
}) {
  const isSelected = selectedFiles.has(file.path);
  const isDimSelected = derivedSelections[columnIndex] === file.path && columnIndex < columnPaths.length - 1;
  const isContextMenuSelected = contextMenuFile?.path === file.path;
  const isDragOver = dragOver === file.path;

  let className = '';
  if (isSelected) className = 'selected';
  else if (isDimSelected) className = 'selected-dim';
  if (isDragOver) className += ' drag-over';

  const handleDragStart = (e) => {
    startDrag(e, file, selectedFiles, setSelection, setDraggedFiles, setIsDragging, paneId);
  };

  const handleDragEnd = () => endDrag(setIsDragging, setDraggedFiles, setDragOver);

  const handleDragOver = (e) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      setDragOver(file.path);
    }
  };

  const handleDragEnter = (e) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(null);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    useStore.getState().setActivePane(paneId);
    updateColumnState(paneId, { focusedIndex: columnIndex });

    if (e.metaKey || e.ctrlKey) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey) {
      onClick(e, file, columnIndex, 'shift');
    } else {
      setSelection(paneId, [file.path]);
      onClick(e, file, columnIndex, 'normal');
    }
  };

  const tags = fileTags[file.path] || [];

  return (
    <Styled
      className={className.trim()}
      contextMenuSelected={isContextMenuSelected}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={e => { e.stopPropagation(); onDrop(e, file); }}
    >
      <span className="icon">
        {file.isDirectory ? (
          file.name && file.name.endsWith('.app') ? (
            <FileIconComponent ext="app" size={14} />
          ) : (
            '📁'
          )
        ) : (
          <FileIconComponent ext={file.extension} size={14} />
        )}
      </span>
      <span className="name">{file.name}</span>
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
            <TagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3.5 : 0} />
          ))}
        </TagDots>
      )}
    </Styled>
  );
}
