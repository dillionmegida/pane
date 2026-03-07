import React, { useState } from 'react';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label } from './ModalPrimitives';

export function PermissionsModal({ data, onClose }) {
  const file = data?.file;
  const [perm, setPerm] = useState(file?.permissions?.octal || '644');
  const [saving, setSaving] = useState(false);

  if (!file) return null;

  const octalToRwx = (octal) => {
    const val = parseInt(octal, 8);
    const rwx = (n) => [(n & 4) ? 'r' : '-', (n & 2) ? 'w' : '-', (n & 1) ? 'x' : '-'].join('');
    return rwx((val >> 6) & 7) + rwx((val >> 3) & 7) + rwx(val & 7);
  };

  const toggleBit = (pos) => {
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
      <ModalBox width="400px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔒 Permissions: {file.name}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <div style={{ fontFamily: 'monospace', fontSize: 24, textAlign: 'center', color: '#34d399', marginBottom: 16, letterSpacing: 4 }}>
            {octalToRwx(perm)} ({perm})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
            {bits.map(bit => {
              const val = parseInt(perm, 8);
              const on = !!(val & (1 << bit.pos));
              return (
                <label key={bit.label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: on ? '#e8e8ed' : '#5a5a6b' }}>
                  <input type="checkbox" checked={on} onChange={() => toggleBit(bit.pos)} />
                  {bit.label}
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Label style={{ margin: 0 }}>Octal:</Label>
            <Input value={perm} onChange={e => setPerm(e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Apply chmod'}</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
