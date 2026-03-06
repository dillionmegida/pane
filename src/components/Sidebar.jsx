import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const SidebarWrap = styled.div`
  width: ${p => p.theme.sidebar};
  min-width: ${p => p.theme.sidebar};
  background: ${p => p.theme.bg.secondary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
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

  &:hover {
    background: ${p => p.theme.bg.hover};
    color: ${p => p.theme.text.primary};
  }

  &.active {
    color: ${p => p.theme.text.primary};
    background: ${p => p.theme.bg.active};
  }

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

const Divider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 6px 8px;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const TagDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const BookmarkItem = styled(Item)`
  &.drag-over { background: ${p => p.theme.bg.selection}; }
`;

const FOLDER_ICONS = {
  home: '🏠', desktop: '🖥️', documents: '📁', downloads: '⬇️',
  music: '🎵', pictures: '🖼️', movies: '🎬', default: '📁'
};

export default function Sidebar() {
  const {
    bookmarks, setBookmarks,
    panes, activePane, navigateTo,
    allTags, loadAllTags,
    openModal,
  } = useStore();

  const [recentPaths, setRecentPaths] = useState([]);
  const [dragOver, setDragOver] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ bookmarks: true, tags: true, recent: true });

  const activePath = panes.find(p => p.id === activePane)?.path;

  useEffect(() => {
    loadAllTags();
  }, []);

  // Track recent folders
  useEffect(() => {
    if (activePath) {
      setRecentPaths(prev => {
        const filtered = prev.filter(p => p !== activePath);
        return [activePath, ...filtered].slice(0, 8);
      });
    }
  }, [activePath]);

  const navigate = (path) => {
    navigateTo(activePane, path);
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    setDragOver(null);
    const srcIdx = parseInt(e.dataTransfer.getData('bookmark-index'));
    if (isNaN(srcIdx) || srcIdx === targetIdx) return;
    const newBookmarks = [...bookmarks];
    const [moved] = newBookmarks.splice(srcIdx, 1);
    newBookmarks.splice(targetIdx, 0, moved);
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
      setBookmarks([...bookmarks, { name, path: p, icon: 'default' }]);
    }
  };

  const removeBookmark = (idx, e) => {
    e.stopPropagation();
    const nb = [...bookmarks];
    nb.splice(idx, 1);
    setBookmarks(nb);
  };

  const toggleSection = (key) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  return (
    <SidebarWrap>
      <ScrollArea>
        {/* Devices */}
        <Section>
          <SectionHeader>Devices</SectionHeader>
          <Item className={activePath === '/' ? 'active' : ''} onClick={() => navigate('/')}>
            <span className="icon">💻</span>
            <span className="name">Macintosh HD</span>
          </Item>
        </Section>

        <Divider />

        {/* Bookmarks */}
        <Section>
          <SectionHeader
            onClick={() => toggleSection('bookmarks')}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', paddingRight: 12 }}
          >
            <span>Bookmarks</span>
            <span style={{ fontSize: 12, cursor: 'pointer', color: '#4A9EFF' }} onClick={(e) => { e.stopPropagation(); addBookmark(); }}>+</span>
          </SectionHeader>
          {expandedSections.bookmarks && bookmarks.map((bm, idx) => (
            <BookmarkItem
              key={bm.path + idx}
              className={`${dragOver === idx ? 'drag-over' : ''} ${activePath === bm.path ? 'active' : ''}`}
              draggable
              onDragStart={e => e.dataTransfer.setData('bookmark-index', idx)}
              onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => navigate(bm.path)}
            >
              <span className="icon">{FOLDER_ICONS[bm.icon] || '📁'}</span>
              <span className="name">{bm.name}</span>
              <span className="remove" onClick={e => removeBookmark(idx, e)}>✕</span>
            </BookmarkItem>
          ))}
        </Section>

        <Divider />

        {/* Smart Folders */}
        <Section>
          <SectionHeader style={{ cursor: 'pointer' }} onClick={() => openModal('smartFolders')}>
            Smart Folders ›
          </SectionHeader>
          {[
            { id: 'large', name: 'Large Files', icon: '⚖️' },
            { id: 'recent', name: 'Recent Downloads', icon: '⬇️' },
            { id: 'empty', name: 'Empty Folders', icon: '📭' },
            { id: 'old', name: 'Old Files', icon: '🗓️' },
          ].map(sf => (
            <Item key={sf.id} onClick={() => openModal('smartFolders', sf)}>
              <span className="icon">{sf.icon}</span>
              <span className="name">{sf.name}</span>
            </Item>
          ))}
        </Section>

        <Divider />

        {/* Tags */}
        {allTags.length > 0 && (
          <Section>
            <SectionHeader onClick={() => toggleSection('tags')} style={{ cursor: 'pointer' }}>
              Tags
            </SectionHeader>
            {expandedSections.tags && allTags.slice(0, 12).map(tag => (
              <Item key={tag.tag_name} onClick={async () => {
                const result = await window.electronAPI.searchByTag(tag.tag_name);
                if (result.success) {
                  useStore.getState().openModal('tags', { filterTag: tag.tag_name, files: result.files });
                }
              }}>
                <TagDot color={tag.color} />
                <span className="name">{tag.tag_name}</span>
              </Item>
            ))}
          </Section>
        )}

        <Divider />

        {/* Recent */}
        <Section>
          <SectionHeader onClick={() => toggleSection('recent')} style={{ cursor: 'pointer' }}>
            Recent
          </SectionHeader>
          {expandedSections.recent && recentPaths.slice(0, 6).map(p => (
            <Item key={p} className={activePath === p ? 'active' : ''} onClick={() => navigate(p)}>
              <span className="icon">🕐</span>
              <span className="name">{p === '/' ? 'Root' : p.split('/').pop()}</span>
            </Item>
          ))}
        </Section>
      </ScrollArea>
    </SidebarWrap>
  );
}