import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { themes } from './theme';
import { useStore } from './store/index';
import App from './App';
import 'xterm/css/xterm.css';

function ThemedApp() {
  const currentTheme = useStore(state => state.currentTheme);
  const theme = themes[currentTheme] || themes.classicLight;

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No #root element found');
const root = createRoot(rootEl);
root.render(<ThemedApp />);
