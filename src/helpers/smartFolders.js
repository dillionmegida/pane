export const DEFAULT_EXCLUDED_DIRECTORIES = [
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

export const createFilterDefinitions = (fileSizeThresholdMB) => {
  const sizeLabel = fileSizeThresholdMB.toString();
  const sizeThresholdBytes = fileSizeThresholdMB * 1024 * 1024;
  const sevenDaysInMs = 7 * 86400000;
  const oneYearInMs = 365 * 86400000;

  return {
    large: {
      name: '⚖️ Large Files',
      icon: '⚖️',
      desc: `Files over ${sizeLabel}MB`,
      test: (file) => !file.isDirectory && file.size > sizeThresholdBytes
    },
    empty: {
      name: '📭 Empty Folders',
      icon: '📭',
      desc: 'Folders with no files',
      test: (file) => file.isDirectory && file.size === 0
    },
    old: {
      name: '🗓️ Old Files',
      icon: '🗓️',
      desc: 'Not accessed in over 1 year',
      test: (file) => !file.isDirectory && Date.now() - new Date(file.modified).getTime() > oneYearInMs
    }
  };
};

export const parseFileSizeInput = (inputValue) => {
  const normalized = inputValue.replace(',', '.');
  const parsed = parseFloat(normalized);

  if (!isNaN(parsed) && parsed >= 0) {
    return parsed;
  } else if (inputValue.trim() === '') {
    return 0;
  }
  return null;
};
