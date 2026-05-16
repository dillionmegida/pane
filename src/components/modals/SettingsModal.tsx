import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import { themes } from '../../theme';
import { useStore } from '../../store/index';

const SettingsSection = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${p => p.theme.text.secondary};
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SubLabel = styled.div`
  margin-bottom: 8px;
  font-size: 11px;
  color: ${p => p.theme.text.secondary};
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const ThemeCard = styled.div<{ $active: boolean }>`
  cursor: pointer;
  padding: 12px;
  border-radius: ${p => p.theme.radius.md};
  border: 2px solid ${p => p.$active ? p.theme.border.focus : p.theme.border.subtle};
  background: ${p => p.$active ? p.theme.bg.elevated : p.theme.bg.secondary};
  transition: all 0.15s ease;
`;

const ThemeCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const ThemeDot = styled.div<{ bg: string; borderColor: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${p => p.bg};
  border: 2px solid ${p => p.borderColor};
`;

const ThemeName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
`;

const ThemeCheck = styled.div`
  margin-left: auto;
  font-size: 10px;
`;

const ColorSwatches = styled.div`
  display: flex;
  gap: 3px;
`;

const ColorSwatch = styled.div<{ bg: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${p => p.bg};
`;

const SettingLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 0;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;

const SettingLabelTitle = styled.div`
  font-size: 12px;
  color: ${p => p.theme.text.primary};
`;

const SettingLabelDesc = styled.div`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
`;

const ShortcutRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  font-size: 12px;
`;

const ShortcutLabel = styled.span`
  color: ${p => p.theme.text.secondary};
`;

const ShortcutKey = styled.span`
  font-family: monospace;
  color: ${p => p.theme.text.accent};
  background: ${p => p.theme.bg.tertiary};
  padding: 1px 8px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 11px;
`;

const AboutBox = styled.div`
  background: ${p => p.theme.bg.secondary};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  padding: 12px;
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
`;

const AboutTitle = styled.div`
  color: ${p => p.theme.text.secondary};
  font-weight: 600;
  margin-bottom: 6px;
`;

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
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
          <SettingsSection>
            <SectionTitle>Appearance</SectionTitle>
            <SubLabel>Theme</SubLabel>
            <ThemeGrid>
              {Object.entries(themes).map(([key, themeObj]) => (
                <ThemeCard
                  key={key}
                  $active={currentTheme === key}
                  onClick={() => setTheme(key)}
                >
                  <ThemeCardHeader>
                    <ThemeDot bg={themeObj.bg.primary} borderColor={themeObj.border.normal} />
                    <ThemeName>{themeObj.name}</ThemeName>
                    {currentTheme === key && <ThemeCheck>✓</ThemeCheck>}
                  </ThemeCardHeader>
                  <ColorSwatches>
                    {themeObj.tagColors.slice(0, 6).map((color: string, i: number) => (
                      <ColorSwatch key={i} bg={color} />
                    ))}
                  </ColorSwatches>
                </ThemeCard>
              ))}
            </ThemeGrid>
          </SettingsSection>

          <SettingsSection>
            <SectionTitle>General</SectionTitle>
            <SettingLabel>
              <input type="checkbox" checked={showHidden} onChange={e => { setShowHidden(e.target.checked); toggle('showHidden', e.target.checked); }} />
              <div>
                <SettingLabelTitle>Show hidden files</SettingLabelTitle>
                <SettingLabelDesc>Show files beginning with a dot (.)</SettingLabelDesc>
              </div>
            </SettingLabel>
          </SettingsSection>

          <SettingsSection>
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            {[
              { label: 'Toggle Terminal', shortcut: '⌘ + `' },
              { label: 'Search', shortcut: '⌘ + F' },
              { label: 'Undo', shortcut: '⌘ + Z' },
              { label: 'Show/Hide App', shortcut: '⌘ + ⇧ + Space' },
              { label: 'New Tab', shortcut: '⌘ + T' },
            ].map(s => (
              <ShortcutRow key={s.label}>
                <ShortcutLabel>{s.label}</ShortcutLabel>
                <ShortcutKey>{s.shortcut}</ShortcutKey>
              </ShortcutRow>
            ))}
          </SettingsSection>

          <AboutBox>
            <AboutTitle>About Pane</AboutTitle>
            Version 1.0.0 · Built with Electron + React · SQLite for tags & logs
          </AboutBox>
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
