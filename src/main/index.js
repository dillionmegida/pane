const { app, BrowserWindow, ipcMain, globalShortcut, Menu, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const crypto = require('crypto');
const os = require('os');

// Set app name
app.name = 'Pane';

// Force dark mode
nativeTheme.themeSource = 'dark';

let mainWindow = null;
let db = null;
let store = null;
let chokidarWatchers = new Map();

// ─── Database & Store Init ───────────────────────────────────────────────────
function initDB() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'pane.db');
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        color TEXT DEFAULT '#4A9EFF',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_path, tag_name)
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        action_type TEXT NOT NULL,
        description TEXT,
        files_json TEXT,
        source TEXT,
        destination TEXT
      );

      CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        conditions_json TEXT NOT NULL,
        actions_json TEXT NOT NULL,
        watch_path TEXT,
        schedule_interval INTEGER DEFAULT 0,
        last_run DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS undo_stack (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        undone INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS global_tags (
        tag_name TEXT PRIMARY KEY,
        color TEXT NOT NULL DEFAULT '#4A9EFF',
        sort_order INTEGER DEFAULT 999
      );

      CREATE INDEX IF NOT EXISTS idx_tags_path ON tags(file_path);
      CREATE INDEX IF NOT EXISTS idx_log_timestamp ON activity_log(timestamp DESC);
    `);

    // Seed default tags if none exist
    const existingGlobalTags = db.prepare('SELECT COUNT(*) as cnt FROM global_tags').get();
    if (existingGlobalTags.cnt === 0) {
      const defaults = [
        { name: 'Red',    color: '#f87171', order: 0 },
        { name: 'Orange', color: '#fb923c', order: 1 },
        { name: 'Yellow', color: '#fbbf24', order: 2 },
        { name: 'Green',  color: '#34d399', order: 3 },
        { name: 'Blue',   color: '#4A9EFF', order: 4 },
        { name: 'Purple', color: '#a78bfa', order: 5 },
        { name: 'Grey',   color: '#9ca3af', order: 6 },
      ];
      const insert = db.prepare('INSERT OR IGNORE INTO global_tags (tag_name, color, sort_order) VALUES (?, ?, ?)');
      for (const t of defaults) insert.run(t.name, t.color, t.order);
    }

    return true;
  } catch (err) {
    console.error('DB init error:', err.message);
    return false;
  }
}

function initStore() {
  try {
    const Store = require('electron-store');
    store = new Store({
      defaults: {
        bookmarks: [
          { name: 'Applications', path: '/Applications', icon: 'applications' },
          { name: 'Desktop', path: path.join(os.homedir(), 'Desktop'), icon: 'desktop' },
          { name: 'Documents', path: path.join(os.homedir(), 'Documents'), icon: 'documents' },
          { name: 'Downloads', path: path.join(os.homedir(), 'Downloads'), icon: 'downloads' },
        ],
        shortcuts: {},
        windowBounds: { width: 1400, height: 900 },
        splitRatio: 0.5,
        showHidden: false,
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'list',
      },
    });
  } catch (err) {
    console.error('Store init error:', err.message);
    store = { get: (k, d) => d, set: () => {}, store: {} };
  }
}

// ─── Window ──────────────────────────────────────────────────────────────────
function createWindow() {
  const bounds = store ? store.get('windowBounds', { width: 1400, height: 900 }) : { width: 1400, height: 900 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: false,
      sandbox: false,
      spellcheck: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../../dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('resize', () => {
    if (store) store.set('windowBounds', mainWindow.getBounds());
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Remove default menu
  Menu.setApplicationMenu(null);
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initStore();
  initDB();
  createWindow();
  registerGlobalShortcuts();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  chokidarWatchers.forEach(w => w.close());
});

// ─── Global Shortcuts ─────────────────────────────────────────────────────────
function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!mainWindow) { createWindow(); return; }
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── IPC: File System ─────────────────────────────────────────────────────────
ipcMain.handle('fs:readdir', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = [];
    const batchSize = 32; // Bound concurrency for stat calls

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(async (entry) => {

        const fullPath = path.join(dirPath, entry.name);
        try {
          const isSymlink = entry.isSymbolicLink();
          const stat = await fs.promises.lstat(fullPath);
          let symlinkTarget = null;
          
          if (isSymlink) {
            try {
              symlinkTarget = await fs.promises.readlink(fullPath);
            } catch (e) {
              // Ignore errors reading symlink target
            }
          }
          
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isSymlink,
            symlinkTarget,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            created: stat.birthtime.toISOString(),
            accessed: stat.atime.toISOString(),
            extension: path.extname(entry.name).slice(1).toLowerCase(),
            permissions: {
              mode: stat.mode,
              octal: (stat.mode & 0o777).toString(8).padStart(3, '0'),
              readable: !!(stat.mode & fs.constants.S_IRUSR),
              writable: !!(stat.mode & fs.constants.S_IWUSR),
              executable: !!(stat.mode & fs.constants.S_IXUSR),
            },
          };
        } catch (e) {
          return null; // Skip files we can't stat
        }
      }));

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          files.push(result.value);
        }
      });
    }

    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:stat', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return { success: true, stat: { ...stat, mtime: stat.mtime.toISOString(), birthtime: stat.birthtime.toISOString() } };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:readFile', async (event, filePath, encoding = 'utf8') => {
  try {
    const content = fs.readFileSync(filePath, encoding);
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:readBinaryFile', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { success: true, data: buffer.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    logActivity('edit', `Edited file: ${path.basename(filePath)}`, [filePath]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
  try {
    fsExtra.mkdirpSync(dirPath);
    logActivity('mkdir', `Created folder: ${path.basename(dirPath)}`, [dirPath]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
  try {
    pushUndo('rename', { oldPath, newPath });
    fs.renameSync(oldPath, newPath);
    logActivity('rename', `Renamed: ${path.basename(oldPath)} → ${path.basename(newPath)}`, [oldPath], oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:copy', async (event, srcPath, destPath) => {
  try {
    pushUndo('copy', { srcPath, destPath });
    fsExtra.copySync(srcPath, destPath);
    logActivity('copy', `Copied: ${path.basename(srcPath)}`, [srcPath], srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:move', async (event, srcPath, destPath) => {
  try {
    pushUndo('move', { srcPath, destPath });
    fsExtra.moveSync(srcPath, destPath, { overwrite: false });
    logActivity('move', `Moved: ${path.basename(srcPath)}`, [srcPath], srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:delete', async (event, filePath) => {
  try {
    pushUndo('delete', { filePath, tempPath: path.join(os.tmpdir(), `fp_trash_${Date.now()}_${path.basename(filePath)}`) });
    shell.trashItem(filePath);
    logActivity('delete', `Deleted: ${path.basename(filePath)}`, [filePath]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:batchRename', async (event, renames) => {
  const results = [];
  try {
    for (const { oldPath, newPath } of renames) {
      try {
        pushUndo('rename', { oldPath, newPath });
        fs.renameSync(oldPath, newPath);
        results.push({ oldPath, newPath, success: true });
      } catch (e) {
        results.push({ oldPath, newPath, success: false, error: e.message });
      }
    }
    logActivity('batch_rename', `Batch renamed ${results.filter(r => r.success).length} files`, renames.map(r => r.oldPath));
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:chmod', async (event, filePath, mode) => {
  try {
    fs.chmodSync(filePath, parseInt(mode, 8));
    logActivity('chmod', `Changed permissions: ${path.basename(filePath)} → ${mode}`, [filePath]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:getHomeDir', async () => os.homedir());
ipcMain.handle('fs:getDrives', async () => {
  return [{ name: 'Macintosh HD', path: '/', type: 'disk' }];
});

// ─── IPC: Search ─────────────────────────────────────────────────────────────
let activeSearch = null;
let activeGrepProcess = null;

const SEARCH_DEFAULT_EXCLUDES = ['node_modules', '.git', '.svn', '.hg', 'bower_components', '.vscode', '.idea', 'dist', 'build', 'target', 'bin', 'obj', 'packages', '.next', '.nuxt', 'coverage', '.cache', 'tmp', 'temp', 'venv', '.venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox', 'site-packages', '.eggs', '*.egg-info', 'vendor', 'Pods'];

ipcMain.handle('fs:search', async (event, { rootPath, query, options = {}, searchId }) => {
  const { useRegex, caseSensitive, contentSearch, maxResults = 500, excludeDirs = [] } = options;

  const activeSearchId = searchId || Date.now();
  activeSearch = activeSearchId;
  const allExcludes = [...new Set([...SEARCH_DEFAULT_EXCLUDES, ...excludeDirs])];

  if (contentSearch) {
    // ── Content search using grep, streamed line-by-line ──────────────────
    contentSearchWithGrep(event, rootPath, query, {
      useRegex, caseSensitive, maxResults, allExcludes, searchId: activeSearchId,
    });
  } else {
    // ── Filename search (existing behavior) ──────────────────────────────
    filenameSearch(event, rootPath, query, {
      useRegex, caseSensitive, maxResults, allExcludes, searchId: activeSearchId,
    });
  }
});

// ── Content search: spawns grep and streams matches ────────────────────────
function contentSearchWithGrep(event, rootPath, query, opts) {
  const { spawn } = require('child_process');
  const { useRegex, caseSensitive, maxResults, allExcludes, searchId } = opts;
  // Kill any previous grep process
  if (activeGrepProcess) {
    try { activeGrepProcess.kill(); } catch (_) {}
    activeGrepProcess = null;
  }

  // Build grep args:
  //   -r   recursive
  //   -n   line numbers
  //   -I   skip binary files
  //   -H   always print filename
  //   --color=never   no ANSI codes
  const args = ['-rnIH', '--color=never'];

  if (!useRegex) args.push('-F');        // fixed-string mode
  if (!caseSensitive) args.push('-i');   // case insensitive

  // Exclude directories
  for (const dir of allExcludes) {
    args.push(`--exclude-dir=${dir}`);
  }

  // Max count per file to prevent huge outputs from single files
  args.push('-m', '50');

  args.push('--', query, rootPath);

  const grep = spawn('grep', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, LC_ALL: 'C' },
  });
  activeGrepProcess = grep;

  let totalResults = 0;
  let buffer = '';
  const seenFiles = new Map(); // filePath → stat info cache

  const processLine = async (line) => {
    if (activeSearch !== searchId) return;
    if (totalResults >= maxResults) {
      try { grep.kill(); } catch (_) {}
      return;
    }

    // grep output format: /path/to/file:lineNo:matchedLine
    // We need to handle paths that may contain colons (rare on macOS but possible)
    // Strategy: find first `:digits:` pattern after rootPath
    const afterRoot = line.substring(rootPath.length);
    const colonMatch = afterRoot.match(/^(.*?):(\d+):(.*)$/);
    if (!colonMatch) return;

    const filePath = rootPath + colonMatch[1];
    const lineNumber = parseInt(colonMatch[2], 10);
    const matchedLine = colonMatch[3];

    // Get or cache file stat
    let fileStat = seenFiles.get(filePath);
    if (!fileStat) {
      try {
        const stat = await fs.promises.stat(filePath);
        const name = path.basename(filePath);
        fileStat = {
          name,
          path: filePath,
          isDirectory: false,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          extension: name.includes('.') ? name.split('.').pop().toLowerCase() : '',
        };
        seenFiles.set(filePath, fileStat);
      } catch (_) {
        return; // skip files we can't stat
      }
    }

    totalResults++;

    const result = {
      ...fileStat,
      lineNumber,
      matchedLine: matchedLine.substring(0, 500), // truncate very long lines
      isContentMatch: true,
    };

    if (activeSearch === searchId) {
      event.sender.send('search:progress', { result, total: totalResults, searchId });
    }
  };

  // Process stdout line-by-line as data arrives
  grep.stdout.on('data', (chunk) => {
    if (activeSearch !== searchId) {
      try { grep.kill(); } catch (_) {}
      return;
    }

    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) processLine(line);
    }
  });

  grep.stderr.on('data', () => {
    // ignore stderr (permission errors etc.)
  });

  grep.on('close', () => {
    activeGrepProcess = null;
    // Process any remaining buffer
    if (buffer.trim() && activeSearch === searchId) {
      processLine(buffer);
    }
    // Small delay to let final processLine calls finish (they're async)
    setTimeout(() => {
      if (activeSearch === searchId) {
        event.sender.send('search:complete', { searchId });
      }
    }, 100);
  });

  grep.on('error', () => {
    activeGrepProcess = null;
    // Fallback: use the manual directory walker for content search
    fallbackContentSearch(event, rootPath, query, opts);
  });
}

// ── Fallback content search (no grep available) ────────────────────────────
async function fallbackContentSearch(event, rootPath, query, opts) {
  const { useRegex, caseSensitive, maxResults, allExcludes, searchId } = opts;
  let totalResults = 0;

  const textExtensions = new Set([
    'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'json', 'css', 'scss', 'less', 'html', 'htm',
    'xml', 'svg', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bash', 'zsh',
    'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt',
    'sql', 'graphql', 'vue', 'svelte', 'astro', 'php', 'pl', 'r', 'lua', 'ex', 'exs',
    'erl', 'hs', 'ml', 'clj', 'el', 'vim', 'fish', 'ps1', 'bat', 'cmd', 'makefile',
    'dockerfile', 'env', 'gitignore', 'editorconfig', 'prettierrc', 'eslintrc', 'babelrc',
    'log', 'csv', 'tsv', 'rst', 'tex', 'org',
  ]);

  function isTextFile(name) {
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    if (textExtensions.has(ext)) return true;
    // Files without extensions that are commonly text (Makefile, Dockerfile, etc.)
    const baseLower = name.toLowerCase();
    return ['makefile', 'dockerfile', 'gemfile', 'rakefile', 'procfile', 'readme', 'license', 'changelog'].includes(baseLower);
  }

  let regex;
  try {
    regex = useRegex
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
  } catch (_) {
    if (activeSearch === searchId) event.sender.send('search:complete', { searchId });
    return;
  }

  async function searchDir(dirPath, depth) {
    if (activeSearch !== searchId || totalResults >= maxResults || depth > 10) return;
    let entries;
    try { entries = await fs.promises.readdir(dirPath, { withFileTypes: true }); } catch (_) { return; }

    for (const entry of entries) {
      if (activeSearch !== searchId || totalResults >= maxResults) return;
      if (entry.name.startsWith('.') && entry.name !== '..') continue;
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (allExcludes.includes(entry.name)) continue;
        await searchDir(fullPath, depth + 1);
      } else if (isTextFile(entry.name)) {
        try {
          const stat = await fs.promises.stat(fullPath);
          // Skip files > 2MB
          if (stat.size > 2 * 1024 * 1024) continue;

          const content = await fs.promises.readFile(fullPath, 'utf8');
          const lines = content.split('\n');
          const name = entry.name;
          const fileStat = {
            name,
            path: fullPath,
            isDirectory: false,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            extension: name.includes('.') ? name.split('.').pop().toLowerCase() : '',
          };

          let fileMatchCount = 0;
          for (let i = 0; i < lines.length && totalResults < maxResults && fileMatchCount < 50; i++) {
            regex.lastIndex = 0;
            if (regex.test(lines[i])) {
              totalResults++;
              fileMatchCount++;
              const result = {
                ...fileStat,
                lineNumber: i + 1,
                matchedLine: lines[i].substring(0, 500),
                isContentMatch: true,
              };
              if (activeSearch === searchId) {
                event.sender.send('search:progress', { result, total: totalResults, searchId });
              }
            }
          }
        } catch (_) {
          // skip unreadable files
        }
      }
    }
  }

  await searchDir(rootPath, 0);
  if (activeSearch === searchId) {
    event.sender.send('search:complete', { searchId });
  }
}

// ── Filename search ────────────────────────────────────────────────────────
function filenameSearch(event, rootPath, query, opts) {
  const { useRegex, caseSensitive, maxResults, allExcludes, searchId } = opts;
  const results = [];

  async function searchDir(dirPath, depth = 0) {
    if (activeSearch !== searchId) return;
    if (depth > 8 || results.length >= maxResults) return;

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (activeSearch !== searchId) return;

        if (entry.name.startsWith('.') && !entry.name.startsWith('..')) continue;
        if (entry.isDirectory() && allExcludes.includes(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);
        let matches = false;

        try {
          if (useRegex) {
            const re = new RegExp(query, caseSensitive ? '' : 'i');
            matches = re.test(entry.name);
          } else {
            matches = caseSensitive ? entry.name.includes(query) : entry.name.toLowerCase().includes(query.toLowerCase());
          }

          if (matches) {
            const stat = await fs.promises.stat(fullPath);
            const result = {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: stat.size,
              modified: stat.mtime.toISOString(),
              extension: path.extname(entry.name).slice(1).toLowerCase(),
            };
            results.push(result);

            if (activeSearch === searchId) {
              event.sender.send('search:progress', { result, total: results.length, searchId });
            }
          }

          if (entry.isDirectory()) {
            await searchDir(fullPath, depth + 1);
          }
        } catch (e) {
          // Skip files we can't access
        }
      }
    } catch (e) {
      // Skip directories we can't access
    }
  }

  searchDir(rootPath).then(() => {
    if (activeSearch === searchId) {
      event.sender.send('search:complete', { results, searchId });
    }
  });
}

ipcMain.handle('fs:searchCancel', () => {
  activeSearch = null;
  if (activeGrepProcess) {
    try { activeGrepProcess.kill(); } catch (_) {}
    activeGrepProcess = null;
  }
  return { success: true };
});

// ─── IPC: Zip ─────────────────────────────────────────────────────────────────
ipcMain.handle('fs:zip', async (event, { files, destPath }) => {
  try {
    const { execSync } = require('child_process');
    const filePaths = files.map(f => `"${f}"`).join(' ');
    execSync(`zip -r "${destPath}" ${filePaths}`, { cwd: path.dirname(files[0]) });
    logActivity('zip', `Zipped ${files.length} files → ${path.basename(destPath)}`, files, files[0], destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:unzip', async (event, { filePath, destDir }) => {
  try {
    const { execSync } = require('child_process');
    fsExtra.mkdirpSync(destDir);
    execSync(`unzip -o "${filePath}" -d "${destDir}"`);
    logActivity('unzip', `Unzipped ${path.basename(filePath)} → ${path.basename(destDir)}`, [filePath], filePath, destDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Duplicate Detection ─────────────────────────────────────────────────
ipcMain.handle('fs:findDuplicates', async (event, dirPath) => {
  const hashMap = new Map();
  const nameMap = new Map();

  function scanDir(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.isDirectory()) continue;
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size === 0) continue;

          // Hash-based exact duplicates (only for files under 100MB)
          if (stat.size < 100 * 1024 * 1024) {
            const buffer = fs.readFileSync(fullPath);
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            const key = `${hash}_${stat.size}`;
            if (!hashMap.has(key)) hashMap.set(key, []);
            hashMap.get(key).push({ path: fullPath, name: entry.name, size: stat.size, hash });
          }

          // Name-similarity near-duplicates
          const baseName = entry.name.replace(/\s*\(\d+\)/, '').replace(/\s*copy/, '').trim().toLowerCase();
          if (!nameMap.has(baseName)) nameMap.set(baseName, []);
          nameMap.get(baseName).push({ path: fullPath, name: entry.name, size: stat.size });
        } catch (e) {}
      }
    } catch (e) {}
  }

  scanDir(dirPath);

  const exactDuplicates = [...hashMap.values()].filter(g => g.length > 1).map(g => ({ type: 'exact', files: g }));
  const nearDuplicates = [...nameMap.values()].filter(g => g.length > 1).map(g => ({ type: 'near', files: g }));

  return { success: true, exact: exactDuplicates, near: nearDuplicates };
});

ipcMain.handle('fs:moveDuplicates', async (event, { files, baseDir }) => {
  const destDir = path.join(baseDir, 'Duplicates');
  fsExtra.mkdirpSync(destDir);
  const moved = [];
  for (const file of files) {
    try {
      const dest = path.join(destDir, path.basename(file));
      fsExtra.moveSync(file, dest, { overwrite: false });
      moved.push({ from: file, to: dest });
    } catch (e) {}
  }
  logActivity('move_duplicates', `Moved ${moved.length} duplicates to /Duplicates`, files);
  return { success: true, moved };
});

// ─── IPC: Folder Size ─────────────────────────────────────────────────────────
ipcMain.handle('fs:folderSize', async (event, dirPath) => {
  function getSize(p) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(p);
        return entries.reduce((sum, e) => sum + getSize(path.join(p, e)), 0);
      }
      return stat.size;
    } catch { return 0; }
  }

  function buildTree(p, depth = 0) {
    if (depth > 3) return null;
    try {
      const stat = fs.statSync(p);
      const name = path.basename(p);
      if (stat.isDirectory()) {
        const children = [];
        try {
          const entries = fs.readdirSync(p);
          for (const e of entries) {
            if (e.startsWith('.')) continue;
            const child = buildTree(path.join(p, e), depth + 1);
            if (child) children.push(child);
          }
        } catch {}
        const size = children.reduce((sum, c) => sum + c.size, 0);
        return { name, path: p, size, isDirectory: true, children };
      } else {
        return { name, path: p, size: stat.size, isDirectory: false };
      }
    } catch { return null; }
  }

  const tree = buildTree(dirPath);
  return { success: true, tree };
});

// ─── IPC: Tags ────────────────────────────────────────────────────────────────
ipcMain.handle('tags:add', async (event, { filePath, tagName }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    // Get color from global_tags
    const gt = db.prepare('SELECT color FROM global_tags WHERE tag_name = ?').get(tagName);
    const color = gt ? gt.color : '#4A9EFF';
    db.prepare('INSERT OR REPLACE INTO tags (file_path, tag_name, color) VALUES (?, ?, ?)').run(filePath, tagName, color);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:remove', async (event, { filePath, tagName }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    db.prepare('DELETE FROM tags WHERE file_path = ? AND tag_name = ?').run(filePath, tagName);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:get', async (event, filePath) => {
  if (!db) return { success: true, tags: [] };
  try {
    // Join with global_tags to get latest color
    const tags = db.prepare(`
      SELECT t.file_path, t.tag_name, COALESCE(g.color, t.color) as color
      FROM tags t LEFT JOIN global_tags g ON t.tag_name = g.tag_name
      WHERE t.file_path = ?
    `).all(filePath);
    return { success: true, tags };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:getAll', async () => {
  if (!db) return { success: true, tags: [] };
  try {
    const tags = db.prepare('SELECT tag_name, color, sort_order FROM global_tags ORDER BY sort_order ASC, tag_name ASC').all();
    return { success: true, tags };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:create', async (event, { tagName, color }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM global_tags').get();
    const order = (maxOrder.m ?? -1) + 1;
    db.prepare('INSERT OR IGNORE INTO global_tags (tag_name, color, sort_order) VALUES (?, ?, ?)').run(tagName, color || '#4A9EFF', order);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:delete', async (event, tagName) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    db.prepare('DELETE FROM global_tags WHERE tag_name = ?').run(tagName);
    db.prepare('DELETE FROM tags WHERE tag_name = ?').run(tagName);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:rename', async (event, { oldName, newName }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    db.prepare('UPDATE global_tags SET tag_name = ? WHERE tag_name = ?').run(newName, oldName);
    db.prepare('UPDATE tags SET tag_name = ? WHERE tag_name = ?').run(newName, oldName);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:recolor', async (event, { tagName, color }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    db.prepare('UPDATE global_tags SET color = ? WHERE tag_name = ?').run(color, tagName);
    db.prepare('UPDATE tags SET color = ? WHERE tag_name = ?').run(color, tagName);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:getFilesForTag', async (event, tagName) => {
  if (!db) return { success: true, files: [] };
  try {
    const rows = db.prepare('SELECT file_path FROM tags WHERE tag_name = ?').all(tagName);
    return { success: true, files: rows.map(r => r.file_path) };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:searchByTag', async (event, tagName) => {
  if (!db) return { success: true, files: [] };
  try {
    const files = db.prepare('SELECT file_path FROM tags WHERE tag_name = ?').all(tagName);
    return { success: true, files: files.map(f => f.file_path) };
  } catch (err) { return { success: false, error: err.message }; }
});

// ─── IPC: Activity Log ────────────────────────────────────────────────────────
function logActivity(actionType, description, files = [], source = null, destination = null) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO activity_log (action_type, description, files_json, source, destination) VALUES (?, ?, ?, ?, ?)')
      .run(actionType, description, JSON.stringify(files), source, destination);
  } catch (e) {}
}

ipcMain.handle('log:getAll', async (event, { limit = 500, search = '', actionType = '' }) => {
  if (!db) return { success: true, logs: [] };
  try {
    let query = 'SELECT * FROM activity_log WHERE 1=1';
    const params = [];
    if (search) { query += ' AND (description LIKE ? OR files_json LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (actionType) { query += ' AND action_type = ?'; params.push(actionType); }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    const logs = db.prepare(query).all(...params);
    return { success: true, logs };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('log:clear', async () => {
  if (!db) return { success: false };
  db.prepare('DELETE FROM activity_log').run();
  return { success: true };
});

// ─── IPC: Undo / Redo ─────────────────────────────────────────────────────────
function pushUndo(actionType, payload) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO undo_stack (action_type, payload_json) VALUES (?, ?)').run(actionType, JSON.stringify(payload));
  } catch (e) {}
}

ipcMain.handle('undo:perform', async () => {
  if (!db) return { success: false, error: 'DB unavailable' };
  try {
    const entry = db.prepare('SELECT * FROM undo_stack WHERE undone = 0 ORDER BY id DESC LIMIT 1').get();
    if (!entry) return { success: false, error: 'Nothing to undo' };
    const payload = JSON.parse(entry.payload_json);
    let result = { success: false };

    switch (entry.action_type) {
      case 'rename':
        if (fs.existsSync(payload.newPath)) {
          fs.renameSync(payload.newPath, payload.oldPath);
          result = { success: true };
        }
        break;
      case 'move':
        if (fs.existsSync(payload.destPath)) {
          fsExtra.moveSync(payload.destPath, payload.srcPath);
          result = { success: true };
        }
        break;
      case 'copy':
        if (fs.existsSync(payload.destPath)) {
          fsExtra.removeSync(payload.destPath);
          result = { success: true };
        }
        break;
    }

    if (result.success) {
      db.prepare('UPDATE undo_stack SET undone = 1 WHERE id = ?').run(entry.id);
      logActivity('undo', `Undid ${entry.action_type}`, [], payload.srcPath || payload.oldPath);
    }
    return result;
  } catch (err) { return { success: false, error: err.message }; }
});

// ─── IPC: Rules ───────────────────────────────────────────────────────────────
ipcMain.handle('rules:getAll', async () => {
  if (!db) return { success: true, rules: [] };
  const rules = db.prepare('SELECT * FROM rules').all();
  return { success: true, rules: rules.map(r => ({ ...r, conditions: JSON.parse(r.conditions_json), actions: JSON.parse(r.actions_json) })) };
});

ipcMain.handle('rules:save', async (event, rule) => {
  if (!db) return { success: false };
  try {
    if (rule.id) {
      db.prepare('UPDATE rules SET name=?, enabled=?, conditions_json=?, actions_json=?, watch_path=?, schedule_interval=? WHERE id=?')
        .run(rule.name, rule.enabled ? 1 : 0, JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.watchPath, rule.scheduleInterval || 0, rule.id);
    } else {
      const info = db.prepare('INSERT INTO rules (name, enabled, conditions_json, actions_json, watch_path, schedule_interval) VALUES (?,?,?,?,?,?)')
        .run(rule.name, rule.enabled ? 1 : 0, JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.watchPath, rule.scheduleInterval || 0);
      rule.id = info.lastInsertRowid;
    }
    return { success: true, rule };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('rules:delete', async (event, id) => {
  if (!db) return { success: false };
  db.prepare('DELETE FROM rules WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('rules:run', async (event, ruleId) => {
  if (!db) return { success: false };
  const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
  if (!rule) return { success: false, error: 'Rule not found' };
  // Rule execution is handled in renderer for now; main just updates last_run
  db.prepare('UPDATE rules SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(ruleId);
  return { success: true };
});

// ─── IPC: Bookmarks & Settings ───────────────────────────────────────────────
ipcMain.handle('store:get', async (event, key) => store ? store.get(key) : null);
ipcMain.handle('store:set', async (event, key, value) => { if (store) store.set(key, value); return true; });

ipcMain.handle('bookmarks:get', async () => store ? store.get('bookmarks', []) : []);
ipcMain.handle('bookmarks:save', async (event, bookmarks) => { if (store) store.set('bookmarks', bookmarks); return true; });

// ─── IPC: Shell ───────────────────────────────────────────────────────────────
ipcMain.handle('shell:openExternal', async (event, url) => shell.openExternal(url));
ipcMain.handle('shell:openPath', async (event, p) => shell.openPath(p));
ipcMain.handle('shell:showItemInFinder', async (event, p) => shell.showItemInFinder(p));

ipcMain.handle('dialog:showOpenDialog', async (event, opts) => dialog.showOpenDialog(mainWindow, opts));
ipcMain.handle('dialog:showSaveDialog', async (event, opts) => dialog.showSaveDialog(mainWindow, opts));

// ─── IPC: Terminal (PTY) ─────────────────────────────────────────────────────
let ptyProcess = null;

ipcMain.handle('pty:create', async (event, { cwd }) => {
  try {
    const pty = require('node-pty');
    const shell = process.env.SHELL || '/bin/zsh';
    if (ptyProcess) { ptyProcess.kill(); ptyProcess = null; }

    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwd || os.homedir(),
      env: process.env,
    });

    ptyProcess.onData(data => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pty:data', data);
      }
    });

    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('pty:write', async (event, data) => {
  if (ptyProcess) ptyProcess.write(data);
  return true;
});

ipcMain.handle('pty:resize', async (event, { cols, rows }) => {
  if (ptyProcess) ptyProcess.resize(cols, rows);
  return true;
});

ipcMain.handle('pty:cd', async (event, dir) => {
  if (ptyProcess) ptyProcess.write(`cd "${dir}"\r`);
  return true;
});

ipcMain.handle('pty:destroy', async () => {
  if (ptyProcess) { ptyProcess.kill(); ptyProcess = null; }
  return true;
});

// ─── IPC: Folder Watcher ─────────────────────────────────────────────────────
ipcMain.handle('watcher:start', async (event, watchPath) => {
  try {
    const chokidar = require('chokidar');
    if (chokidarWatchers.has(watchPath)) return { success: true };

    const watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      depth: 99,
    });

    watcher.on('add', p => mainWindow?.webContents.send('watcher:change', { type: 'add', path: p, dir: watchPath }));
    watcher.on('unlink', p => mainWindow?.webContents.send('watcher:change', { type: 'unlink', path: p, dir: watchPath }));
    watcher.on('addDir', p => mainWindow?.webContents.send('watcher:change', { type: 'addDir', path: p, dir: watchPath }));
    watcher.on('unlinkDir', p => mainWindow?.webContents.send('watcher:change', { type: 'unlinkDir', path: p, dir: watchPath }));
    watcher.on('change', p => mainWindow?.webContents.send('watcher:change', { type: 'change', path: p, dir: watchPath }));

    chokidarWatchers.set(watchPath, watcher);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('watcher:stop', async (event, watchPath) => {
  const w = chokidarWatchers.get(watchPath);
  if (w) { w.close(); chokidarWatchers.delete(watchPath); }
  return { success: true };
});