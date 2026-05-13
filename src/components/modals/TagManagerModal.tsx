import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import { getTagColors } from '../../theme';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label, Row } from './ModalPrimitives';
import type { Tag } from '../../types';

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0 6px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  margin-bottom: 10px;
`;

const ColorDot = styled.button.withConfig({
  shouldForwardProp: p => !['active', 'color'].includes(p),
})<{ active: boolean; color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${p => p.color};
  border: 2.5px solid ${p => p.active ? '#fff' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : 'none'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  position: relative;
  &:hover { transform: scale(1.12); }
`;

const CheckMark = styled.span`
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
`;

const TagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  transition: background 0.08s;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const TagDotSmall = styled.span.withConfig({
  shouldForwardProp: p => p !== 'color',
})<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const TagName = styled.span`
  flex: 1;
  font-size: 12px;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CheckIcon = styled.span.withConfig({
  shouldForwardProp: p => p !== 'checked',
})<{ checked: boolean }>`
  font-size: 12px;
  color: ${p => p.theme.accent.blue};
  opacity: ${p => p.checked ? 1 : 0};
`;

const NoneColorDot = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid ${p => p.theme.border.normal};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
  transition: all 0.12s;
  &:hover { border-color: ${p => p.theme.text.secondary}; }
`;

interface FileArg {
  name: string;
  path: string;
}

interface TagManagerModalProps {
  data?: { file?: FileArg; filePath?: string };
  onClose: () => void;
}

export function TagManagerModal({ data, onClose }: TagManagerModalProps) {
  const { loadAllTags, currentTheme } = useStore();
  const TAG_COLORS = getTagColors(currentTheme);
  const file = data?.file;

  const [existingTags, setExistingTags] = useState<Tag[]>([]);
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(TAG_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const loadData = async () => {
    const [all, mine] = await Promise.all([
      window.electronAPI.getAllTags(),
      file ? window.electronAPI.getTags(file.path) : Promise.resolve({ success: true, tags: [] }),
    ]);
    if (all.success) setExistingTags(all.tags);
    if (mine.success) setFileTags(mine.tags.map((t: Tag) => t.tag_name));
  };

  const addTag = async (name?: string, color?: string) => {
    const tagName = (name || newTag).trim();
    if (!tagName || !file) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName, color: color || selectedColor || null });
    if (!name) setNewTag('');
    await loadData();
    loadAllTags();
  };

  const removeTag = async (tagName: string) => {
    if (!file) return;
    await window.electronAPI.removeTag({ filePath: file.path, tagName });
    await loadData();
    loadAllTags();
  };

  const toggleExistingTag = async (tag: Tag) => {
    if (!file) return;
    if (fileTags.includes(tag.tag_name)) {
      await removeTag(tag.tag_name);
    } else {
      await addTag(tag.tag_name, tag.color);
    }
  };

  const COLOR_NAMES: Record<string, string> = {
    [TAG_COLORS[0]]: 'Blue', [TAG_COLORS[1]]: 'Purple', [TAG_COLORS[2]]: 'Green',
    [TAG_COLORS[3]]: 'Orange', [TAG_COLORS[4]]: 'Red', [TAG_COLORS[5]]: 'Yellow',
    [TAG_COLORS[6]]: 'Pink', [TAG_COLORS[7]]: 'Teal',
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="340px" onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ maxHeight: '70vh' }}>
        <ModalHeader>
          <ModalTitle>🏷️ Tags{file ? ` — ${file.name}` : ''}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <ColorRow>
            <NoneColorDot title="No color" onClick={() => setSelectedColor(null)}>✕</NoneColorDot>
            {TAG_COLORS.slice(0, 8).map(c => (
              <ColorDot key={c} color={c} active={selectedColor === c} onClick={() => setSelectedColor(c)} title={COLOR_NAMES[c] || c}>
                {selectedColor === c && <CheckMark>✓</CheckMark>}
              </ColorDot>
            ))}
          </ColorRow>

          {file && (
            <Row style={{ marginBottom: 10 }}>
              <Input
                ref={inputRef}
                value={newTag}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addTag()}
                style={{ flex: 1 }}
              />
              <Btn primary onClick={() => addTag()} disabled={!newTag.trim()}>Add</Btn>
            </Row>
          )}

          {existingTags.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <Label style={{ marginBottom: 6 }}>Tags</Label>
              {existingTags.map(tag => (
                <TagRow key={tag.tag_name} onClick={() => file && toggleExistingTag(tag)}>
                  <TagDotSmall color={tag.color} />
                  <TagName>{tag.tag_name}</TagName>
                  <CheckIcon checked={fileTags.includes(tag.tag_name)}>✓</CheckIcon>
                </TagRow>
              ))}
            </div>
          )}

          {existingTags.length === 0 && !file && (
            <div style={{ color: '#5a5a6b', fontSize: 11, textAlign: 'center', paddingTop: 20 }}>
              No tags yet. Open a file&apos;s context menu to add tags.
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
