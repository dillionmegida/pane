import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import path from 'path-browserify';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label, Row, Select } from './ModalPrimitives';
import type { FileItem } from '../../types';

const ModeRow = styled(Row)`
  margin-bottom: 16px;
  border-bottom: 1px solid #2e2e35;
  padding-bottom: 12px;
`;

const PatternSection = styled.div`
  margin-bottom: 16px;
`;

const TokenHelp = styled.div`
  margin-top: 8px;
  font-size: 10px;
  color: #5a5a6b;
  line-height: 1.8;
`;

const TokenCode = styled.code`
  color: #4A9EFF;
`;

const CounterRow = styled(Row)`
  margin-top: 10px;
`;

const FindReplaceRow = styled(Row)`
  margin-bottom: 16px;
  gap: 12px;
`;

const FlexField = styled.div`
  flex: 1;
`;

const RegexWrap = styled.div`
  padding-top: 20px;
`;

const RegexLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9898a8;
  cursor: pointer;
`;

const CaseRow = styled(Row)`
  margin-bottom: 16px;
`;

const CaseModeLabel = styled(Label)`
  margin-bottom: 0;
`;

const PreviewTable = styled.div`
  border: 1px solid #2e2e35;
  border-radius: 6px;
  overflow: hidden;
`;

const PreviewHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 20px 1fr;
  padding: 6px 12px;
  background: #1e1e22;
  font-size: 10px;
  color: #5a5a6b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PreviewList = styled.div`
  max-height: 280px;
  overflow-y: auto;
`;

const PreviewRow = styled.div<{ even: boolean }>`
  display: grid;
  grid-template-columns: 1fr 20px 1fr;
  padding: 5px 12px;
  font-size: 11px;
  background: ${p => p.even ? 'transparent' : '#1a1a1e'};
  border-bottom: 1px solid #222;
`;

const OldName = styled.span`
  color: #9898a8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
`;

const Arrow = styled.span`
  color: #4A9EFF;
  text-align: center;
