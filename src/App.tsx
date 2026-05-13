import React, { useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useStore } from './store/index';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import SearchOverlay from './components/SearchOverlay';
import { PermissionsModal } from './components/modals/PermissionsModal';
import { TagManagerModal } from './components/modals/TagManagerModal';
import { TagBrowserModal } from './components/modals/TagBrowserModal';
import { AllTagsModal } from './components/modals/AllTagsModal';
import { SizeVisualizerModal } from './components/modals/SizeVisualizerModal';
import { SmartFoldersModal } from './components/modals/SmartFoldersModal';
import { SettingsModal } from './components/modals/SettingsModal';
import ClipboardQueue from './components/Clipboardqueue';

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${p => p.theme.bg.primary};
    color: ${p => p.theme.text.primary};
    font-family: ${p => p.theme.font.sans};
    font-size: ${p => p.theme.font.size.base};
    overflow: hidden;
  }
  input, textarea, button { font-family: inherit; font-size: inherit; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${p => p.theme.text.tertiary}40; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: ${p => p.theme.text.tertiary}80; }
  ::-webkit-scrollbar-corner { background: transparent; }
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
    showSearch,
    showSidebar,
    zoom,
  } = useStore();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); useStore.getState().zoomIn();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault(); useStore.getState().zoomOut();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault(); useStore.getState().zoomReset();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        window.electronAPI.undo().then((r: { success: boolean }) => {
          if (r.success) useStore.getState().panes.forEach(p => useStore.getState().refreshPane(p.id));
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault(); useStore.getState().toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault(); useStore.getState().toggleSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        const state = useStore.getState();
        state.addTab(state.activePane);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        const state = useStore.getState();
        const pane = state.panes.find(p => p.id === state.activePane);
        if (pane && pane.tabs.length > 1) state.closeTab(state.activePane, pane.activeTab);
      }
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const state = useStore.getState();
        const pane = state.panes.find(p => p.id === state.activePane);
        if (pane) {
          const tabIndex = parseInt(e.key) - 1;
          if (tabIndex < pane.tabs.length) state.switchTab(state.activePane, tabIndex);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        const state = useStore.getState();
        const { activePane, panes } = state;
        const pane = panes.find(p => p.id === activePane);
        if (!pane) return;
        const selectedPaths = [...(pane.selectedFiles || [])];
        const filePath = selectedPaths[0];
        if (!filePath) return;
        const parentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
        const isDirectory = pane.files?.find(f => f.path === filePath)?.isDirectory ?? false;
        if (pane.viewMode !== 'column') state.setViewMode(activePane, 'column');
        state.setRevealTarget({ paneId: activePane, filePath, fileDir: parentDir, isDirectory, triggerPreview: !isDirectory });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault(); const state = useStore.getState(); state.goBackInHistory(state.activePane);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault(); const state = useStore.getState(); state.goForwardInHistory(state.activePane);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault(); useStore.getState().openModal('settings');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault(); useStore.getState().toggleHiddenFiles();
      }
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
        <ContentRow style={{ height: '100%' }}>
          {showSidebar && <Sidebar />}
          <MainArea>
            <MainContent />
            <BottomArea>
              <ClipboardQueue />
            </BottomArea>
          </MainArea>
        </ContentRow>

        {showSearch && <SearchOverlay />}

        {activeModal === 'permissions' && <PermissionsModal data={modalData} onClose={closeModal} />}
        {activeModal === 'tags' && <TagManagerModal data={modalData} onClose={closeModal} />}
        {activeModal === 'tagBrowser' && <TagBrowserModal data={modalData} onClose={closeModal} />}
        {activeModal === 'allTags' && <AllTagsModal onClose={closeModal} />}
        {activeModal === 'sizeViz' && <SizeVisualizerModal data={modalData} onClose={closeModal} />}
        {activeModal === 'smartFolders' && <SmartFoldersModal data={modalData} onClose={closeModal} />}
        {activeModal === 'settings' && <SettingsModal onClose={closeModal} />}
      </AppShell>
    </>
  );
}
