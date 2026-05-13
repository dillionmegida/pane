import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import type { Bookmark, Tag } from '../types';

const SidebarWrap = styled.div<{ sidebarWidth: number }>`
  width: ${p => p.sidebarWidth}px;
  min-width: 160px;
  max-width: 500px;
  background: ${p => p.theme.bg.secondary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
`;

const SidebarResizeHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
  -webkit-app-region: no-drag;
  &:hover, &.dragging { background: ${p => p.theme.accent.blue}40; }
`;

const TrafficLightSpacer = styled.div`
  height: 38px;
  flex-shrink: 0;
  -webkit-app-region: drag;
`;

const SidebarFooter = styled.div`
  flex-shrink: 0;
  padding: 8px 6px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const FooterBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  padding: 5px 7px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-app-region: no-drag;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const Section = styled.div`
  flex-shrink: 0;
`;

const SectionHeader = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${p => p.theme.text.tertiary};
  padding: 10px 12px 4px;
`;

const ClickableSectionHeader = styled(SectionHeader)`
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding-right: 12px;
`;

const AddBookmarkBtn = styled.span`
  font-size: 12px;
  cursor: pointer;
  color: #4A9EFF;
`;

const ClickableSectionHeaderSimple = styled(SectionHeader)`
  cursor: pointer;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  margin: 0 4px;
  font-size: 12px;
  color: ${p => p.theme.text.secondary};
  background: transparent;
  transition: all 0.1s;
  position: relative;
  user-select: none;

  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  &.active { color: ${p => p.theme.text.primary}; background: ${p => p.theme.bg.active}; }

  .icon { font-size: 13px; flex-shrink: 0; }
  .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .remove {
    opacity: 0;
    font-size: 11px;
    color: ${p => p.theme.text.tertiary};
    transition: opacity 0.1s;
    &:hover { color: ${p => p.theme.text.error}; }
  }
  &:hover .remove { opacity: 1; }
`;

const AllTagsItem = styled(Item)`
  margin-top: 2px;
`;

const AllTagsIcon = styled.span`
  font-size: 11px;
`;

const AllTagsName = styled.span`
  color: inherit;
`;

const Divider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 6px 8px;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const TagDot = styled.span<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
  display: inline-block;
`;

const BookmarkItem = styled(Item)`
  &.dragging { opacity: 0.4; }
`;

const DropIndicatorLine = styled.div`
  height: 2px;
  background: ${p => p.theme.accent.blue};
  margin: 0 4px;
  border-radius: 1px;
`;

const FOLDER_ICONS: Record<string, string> = {
  home: '🏠', desktop: '🖥️', documents: '📁', downloads: '⬇️',
  music: '🎵', pictures: '🖼️', movies: '🎬', applications: '🚀', default: '📁',
};

const SMART_FOLDERS = [
  { id: 'large', name: 'Large Files', icon: '⚖️' },
  { id: 'empty', name: 'Empty Folders', icon: '📭' },
  { id: 'old', name: 'Old Files', icon: '🗓️' },
] as const;

