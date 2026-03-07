import React, { useState, useEffect } from 'react';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';

export function SettingsModal({ onClose }) {
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    window.electronAPI.storeGet('showHidden').then(v => setShowHidden(!!v));
  }, []);

  const toggle = async (key, val) => {
    await window.electronAPI.storeSet(key, val);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="480px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>⚙️ Settings</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9898a8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #222' }}>
              <input type="checkbox" checked={showHidden} onChange={e => { setShowHidden(e.target.checked); toggle('showHidden', e.target.checked); }} />
              <div>
                <div style={{ fontSize: 12, color: '#e8e8ed' }}>Show hidden files</div>
                <div style={{ fontSize: 10, color: '#5a5a6b' }}>Show files beginning with a dot (.)</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9898a8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyboard Shortcuts</div>
            {[
              { label: 'Toggle Terminal', shortcut: '⌘ + `' },
              { label: 'Search', shortcut: '⌘ + F' },
              { label: 'Undo', shortcut: '⌘ + Z' },
              { label: 'Show/Hide App', shortcut: '⌘ + ⇧ + Space' },
              { label: 'New Tab', shortcut: '⌘ + T (via +)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1e', fontSize: 12 }}>
                <span style={{ color: '#9898a8' }}>{s.label}</span>
                <span style={{ fontFamily: 'monospace', color: '#4A9EFF', background: '#1a2a3a', padding: '1px 8px', borderRadius: 4, fontSize: 11 }}>{s.shortcut}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#18181b', border: '1px solid #2e2e35', borderRadius: 8, padding: 12, fontSize: 11, color: '#5a5a6b' }}>
            <div style={{ color: '#9898a8', fontWeight: 600, marginBottom: 6 }}>About Finder Pro</div>
            Version 1.0.0 · Built with Electron + React · SQLite for tags & logs
          </div>
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
