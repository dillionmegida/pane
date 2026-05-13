import React from 'react';

interface IconBase {
  color: string;
  bg: string | null;
  label: string;
  viewBox?: string;
  shape: React.ReactNode;
}

interface IconAlias {
  alias: string;
  color?: string;
  bg?: string | null;
  label: string;
}

type IconDef = IconBase | IconAlias;

function isAlias(def: IconDef): def is IconAlias {
  return 'alias' in def;
}

const iconDefs: Record<string, IconDef> = {
  // --- Images ---
  jpg: {
    color: '#E8844A',
    bg: '#FDF0E8',
    label: 'JPG',
    shape: (
      <g>
        <rect x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" opacity="0.15" />
        <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.5" />
        <path d="M5 16l4-4 3 3 2-2 5 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  jpeg: { alias: 'jpg', label: 'JPEG' },
  png: { alias: 'jpg', color: '#5B8DD9', bg: '#EBF1FB', label: 'PNG' },
  gif: { alias: 'jpg', color: '#A855C8', bg: '#F5EAFB', label: 'GIF' },
  webp: { alias: 'jpg', color: '#38A169', bg: '#E8F6EF', label: 'WEBP' },
  svg: {
    color: '#F59E0B',
    bg: '#FEF9E8',
    label: 'SVG',
    shape: (
      <g>
        <path d="M12 5l7 7-7 7-7-7z" fill="currentColor" opacity="0.2" />
        <path d="M12 5l7 7-7 7-7-7z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
      </g>
    ),
  },
  ico: { alias: 'svg', color: '#8B7355', bg: '#F5F0E8', label: 'ICO' },

  // --- Video ---
  mp4: {
    color: '#EF4444',
    bg: '#FEF0F0',
    label: 'MP4',
    shape: (
      <g>
        <rect x="4" y="6" width="11" height="12" rx="1.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.3" />
        <path d="M15 10l5-3v10l-5-3V10z" fill="currentColor" opacity="0.7" />
      </g>
    ),
  },
  mov: { alias: 'mp4', color: '#DC6B3A', bg: '#FDF2EC', label: 'MOV' },
  m4v: { alias: 'mp4', color: '#C0392B', bg: '#FDECEA', label: 'M4V' },
  avi: { alias: 'mp4', color: '#9B2335', bg: '#FAEAEC', label: 'AVI' },
  mkv: { alias: 'mp4', color: '#7B3F96', bg: '#F3EAFA', label: 'MKV' },
  webm: { alias: 'mp4', color: '#E84393', bg: '#FDE9F3', label: 'WEBM' },

  // --- Audio ---
  mp3: {
    color: '#8B5CF6',
    bg: '#F3EDFE',
    label: 'MP3',
    shape: (
      <g>
        <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.35" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  wav: { alias: 'mp3', color: '#6D28D9', bg: '#EDE9FE', label: 'WAV' },
  flac: { alias: 'mp3', color: '#5B21B6', bg: '#EDE9FE', label: 'FLAC' },
  aac: { alias: 'mp3', color: '#4C1D95', bg: '#EDE9FE', label: 'AAC' },
  m4a: { alias: 'mp3', color: '#7C3AED', bg: '#F5F3FF', label: 'M4A' },

  // --- Code ---
  js: {
    color: '#D4A017',
    bg: '#FFFBEB',
    label: 'JS',
    shape: (
      <g>
        <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity="0.15" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="monospace">JS</text>
      </g>
    ),
  },
  jsx: { alias: 'js', color: '#61DAFB', bg: '#E8FAFF', label: 'JSX' },
  ts: {
    color: '#3178C6',
    bg: '#3178C6',
    label: 'TS',
    shape: (
      <g transform="translate(24,0) scale(-1,1)">
        <path d="M 15.99 33.37 L 20.74 33.37 L 25.49 33.37 L 25.49 19.87 L 25.49 6.37 L 28.85 6.37 L 32.21 6.37 L 32.21 19.87 L 32.21 33.37 L 36.96 33.37 L 41.71 33.37 L 41.69 36.36 L 41.66 39.34 L 28.9 39.37 C 21.89 39.39 16.11 39.36 16.07 39.32 C 16.03 39.28 15.99 37.93 15.99 36.3 Z" fill="white" />
        <path d="M 58.83 39.41 C 57.57 39.72 54.58 39.81 53.29 39.57 C 49.33 38.82 46.58 36.28 45.8 32.64 C 45.58 31.6 45.65 29.01 45.93 27.98 C 46.27 26.74 47.08 25.26 47.94 24.33 C 49.42 22.73 51.04 21.73 54.81 20.1 C 58.1 18.68 59.26 17.99 59.83 17.18 C 60.27 16.55 60.37 16.18 60.37 15.33 C 60.37 14.39 60.09 13.75 59.42 13.14 C 57.84 11.73 54.65 11.55 52.32 12.78 C 51.51 13.21 50.16 14.5 49.55 15.43 L 49.11 16.08 L 47.01 14.87 C 45.85 14.19 44.62 13.49 44.3 13.3 C 43.96 13.11 43.66 12.92 43.63 12.87 C 43.55 12.73 44.85 10.8 45.53 10.06 C 47.24 8.16 50.02 6.71 52.95 6.19 C 54.3 5.94 57.26 5.9 58.52 6.13 C 62.56 6.81 65.43 8.88 66.59 11.91 C 67.65 14.7 67.3 18.46 65.75 20.81 C 64.36 22.92 62.12 24.4 56.89 26.65 C 54.05 27.88 53.15 28.48 52.66 29.49 C 52.43 29.95 52.35 30.29 52.35 30.86 C 52.34 32.79 53.77 33.95 55.98 33.8 C 57.48 33.7 58.47 33.1 59.41 31.74 C 59.72 31.27 60 30.97 60.07 31.02 C 60.13 31.06 61.26 31.74 62.57 32.53 C 64.56 33.72 64.99 33.99 64.99 34.08 C 64.99 34.34 63.99 35.74 63.39 36.38 C 62.1 37.72 60.68 38.94 58.83 39.41 Z" fill="white" />
      </g>
    ),
  },
  tsx: { alias: 'ts', color: '#2563EB', bg: '#EBF3FF', label: 'TSX' },
  py: {
    color: '#387eb8',
    bg: null,
    label: 'PY',
    viewBox: '0 0 32 32',
    shape: (
      <g>
        <defs>
          <linearGradient id="pygrad-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#387eb8" />
            <stop offset="1" stopColor="#366994" />
          </linearGradient>
          <linearGradient id="pygrad-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe052" />
            <stop offset="1" stopColor="#ffc331" />
          </linearGradient>
        </defs>
        <path d="M15.885,2.1c-7.1,0-6.651,3.07-6.651,3.07V8.36h6.752v1H6.545S2,8.8,2,16.005s4.013,6.912,4.013,6.912H8.33V19.556s-.13-4.013,3.9-4.013h6.762s3.772.06,3.772-3.652V5.8s.572-3.712-6.842-3.712h0ZM12.153,4.237a1.214,1.214,0,1,1-1.183,1.244v-.02a1.214,1.214,0,0,1,1.214-1.214h0Z" fill="url(#pygrad-a)" />
        <path d="M16.085,29.91c7.1,0,6.651-3.08,6.651-3.08V23.65H15.985v-1h9.47S30,23.158,30,15.995s-4.013-6.912-4.013-6.912H23.64V12.4s.13,4.013-3.9,4.013H12.975S9.2,16.356,9.2,20.068V26.2s-.572,3.712,6.842,3.712h.04Zm3.732-2.147A1.214,1.214,0,1,1,21,26.519v.03a1.214,1.214,0,0,1-1.214,1.214h.03Z" fill="url(#pygrad-b)" />
      </g>
    ),
  },
  rb: {
    color: '#CC342D',
    bg: '#FDECEA',
    label: 'RB',
    shape: (
      <g>
        <ellipse cx="12" cy="12" rx="7" ry="5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.3" />
        <ellipse cx="12" cy="12" rx="3" ry="2" fill="currentColor" opacity="0.5" />
      </g>
    ),
  },
  go: {
    color: '#00ADD8',
    bg: '#E8F8FC',
    label: 'GO',
    shape: (
      <g>
        <circle cx="9" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="15" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="12" y1="8.5" x2="12" y2="15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="9" cy="12" r="1.2" fill="currentColor" opacity="0.5" />
        <circle cx="15" cy="12" r="1.2" fill="currentColor" opacity="0.5" />
      </g>
    ),
  },
  rs: {
    color: '#CE422B',
    bg: '#FDEFEC',
    label: 'RS',
    shape: (
      <g>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 12 Q12 8 15 12 Q12 16 9 12z" fill="currentColor" opacity="0.4" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </g>
    ),
  },
  java: {
    color: '#E76F00',
    bg: '#FEF3E8',
    label: 'JAVA',
    shape: (
      <g>
        <path d="M12 4 Q15 8 12 11 Q9 8 12 4z" fill="currentColor" opacity="0.5" />
        <path d="M9 12 Q12 16 15 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M8 16 Q12 20 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
  },

  // --- Web ---
  html: {
    color: '#E34C26',
    bg: '#FEF0EC',
    label: 'HTML',
    shape: (
      <g>
        <path d="M5 5l1.5 14L12 21l5.5-2L19 5H5z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 9h6l-.5 5-2.5.7-2.5-.7-.2-2h1.5l.1 1 1.1.3 1.1-.3.2-2.5H8.7" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  css: {
    color: '#264DE4',
    bg: '#EBF0FE',
    label: 'CSS',
    shape: (
      <g>
        <path d="M5 5l1.5 14L12 21l5.5-2L19 5H5z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 9h6.5l-.3 2.5H9.5l.2 1.5h5l-.5 4-2.2.6-2.2-.6-.1-1.5h1.5l.1.7 1.1.3 1-.3.2-2H9" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  json: {
    color: '#4B9E44',
    bg: '#EBF7EA',
    label: 'JSON',
    shape: (
      <g>
        <path d="M8 6C7 6 6 7 6 8v2.5C6 11.3 5.3 12 4.5 12 5.3 12 6 12.7 6 13.5V16c0 1 1 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M16 6C17 6 18 7 18 8v2.5c0 .8.7 1.5 1.5 1.5-.8 0-1.5.7-1.5 1.5V16c0 1-1 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10.5" cy="12" r="1" fill="currentColor" />
        <circle cx="13.5" cy="12" r="1" fill="currentColor" />
      </g>
    ),
  },

  // --- Docs ---
  pdf: {
    color: '#D93025',
    bg: '#FDECEA',
    label: 'PDF',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M14 17 h4 v4 h-4 z" fill="currentColor" opacity="0" />
        <path d="M14 18l2 2 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  doc: {
    color: '#2B579A',
    bg: '#EBF1FB',
    label: 'DOC',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
  },
  docx: { alias: 'doc', label: 'DOCX' },
  xls: {
    color: '#1D6F42',
    bg: '#E8F5EE',
    label: 'XLS',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M8 7l2.5 2.5M10.5 7L8 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  xlsx: { alias: 'xls', label: 'XLSX' },
  ppt: {
    color: '#C43E1C',
    bg: '#FDEFEB',
    label: 'PPT',
    shape: (
      <g>
        <rect x="3" y="5" width="18" height="13" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="7" y="8.5" width="5" height="3.5" rx="1" fill="currentColor" opacity="0.4" />
      </g>
    ),
  },
  pptx: { alias: 'ppt', label: 'PPTX' },

  // --- Text ---
  txt: {
    color: '#6B7280',
    bg: '#F3F4F6',
    label: 'TXT',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="11.5" x2="16" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="15" x2="14" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
  },
  md: {
    color: '#374151',
    bg: '#F1F3F4',
    label: 'MD',
    shape: (
      <g>
        <rect x="3" y="6" width="18" height="12" rx="1.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 15V9l3 4 3-4v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 15V9l3 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  markdown: { alias: 'md', label: 'MD' },
  yaml: {
    color: '#CF222E',
    bg: '#FFF0F1',
    label: 'YAML',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="8" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="14" cy="8" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="16" cy="11" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="14" cy="14" r="1" fill="currentColor" opacity="0.6" />
      </g>
    ),
  },
  yml: { alias: 'yaml', label: 'YML' },
  xml: {
    color: '#9CA3AF',
    bg: '#F3F4F6',
    label: 'XML',
    shape: (
      <g>
        <path d="M7 8L3 12l4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="14" y1="6" x2="10" y2="18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      </g>
    ),
  },
  csv: {
    color: '#059669',
    bg: '#E8F8F2',
    label: 'CSV',
    shape: (
      <g>
        <rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.3" />
        <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="10" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="16" y1="4" x2="16" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </g>
    ),
  },

  // --- Archives ---
  zip: {
    color: '#D97706',
    bg: '#FEF3C7',
    label: 'ZIP',
    shape: (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 2" opacity="0.5" />
        <rect x="9.5" y="14" width="5" height="4" rx="1" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1" />
      </g>
    ),
  },
  tar: { alias: 'zip', color: '#B45309', bg: '#FEF3C7', label: 'TAR' },
  gz: { alias: 'zip', color: '#92400E', bg: '#FEF3C7', label: 'GZ' },
  rar: { alias: 'zip', color: '#7C3AED', bg: '#F5F3FF', label: 'RAR' },
  '7z': { alias: 'zip', color: '#4338CA', bg: '#EEF2FF', label: '7Z' },

  // --- System ---
  sh: {
    color: '#1F2937',
    bg: '#F1F3F4',
    label: 'SH',
    shape: (
      <g>
        <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 9l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  bash: { alias: 'sh', label: 'BASH' },
  zsh: { alias: 'sh', label: 'ZSH' },

  // --- Fonts ---
  ttf: {
    color: '#7C3AED',
    bg: '#F5F3FF',
    label: 'TTF',
    shape: (
      <g>
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <text x="12" y="19" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.35" fontFamily="serif">T</text>
      </g>
    ),
  },
  otf: { alias: 'ttf', color: '#6D28D9', bg: '#EDE9FE', label: 'OTF' },
  woff: { alias: 'ttf', color: '#5B21B6', bg: '#EDE9FE', label: 'WOFF' },
  woff2: { alias: 'ttf', color: '#4C1D95', bg: '#EDE9FE', label: 'WOFF2' },

  // --- App ---
  app: {
    color: '#2563EB',
    bg: '#EBF3FF',
    label: 'APP',
    shape: (
      <g>
        <rect x="5" y="5" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="13" y="5" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="5" y="13" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="13" y="13" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
      </g>
    ),
  },
};

function resolveIcon(ext: string): IconBase | null {
  const raw = iconDefs[ext];
  if (!raw) return null;
  if (isAlias(raw)) {
    const base = iconDefs[raw.alias] as IconBase;
    return {
      color: raw.color ?? base.color,
      bg: raw.bg !== undefined ? raw.bg : base.bg,
      label: raw.label,
      shape: base.shape,
      viewBox: base.viewBox,
    };
  }
  return raw;
}

interface FileIconProps {
  ext: string;
  size?: number;
  showLabel?: boolean;
  labelSize?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function FileIcon({ ext, size = 32, showLabel = false, labelSize, style, className }: FileIconProps) {
  const icon = resolveIcon(ext.toLowerCase());
  if (!icon) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={style}
        className={className}
      >
        <rect x="5" y="3" width="14" height="18" rx="1.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.3" />
        <text x="12" y="14" textAnchor="middle" fontSize="6" fill="#6B7280" fontFamily="monospace" fontWeight="700">
          {ext.toUpperCase().slice(0, 4)}
        </text>
      </svg>
    );
  }

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...style }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox={icon.viewBox ?? '0 0 24 24'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`${icon.label} file`}
      >
        {icon.bg && <rect width="24" height="24" rx="5" fill={icon.bg} />}
        <g color={icon.color}>{icon.shape}</g>
      </svg>
      {showLabel && (
        <span
          style={{
            fontSize: labelSize ?? Math.max(9, size * 0.28),
            color: icon.color,
            fontWeight: 600,
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
          }}
        >
          {icon.label}
        </span>
      )}
    </div>
  );
}

interface FileIconGridProps {
  size?: number;
  showLabel?: boolean;
}

export function FileIconGrid({ size = 40, showLabel = true }: FileIconGridProps) {
  const allExts = Object.keys(iconDefs).filter(k => !isAlias(iconDefs[k]));
  const withAlias = Object.entries(iconDefs)
    .filter(([, v]) => isAlias(v))
    .map(([k]) => k);
  const all = [...allExts, ...withAlias];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16 }}>
      {all.map(ext => (
        <FileIcon key={ext} ext={ext} size={size} showLabel={showLabel} />
      ))}
    </div>
  );
}

export default FileIcon;
