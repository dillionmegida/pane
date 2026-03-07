import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/index';

const Bar = styled.div`
  height: ${p => p.theme.titleBar};
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  align-items: center;
  padding: 0 16px 0 80px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  gap: 6px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  margin-left: auto;
`;

const Btn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  &.active { color: ${p => p.theme.accent.blue}; }
`;

const Title = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  letter-spacing: 0.02em;
  -webkit-app-region: no-drag;
`;

export default function TitleBar() {
  const { showTerminal, toggleTerminal, showSearch, toggleSearch, toggleRightPane, showRightPane, openModal, zoom, zoomIn, zoomOut, zoomReset } = useStore();

  return (
    <Bar>
      <Title>Pane</Title>
      <Actions>
        <Btn onClick={toggleSearch} className={showSearch ? 'active' : ''} title="Search (⌘F)">
          🔍 Search
        </Btn>
        <Btn onClick={() => openModal('batchRename')} title="Batch Rename">
          ✏️ Rename
        </Btn>
        <Btn onClick={() => openModal('rules')} title="Auto-Organise Rules">
          ⚡ Rules
        </Btn>
        <Btn onClick={() => openModal('duplicates')} title="Find Duplicates">
          🔁 Dupes
        </Btn>
        <Btn onClick={() => openModal('smartFolders')} title="Smart Folders">
          🗂️ Smart
        </Btn>
        <Btn onClick={() => openModal('log')} title="Activity Log">
          📋 Log
        </Btn>
        <Btn onClick={toggleRightPane} className={showRightPane ? 'active' : ''} title="Toggle Split View">
          ⬜ Split
        </Btn>
        <Btn onClick={toggleTerminal} className={showTerminal ? 'active' : ''} title="Terminal (⌘`)">
          ⌨️ Term
        </Btn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '0 2px' }}>
          <Btn onClick={zoomOut} title="Zoom Out (⌘-)" style={{ padding: '4px 6px', minWidth: 'auto' }}>−</Btn>
          <span
            onClick={zoomReset}
            title="Reset Zoom (⌘0)"
            style={{ fontSize: 10, color: zoom !== 1.0 ? '#4A9EFF' : '#5a5a6b', cursor: 'pointer', minWidth: 32, textAlign: 'center', userSelect: 'none' }}
          >{Math.round(zoom * 100)}%</span>
          <Btn onClick={zoomIn} title="Zoom In (⌘=)" style={{ padding: '4px 6px', minWidth: 'auto' }}>+</Btn>
        </div>
        <Btn onClick={() => openModal('settings')} title="Settings">
          ⚙️
        </Btn>
      </Actions>
    </Bar>
  );
}