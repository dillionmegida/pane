import React from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import { SORT_TYPES } from '../../helpers/sort';

const ContextMenuContainer = styled.div`
  position: absolute;
  z-index: 1000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  min-width: 180px;
  padding: 4px;
  user-select: none;
`;

const MenuItem = styled.div`
  padding: 6px 12px;
  font-size: 12px;
  color: ${p => p.danger ? p.theme.text.error : p.theme.text.primary};
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 3px 0;
`;

const CtxTagRow = styled.div`
  padding: 5px 10px 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-height: 32px;
`;

const CtxTagDot = styled.div.withConfig({ shouldForwardProp: p => !['active','color','hovered'].includes(p) })`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${p => p.color};
  border: 2px solid ${p => p.active ? 'white' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : 'none'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  font-weight: 700;
  transition: transform 0.1s;
  transform: ${p => p.hovered ? 'scale(1.2)' : 'scale(1)'};
  cursor: pointer;
`;

const CtxTagLabel = styled.div`
  padding: 0 10px 5px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  min-height: 16px;
`;

const CtxSortRow = styled.div`
  padding: 5px 8px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const CtxSortBtn = styled.button.withConfig({ shouldForwardProp: p => p !== 'active' })`
  width: 34px;
  height: 34px;
  border-radius: ${p => p.theme.radius.sm};
  background: ${p => p.active ? p.theme.accent.blue + '22' : p.theme.bg.primary};
  border: 1.5px solid ${p => p.active ? p.theme.accent.blue : p.theme.border.subtle};
  color: ${p => p.active ? p.theme.accent.blue : p.theme.text.tertiary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  flex-shrink: 0;
  &:hover {
    border-color: ${p => p.theme.accent.blue};
    color: ${p => p.theme.accent.blue};
    background: ${p => p.theme.accent.blue + '15'};
  }
  svg { width: 18px; height: 18px; display: block; }
`;

const CtxSortLabel = styled.div`
  padding: 0 10px 5px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  min-height: 16px;
`;

export default function PaneContextMenu({
  contextMenu,
  contextMenuFile,
  selectedFiles,
  selectedFileObjects,
  currentPath,
  currentBreadcrumbPath,
  clipboardQueue,
  ctxAllTags,
  ctxFileTags,
  ctxTagHover,
  ctxSortTarget,
  ctxSortHover,
  viewMode,
  columnFiles,
  sortBy,
  sortOrder,
  bookmarks,
  paneId,
  getDirSort,
  setCtxTagHover,
  setCtxSortHover,
  setCtxFileTags,
  setFileTags,
  setDirectorySort,
  setBookmarks,
  createFolder,
  createFile,
  refreshPane,
  updateColumnState,
  sortFiles,
  pasteClipboard,
  startRename,
  deleteSelected,
  addToClipboard,
  openModal,
  setContextMenu,
  setContextMenuFile,
}) {
  const closeMenu = () => { setContextMenu(null); setContextMenuFile(null); };

  const SortRow = ({ sortTarget }) => (
    <>
      <CtxSortRow>
        {SORT_TYPES.map(st => {
          const active = getDirSort(sortTarget) === st.id;
          return (
            <CtxSortBtn
              key={st.id}
              active={active}
              title={st.label}
              onMouseEnter={() => setCtxSortHover(st.id)}
              onMouseLeave={() => setCtxSortHover(null)}
              onClick={async (e) => {
                e.stopPropagation();
                await setDirectorySort(sortTarget, st.id);
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
            </CtxSortBtn>
          );
        })}
      </CtxSortRow>
      <CtxSortLabel>
        {ctxSortHover
          ? `Sort by ${SORT_TYPES.find(s => s.id === ctxSortHover)?.label}`
          : `Sort: ${SORT_TYPES.find(s => s.id === getDirSort(sortTarget))?.label || 'Name'}`
        }
      </CtxSortLabel>
    </>
  );

  const refreshColumnDirs = async () => {
    if (viewMode === 'column') {
      const updatedFilesByPath = { ...columnFiles };
      for (const colPath of Object.keys(columnFiles)) {
        const res = await window.electronAPI.readdir(colPath);
        if (res.success) {
          updatedFilesByPath[colPath] = sortFiles(res.files, sortBy, sortOrder);
        }
      }
      updateColumnState(paneId, { filesByPath: updatedFilesByPath });
    }
  };

  return (
    <ContextMenuContainer
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={e => e.stopPropagation()}
    >
      {contextMenu.background ? (
        <>
          <MenuItem onClick={() => { createFolder(); closeMenu(); }}>📁 New Folder</MenuItem>
          <MenuItem onClick={() => { createFile(); closeMenu(); }}>📄 New File</MenuItem>
          <MenuItem onClick={async () => {
            await refreshPane(paneId);
            await refreshColumnDirs();
            closeMenu();
          }}>↺ Refresh</MenuItem>
          {clipboardQueue.length > 0 && (
            <MenuItem onClick={() => { pasteClipboard(currentPath); closeMenu(); }}>
              📋 Paste {clipboardQueue.length} item{clipboardQueue.length > 1 ? 's' : ''}
            </MenuItem>
          )}
          <MenuDivider />
          <SortRow sortTarget={ctxSortTarget || currentBreadcrumbPath} />
          <MenuDivider />
          <MenuItem onClick={() => { openModal('sizeViz', { path: currentBreadcrumbPath, paneId }); closeMenu(); }}>
            📊 Disk Usage Map
          </MenuItem>
        </>
      ) : (
        <>
          {contextMenuFile?.isDirectory && (
            <>
              <MenuItem onClick={() => {
                const file = contextMenu.file;
                if (!bookmarks.find(bm => bm.path === file.path)) {
                  const name = file.name || file.path.split('/').pop() || file.path;
                  setBookmarks([...bookmarks, { id: `bm-${Date.now()}`, name, path: file.path, icon: 'default' }]);
                }
                closeMenu();
              }}>🔖 Add to Bookmarks</MenuItem>
              <MenuItem onClick={() => {
                openModal('sizeViz', { path: contextMenuFile.path, paneId });
                closeMenu();
              }}>📊 Disk Usage Map</MenuItem>
              <MenuDivider />
              <SortRow sortTarget={ctxSortTarget} />
              <MenuDivider />
            </>
          )}

          <MenuItem onClick={() => { startRename(contextMenu.file); closeMenu(); }}>✏️ Rename</MenuItem>
          {selectedFiles.size > 1 && (
            <MenuItem onClick={() => {
              openModal('batchRename', { files: selectedFileObjects, basePath: currentPath });
              closeMenu();
            }}>✏️ Batch Rename...</MenuItem>
          )}
          <MenuDivider />
          <MenuItem onClick={() => { addToClipboard([...selectedFiles], 'copy'); closeMenu(); }}>📋 Copy</MenuItem>
          <MenuItem onClick={() => { addToClipboard([...selectedFiles], 'cut'); closeMenu(); }}>✂️ Cut</MenuItem>
          {clipboardQueue.length > 0 && (
            <MenuItem onClick={() => { pasteClipboard(currentPath); closeMenu(); }}>📋 Paste</MenuItem>
          )}
          <MenuDivider />

          {/* Inline tag dot row */}
          <CtxTagRow>
            {ctxAllTags.map(tag => {
              const active = ctxFileTags.has(tag.tag_name);
              return (
                <CtxTagDot
                  key={tag.tag_name}
                  color={tag.color}
                  active={active}
                  hovered={ctxTagHover === tag.tag_name}
                  onMouseEnter={() => setCtxTagHover(tag.tag_name)}
                  onMouseLeave={() => setCtxTagHover(null)}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const file = contextMenu.file;
                    if (active) {
                      await window.electronAPI.removeTag({ filePath: file.path, tagName: tag.tag_name });
                      setCtxFileTags(prev => { const n = new Set(prev); n.delete(tag.tag_name); return n; });
                    } else {
                      await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name });
                      setCtxFileTags(prev => new Set([...prev, tag.tag_name]));
                    }
                    window.electronAPI.getTags(file.path).then(r => {
                      if (r.success) setFileTags(prev => ({ ...prev, [file.path]: r.tags }));
                    });
                    useStore.getState().loadAllTags();
                  }}
                >
                  {active ? '✓' : ''}
                </CtxTagDot>
              );
            })}
          </CtxTagRow>
          <CtxTagLabel>
            {ctxTagHover ? (
              ctxFileTags.has(ctxTagHover)
                ? `Remove "${ctxTagHover}"`
                : `Add "${ctxTagHover}"`
            ) : "All tags"}
          </CtxTagLabel>
          <MenuDivider />

          <SortRow sortTarget={ctxSortTarget} />
          <MenuDivider />

          <MenuItem onClick={() => { openModal('permissions', { file: contextMenuFile }); closeMenu(); }}>🔒 Permissions...</MenuItem>

          {!contextMenuFile?.isDirectory && (
            <>
              <MenuDivider />
              <MenuItem onClick={async () => {
                const sel = [...selectedFiles];
                const dest = `${currentPath}/${sel.map(p => p.split('/').pop()).join('_')}.zip`;
                await window.electronAPI.zip({ files: sel, destPath: dest });
                await refreshPane(paneId);
                if (viewMode === 'column' && columnFiles[currentPath]) {
                  const res = await window.electronAPI.readdir(currentPath);
                  if (res.success) {
                    updateColumnState(paneId, {
                      filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) }
                    });
                  }
                }
                closeMenu();
              }}>📦 Zip</MenuItem>
              {contextMenuFile?.extension === 'zip' && (
                <MenuItem onClick={async () => {
                  const destDir = contextMenuFile.path.replace('.zip', '');
                  await window.electronAPI.unzip({ filePath: contextMenuFile.path, destDir });
                  await refreshPane(paneId);
                  if (viewMode === 'column' && columnFiles[currentPath]) {
                    const res = await window.electronAPI.readdir(currentPath);
                    if (res.success) {
                      updateColumnState(paneId, {
                        filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) }
                      });
                    }
                  }
                  closeMenu();
                }}>📂 Unzip Here</MenuItem>
              )}
            </>
          )}

          <MenuDivider />
          <MenuItem danger onClick={() => { deleteSelected(); closeMenu(); }}>🗑️ Move to Trash</MenuItem>
        </>
      )}
    </ContextMenuContainer>
  );
}
