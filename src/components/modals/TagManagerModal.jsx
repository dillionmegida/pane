import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { getTagColors } from '../../theme';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label, Row } from './ModalPrimitives';

export function TagManagerModal({ data, onClose }) {
  const { loadAllTags, currentTheme } = useStore();
  const TAG_COLORS = getTagColors(currentTheme);
  const file = data?.file;
  const [existingTags, setExistingTags] = useState([]);
  const [fileTags, setFileTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [all, mine] = await Promise.all([
      window.electronAPI.getAllTags(),
      file ? window.electronAPI.getTags(file.path) : Promise.resolve({ tags: [] }),
    ]);
    if (all.success) setExistingTags(all.tags);
    if (mine.success) setFileTags(mine.tags.map(t => t.tag_name));
  };

  const addTag = async () => {
    if (!newTag.trim() || !file) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: newTag.trim(), color: selectedColor });
    setNewTag('');
    await loadData();
    loadAllTags();
  };

  const removeTag = async (tagName) => {
    if (!file) return;
    await window.electronAPI.removeTag({ filePath: file.path, tagName });
    await loadData();
    loadAllTags();
  };

  const quickAddTag = async (tag) => {
    if (!file || fileTags.includes(tag.tag_name)) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name, color: tag.color });
    await loadData();
  };

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="420px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🏷️ Tags{file ? `: ${file.name}` : ''}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          {file && (
            <>
              <Label>Current Tags</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, minHeight: 30 }}>
                {fileTags.length === 0 && <span style={{ color: '#5a5a6b', fontSize: 11 }}>No tags</span>}
                {fileTags.map(t => {
                  const tagInfo = existingTags.find(et => et.tag_name === t);
                  return (
                    <span key={t} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: (tagInfo?.color || '#4A9EFF') + '30',
                      border: `1px solid ${tagInfo?.color || '#4A9EFF'}`,
                      color: tagInfo?.color || '#4A9EFF',
                      borderRadius: 12, padding: '2px 8px', fontSize: 11,
                    }}>
                      {t}
                      <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeTag(t)}>✕</span>
                    </span>
                  );
                })}
              </div>

              <Label>Add Tag</Label>
              <Row style={{ marginBottom: 14 }}>
                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag name..." onKeyDown={e => e.key === 'Enter' && addTag()} style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 3 }}>
                  {TAG_COLORS.slice(0, 6).map(c => (
                    <div key={c} onClick={() => setSelectedColor(c)} style={{
                      width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: selectedColor === c ? '2px solid white' : '2px solid transparent',
                    }} />
                  ))}
                </div>
                <Btn primary onClick={addTag} disabled={!newTag.trim()}>Add</Btn>
              </Row>
            </>
          )}

          {existingTags.length > 0 && (
            <>
              <Label>All Tags</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {existingTags.map(tag => (
                  <span key={tag.tag_name} onClick={() => file && quickAddTag(tag)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: tag.color + '20',
                    border: `1px solid ${tag.color}`,
                    color: tag.color,
                    borderRadius: 12, padding: '2px 8px', fontSize: 11,
                    cursor: file ? 'pointer' : 'default',
                    opacity: fileTags.includes(tag.tag_name) ? 0.4 : 1,
                  }}>
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
