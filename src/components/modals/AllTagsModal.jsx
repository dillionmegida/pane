import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useStore } from '../../store';

// ─── Styled ───────────────────────────────────────────────────────────────────
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
  width: 420px;
  max-height: 580px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;

const Title = styled.div`
  font-size: 1rem; font-weight: 600; color: ${p => p.theme.text.primary};
`;

const HeaderActions = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const AddBtn = styled.button`
  width: 22px; height: 22px; border-radius: 50%;
  background: ${p => p.theme.accent.blue};
  border: none; cursor: pointer; color: white;
  font-size: 14px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
  &:hover { opacity: 0.8; }
`;

const CloseBtn = styled.button`
  background: none; border: none; cursor: pointer;
  color: ${p => p.theme.text.tertiary}; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const TagList = styled.div`
  flex: 1; overflow-y: auto; padding: 6px 0;
`;

const TagRow = styled.div.withConfig({ shouldForwardProp: p => p !== 'contextMenuActive' })`
  display: flex; align-items: center; gap: 10px;
  padding: 7px 16px; cursor: default; user-select: none;
  transition: background 0.07s;
  background: ${p => p.contextMenuActive ? p.theme.bg.hover : 'transparent'};
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const TagDotLarge = styled.span.withConfig({ shouldForwardProp: p => p !== 'color' })`
  width: 14px; height: 14px; border-radius: 50%;
  background: ${p => p.color}; flex-shrink: 0;
  display: inline-block;
`;

const TagNameText = styled.span`
  flex: 1; font-size: 13px; color: ${p => p.theme.text.primary};
  line-height: 1.5;
  height: 20px;
`;

const RenameInput = styled.input`
  flex: 1; font-size: 13px;
  background: transparent;
  color: ${p => p.theme.text.primary};
  outline: none;
  border: none;
  line-height: 1.5;
  height: 20px;
  /* padding: 2px 6px; outline: none; */
`;

const TagCount = styled.span`
  font-size: 11px; color: ${p => p.theme.text.tertiary};
`;

// ─── Create Tag Row ───────────────────────────────────────────────────────────
const CreateRow = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid ${p => p.theme.border.subtle};
`;

const CreateInput = styled.input`
  flex: 1; font-size: 12px;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary};
  padding: 5px 8px; outline: none;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;

const CreateSaveBtn = styled.button`
  background: ${p => p.theme.accent.blue}; color: white;
  border: none; border-radius: ${p => p.theme.radius.sm};
  padding: 5px 12px; font-size: 12px; cursor: pointer;
  &:hover { opacity: 0.85; } &:disabled { opacity: 0.4; cursor: default; }
`;

// ─── Tag Right-Click Context Menu ────────────────────────────────────────────
const CtxMenu = styled.div`
  position: fixed; z-index: 1000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 4px 0; width: 180px;
`;

const CtxItem = styled.div`
  padding: 7px 14px; font-size: 12px; cursor: pointer;
  color: ${p => p.danger ? p.theme.text.error : p.theme.text.primary};
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const CtxDivider = styled.div`
  height: 1px; background: ${p => p.theme.border.subtle}; margin: 4px 0;
`;

const CtxColorRow = styled.div`
  display: flex; align-items: center; gap: 5px;
  flex-wrap: wrap;
  padding: 6px 14px;
`;

const CtxColorDot = styled.button.withConfig({ shouldForwardProp: p => !['color','active'].includes(p) })`
  width: 18px; height: 18px; border-radius: 50%;
  background: ${p => p.color}; border: 2px solid ${p => p.active ? '#fff' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : 'none'};
  cursor: pointer; transition: transform 0.1s;
  &:hover { transform: scale(1.18); }
`;

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const ConfirmOverlay = styled.div`
  position: fixed; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5);
`;

const ConfirmBox = styled.div`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  width: 360px; padding: 20px;
`;

const ConfirmTitle = styled.div`
  font-size: 13px; font-weight: 600; color: ${p => p.theme.text.primary}; margin-bottom: 8px;
`;

const ConfirmBody = styled.div`
  font-size: 12px; color: ${p => p.theme.text.secondary}; margin-bottom: 10px;
  line-height: 1.5;
`;

const ConfirmFileList = styled.div`
  max-height: 120px; overflow-y: auto;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  padding: 6px 10px; margin-bottom: 14px;
  font-size: 11px; color: ${p => p.theme.text.secondary};
  line-height: 1.6;
`;

const ConfirmActions = styled.div`
  display: flex; justify-content: flex-end; gap: 8px;
`;

const Btn = styled.button`
  padding: 6px 14px; border-radius: ${p => p.theme.radius.sm};
  font-size: 12px; cursor: pointer; border: none;
  background: ${p => p.danger ? p.theme.text.error : p.primary ? p.theme.accent.blue : p.theme.bg.hover};
  color: ${p => p.danger || p.primary ? 'white' : p.theme.text.primary};
  &:hover { opacity: 0.85; }
