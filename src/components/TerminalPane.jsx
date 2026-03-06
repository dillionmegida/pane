import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const Wrap = styled.div`
  background: #0d0d0d;
  border-top: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: ${p => p.height}px;
  position: relative;
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  cursor: ns-resize;
  z-index: 10;
  &:hover { background: ${p => p.theme.accent.blue}; opacity: 0.5; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: #141414;
  border-bottom: 1px solid #222;
  height: 28px;
  flex-shrink: 0;
  gap: 8px;
`;

const Title = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: 11px;
  color: #666;
`;

const TermBtn = styled.button`
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  &:hover { background: #222; color: #999; }
`;

const XtermContainer = styled.div`
  flex: 1;
  padding: 6px 8px;
  overflow: hidden;
  .xterm { height: 100%; }
  .xterm-viewport { border-radius: 0; }
`;

export default function TerminalPane() {
  const { terminalHeight, setTerminalHeight, toggleTerminal, panes, activePane } = useStore();
  const xtermRef = useRef(null);
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  const activePath = panes.find(p => p.id === activePane)?.path || '~';

  useEffect(() => {
    let mounted = true;

    const initTerminal = async () => {
      try {
        // Dynamic import for xterm
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');

        if (!mounted || !containerRef.current) return;

        const term = new Terminal({
          theme: {
            background: '#0d0d0d',
            foreground: '#e8e8ed',
            cursor: '#4A9EFF',
            selectionBackground: '#1d3557',
            black: '#1a1a1a',
            red: '#f87171',
            green: '#34d399',
            yellow: '#fbbf24',
            blue: '#60a5fa',
            magenta: '#a78bfa',
            cyan: '#22d3ee',
            white: '#e8e8ed',
            brightBlack: '#444',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#fde68a',
            brightBlue: '#93c5fd',
            brightMagenta: '#c4b5fd',
            brightCyan: '#67e8f9',
            brightWhite: '#f8fafc',
          },
          fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
          fontSize: 12,
          lineHeight: 1.4,
          cursorStyle: 'bar',
          cursorBlink: true,
          scrollback: 2000,
          rows: 12,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Create PTY
        const r = await window.electronAPI.ptyCreate({ cwd: activePath });
        if (!r.success) {
          setError(`Terminal unavailable: ${r.error}`);
          return;
        }

        // Input -> PTY
        term.onData(data => window.electronAPI.ptyWrite(data));

        // PTY output -> Terminal
        window.electronAPI.onPtyData(data => {
          if (mounted && termRef.current) termRef.current.write(data);
        });

        // Resize
        term.onResize(({ cols, rows }) => window.electronAPI.ptyResize({ cols, rows }));

        setInitialized(true);
      } catch (err) {
        setError(`Terminal error: ${err.message}`);
      }
    };

    initTerminal();

    return () => {
      mounted = false;
      window.electronAPI.offPtyData();
      window.electronAPI.ptyDestroy();
      termRef.current?.dispose();
    };
  }, []);

  // CD when active folder changes
  useEffect(() => {
    if (initialized) {
      window.electronAPI.ptyCd(activePath);
    }
  }, [activePath, initialized]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;
    const observer = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit(); } catch {}
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [initialized]);

  // Drag resize
  const onMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const onMove = (me) => {
      const newH = Math.max(100, Math.min(600, startH - (me.clientY - startY)));
      setTerminalHeight(newH);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setTimeout(() => { try { fitAddonRef.current?.fit(); } catch {} }, 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Wrap height={terminalHeight}>
      <ResizeHandle onMouseDown={onMouseDown} />
      <Header>
        <Title>⌨️ Terminal — {activePath}</Title>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <TermBtn onClick={() => window.electronAPI.ptyCd(activePath)} title="CD to current folder">
            cd here
          </TermBtn>
          <TermBtn onClick={toggleTerminal} title="Close Terminal">✕</TermBtn>
        </div>
      </Header>
      {error ? (
        <div style={{ padding: 16, color: '#f87171', fontFamily: 'monospace', fontSize: 12 }}>
          {error}
          <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
            Make sure node-pty is installed: npm install node-pty
          </div>
        </div>
      ) : (
        <XtermContainer ref={containerRef} />
      )}
    </Wrap>
  );
}