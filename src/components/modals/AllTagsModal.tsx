import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useStore } from '../../store';
import type { Tag, FileItem } from '../../types';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
`;
const Modal = styled.div`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  width: 420px; max-height: 580px;
  display: flex; flex-direction: column; overflow: hidden;
`;
const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;
const Title = styled.div`font-size: 1rem; font-weight: 600; color: ${p => p.theme.text.primary};`;
const HeaderActions = styled.div`display: flex; align-items: center; gap: 8px;`;
const AddBtn = styled.button`
  width: 22px; height: 22px; border-radius: 50%;
  background: ${p => p.theme.accent.blue}; border: none; cursor: pointer; color: white;
  font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;
  &:hover { opacity: 0.8; }
`;
const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer;
  color: ${p => p.theme.text.tertiary}; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;
const TagList = styled.div`flex: 1; overflow-y: auto; padding: 6px 0;`;
const TagRow = styled.div.withConfig({ shouldForwardProp: p => p !== 'contextMenuActive' })<{ contextMenuActive?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  padding: 7px 16px; cursor: default; user-select: none; transition: background 0.07s;
  background: ${p => p.contextMenuActive ? p.theme.bg.hover : 'transparent'};
  &:hover { background: ${p => p.theme.bg.hover}; }
`;
const TagDotLarge = styled.span.withConfig({ shouldForwardProp: p => p !== 'color' })<{ color: string }>`
  width: 14px; height: 14px; border-radius: 50%;
  background: ${p => p.color}; flex-shrink: 0; display: inline-block;
`;
const TagNameText = styled.span`flex: 1; font-size: 13px; color: ${p => p.theme.text.primary}; line-height: 1.5; height: 20px;`;
const RenameInput = styled.input`
  flex: 1; font-size: 13px; background: transparent; color: ${p => p.theme.text.primary};
  outline: none; border: none; line-height: 1.5; height: 20px;
`;
const TagCount = styled.span`font-size: 11px; color: ${p => p.theme.text.tertiary};`;
const CreateRow = styled.div`
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  border-top: 1px solid ${p => p.theme.border.subtle};
`;
const CreateInput = styled.input`
  flex: 1; font-size: 12px; background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.normal}; border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary}; padding: 5px 8px; outline: none;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;
const CreateSaveBtn = styled.button`
  background: ${p => p.theme.accent.blue}; color: white; border: none;
  border-radius: ${p => p.theme.radius.sm}; padding: 5px 12px; font-size: 12px; cursor: pointer;
  &:hover { opacity: 0.85; } &:disabled { opacity: 0.4; cursor: default; }
`;
const CtxMenu = styled.div`
  position: fixed; z-index: 1000; background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong}; border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg}; padding: 4px 0; width: 180px;
`;
const CtxItem = styled.div<{ $danger?: boolean }>`
  padding: 7px 14px; font-size: 12px; cursor: pointer;
  color: ${p => p.$danger ? p.theme.text.error : p.theme.text.primary};
  &:hover { background: ${p => p.theme.bg.hover}; }
`;
const CtxDivider = styled.div`height: 1px; background: ${p => p.theme.border.subtle}; margin: 4px 0;`;
const CtxColorRow = styled.div`display: flex; align-items: center; gap: 5px; flex-wrap: wrap; padding: 6px 14px;`;
const CtxColorDot = styled.button.withConfig({ shouldForwardProp: p => !['color', '$active'].includes(p) })<{ color: string; $active?: boolean }>`
  width: 18px; height: 18px; border-radius: 50%; background: ${p => p.color};
  border: 2px solid ${p => p.$active ? '#fff' : 'transparent'};
  box-shadow: ${p => p.$active ? `0 0 0 2px ${p.color}` : 'none'};
  cursor: pointer; transition: transform 0.1s; &:hover { transform: scale(1.18); }
`;
const ConfirmOverlay = styled.div`
  position: fixed; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);
