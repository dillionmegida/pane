import React from 'react';
import styled from 'styled-components';
import ColumnItem from './ColumnItem';

const ColumnWrapper = styled.div`
  width: ${p => p.width || '200px'};
  min-width: 150px;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  position: relative;
  flex-shrink: 0;
  
  &.active {
    background: ${p => p.theme.bg.secondary};
  }
`;

const ColumnList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px 0;
  height: 100%;
  align-self: stretch;
`;

const ColumnResizer = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
  
  &:hover {
    background: ${p => p.theme.accent.blue}40;
  }
  
  &.dragging {
    background: ${p => p.theme.accent.blue}60;
  }
`;

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
}) {
  return (
    <ColumnWrapper
      width={width}
      className={isFocused ? 'active' : ''}
      data-column-index={columnIndex}
    >
      <ColumnList
        data-column-list
        onClick={() => onEmptyClick(columnIndex)}
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
        }}
        onDrop={e => {
          e.stopPropagation();
          onDrop(e, null, colPath);
        }}
      >
        {colFiles.map(file => (
          <ColumnItem
            key={file.path}
            file={file}
            columnIndex={columnIndex}
            columnPaths={columnPaths}
            derivedSelections={derivedSelections}
            selectedFiles={selectedFiles}
            draggedFiles={draggedFiles}
            dragOver={dragOver}
            contextMenuFile={contextMenuFile}
            paneId={paneId}
            fileTags={fileTags}
            onClick={onItemClick}
            onContextMenu={e => onItemContextMenu(e, file)}
            onDrop={onDrop}
            setSelection={setSelection}
            setDraggedFiles={setDraggedFiles}
            setIsDragging={setIsDragging}
            setDragOver={setDragOver}
            updateColumnState={updateColumnState}
            toggleSelection={toggleSelection}
          />
        ))}
      </ColumnList>
      <ColumnResizer onMouseDown={onResizerMouseDown} />
    </ColumnWrapper>
  );
}
