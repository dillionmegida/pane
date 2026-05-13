export interface ThemeFont {
  mono: string;
  sans: string;
  size: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
  };
}

export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeBg {
  primary: string;
  secondary: string;
  tertiary: string;
  elevated: string;
  hover: string;
  active: string;
  selection: string;
}

export interface ThemeBorder {
  subtle: string;
  normal: string;
  strong: string;
  focus: string;
}

export interface ThemeText {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
}

export interface ThemeAccent {
  blue: string;
  purple: string;
  green: string;
  orange: string;
  red: string;
  yellow: string;
  pink: string;
  cyan: string;
}

export interface ThemeShadow {
  sm: string;
  md: string;
  lg: string;
}

export interface Theme {
  name: string;
  sidebar: string;
  titleBar: string;
  tabBar: string;
  toolbar: string;
  statusBar: string;
  font: ThemeFont;
  radius: ThemeRadius;
  bg: ThemeBg;
  border: ThemeBorder;
  text: ThemeText;
  accent: ThemeAccent;
  shadow: ThemeShadow;
  tagColors: string[];
}

const baseTheme = {
  sidebar: '220px',
  titleBar: '36px',
  tabBar: '38px',
  toolbar: '30px',
  statusBar: '24px',
  font: {
    mono: '"SF Mono", "Fira Code", monospace',
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    size: { xs: '10px', sm: '11px', base: '12px', md: '13px', lg: '14px' },
  },
  radius: { sm: '4px', md: '6px', lg: '10px', xl: '14px' },
};

export const themes: Record<string, Theme> = {
  dark: {
    ...baseTheme,
    name: 'Dark',
    bg: {
      primary: '#111113',
      secondary: '#18181b',
      tertiary: '#1e1e22',
      elevated: '#242428',
      hover: '#2a2a2f',
      active: '#313138',
      selection: '#1a3a5c',
    },
    border: {
      subtle: '#222226',
      normal: '#2e2e35',
      strong: '#3d3d46',
      focus: '#4A9EFF',
    },
    text: {
      primary: '#e8e8ed',
      secondary: '#9898a8',
      tertiary: '#5a5a6b',
      accent: '#4A9EFF',
      warning: '#f5a623',
      error: '#ff4d4f',
      success: '#34d399',
    },
    accent: {
      blue: '#4A9EFF',
      purple: '#a78bfa',
      green: '#34d399',
      orange: '#fb923c',
      red: '#f87171',
      yellow: '#fbbf24',
      pink: '#f472b6',
      cyan: '#22d3ee',
    },
    shadow: {
      sm: '0 1px 3px rgba(0,0,0,0.4)',
      md: '0 4px 12px rgba(0,0,0,0.5)',
      lg: '0 8px 24px rgba(0,0,0,0.6)',
    },
    tagColors: [
      '#4A9EFF','#a78bfa','#34d399','#fb923c',
      '#f87171','#fbbf24','#f472b6','#22d3ee',
      '#6366f1','#10b981','#ef4444','#8b5cf6',
    ],
  },
  
  classicLight: {
    ...baseTheme,
    name: 'Classic Light',
    bg: {
      primary: '#ffffff',
      secondary: '#f5f5f7',
      tertiary: '#e9e9eb',
      elevated: '#f0f0f3',
      hover: '#e2e2e6',
      active: '#d1d1d9',
      selection: '#c3e1ff',
    },
    border: {
      subtle: '#e0e0e3',
      normal: '#d1d1d9',
      strong: '#b1b1ba',
      focus: '#007acc',
    },
    text: {
      primary: '#111113',
      secondary: '#4a4a4f',
      tertiary: '#6b6b6b',
      accent: '#007acc',
      warning: '#f5a623',
      error: '#ff3b30',
      success: '#34c759',
    },
    accent: {
      blue: '#007acc',
      purple: '#8b5cf6',
      green: '#34c759',
      orange: '#fb8500',
      red: '#ff3b30',
      yellow: '#fbbf24',
      pink: '#f472b6',
      cyan: '#22d3ee',
    },
    shadow: {
      sm: '0 1px 3px rgba(0,0,0,0.1)',
      md: '0 4px 12px rgba(0,0,0,0.12)',
      lg: '0 8px 24px rgba(0,0,0,0.14)',
    },
    tagColors: [
      '#007acc','#8b5cf6','#34c759','#fb8500',
      '#ff3b30','#fbbf24','#f472b6','#22d3ee',
      '#6366f1','#10b981','#ef4444','#8b5cf6',
    ],
  },

  warmLight: {
    ...baseTheme,
    name: 'Warm Light',
    bg: {
      primary: '#fefdfb',
      secondary: '#f9f6f1',
      tertiary: '#f0ebe3',
      elevated: '#f5f1ea',
      hover: '#ebe5db',
      active: '#ddd5c8',
      selection: '#ffecd1',
    },
    border: {
      subtle: '#e8e0d5',
      normal: '#d9cfc0',
      strong: '#c4b8a5',
      focus: '#d97706',
    },
    text: {
      primary: '#1a1410',
      secondary: '#5a4f42',
      tertiary: '#7a6f5f',
      accent: '#d97706',
      warning: '#ea580c',
      error: '#dc2626',
      success: '#16a34a',
    },
    accent: {
      blue: '#0284c7',
      purple: '#9333ea',
      green: '#16a34a',
      orange: '#ea580c',
      red: '#dc2626',
      yellow: '#ca8a04',
      pink: '#db2777',
      cyan: '#0891b2',
    },
    shadow: {
      sm: '0 1px 3px rgba(139,92,31,0.08)',
      md: '0 4px 12px rgba(139,92,31,0.1)',
      lg: '0 8px 24px rgba(139,92,31,0.12)',
    },
    tagColors: [
      '#d97706','#9333ea','#16a34a','#ea580c',
      '#dc2626','#ca8a04','#db2777','#0891b2',
      '#6366f1','#059669','#ef4444','#a855f7',
    ],
  },

  coolLight: {
    ...baseTheme,
    name: 'Cool Light',
    bg: {
      primary: '#fafbfc',
      secondary: '#f3f5f8',
      tertiary: '#e8ecf1',
      elevated: '#eef2f7',
      hover: '#dfe5ed',
      active: '#cdd5e0',
      selection: '#d1e7ff',
    },
    border: {
      subtle: '#dce3eb',
      normal: '#cbd5e1',
      strong: '#b0bcc9',
      focus: '#0369a1',
    },
    text: {
      primary: '#0f1419',
      secondary: '#3e4c59',
      tertiary: '#5f6b7a',
      accent: '#0369a1',
      warning: '#ea580c',
      error: '#dc2626',
      success: '#059669',
    },
    accent: {
      blue: '#0369a1',
      purple: '#7c3aed',
      green: '#059669',
      orange: '#ea580c',
      red: '#dc2626',
      yellow: '#d97706',
      pink: '#db2777',
      cyan: '#0891b2',
    },
    shadow: {
      sm: '0 1px 3px rgba(15,23,42,0.08)',
      md: '0 4px 12px rgba(15,23,42,0.1)',
      lg: '0 8px 24px rgba(15,23,42,0.12)',
    },
    tagColors: [
      '#0369a1','#7c3aed','#059669','#ea580c',
      '#dc2626','#d97706','#db2777','#0891b2',
      '#6366f1','#10b981','#ef4444','#8b5cf6',
    ],
  },
};

export const theme: Theme = themes.classicLight;

export const TAG_COLORS: string[] = theme.tagColors;

export function getTagColors(themeName: string): string[] {
  return themes[themeName]?.tagColors || themes.classicLight.tagColors;
}