`;

// ─── TAG COLOR PALETTE ────────────────────────────────────────────────────────
const PALETTE = [
  '#f87171','#fb923c','#fbbf24','#34d399',
  '#4A9EFF','#a78bfa','#9ca3af','#f472b6',
  '#22d3ee','#6366f1','#10b981','#ef4444',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AllTagsModal({ onClose }) {
  const { loadAllTags } = useStore();
  const [tags, setTags] = useState([]);
  const [tagCounts, setTagCounts] = useState({});
  const [renamingTag, setRenamingTag] = useState(null); // tag_name being renamed
  const [renameValue, setRenameValue] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null); // { tag, x, y }
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[4]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { tag, files[] }
  const renameInputRef = useRef(null);
  const createInputRef = useRef(null);

  const loadTags = useCallback(async () => {
    const r = await window.electronAPI.getAllTags();
    if (r.success) {
      setTags(r.tags);
      // Load counts
      const counts = {};
      await Promise.all(r.tags.map(async t => {
        const fr = await window.electronAPI.getFilesForTag(t.tag_name);
        counts[t.tag_name] = fr.success ? fr.files.length : 0;
      }));
      setTagCounts(counts);
    }
  }, []);

  useEffect(() => { loadTags(); }, []);

  useEffect(() => {
    if (renamingTag) setTimeout(() => renameInputRef.current?.select(), 40);
  }, [renamingTag]);

  useEffect(() => {
    if (creating) setTimeout(() => createInputRef.current?.focus(), 40);
  }, [creating]);

  // Close ctx menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu]);

  const startRename = (tag) => {
    setCtxMenu(null);
    setRenamingTag(tag.tag_name);
    setRenameValue(tag.tag_name);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingTag) {
      await window.electronAPI.renameTag({ oldName: renamingTag, newName: trimmed });
      await loadAllTags();
      await loadTags();
    }
    setRenamingTag(null);
  };

  const recolor = async (tag, color) => {
    await window.electronAPI.recolorTag({ tagName: tag.tag_name, color });
    setCtxMenu(null);
    await loadAllTags();
    await loadTags();
  };

  const confirmDelete = async (tag) => {
    setCtxMenu(null);
    const r = await window.electronAPI.getFilesForTag(tag.tag_name);
    setDeleteConfirm({ tag, files: r.success ? r.files : [] });
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    await window.electronAPI.deleteTag(deleteConfirm.tag.tag_name);
    setDeleteConfirm(null);
    await loadAllTags();
    await loadTags();
  };

  const doCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await window.electronAPI.createTag({ tagName: name, color: newColor });
    setNewName('');
    setCreating(false);
    await loadAllTags();
    await loadTags();
  };

  const handleRightClick = (e, tag) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ tag, x: e.clientX, y: e.clientY });
  };

  return ReactDOM.createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>Tags</Title>
          <HeaderActions>
            <AddBtn title="New tag" onClick={() => setCreating(v => !v)}>+</AddBtn>
            <CloseBtn onClick={onClose}>×</CloseBtn>
          </HeaderActions>
        </Header>

        <TagList>
          {tags.map(tag => (
            <TagRow 
              key={tag.tag_name} 
              onContextMenu={e => handleRightClick(e, tag)}
              contextMenuActive={ctxMenu?.tag.tag_name === tag.tag_name}
            >
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
                <TagNameText onDoubleClick={() => startRename(tag)}>
                  {tag.tag_name}
                </TagNameText>
              )}
              <TagCount>{tagCounts[tag.tag_name] ?? 0} files</TagCount>
            </TagRow>
          ))}
          {tags.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#888' }}>
              No tags yet. Click + to create one.
            </div>
          )}
        </TagList>

        {creating && (
          <CreateRow>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 140 }}>
              {PALETTE.map(c => (
                <CtxColorDot key={c} color={c} active={newColor === c} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <CreateInput
              ref={createInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Tag name..."
              onKeyDown={e => {
                if (e.key === 'Enter') doCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
            />
            <CreateSaveBtn onClick={doCreate} disabled={!newName.trim()}>Add</CreateSaveBtn>
          </CreateRow>
        )}
      </Modal>

      {/* Right-click context menu */}
      {ctxMenu && ReactDOM.createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={(e) => { e.stopPropagation(); setCtxMenu(null); }} />
          <CtxMenu style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
            <CtxItem danger onClick={() => confirmDelete(ctxMenu.tag)}>
              Delete Tag "{ctxMenu.tag.tag_name}"…
            </CtxItem>
            <CtxDivider />
            <CtxItem onClick={() => startRename(ctxMenu.tag)}>
              Rename "{ctxMenu.tag.tag_name}"
            </CtxItem>
            <CtxDivider />
            <CtxColorRow>
              {PALETTE.map(c => (
                <CtxColorDot
                  key={c}
                  color={c}
                  active={ctxMenu.tag.color === c}
                  onClick={() => recolor(ctxMenu.tag, c)}
                  title={c}
                />
              ))}
            </CtxColorRow>
          </CtxMenu>
        </>,
        document.body
      )}

      {/* Delete confirmation */}
      {deleteConfirm && ReactDOM.createPortal(
        <ConfirmOverlay onClick={() => setDeleteConfirm(null)}>
          <ConfirmBox onClick={e => e.stopPropagation()}>
            <ConfirmTitle>Delete Tag "{deleteConfirm.tag.tag_name}"?</ConfirmTitle>
            {deleteConfirm.files.length > 0 ? (
              <>
                <ConfirmBody>
                  The following {deleteConfirm.files.length} file{deleteConfirm.files.length > 1 ? 's' : ''} will lose this tag:
                </ConfirmBody>
                <ConfirmFileList>
                  {deleteConfirm.files.map(f => (
                    <div key={f}>{f.split('/').pop()}</div>
                  ))}
                </ConfirmFileList>
              </>
            ) : (
              <ConfirmBody>This tag has no files assigned.</ConfirmBody>
            )}
            <ConfirmActions>
              <Btn onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
              <Btn danger onClick={doDelete}>Delete</Btn>
            </ConfirmActions>
          </ConfirmBox>
        </ConfirmOverlay>,
        document.body
      )}
    </Overlay>,
    document.body
  );
}