`;
const ConfirmBox = styled.div`
  background: ${p => p.theme.bg.elevated}; border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl}; box-shadow: ${p => p.theme.shadow.lg}; width: 360px; padding: 20px;
`;
const ConfirmTitle = styled.div`font-size: 13px; font-weight: 600; color: ${p => p.theme.text.primary}; margin-bottom: 8px;`;
const ConfirmBody = styled.div`font-size: 12px; color: ${p => p.theme.text.secondary}; margin-bottom: 10px; line-height: 1.5;`;
const ConfirmFileList = styled.div`
  max-height: 120px; overflow-y: auto; background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.normal}; border-radius: ${p => p.theme.radius.sm};
  padding: 6px 10px; margin-bottom: 14px; font-size: 11px; color: ${p => p.theme.text.secondary}; line-height: 1.6;
`;
const ConfirmActions = styled.div`display: flex; justify-content: flex-end; gap: 8px;`;
const ActionBtn = styled.button<{ $danger?: boolean; primary?: boolean }>`
  padding: 6px 14px; border-radius: ${p => p.theme.radius.sm}; font-size: 12px; cursor: pointer; border: none;
  background: ${p => p.$danger ? p.theme.text.error : p.primary ? p.theme.accent.blue : p.theme.bg.hover};
  color: ${p => p.$danger || p.primary ? 'white' : p.theme.text.primary};
  &:hover { opacity: 0.85; }
`;

const EmptyTags = styled.div`
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #888;
`;

const PaletteRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  max-width: 140px;
`;

const CtxBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const PALETTE = [
  '#f87171','#fb923c','#fbbf24','#34d399',
  '#4A9EFF','#a78bfa','#9ca3af','#f472b6',
  '#22d3ee','#6366f1','#10b981','#ef4444',
];

interface CtxMenuState { tag: Tag; x: number; y: number }
interface DeleteConfirmState { tag: Tag; files: FileItem[] }

interface AllTagsModalProps {
  onClose: () => void;
}