export default function Sidebar() {
  const {
    bookmarks, setBookmarks,
    activePane, navigateTo, navigateToBookmark,
    allTags, loadAllTags,
    openModal,
    getActivePath,
    sidebarWidth, setSidebarWidth,
  } = useStore();

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = useStore.getState().sidebarWidth;
    const currentZoom = useStore.getState().zoom;

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / currentZoom;
      setSidebarWidth(startWidth + dx);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [setSidebarWidth]);

  const [insertLineIndex, setInsertLineIndex] = useState<number | null>(null);
  const [reorderSrcIdx, setReorderSrcIdx] = useState<number | null>(null);
  const bookmarksListRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState({ bookmarks: true, tags: true });

  const activePath = getActivePath(activePane);
  const activeBookmark = useStore.getState().getActiveBookmark(activePane);

  useEffect(() => {
    loadAllTags();
  }, []);

  const navigate = (p: string) => navigateTo(activePane, p);

  const navigateBookmark = (bookmarkPath: string) => {
    const bookmark = bookmarks.find((bm: Bookmark) => bm.path === bookmarkPath);
    if (bookmark) navigateToBookmark(activePane, bookmark.path, bookmark.id);
  };

  const handleReorderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const srcIdx = parseInt(e.dataTransfer.getData('bookmark-index'));
    const targetIdx = insertLineIndex ?? bookmarks.length;
    setInsertLineIndex(null);
    setReorderSrcIdx(null);
    if (isNaN(srcIdx)) return;
    let adjustedTarget = targetIdx > srcIdx ? targetIdx - 1 : targetIdx;
    if (adjustedTarget === srcIdx) return;
    const newBookmarks = [...bookmarks];
    const [moved] = newBookmarks.splice(srcIdx, 1);
    newBookmarks.splice(adjustedTarget, 0, moved);
    setBookmarks(newBookmarks);
  };

  const addBookmark = async () => {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select a folder to bookmark',
    });
    if (!result.canceled && result.filePaths[0]) {
      const p = result.filePaths[0];
      const name = p.split('/').pop() || p;
      setBookmarks([...bookmarks, { id: `bm-${Date.now()}`, name, path: p, icon: 'default' }]);
    }
  };

  const removeBookmark = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const nb = [...bookmarks];
    nb.splice(idx, 1);
    setBookmarks(nb);
  };

  const isExternalFileDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('file-paths') && !e.dataTransfer.types.includes('bookmark-index');

  const isBookmarkReorder = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('bookmark-index');

  const handleBookmarksListDragOver = (e: React.DragEvent) => {
    const isExternal = isExternalFileDrag(e);
    const isReorder = isBookmarkReorder(e);
    if (!isExternal && !isReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isExternal ? 'copy' : 'move';
    const container = bookmarksListRef.current;
    if (!container) { setInsertLineIndex(bookmarks.length); return; }
    const items = container.querySelectorAll('[data-bookmark-idx]');
    let idx = bookmarks.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
    }
    setInsertLineIndex(idx);
  };

  const handleBookmarksListDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertLineIndex(null);
      setReorderSrcIdx(null);
    }
  };

  const handleExternalDrop = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    const idx = insertLineIndex ?? bookmarks.length;
    setInsertLineIndex(null);
    const rawPaths = e.dataTransfer.getData('file-paths');
    if (!rawPaths) return;
    const paths: string[] = JSON.parse(rawPaths);
    const newEntries = paths
      .filter(p => !bookmarks.some(bm => bm.path === p))
      .map(p => ({
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: p.split('/').pop() || p,
        path: p,
        icon: 'default',
      }));
    if (!newEntries.length) return;
    const nb = [...bookmarks];
    nb.splice(idx, 0, ...newEntries);
    setBookmarks(nb);
  };

  const toggleSection = (key: 'bookmarks' | 'tags') =>
    setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  return (
    <SidebarWrap sidebarWidth={sidebarWidth}>
      <SidebarResizeHandle onMouseDown={handleResizeMouseDown} />
      <TrafficLightSpacer />
      <ScrollArea>
        <Section>
          <SectionHeader>Devices</SectionHeader>
          <Item className={activePath === '/' ? 'active' : ''} onClick={() => navigate('/')}>
            <span className="icon">💻</span>
            <span className="name">Macintosh HD</span>
          </Item>
        </Section>

        <Divider />

        <Section>
          <ClickableSectionHeader onClick={() => toggleSection('bookmarks')}>
            <span>Bookmarks</span>
            <AddBookmarkBtn onClick={(e) => { e.stopPropagation(); addBookmark(); }}>+</AddBookmarkBtn>
          </ClickableSectionHeader>
          {expandedSections.bookmarks && (
            <div
              ref={bookmarksListRef}
              onDragOver={handleBookmarksListDragOver}
              onDragLeave={handleBookmarksListDragLeave}
              onDrop={e => {
                if (isBookmarkReorder(e)) handleReorderDrop(e);
                else handleExternalDrop(e);
              }}
            >
              {bookmarks.map((bm: Bookmark, idx: number) => (
                <React.Fragment key={bm.id}>
                  {insertLineIndex === idx && <DropIndicatorLine />}
                  <BookmarkItem
                    data-bookmark-idx={idx}
                    className={`${reorderSrcIdx === idx ? 'dragging' : ''} ${activePath === bm.path ? 'active' : ''} ${activeBookmark && activeBookmark.id === bm.id ? 'bookmark-active' : ''}`}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('bookmark-index', String(idx)); setReorderSrcIdx(idx); }}
                    onDragEnd={() => { setInsertLineIndex(null); setReorderSrcIdx(null); }}
                    onClick={() => navigateBookmark(bm.path)}
                  >
                    <span className="icon">{FOLDER_ICONS[bm.icon] || '📁'}</span>
                    <span className="name">{bm.name}</span>
                    <span className="remove" onClick={e => removeBookmark(idx, e)}>✕</span>
                  </BookmarkItem>
                </React.Fragment>
              ))}
              {insertLineIndex === bookmarks.length && <DropIndicatorLine />}
            </div>
          )}
        </Section>

        <Divider />

        <Section>
          <ClickableSectionHeaderSimple onClick={() => openModal('smartFolders')}>
            Smart Folders ›
          </ClickableSectionHeaderSimple>
          {SMART_FOLDERS.map(sf => (
            <Item key={sf.id} onClick={() => openModal('smartFolders', sf)}>
              <span className="icon">{sf.icon}</span>
              <span className="name">{sf.name}</span>
            </Item>
          ))}
        </Section>

        <Divider />

        <Section>
          <ClickableSectionHeaderSimple onClick={() => toggleSection('tags')}>
            Tags
          </ClickableSectionHeaderSimple>
          {expandedSections.tags && (
            <>
              {allTags.map((tag: Tag) => (
                <Item key={tag.tag_name} onClick={async () => {
                  const result = await window.electronAPI.searchByTag(tag.tag_name);
                  if (result.success) {
                    useStore.getState().openModal('tagBrowser', { filterTag: tag.tag_name, color: tag.color, files: result.files });
                  }
                }}>
                  <TagDot color={tag.color} />
                  <span className="name">{tag.tag_name}</span>
                </Item>
              ))}
              <AllTagsItem onClick={() => useStore.getState().openModal('allTags')}>
                <AllTagsIcon className="icon">🏷️</AllTagsIcon>
                <AllTagsName className="name">All Tags…</AllTagsName>
              </AllTagsItem>
            </>
          )}
        </Section>
      </ScrollArea>

      <SidebarFooter>
        <FooterBtn onClick={() => openModal('settings')} title="Settings">⚙️</FooterBtn>
      </SidebarFooter>
    </SidebarWrap>
  );
}
