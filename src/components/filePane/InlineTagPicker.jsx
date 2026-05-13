import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useStore } from '../../store';
import { getTagColors } from '../../theme';

const TagPickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
`;

const TagPickerPanel = styled.div.withConfig({
  shouldForwardProp: p => !['top','left'].includes(p),
})`
  position: fixed;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.lg};
  box-shadow: ${p => p.theme.shadow.lg};
  width: 280px;
  padding: 10px 0 6px;
  z-index: 901;
  top: ${p => p.top}px;
  left: ${p => p.left}px;
`;

const TagPickerHeader = styled.div`
  padding: 4px 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  margin-bottom: 4px;
`;

const TagPickerColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
`;

const TagPickerDot = styled.button.withConfig({
  shouldForwardProp: p => !['active','noColor','color'].includes(p),
})`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${p => p.color || 'transparent'};
  border: 2px solid ${p => p.active ? 'white' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : p.noColor ? `inset 0 0 0 1.5px ${p.theme.border.normal}` : 'none'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  transition: transform 0.1s;
  &:hover { transform: scale(1.15); }
`;

const TagPickerInput = styled.input`
  width: 100%;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary};
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;

const TagPickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.07s;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const TagPickerDotSmall = styled.span.withConfig({
  shouldForwardProp: p => p !== 'color',
})`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const TagPickerCheck = styled.span.withConfig({
  shouldForwardProp: p => p !== 'visible',
})`
  margin-left: auto;
  font-size: 12px;
  color: ${p => p.theme.accent.blue};
  opacity: ${p => p.visible ? 1 : 0};
`;

export default function InlineTagPicker({ file, allTags, fileTags, onClose, onChanged }) {
  const { currentTheme } = useStore();
  const TAG_COLORS = getTagColors(currentTheme);

  const [localFileTags, setLocalFileTags] = useState(fileTags);
  const [localAllTags, setLocalAllTags] = useState(allTags);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [pos, setPos] = useState({ top: 200, left: 200 });
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    setPos({ top: Math.round(window.innerHeight / 2 - 150), left: Math.round(window.innerWidth / 2 - 140) });
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    let { top, left } = pos;
    if (rect.bottom > window.innerHeight - 20) top = Math.max(20, window.innerHeight - rect.height - 20);
    if (rect.right > window.innerWidth - 20) left = Math.max(20, window.innerWidth - rect.width - 20);
    if (top !== pos.top || left !== pos.left) setPos({ top, left });
  }, [localAllTags]);

  const toggleTag = async (tag) => {
    const isOn = localFileTags.includes(tag.tag_name);
    if (isOn) {
      await window.electronAPI.removeTag({ filePath: file.path, tagName: tag.tag_name });
      const next = localFileTags.filter(t => t !== tag.tag_name);
      setLocalFileTags(next);
      onChanged(next);
    } else {
      await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name, color: tag.color });
      const next = [...localFileTags, tag.tag_name];
      setLocalFileTags(next);
      onChanged(next);
    }
  };

  const createAndAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: name, color: selectedColor });
    const next = [...localFileTags, name];
    setLocalFileTags(next);
    const all = await window.electronAPI.getAllTags();
    const nextAll = all.success ? all.tags : localAllTags;
    setLocalAllTags(nextAll);
    onChanged(next, nextAll);
    setNewTagName('');
  };

  const COLOR_NAMES = ['Blue','Purple','Green','Orange','Red','Yellow','Pink','Teal'];

  const filtered = newTagName.trim()
    ? localAllTags.filter(t => t.tag_name.toLowerCase().includes(newTagName.toLowerCase()))
    : localAllTags;

  return ReactDOM.createPortal(
    <>
      <TagPickerOverlay onClick={onClose} />
      <TagPickerPanel ref={panelRef} top={pos.top} left={pos.left} onClick={e => e.stopPropagation()}>
        <TagPickerHeader>🏷️ Tags — {file.name}</TagPickerHeader>

        <TagPickerColorRow>
          <TagPickerDot noColor title="No color" onClick={() => setSelectedColor(null)}>✕</TagPickerDot>
          {TAG_COLORS.slice(0, 8).map((c, i) => (
            <TagPickerDot
              key={c}
              color={c}
              active={selectedColor === c}
              onClick={() => setSelectedColor(c)}
              title={COLOR_NAMES[i]}
            >
              {selectedColor === c && '✓'}
            </TagPickerDot>
          ))}
        </TagPickerColorRow>

        <div style={{ padding: '6px 12px 6px' }}>
          <TagPickerInput
            ref={inputRef}
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="Add or find a tag..."
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const exact = localAllTags.find(t => t.tag_name.toLowerCase() === newTagName.trim().toLowerCase());
                if (exact) toggleTag(exact);
                else createAndAddTag();
              }
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {filtered.map(tag => (
            <TagPickerRow key={tag.tag_name} onClick={() => toggleTag(tag)}>
              <TagPickerDotSmall color={tag.color} />
              <span style={{ fontSize: 12, flex: 1, color: 'inherit' }}>{tag.tag_name}</span>
              <TagPickerCheck visible={localFileTags.includes(tag.tag_name)}>✓</TagPickerCheck>
            </TagPickerRow>
          ))}
          {newTagName.trim() && !localAllTags.find(t => t.tag_name.toLowerCase() === newTagName.trim().toLowerCase()) && (
            <TagPickerRow onClick={createAndAddTag}>
              <TagPickerDotSmall color={selectedColor || '#888'} />
              <span style={{ fontSize: 12, flex: 1, color: 'inherit' }}>Create "{newTagName.trim()}"</span>
            </TagPickerRow>
          )}
          {filtered.length === 0 && !newTagName.trim() && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: '#888' }}>No tags yet. Type to create one.</div>
          )}
        </div>
      </TagPickerPanel>
    </>,
    document.body
  );
}
