import type { FileItem } from '../types';

export const DEFAULT_EXCLUDED_DIRECTORIES: string[] = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'bower_components',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  'packages',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  'tmp',
  'temp',
  'venv',
  '.venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.tox',
  'site-packages',
  '.eggs',
  '*.egg-info',
  'vendor',
  'Pods'
];

export interface FilterDefinition {
  name: string;
  icon: string;
  desc: string;
  test: (file: FileItem) => boolean;
}

export interface FilterDefinitions {
  large: FilterDefinition;
  empty: FilterDefinition;
  old: FilterDefinition;
  [key: string]: FilterDefinition;
}

export const createFilterDefinitions = (fileSizeThresholdMB: number | string): FilterDefinitions => {
  const numericMB = typeof fileSizeThresholdMB === 'string' ? parseFloat(fileSizeThresholdMB) || 0 : fileSizeThresholdMB;
  const sizeLabel = numericMB.toString();
  const sizeThresholdBytes = numericMB * 1024 * 1024;
  const oneYearInMs = 365 * 86400000;

  return {
    large: {
      name: '⚖️ Large Files',
      icon: '⚖️',
      desc: `Files over ${sizeLabel}MB`,
      test: (file: FileItem) => !file.isDirectory && file.size > sizeThresholdBytes
    },
    empty: {
      name: '📭 Empty Folders',
      icon: '📭',
      desc: 'Folders with no files',
      test: (file: FileItem) => file.isDirectory && file.size === 0
    },
    old: {
      name: '🗓️ Old Files',
      icon: '🗓️',
      desc: 'Not accessed in over 1 year',
      test: (file: FileItem) => !file.isDirectory && Date.now() - new Date(file.modified || 0).getTime() > oneYearInMs
    }
  };
};

export const parseFileSizeInput = (inputValue: string): number | null => {
  const normalized = inputValue.replace(',', '.');
  const parsed = parseFloat(normalized);

  if (!isNaN(parsed) && parsed >= 0) {
    return parsed;
  } else if (inputValue.trim() === '') {
    return 0;
  }
  return null;
};
