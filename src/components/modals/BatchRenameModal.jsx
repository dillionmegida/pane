import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import path from 'path-browserify';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label, Row, Select } from './ModalPrimitives';

// ─── Batch Rename Modal ───────────────────────────────────────────────────────
export default function BatchRenameModal({ data, onClose }) {
  const { panes, activePane, refreshPane } = useStore();
  const pane = panes.find(p => p.id === activePane);

  const files = data?.files || [...(pane?.selectedFiles || [])].map(fp => ({
    path: fp, name: fp.split('/').pop(),
    extension: fp.split('.').pop()
  })).filter(f => pane?.files.find(pf => pf.path === f.path) || true);

  const allFiles = data?.files || (pane?.files.filter(f => pane.selectedFiles.has(f.path)) || []);

  const [mode, setMode] = useState('pattern'); // 'pattern' | 'findReplace' | 'case'
  const [pattern, setPattern] = useState('{original}');
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseMode, setCaseMode] = useState('unchanged');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [startCounter, setStartCounter] = useState(1);
  const [counterPad, setCounterPad] = useState(2);
  const [applying, setApplying] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const applyPattern = (file, index) => {
    let baseName = file.name;
    const ext = file.extension || file.name.split('.').pop() || '';
    const nameWithoutExt = ext && file.name.endsWith(`.${ext}`) ? file.name.slice(0, -(ext.length + 1)) : file.name;
    const parentFolder = (file.path || '').split('/').slice(-2, -1)[0] || '';
    const counter = String(startCounter + index).padStart(counterPad, '0');

    if (mode === 'pattern') {
      baseName = pattern
        .replace(/\{original\}/g, nameWithoutExt)
        .replace(/\{ext\}/g, ext)
        .replace(/\{date\}/g, todayStr)
        .replace(/\{counter\}/g, counter)
        .replace(/\{parent\}/g, parentFolder);
      if (ext && !pattern.includes('{ext}') && file.extension) baseName += `.${ext}`;
    } else if (mode === 'findReplace') {
      if (useRegex) {
        try {
          const re = new RegExp(findStr, 'g');
          baseName = baseName.replace(re, replaceStr);
        } catch {}
      } else {
        baseName = baseName.split(findStr).join(replaceStr);
      }
    }

    // Prefix / Suffix
    if (prefix || suffix) {
      const parts = baseName.split('.');
      const e = parts.length > 1 ? parts.pop() : '';
      const n = parts.join('.');
      baseName = prefix + n + suffix + (e ? `.${e}` : '');
    }

    // Case
    if (caseMode === 'lower') baseName = baseName.toLowerCase();
    else if (caseMode === 'upper') baseName = baseName.toUpperCase();
    else if (caseMode === 'title') baseName = baseName.replace(/\b\w/g, c => c.toUpperCase());

    return baseName;
  };

  const previews = useMemo(() => {
    return allFiles.map((file, i) => ({
      file,
      newName: applyPattern(file, i),
      changed: applyPattern(file, i) !== file.name,
    }));
  }, [allFiles, mode, pattern, findStr, replaceStr, useRegex, caseMode, prefix, suffix, startCounter, counterPad]);

  const apply = async () => {
    setApplying(true);
    const renames = previews
      .filter(p => p.changed && p.newName.trim())
      .map(p => ({
        oldPath: p.file.path,
        newPath: p.file.path.replace(/[^/]+$/, p.newName),
      }));
    await window.electronAPI.batchRename(renames);
    setApplying(false);
    refreshPane(activePane);
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="780px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>✏️ Batch Rename — {allFiles.length} files</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        <ModalBody pad="16px">
          {/* Mode Tabs */}
          <Row style={{ marginBottom: 16, borderBottom: '1px solid #2e2e35', paddingBottom: 12 }}>
            {['pattern', 'findReplace', 'case'].map(m => (
              <Btn key={m} primary={mode === m} onClick={() => setMode(m)}>
                {m === 'pattern' ? 'Pattern' : m === 'findReplace' ? 'Find & Replace' : 'Case'}
              </Btn>
            ))}
          </Row>

          {/* Controls */}
          {mode === 'pattern' && (
            <div style={{ marginBottom: 16 }}>
              <Label>Name Pattern</Label>
              <Input
                mono
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="{original}_{counter}"
              />
              <div style={{ marginTop: 8, fontSize: 10, color: '#5a5a6b', lineHeight: 1.8 }}>
                Tokens: <code style={{ color: '#4A9EFF' }}>{'{original}'}</code> original name ·{' '}
                <code style={{ color: '#4A9EFF' }}>{'{ext}'}</code> extension ·{' '}
                <code style={{ color: '#4A9EFF' }}>{'{date}'}</code> today ({todayStr}) ·{' '}
                <code style={{ color: '#4A9EFF' }}>{'{counter}'}</code> sequential number ·{' '}
                <code style={{ color: '#4A9EFF' }}>{'{parent}'}</code> parent folder
              </div>
              <Row style={{ marginTop: 10 }}>
                <div>
                  <Label>Counter Start</Label>
                  <Input type="number" value={startCounter} onChange={e => setStartCounter(+e.target.value)} width="80px" />
                </div>
                <div>
                  <Label>Pad to digits</Label>
                  <Input type="number" min={1} max={8} value={counterPad} onChange={e => setCounterPad(+e.target.value)} width="80px" />
                </div>
                <div>
                  <Label>Prefix</Label>
                  <Input value={prefix} onChange={e => setPrefix(e.target.value)} width="120px" placeholder="e.g. IMG_" />
                </div>
                <div>
                  <Label>Suffix</Label>
                  <Input value={suffix} onChange={e => setSuffix(e.target.value)} width="120px" placeholder="e.g. _final" />
                </div>
              </Row>
            </div>
          )}

          {mode === 'findReplace' && (
            <Row style={{ marginBottom: 16, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Label>Find</Label>
                <Input mono value={findStr} onChange={e => setFindStr(e.target.value)} placeholder="search string or regex" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Replace</Label>
                <Input mono value={replaceStr} onChange={e => setReplaceStr(e.target.value)} placeholder="replacement" />
              </div>
              <div style={{ paddingTop: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9898a8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} />
                  Regex
                </label>
              </div>
            </Row>
          )}

          {mode === 'case' && (
            <Row style={{ marginBottom: 16 }}>
              <Label style={{ marginBottom: 0 }}>Case Mode:</Label>
              {['unchanged', 'lower', 'upper', 'title'].map(c => (
                <Btn key={c} primary={caseMode === c} onClick={() => setCaseMode(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Btn>
              ))}
            </Row>
          )}

          {/* Preview Table */}
          <div style={{ border: '1px solid #2e2e35', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr', padding: '6px 12px', background: '#1e1e22', fontSize: 10, color: '#5a5a6b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Before</span><span></span><span>After</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {previews.map((p, i) => (
                <div key={p.file.path} style={{
                  display: 'grid', gridTemplateColumns: '1fr 20px 1fr',
                  padding: '5px 12px', fontSize: 11,
                  background: i % 2 === 0 ? 'transparent' : '#1a1a1e',
                  borderBottom: '1px solid #222',
                }}>
                  <span style={{ color: '#9898a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{p.file.name}</span>
                  <span style={{ color: '#4A9EFF', textAlign: 'center' }}>→</span>
                  <span style={{
                    color: p.changed ? '#34d399' : '#5a5a6b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: 'monospace', fontWeight: p.changed ? 600 : 400,
                  }}>{p.newName}</span>
                </div>
              ))}
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <span style={{ fontSize: 11, color: '#5a5a6b', marginRight: 'auto' }}>
            {previews.filter(p => p.changed).length} files will be renamed
          </span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={applying || previews.filter(p => p.changed).length === 0} onClick={apply}>
            {applying ? 'Renaming...' : 'Apply Rename'}
          </Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}