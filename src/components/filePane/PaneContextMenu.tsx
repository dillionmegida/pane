import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useFloating, offset, flip, shift, size, autoUpdate, type ReferenceType } from '@floating-ui/react';
import { useStore } from '../../store';
import { SORT_TYPES } from '../../helpers/sort';
import type { FileItem, SortBy, Tag } from '../../types';

const Menu = styled.div`
  position: fixed;
  z-index: 9000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 4px;
  min-width: 200px;
  max-width: 280px;
  font-size: 12px;
  user-select: none;
`;

const CtxTagRow = styled.div`
  padding: 5px 10px 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-height: 32px;
`;

const CtxTagDot = styled.div<{ color: string; $active: boolean; hovered: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${p => p.color};
  border: 2px solid ${p => p.$active ? 'white' : 'transparent'};
  box-shadow: ${p => p.$active ? `0 0 0 2px ${p.color}` : 'none'};
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

const MenuItem = styled.div<{ $danger?: boolean; disabled?: boolean; $highlighted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  color: ${p => p.$danger ? p.theme.text.error : p.disabled ? p.theme.text.tertiary : p.theme.text.primary};
  opacity: ${p => p.disabled ? 0.5 : 1};
  transition: background 0.08s;
  background: ${p => p.$highlighted ? p.theme.bg.active : 'transparent'};
  &:hover { background: ${p => p.disabled ? 'transparent' : p.theme.bg.active}; }
`;

const MenuIcon = styled.span`
  font-size: 13px;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
`;

const MenuLabel = styled.span`
  flex: 1;
`;

const Shortcut = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
`;

const Divider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 3px 4px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 10px 2px;
`;

const SortRow = styled.div`
  display: flex;
  gap: 3px;
  padding: 4px 6px;
`;

const SubMenuWrap = styled.div`
  position: relative;
`;

const SubMenu = styled.div`
  position: fixed;
  z-index: 9100;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 4px;
  min-width: 220px;
  max-width: 320px;
  overflow-y: auto;
  font-size: 12px;
  user-select: none;
`;

const SubMenuItem = styled.div<{ $active?: boolean; $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  color: ${p => p.$danger ? p.theme.text.error : p.theme.text.primary};
  background: ${p => p.$active ? p.theme.bg.selection : 'transparent'};
  transition: background 0.08s;
  &:hover { background: ${p => p.$active ? p.theme.bg.selection : p.theme.bg.active}; }
`;

const DefaultBadge = styled.span`
  font-size: 9px;
  background: ${p => p.theme.accent.blue}33;
  color: ${p => p.theme.text.accent};
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: auto;
`;

const SortBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: ${p => p.theme.radius.sm};
  background: ${p => p.$active ? p.theme.bg.selection : p.theme.bg.primary};
  border: 1px solid ${p => p.$active ? p.theme.border.focus : p.theme.border.subtle};
  color: ${p => p.$active ? p.theme.text.accent : p.theme.text.secondary};
  cursor: pointer;
  font-size: 10px;
  transition: all 0.12s;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

interface PaneContextMenuProps {
  x: number;
  y: number;
  file: FileItem | null;
  paneId: string;
  currentPath: string;
  selectedFiles: Set<string>;
  onClose: () => void;
  onRename: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onDelete: (files?: string[]) => void;
  onRefresh: () => void;
  onBatchRename: () => void;
  onGroupInFolder: (files: string[]) => void;
  onTagsChanged?: (filePath: string, tags: Tag[]) => void;
}

export default function PaneContextMenu({
  x,
  y,
  file,
  paneId,
  currentPath,
  selectedFiles,
  onClose,
  onRename,
  onNewFolder,
  onNewFile,
  onDelete,
  onRefresh,
  onBatchRename,
  onGroupInFolder,
  onTagsChanged,
}: PaneContextMenuProps) {
  const {
    addToClipboard,
    clipboardQueue,
    clipboardMode,
    pasteClipboard,
    openModal,
    getDirSort,
    setDirectorySort,
  } = useStore();

  const [tagHover, setTagHover] = useState<string | null>(null);
  const [fileTags, setFileTags] = useState<Set<string>>(new Set());
  const [openWithVisible, setOpenWithVisible] = useState(false);
  const [openWithApps, setOpenWithApps] = useState<Array<{ name: string; path: string }> | null>(null);
  const [defaultApp, setDefaultApp] = useState<{ path: string; name: string } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { allTags, loadAllTags } = useStore();

  const virtualEl = useMemo(() => ({
    getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }),
  } as ReferenceType), [x, y]);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [offset(2), flip(), shift({ padding: 8 })],
    elements: { reference: virtualEl as any },
  });

  const { refs: subRefs, floatingStyles: subFloatingStyles } = useFloating({
    placement: 'right-start',
    strategy: 'fixed',
    open: openWithVisible,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ['right-end', 'left-start', 'left-end'] }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(360, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  useEffect(() => {
    loadAllTags();
    if (file) {
      window.electronAPI.getTags(file.path).then((r: { success: boolean; tags: Tag[] }) => {
        if (r.success) setFileTags(new Set(r.tags.map((t: Tag) => t.tag_name)));
      });
      if (!file.isDirectory) {
        const ext = file.extension || '';
        window.electronAPI.getDefaultApp(ext).then((r: { success: boolean; app: { path: string; name: string } | null }) => {
          if (r.success) setDefaultApp(r.app);
        });
      }
    }
  }, [file?.path]);

  const handleTagToggle = async (tag: Tag) => {
    if (!file) return;
    const active = fileTags.has(tag.tag_name);
    if (active) {
      await window.electronAPI.removeTag({ filePath: file.path, tagName: tag.tag_name });
      setFileTags(prev => { const n = new Set(prev); n.delete(tag.tag_name); return n; });
    } else {
      await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name });
      setFileTags(prev => new Set([...prev, tag.tag_name]));
    }
    window.electronAPI.getTags(file.path).then((r: { success: boolean; tags: Tag[] }) => {
      if (r.success) {
        setFileTags(new Set(r.tags.map((t: Tag) => t.tag_name)));
        onTagsChanged?.(file.path, r.tags);
      }
    });
    loadAllTags();
  };

  const targetDir = file
    ? (file.isDirectory ? file.path : (currentPath || '/'))
    : (currentPath || '/');

  const currentSort = getDirSort(targetDir);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (refs.floating.current && !refs.floating.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose, refs.floating]);

  const handleCopy = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    addToClipboard(files, 'copy');
    onClose();
  };

  const handleCut = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    addToClipboard(files, 'cut');
    onClose();
  };

  const handlePaste = async () => {
    await pasteClipboard(targetDir);
    onClose();
  };

  const handleDelete = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    onDelete(files);
    onClose();
  };

  const handleOpenWithHover = async () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(async () => {
      setOpenWithVisible(true);
      if (openWithApps === null) {
        const r = await window.electronAPI.getAppsForFile(file!.path);
        setOpenWithApps(r.success ? r.apps : []);
      }
    }, 150);
  };

  const handleOpenWithLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenWithVisible(false);
    }, 200);
  };

  const handleSubMenuEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleSubMenuLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenWithVisible(false);
    }, 200);
  };

  const handleOpenWithApp = async (app: { name: string; path: string }) => {
    if (!file) return;
    await window.electronAPI.openWith(file.path, app.path);
    setOpenWithVisible(false);
    onClose();
  };

  const handleSetDefault = async (app: { name: string; path: string }) => {
    if (!file) return;
    const ext = file.extension || '';
    await window.electronAPI.setDefaultApp(ext, app.path, app.name);
    setDefaultApp(app);
    await window.electronAPI.openWith(file.path, app.path);
    setOpenWithVisible(false);
    onClose();
  };

  const handleClearDefault = async () => {
    if (!file) return;
    const ext = file.extension || '';
    await window.electronAPI.clearDefaultApp(ext);
    setDefaultApp(null);
    setOpenWithVisible(false);
  };

  const handleSortChange = async (sortBy: SortBy) => {
    await setDirectorySort(targetDir, sortBy);
    onClose();
  };

  const multiSelected = selectedFiles.size > 1;
  const hasPaste = clipboardQueue.length > 0;
  const label = file
    ? (multiSelected ? `${selectedFiles.size} items` : file.name)
    : 'Background';

  return (
    <Menu ref={refs.setFloating} style={floatingStyles} onClick={e => e.stopPropagation()}>
      {!file && (
        <>
          <MenuItem onClick={() => { onNewFolder(); onClose(); }}>
            <MenuIcon>📁</MenuIcon>
            <MenuLabel>New Folder</MenuLabel>
            <Shortcut>⌘⇧N</Shortcut>
          </MenuItem>
          <MenuItem onClick={() => { onNewFile(); onClose(); }}>
            <MenuIcon>📄</MenuIcon>
            <MenuLabel>New File</MenuLabel>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handlePaste} disabled={!hasPaste}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Paste {hasPaste ? `(${clipboardQueue.length})` : ''}</MenuLabel>
            <Shortcut>⌘V</Shortcut>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { onRefresh(); onClose(); }}>
            <MenuIcon>🔄</MenuIcon>
            <MenuLabel>Refresh</MenuLabel>
            <Shortcut>⌘R</Shortcut>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            openModal('sizeViz', { path: currentPath });
            onClose();
          }}>
            <MenuIcon>📊</MenuIcon>
            <MenuLabel>Disk Usage…</MenuLabel>
          </MenuItem>
        </>
      )}

      {file && (
        <>
          <MenuItem onClick={() => { onRename(); onClose(); }} disabled={multiSelected}>
            <MenuIcon>✏️</MenuIcon>
            <MenuLabel>Rename</MenuLabel>
            <Shortcut>↩</Shortcut>
          </MenuItem>
          {multiSelected && (
            <MenuItem onClick={() => { onBatchRename(); onClose(); }}>
              <MenuIcon>✏️</MenuIcon>
              <MenuLabel>Batch Rename…</MenuLabel>
            </MenuItem>
          )}
          {multiSelected && (
            <MenuItem onClick={() => { onGroupInFolder([...selectedFiles]); onClose(); }}>
              <MenuIcon>📁</MenuIcon>
              <MenuLabel>Group in Folder</MenuLabel>
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleCopy}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Copy</MenuLabel>
            <Shortcut>⌘C</Shortcut>
          </MenuItem>
          <MenuItem onClick={handleCut}>
            <MenuIcon>✂️</MenuIcon>
            <MenuLabel>Cut</MenuLabel>
            <Shortcut>⌘X</Shortcut>
          </MenuItem>
          <MenuItem onClick={handlePaste} disabled={!hasPaste}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Paste {hasPaste ? `(${clipboardQueue.length})` : ''}</MenuLabel>
            <Shortcut>⌘V</Shortcut>
          </MenuItem>
          <Divider />
          {allTags.length > 0 && (
            <>
              <CtxTagRow>
                {allTags.map(tag => (
                  <CtxTagDot
                    key={tag.tag_name}
                    color={tag.color}
                    $active={fileTags.has(tag.tag_name)}
                    hovered={tagHover === tag.tag_name}
                    onMouseEnter={() => setTagHover(tag.tag_name)}
                    onMouseLeave={() => setTagHover(null)}
                    onClick={e => { e.stopPropagation(); handleTagToggle(tag); }}
                  >
                    {fileTags.has(tag.tag_name) ? '✓' : ''}
                  </CtxTagDot>
                ))}
              </CtxTagRow>
              <CtxTagLabel>
                {tagHover
                  ? (fileTags.has(tagHover) ? `Remove "${tagHover}"` : `Add "${tagHover}"`)
                  : 'Tags'}
              </CtxTagLabel>
              <Divider />
            </>
          )}
          {file.isDirectory && (
            <MenuItem onClick={() => {
              openModal('sizeViz', { path: file.path });
              onClose();
            }}>
              <MenuIcon>📊</MenuIcon>
              <MenuLabel>Disk Usage…</MenuLabel>
            </MenuItem>
          )}
          {!file.isDirectory && (
            <>
              <SubMenuWrap
                onMouseEnter={handleOpenWithHover}
                onMouseLeave={handleOpenWithLeave}
              >
                <MenuItem
                  ref={subRefs.setReference as any}
                  $highlighted={openWithVisible}
                >
                  <MenuIcon>↗</MenuIcon>
                  <MenuLabel>Open With{defaultApp ? <DefaultBadge>{defaultApp.name}</DefaultBadge> : null}</MenuLabel>
                  <Shortcut>▸</Shortcut>
                </MenuItem>
                {openWithVisible && (
                  <SubMenu
                    ref={subRefs.setFloating}
                    style={subFloatingStyles}
                    onMouseEnter={handleSubMenuEnter}
                    onMouseLeave={handleSubMenuLeave}
                  >
                    {openWithApps === null ? (
                      <SubMenuItem style={{ opacity: 0.5, cursor: 'default' }}>Loading…</SubMenuItem>
                    ) : openWithApps.length === 0 ? (
                      <SubMenuItem style={{ opacity: 0.5, cursor: 'default' }}>No apps found</SubMenuItem>
                    ) : (
                      (() => {
                        const defaultAppPath = defaultApp?.path;
                        const sortedApps = [...openWithApps].sort((a, b) => {
                          if (a.path === defaultAppPath) return -1;
                          if (b.path === defaultAppPath) return 1;
                          return a.name.localeCompare(b.name);
                        });
                        const defaultAppItem = sortedApps.find(a => a.path === defaultAppPath);
                        const otherApps = sortedApps.filter(a => a.path !== defaultAppPath);
                        
                        return (
                          <>
                            {defaultAppItem && (
                              <>
                                <SubMenuItem
                                  key={defaultAppItem.path}
                                  $active
                                  onClick={e => { e.stopPropagation(); handleOpenWithApp(defaultAppItem); }}
                                >
                                  <MenuLabel>{defaultAppItem.name}</MenuLabel>
                                  <DefaultBadge onClick={e => { e.stopPropagation(); handleClearDefault(); }} style={{ cursor: 'pointer' }}>Default ✕</DefaultBadge>
                                </SubMenuItem>
                                <Divider />
                              </>
                            )}
                            {otherApps.map(app => (
                              <SubMenuItem
                                key={app.path}
                                onClick={e => { e.stopPropagation(); handleOpenWithApp(app); }}
                              >
                                <MenuLabel>{app.name}</MenuLabel>
                                <Shortcut
                                  style={{ cursor: 'pointer', color: 'inherit', opacity: 0.6 }}
                                  title={`Set ${app.name} as default for .${file.extension}`}
                                  onClick={e => { e.stopPropagation(); handleSetDefault(app); }}
                                >
                                  Set default
                                </Shortcut>
                              </SubMenuItem>
                            ))}
                          </>
                        );
                      })()
                    )}
                  </SubMenu>
                )}
              </SubMenuWrap>
              <MenuItem onClick={() => {
                openModal('permissions', { filePath: file.path });
                onClose();
              }}>
                <MenuIcon>🔒</MenuIcon>
                <MenuLabel>Permissions…</MenuLabel>
              </MenuItem>
            </>
          )}
          {file.isDirectory ? (
            <>
              <Divider />
              <MenuItem onClick={() => {
                openModal('zip', { files: selectedFiles.size > 0 ? [...selectedFiles] : [file.path] });
                onClose();
              }}>
                <MenuIcon>📦</MenuIcon>
                <MenuLabel>Compress…</MenuLabel>
              </MenuItem>
            </>
          ) : (
            file.extension === 'zip' || file.extension === 'gz' || file.extension === 'tar' ? (
              <>
                <Divider />
                <MenuItem onClick={() => {
                  openModal('unzip', { filePath: file.path });
                  onClose();
                }}>
                  <MenuIcon>📂</MenuIcon>
                  <MenuLabel>Extract…</MenuLabel>
                </MenuItem>
              </>
            ) : null
          )}
          <Divider />
          <MenuItem $danger onClick={handleDelete}>
            <MenuIcon>🗑️</MenuIcon>
            <MenuLabel>Delete {multiSelected ? `(${selectedFiles.size})` : ''}</MenuLabel>
            <Shortcut>⌫</Shortcut>
          </MenuItem>
        </>
      )}

      {(!file || file.isDirectory) && (
        <>
          <Divider />
          <SectionLabel>Sort by</SectionLabel>
          <SortRow>
            {SORT_TYPES.map(st => (
              <SortBtn
                key={st.id}
                $active={currentSort === st.id}
                onClick={() => handleSortChange(st.id)}
                title={st.description}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
              </SortBtn>
            ))}
          </SortRow>
        </>
      )}
    </Menu>
  );
}
