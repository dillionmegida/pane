import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const Wrap = styled.div<{ height: number }>`
  background: ${p => p.theme.bg.secondary};
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
  background: ${p => p.theme.bg.tertiary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  height: 28px;
  flex-shrink: 0;
  gap: 8px;
`;

const Title = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
`;

const TermBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.secondary}; }
`;

const XtermContainer = styled.div`
  flex: 1;
  padding: 6px 8px;
  overflow: hidden;
  .xterm { height: 100%; }
  .xterm-viewport { border-radius: 0; }
`;

export default function TerminalPane(): React.ReactElement {
  const { terminalHeight, setTerminalHeight, toggleTerminal, panes, activePane } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePath = panes.find((p: any) => p.id === activePane)?.path || '~';

  useEffect(() => {
    let mounted = true;

    const initTerminal = async () => {
      try {
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

        const r = await (window as any).electronAPI.ptyCreate({ cwd: activePath });
        if (!r.success) {
          setError(`Terminal unavailable: ${r.error}`);
          return;
        }

        term.onData((data: string) => (window as any).electronAPI.ptyWrite(data));
        (window as any).electronAPI.onPtyData((data: string) => {
          if (mounted && termRef.current) termRef.current.write(data);
        });
        term.onResize(({ cols, rows }: { cols: number; rows: number }) =>
          (window as any).electronAPI.ptyResize({ cols, rows })
        );

        setInitialized(true);
      } catch (err: any) {
        setError(`Terminal error: ${err.message}`);
      }
    };

    initTerminal();

    return () => {
      mounted = false;
      (window as any).electronAPI.offPtyData();
      (window as any).electronAPI.ptyDestroy();
      termRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (initialized) {
      (window as any).electronAPI.ptyCd(activePath);
    }
  }, [activePath, initialized]);

  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;
    const observer = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit(); } catch {}
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [initialized]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const onMove = (me: MouseEvent) => {
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
          <TermBtn onClick={() => (window as any).electronAPI.ptyCd(activePath)} title="CD to current folder">
            cd here
          </TermBtn>
          <TermBtn onClick={toggleTerminal} title="Close Terminal">✕</TermBtn>
        </div>
      </Header>
      {error ? (
        <div style={{ padding: 16, color: 'inherit', fontFamily: 'monospace', fontSize: 12 }}>
          {error}
          <div style={{ marginTop: 8, opacity: 0.6, fontSize: 11 }}>
            Make sure node-pty is installed: npm install node-pty
          </div>
        </div>
      ) : (
        <XtermContainer ref={containerRef} />
      )}
    </Wrap>
  );
}