export function AllTagsModal({ onClose }: AllTagsModalProps) {
  const { loadAllTags } = useStore();
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[4]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const loadTags = useCallback(async () => {
    const r = await window.electronAPI.getAllTags();
    if (r.success) {
      setTags(r.tags);
      const counts: Record<string, number> = {};
      await Promise.all(r.tags.map(async (t: Tag) => {
        const fr = await window.electronAPI.getFilesForTag(t.tag_name);
        counts[t.tag_name] = fr.success ? fr.files.length : 0;
      }));
      setTagCounts(counts);
    }
  }, []);

  useEffect(() => { loadTags(); }, []);
  useEffect(() => { if (renamingTag) setTimeout(() => renameInputRef.current?.select(), 40); }, [renamingTag]);
  useEffect(() => { if (creating) setTimeout(() => createInputRef.current?.focus(), 40); }, [creating]);
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu]);

  const startRename = (tag: Tag) => {
    setCtxMenu(null); setRenamingTag(tag.tag_name); setRenameValue(tag.tag_name);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingTag) {
      await window.electronAPI.renameTag({ oldName: renamingTag!, newName: trimmed });
      await loadAllTags(); await loadTags();
    }
    setRenamingTag(null);
  };

  const recolor = async (tag: Tag, color: string) => {
    await window.electronAPI.recolorTag({ tagName: tag.tag_name, color });
    setCtxMenu(null); await loadAllTags(); await loadTags();
  };

  const confirmDelete = async (tag: Tag) => {
    setCtxMenu(null);
    const r = await window.electronAPI.getFilesForTag(tag.tag_name);
    setDeleteConfirm({ tag, files: r.success ? r.files : [] });
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    await window.electronAPI.deleteTag(deleteConfirm.tag.tag_name);
    setDeleteConfirm(null); await loadAllTags(); await loadTags();
  };

  const doCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await window.electronAPI.createTag({ tagName: name, color: newColor });
    setNewName(''); setCreating(false); await loadAllTags(); await loadTags();
  };

  const handleRightClick = (e: React.MouseEvent, tag: Tag) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ tag, x: e.clientX, y: e.clientY });
  };

  return ReactDOM.createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Header>
          <Title>Tags</Title>
          <HeaderActions>
            <AddBtn title="New tag" onClick={() => setCreating(v => !v)}>+</AddBtn>
            <CloseBtn onClick={onClose}>×</CloseBtn>
          </HeaderActions>
        </Header>

        <TagList>
          {tags.map(tag => (
            <TagRow key={tag.tag_name} onContextMenu={e => handleRightClick(e, tag)} contextMenuActive={ctxMenu?.tag.tag_name === tag.tag_name}>
              <TagDotLarge color={tag.color} />
              {renamingTag === tag.tag_name ? (
                <RenameInput
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingTag(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <TagNameText onDoubleClick={() => startRename(tag)}>{tag.tag_name}</TagNameText>
              )}
              <TagCount>{tagCounts[tag.tag_name] ?? 0} files</TagCount>
            </TagRow>
          ))}
          {tags.length === 0 && (
            <EmptyTags>
              No tags yet. Click + to create one.
            </EmptyTags>
          )}
        </TagList>

        {creating && (
          <CreateRow>
            <PaletteRow>
              {PALETTE.map(c => (
                <CtxColorDot key={c} color={c} $active={newColor === c} onClick={() => setNewColor(c)} />
              ))}
            </PaletteRow>
            <CreateInput
              ref={createInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Tag name..."
              onKeyDown={e => { if (e.key === 'Enter') doCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <CreateSaveBtn onClick={doCreate} disabled={!newName.trim()}>Add</CreateSaveBtn>
          </CreateRow>
        )}
      </Modal>

      {ctxMenu && ReactDOM.createPortal(
        <>
          <CtxBackdrop onClick={(e) => { e.stopPropagation(); setCtxMenu(null); }} />
          <CtxMenu style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <CtxItem $danger onClick={() => confirmDelete(ctxMenu.tag)}>Delete Tag &quot;{ctxMenu.tag.tag_name}&quot;…</CtxItem>
            <CtxDivider />
            <CtxItem onClick={() => startRename(ctxMenu.tag)}>Rename &quot;{ctxMenu.tag.tag_name}&quot;</CtxItem>
            <CtxDivider />
            <CtxColorRow>
              {PALETTE.map(c => (
                <CtxColorDot key={c} color={c} $active={ctxMenu.tag.color === c} onClick={() => recolor(ctxMenu.tag, c)} title={c} />
              ))}
            </CtxColorRow>
          </CtxMenu>
        </>,
        document.body
      )}

      {deleteConfirm && ReactDOM.createPortal(
        <ConfirmOverlay onClick={() => setDeleteConfirm(null)}>
          <ConfirmBox onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <ConfirmTitle>Delete Tag &quot;{deleteConfirm.tag.tag_name}&quot;?</ConfirmTitle>
            {deleteConfirm.files.length > 0 ? (
              <>
                <ConfirmBody>
                  The following {deleteConfirm.files.length} file{deleteConfirm.files.length > 1 ? 's' : ''} will lose this tag:
                </ConfirmBody>
                <ConfirmFileList>
                  {deleteConfirm.files.map(f => <div key={f.path}>{f.path.split('/').pop()}</div>)}
                </ConfirmFileList>
              </>
            ) : (
              <ConfirmBody>This tag has no files assigned.</ConfirmBody>
            )}
            <ConfirmActions>
              <ActionBtn onClick={() => setDeleteConfirm(null)}>Cancel</ActionBtn>
              <ActionBtn $danger onClick={doDelete}>Delete</ActionBtn>
            </ConfirmActions>
          </ConfirmBox>
        </ConfirmOverlay>,
        document.body
      )}
    </Overlay>,
    document.body
  );
}
