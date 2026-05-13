import React, { useState, useEffect } from 'react';
import { useTheme } from 'styled-components';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import { themes } from '../../theme';
import { useStore } from '../../store/index';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const theme = useTheme();
  const [showHidden, setShowHidden] = useState(false);
  const currentTheme = useStore(state => state.currentTheme);
  const setTheme = useStore(state => state.setTheme);

  useEffect(() => {
    window.electronAPI.storeGet('showHidden').then((v: unknown) => setShowHidden(!!v));
  }, []);

  const toggle = async (key: string, val: unknown) => {
    await window.electronAPI.storeSet(key, val);
  };

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="480px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>⚙️ Settings</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text.secondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appearance</div>
            <div style={{ marginBottom: 8, fontSize: 11, color: theme.text.secondary }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {Object.entries(themes).map(([key, themeObj]) => (
                <div
                  key={key}
                  onClick={() => setTheme(key)}
                  style={{
                    cursor: 'pointer', padding: 12,
                    borderRadius: theme.radius.md,
                    border: `2px solid ${currentTheme === key ? theme.border.focus : theme.border.subtle}`,
                    background: currentTheme === key ? theme.bg.elevated : theme.bg.secondary,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: themeObj.bg.primary, border: `2px solid ${themeObj.border.normal}` }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.text.primary }}>{themeObj.name}</div>
                    {currentTheme === key && <div style={{ marginLeft: 'auto', fontSize: 10 }}>✓</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {themeObj.tagColors.slice(0, 6).map((color: string, i: number) => (
                      <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: color }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text.secondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
              <input type="checkbox" checked={showHidden} onChange={e => { setShowHidden(e.target.checked); toggle('showHidden', e.target.checked); }} />
              <div>
                <div style={{ fontSize: 12, color: theme.text.primary }}>Show hidden files</div>
                <div style={{ fontSize: 10, color: theme.text.tertiary }}>Show files beginning with a dot (.)</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text.secondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyboard Shortcuts</div>
            {[
              { label: 'Toggle Terminal', shortcut: '⌘ + `' },
              { label: 'Search', shortcut: '⌘ + F' },
              { label: 'Undo', shortcut: '⌘ + Z' },
              { label: 'Show/Hide App', shortcut: '⌘ + ⇧ + Space' },
              { label: 'New Tab', shortcut: '⌘ + T' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.border.subtle}`, fontSize: 12 }}>
                <span style={{ color: theme.text.secondary }}>{s.label}</span>
                <span style={{ fontFamily: 'monospace', color: theme.text.accent, background: theme.bg.tertiary, padding: '1px 8px', borderRadius: theme.radius.sm, fontSize: 11 }}>{s.shortcut}</span>
              </div>
            ))}
          </div>

          <div style={{ background: theme.bg.secondary, border: `1px solid ${theme.border.normal}`, borderRadius: theme.radius.md, padding: 12, fontSize: 11, color: theme.text.tertiary }}>
            <div style={{ color: theme.text.secondary, fontWeight: 600, marginBottom: 6 }}>About Pane</div>
            Version 1.0.0 · Built with Electron + React · SQLite for tags & logs
          </div>
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
