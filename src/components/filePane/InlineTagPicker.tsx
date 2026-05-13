import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useStore } from '../../store';
import type { Tag } from '../../types';

const Portal = styled.div`
  position: fixed;
  z-index: 9999;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 8px;
  min-width: 200px;
  max-width: 260px;
`;

const Section = styled.div`
  margin-bottom: 6px;
`;

const SectionTitle = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 2px 4px;
`;

const TagRow = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  background: ${p => p.active ? p.theme.bg.selection : 'transparent'};
  transition: background 0.1s;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const TagDot = styled.span<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const TagName = styled.span`
  font-size: 12px;
  color: ${p => p.theme.text.primary};
  flex: 1;
`;

const RemoveBtn = styled.span`
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
  ${TagRow}:hover & { opacity: 1; }
  &:hover { color: ${p => p.theme.text.error}; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 6px 0;
`;

const NewTagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
`;

const NewTagInput = styled.input`
  flex: 1;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary};
  font-size: 11px;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  outline: none;
  &:focus { border-color: ${p => p.theme.border.focus}; }
`;

const ColorDot = styled.span<{ color: string; selected: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${p => p.color};
  cursor: pointer;
  border: 2px solid ${p => p.selected ? p.theme.text.primary : 'transparent'};
  flex-shrink: 0;
`;

const ColorRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const AddBtn = styled.button`
  font-size: 11px;
  padding: 3px 8px;
  background: ${p => p.theme.accent.blue};
  border: none;
  color: #fff;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const TAG_COLOR_OPTIONS = [
  '#4A9EFF', '#a78bfa', '#34d399', '#fb923c',
  '#f87171', '#fbbf24', '#f472b6', '#22d3ee',
];

interface InlineTagPickerProps {
  filePath: string;
  currentTags: Tag[];
  position: { x: number; y: number };
  onClose: () => void;
  onTagsChanged: (tags: Tag[]) => void;
}

export default function InlineTagPicker({
  filePath,
  currentTags,
  position,
  onClose,
  onTagsChanged,
}: InlineTagPickerProps) {
  const { allTags, loadAllTags } = useStore();
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLOR_OPTIONS[0]);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllTags();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (portalRef.current && !portalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [onClose]);

  const hasTag = (tagName: string) => currentTags.some(t => t.tag_name === tagName);

  const toggleTag = async (tag: Tag) => {
    if (hasTag(tag.tag_name)) {
      const result = await window.electronAPI.removeTag({ filePath, tagName: tag.tag_name });
      if (result.success) {
        const updated = currentTags.filter(t => t.tag_name !== tag.tag_name);
        onTagsChanged(updated);
      }
    } else {
      const result = await window.electronAPI.addTag({ filePath, tagName: tag.tag_name, color: null });
      if (result.success) {
        onTagsChanged([...currentTags, tag]);
      }
    }
    await loadAllTags();
  };

  const createAndAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;

    const existing = allTags.find(t => t.tag_name === name);
    if (existing) {
      await toggleTag(existing);
    } else {
      const createResult = await window.electronAPI.createTag({ tagName: name, color: selectedColor });
      if (createResult.success) {
        const addResult = await window.electronAPI.addTag({ filePath, tagName: name, color: selectedColor });
        if (addResult.success) {
          onTagsChanged([...currentTags, { tag_name: name, color: selectedColor }]);
          await loadAllTags();
        }
      }
    }
    setNewTagName('');
  };

  const removeTagFromFile = async (tagName: string) => {
    const result = await window.electronAPI.removeTag({ filePath, tagName });
    if (result.success) {
      onTagsChanged(currentTags.filter(t => t.tag_name !== tagName));
    }
  };

  const style: React.CSSProperties = {
    top: position.y,
    left: position.x,
  };

  return ReactDOM.createPortal(
    <Portal ref={portalRef} style={style}>
      {allTags.length > 0 && (
        <Section>
          <SectionTitle>All Tags</SectionTitle>
          {allTags.map(tag => (
            <TagRow key={tag.tag_name} active={hasTag(tag.tag_name)} onClick={() => toggleTag(tag)}>
              <TagDot color={tag.color} />
              <TagName>{tag.tag_name}</TagName>
              {hasTag(tag.tag_name) && (
                <RemoveBtn onClick={e => { e.stopPropagation(); removeTagFromFile(tag.tag_name); }}>
                  ✕
                </RemoveBtn>
              )}
            </TagRow>
          ))}
          <Divider />
        </Section>
      )}
      <Section>
        <SectionTitle>New Tag</SectionTitle>
        <NewTagRow>
          <NewTagInput
            placeholder="Tag name…"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createAndAdd(); if (e.key === 'Escape') onClose(); }}
            autoFocus
          />
          <AddBtn onClick={createAndAdd}>Add</AddBtn>
        </NewTagRow>
        <ColorRow>
          {TAG_COLOR_OPTIONS.map(c => (
            <ColorDot
              key={c}
              color={c}
              selected={selectedColor === c}
              onClick={() => setSelectedColor(c)}
            />
          ))}
        </ColorRow>
      </Section>
    </Portal>,
    document.body
  );
}
