import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import FilePane from './FilePane';

const Wrap = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
`;

const PaneWrap = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
`;

const Divider = styled.div`
  width: 4px;
  background: ${p => p.theme.border.subtle};
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  transition: background 0.15s;
  &:hover, &.dragging { background: ${p => p.theme.accent.blue}; }
`;

export default function MainContent() {
  const { splitRatio, setSplitRatio, showRightPane, panes } = useStore();
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startRatio = splitRatio;
    const width = containerRef.current?.offsetWidth || 800;

    const onMove = (me) => {
      const dx = me.clientX - startX;
      const newRatio = Math.max(0.2, Math.min(0.8, startRatio + dx / width));
      setSplitRatio(newRatio);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [splitRatio, setSplitRatio]);

  if (!showRightPane) {
    return (
      <Wrap ref={containerRef}>
        <PaneWrap style={{ flex: 1 }}>
          <FilePane paneId="left" />
        </PaneWrap>
      </Wrap>
    );
  }

  const leftW = `calc(${splitRatio * 100}% - 2px)`;
  const rightW = `calc(${(1 - splitRatio) * 100}% - 2px)`;

  return (
    <Wrap ref={containerRef}>
      <PaneWrap style={{ width: leftW }}>
        <FilePane paneId="left" />
      </PaneWrap>
      <Divider
        className={dragging ? 'dragging' : ''}
        onMouseDown={onMouseDown}
      />
      <PaneWrap style={{ width: rightW }}>
        <FilePane paneId="right" />
      </PaneWrap>
    </Wrap>
  );
}