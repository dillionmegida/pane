import React, { useEffect, useCallback, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useStore } from './store/index';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import TitleBar from './components/TitleBar';
import TerminalPane from './components/TerminalPane';
import PreviewPane from './components/PreviewPane';
import SearchOverlay from './components/SearchOverlay';
// Modals
import BatchRenameModal from './components/modals/BatchRenameModal';
import RulesModal from './components/modals/RulesModal';
import { DuplicatesModal } from './components/modals/DuplicatesModal';
import { ActivityLogModal } from './components/modals/ActivityLogModal';
import { PermissionsModal } from './components/modals/PermissionsModal';
import { TagManagerModal } from './components/modals/TagManagerModal';
import { SizeVisualizerModal } from './components/modals/SizeVisualizerModal';
import { SmartFoldersModal } from './components/modals/SmartFoldersModal';
import { SettingsModal } from './components/modals/SettingsModal';
import ClipboardQueue from './components/ClipboardQueue';

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${p => p.theme.bg.primary};
    color: ${p => p.theme.text.primary};
    font-family: ${p => p.theme.font.sans};
    font-size: ${p => p.theme.font.size.base};
    overflow: hidden;
  }
  input, textarea, button {
    font-family: inherit;
    font-size: inherit;
  }
`;

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  transform-origin: top left;
`;

const ContentRow = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const MainArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const BottomArea = styled.div`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
`;

export default function App() {
  const {
    init, initialized,
    activeModal, closeModal, modalData,
    showTerminal,
    showPreview,
    showSearch,
    zoom, zoomIn, zoomOut, zoomReset,
    previewWidth, setPreviewWidth,
  } = useStore();

  useEffect(() => {
    init();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Cmd+= or Cmd++ = zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        useStore.getState().zoomIn();
      }
      // Cmd+- = zoom out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        useStore.getState().zoomOut();
      }
      // Cmd+0 = reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        useStore.getState().zoomReset();
      }
      // Cmd+Z = undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        window.electronAPI.undo().then(r => {
          if (r.success) useStore.getState().panes.forEach(p => useStore.getState().refreshPane(p.id));
        });
      }
      // Cmd+` = toggle terminal
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        useStore.getState().toggleTerminal();
      }
      // Cmd+F = search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        useStore.getState().toggleSearch();
      }
      // Escape = close search / modal
      if (e.key === 'Escape') {
        if (activeModal) closeModal();
        else if (showSearch) useStore.getState().toggleSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeModal, showSearch]);

  if (!initialized) {
    return (
      <AppShell style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4A9EFF', fontFamily: '"SF Mono", monospace', fontSize: 13 }}>
          Loading Pane...
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <GlobalStyle />
      <AppShell style={{ transform: `scale(${zoom})`, width: `${100 / zoom}vw`, height: `${100 / zoom}vh` }}>
        <TitleBar />
        <ContentRow>
          <Sidebar />
          <MainArea>
            <MainContent />
            <BottomArea>
              {showTerminal && <TerminalPane />}
              <ClipboardQueue />
            </BottomArea>
          </MainArea>
          {showPreview && <PreviewPane />}
        </ContentRow>

        {showSearch && <SearchOverlay />}

        {/* Modals */}
        {activeModal === 'batchRename' && <BatchRenameModal data={modalData} onClose={closeModal} />}
        {activeModal === 'rules' && <RulesModal onClose={closeModal} />}
        {activeModal === 'duplicates' && <DuplicatesModal data={modalData} onClose={closeModal} />}
        {activeModal === 'log' && <ActivityLogModal onClose={closeModal} />}
        {activeModal === 'permissions' && <PermissionsModal data={modalData} onClose={closeModal} />}
        {activeModal === 'tags' && <TagManagerModal data={modalData} onClose={closeModal} />}
        {activeModal === 'sizeViz' && <SizeVisualizerModal data={modalData} onClose={closeModal} />}
        {activeModal === 'smartFolders' && <SmartFoldersModal data={modalData} onClose={closeModal} />}
        {activeModal === 'settings' && <SettingsModal onClose={closeModal} />}
      </AppShell>
    </>
  );
}