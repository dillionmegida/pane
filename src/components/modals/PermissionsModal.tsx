import React, { useState } from 'react';
import styled from 'styled-components';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label } from './ModalPrimitives';

const PermDisplay = styled.div`
  font-family: monospace;
  font-size: 24px;
  text-align: center;
  color: #34d399;
  margin-bottom: 16px;
  letter-spacing: 4px;
`;

const BitGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 16px;
`;

const BitLabel = styled.label<{ on: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11px;
  color: ${p => p.on ? '#e8e8ed' : '#5a5a6b'};
`;

const OctalRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const OctalLabel = styled(Label)`
  margin: 0;
`;

const OctalInput = styled(Input)`
  flex: 1;
  font-family: monospace;
`;

interface FilePermissions {
  octal?: string;
}

interface PermissionsFile {
  name: string;
  path: string;
  permissions?: FilePermissions;
}

interface PermissionsModalProps {
  data?: { file?: PermissionsFile; filePath?: string };
  onClose: () => void;
}

export function PermissionsModal({ data, onClose }: PermissionsModalProps) {
  const file = data?.file;
  const [perm, setPerm] = useState(file?.permissions?.octal || '644');
  const [saving, setSaving] = useState(false);

  if (!file) return null;

  const octalToRwx = (octal: string): string => {
    const val = parseInt(octal, 8);
    const rwx = (n: number) => [(n & 4) ? 'r' : '-', (n & 2) ? 'w' : '-', (n & 1) ? 'x' : '-'].join('');
    return rwx((val >> 6) & 7) + rwx((val >> 3) & 7) + rwx(val & 7);
  };

  const toggleBit = (pos: number) => {
    const val = parseInt(perm, 8);
    const newVal = val ^ (1 << pos);
    setPerm(newVal.toString(8).padStart(3, '0'));
  };

  const save = async () => {
    setSaving(true);
    await window.electronAPI.chmod(file.path, perm);
    setSaving(false);
    onClose();
  };

  const bits = [
    { label: 'Owner Read', pos: 8 }, { label: 'Owner Write', pos: 7 }, { label: 'Owner Execute', pos: 6 },
    { label: 'Group Read', pos: 5 }, { label: 'Group Write', pos: 4 }, { label: 'Group Execute', pos: 3 },
    { label: 'Other Read', pos: 2 }, { label: 'Other Write', pos: 1 }, { label: 'Other Execute', pos: 0 },
  ];

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="400px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔒 Permissions: {file.name}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <PermDisplay>
            {octalToRwx(perm)} ({perm})
          </PermDisplay>
          <BitGrid>
            {bits.map(bit => {
              const val = parseInt(perm, 8);
              const on = !!(val & (1 << bit.pos));
              return (
                <BitLabel key={bit.label} on={on}>
                  <input type="checkbox" checked={on} onChange={() => toggleBit(bit.pos)} />
                  {bit.label}
                </BitLabel>
              );
            })}
          </BitGrid>
          <OctalRow>
            <OctalLabel>Octal:</OctalLabel>
            <OctalInput value={perm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPerm(e.target.value)} />
          </OctalRow>
        </ModalBody>
        <ModalFooter>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Apply chmod'}</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