`;

const NewName = styled.span<{ changed: boolean }>`
  color: ${p => p.changed ? '#34d399' : '#5a5a6b'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-weight: ${p => p.changed ? 600 : 400};
`;

const FooterInfo = styled.span`
  font-size: 11px;
  color: #5a5a6b;
  margin-right: auto;
`;

type RenameMode = 'pattern' | 'findReplace' | 'case';
type CaseMode = 'unchanged' | 'lower' | 'upper' | 'title';

interface BatchRenameFile {
  path: string;
  name: string;
  extension?: string;
}

interface BatchRenameModalProps {
  data?: { files?: BatchRenameFile[] };
  onClose: () => void;
}

interface PreviewEntry {
  file: BatchRenameFile;
  newName: string;
  changed: boolean;
}

export default function BatchRenameModal({ data, onClose }: BatchRenameModalProps) {
  const { panes, activePane, refreshPane } = useStore();
  const pane = panes.find(p => p.id === activePane);

  const allFiles: BatchRenameFile[] = data?.files ||
    (pane?.files.filter((f: FileItem) => pane.selectedFiles.has(f.path)) || []);

  const [mode, setMode] = useState<RenameMode>('pattern');
  const [renamePattern, setRenamePattern] = useState('{original}');
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseMode, setCaseMode] = useState<CaseMode>('unchanged');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [startCounter, setStartCounter] = useState(1);
  const [counterPad, setCounterPad] = useState(2);
  const [applying, setApplying] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const applyPattern = (file: BatchRenameFile, index: number): string => {
    let baseName = file.name;
    const ext = file.extension || file.name.split('.').pop() || '';
    const nameWithoutExt = ext && file.name.endsWith(`.${ext}`) ? file.name.slice(0, -(ext.length + 1)) : file.name;
    const parentFolder = (file.path || '').split('/').slice(-2, -1)[0] || '';
    const counter = String(startCounter + index).padStart(counterPad, '0');

    if (mode === 'pattern') {
      baseName = renamePattern
        .replace(/\{original\}/g, nameWithoutExt)
        .replace(/\{ext\}/g, ext)
        .replace(/\{date\}/g, todayStr)
        .replace(/\{counter\}/g, counter)
        .replace(/\{parent\}/g, parentFolder);
      if (ext && !renamePattern.includes('{ext}') && file.extension) baseName += `.${ext}`;
    } else if (mode === 'findReplace') {
      if (useRegex) {
        try { baseName = baseName.replace(new RegExp(findStr, 'g'), replaceStr); } catch {}
      } else {
        baseName = baseName.split(findStr).join(replaceStr);
      }
    }

    if (prefix || suffix) {
      const parts = baseName.split('.');
      const e = parts.length > 1 ? parts.pop()! : '';
      const n = parts.join('.');
      baseName = prefix + n + suffix + (e ? `.${e}` : '');
    }

    if (caseMode === 'lower') baseName = baseName.toLowerCase();
    else if (caseMode === 'upper') baseName = baseName.toUpperCase();
    else if (caseMode === 'title') baseName = baseName.replace(/\b\w/g, c => c.toUpperCase());

    return baseName;
  };

  const previews: PreviewEntry[] = useMemo(() => {
    return allFiles.map((file, i) => ({
      file,
      newName: applyPattern(file, i),
      changed: applyPattern(file, i) !== file.name,
    }));
  }, [allFiles, mode, renamePattern, findStr, replaceStr, useRegex, caseMode, prefix, suffix, startCounter, counterPad]);

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

  const MODES: RenameMode[] = ['pattern', 'findReplace', 'case'];

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="780px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>✏️ Batch Rename — {allFiles.length} files</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        <ModalBody pad="16px">
          <ModeRow>
            {MODES.map(m => (
              <Btn key={m} primary={mode === m} onClick={() => setMode(m)}>
                {m === 'pattern' ? 'Pattern' : m === 'findReplace' ? 'Find & Replace' : 'Case'}
              </Btn>
            ))}
          </ModeRow>

          {mode === 'pattern' && (
            <PatternSection>
              <Label>Name Pattern</Label>
              <Input mono value={renamePattern} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenamePattern(e.target.value)} placeholder="{original}_{counter}" />
              <TokenHelp>
                Tokens: <TokenCode>{'{original}'}</TokenCode> original name ·{' '}
                <TokenCode>{'{ext}'}</TokenCode> extension ·{' '}
                <TokenCode>{'{date}'}</TokenCode> today ({todayStr}) ·{' '}
                <TokenCode>{'{counter}'}</TokenCode> sequential number ·{' '}
                <TokenCode>{'{parent}'}</TokenCode> parent folder
              </TokenHelp>
              <CounterRow>
                <div>
                  <Label>Counter Start</Label>
                  <Input type="number" value={startCounter} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartCounter(+e.target.value)} width="80px" />
                </div>
                <div>
                  <Label>Pad to digits</Label>
                  <Input type="number" min={1} max={8} value={counterPad} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCounterPad(+e.target.value)} width="80px" />
                </div>
                <div>
                  <Label>Prefix</Label>
                  <Input value={prefix} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrefix(e.target.value)} width="120px" placeholder="e.g. IMG_" />
                </div>
                <div>
                  <Label>Suffix</Label>
                  <Input value={suffix} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSuffix(e.target.value)} width="120px" placeholder="e.g. _final" />
                </div>
              </CounterRow>
            </PatternSection>
          )}

          {mode === 'findReplace' && (
            <FindReplaceRow>
              <FlexField>
                <Label>Find</Label>
                <Input mono value={findStr} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFindStr(e.target.value)} placeholder="search string or regex" />
              </FlexField>
              <FlexField>
                <Label>Replace</Label>
                <Input mono value={replaceStr} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplaceStr(e.target.value)} placeholder="replacement" />
              </FlexField>
              <RegexWrap>
                <RegexLabel>
                  <input type="checkbox" checked={useRegex} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseRegex(e.target.checked)} />
                  Regex
                </RegexLabel>
              </RegexWrap>
            </FindReplaceRow>
          )}

          {mode === 'case' && (
            <CaseRow>
              <CaseModeLabel>Case Mode:</CaseModeLabel>
              {(['unchanged', 'lower', 'upper', 'title'] as CaseMode[]).map(c => (
                <Btn key={c} primary={caseMode === c} onClick={() => setCaseMode(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Btn>
              ))}
            </CaseRow>
          )}

          <PreviewTable>
            <PreviewHeader>
              <span>Before</span><span></span><span>After</span>
            </PreviewHeader>
            <PreviewList>
              {previews.map((p, i) => (
                <PreviewRow key={p.file.path} even={i % 2 === 0}>
                  <OldName>{p.file.name}</OldName>
                  <Arrow>→</Arrow>
                  <NewName changed={p.changed}>{p.newName}</NewName>
                </PreviewRow>
              ))}
            </PreviewList>
          </PreviewTable>
        </ModalBody>

        <ModalFooter>
          <FooterInfo>
            {previews.filter(p => p.changed).length} files will be renamed
          </FooterInfo>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={applying || previews.filter(p => p.changed).length === 0} onClick={apply}>
            {applying ? 'Renaming...' : 'Apply Rename'}
          </Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
