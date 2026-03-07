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

      CREATE INDEX IF NOT EXISTS idx_tags_path ON tags(file_path);
      CREATE INDEX IF NOT EXISTS idx_log_timestamp ON activity_log(timestamp DESC);
    `);
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
          { name: 'Home', path: os.homedir(), icon: 'home' },
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
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: false,
      spellcheck: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const url = isDev ? `file://${path.join(__dirname, '../../dist/index.html')}` : `file://${path.join(__dirname, '../../dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
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
    const showHidden = store ? store.get('showHidden', false) : false;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (!showHidden && entry.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
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
        });
      } catch (e) {
        // Skip files we can't stat
      }
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

ipcMain.handle('fs:search', async (event, { rootPath, query, options = {}, searchId }) => {
  const results = [];
  const { useRegex, caseSensitive, contentSearch, maxResults = 500, excludeDirs = [] } = options;

  // If no searchId provided, generate one
  const activeSearchId = searchId || Date.now();
  activeSearch = activeSearchId;

  // Expanded default exclude patterns for root directory searches
  const defaultExcludes = ['node_modules', '.git', '.svn', '.hg', 'bower_components', '.vscode', '.idea', 'dist', 'build', 'target', 'bin', 'obj', 'packages', '.next', '.nuxt', 'coverage', '.cache', 'tmp', 'temp', 'venv', '.venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox', 'site-packages', '.eggs', '*.egg-info', 'vendor', 'Pods'];
  const allExcludes = [...new Set([...defaultExcludes, ...excludeDirs])];

  try {
    // Use find command for much faster search (async version)
    const { exec } = require('child_process');
    
    // Build find command with proper escaping - use */pattern/* to match at any depth
    const escapedPath = rootPath.replace(/'/g, "'\"'\"'");
    const excludePatterns = allExcludes.map(dir => `-not -path "*/${dir}/*" -not -path "*/${dir}"`).join(' ');
    
    let findCommand;
    if (useRegex) {
      findCommand = `find '${escapedPath}' ${excludePatterns} -regextype posix-extended -regex ".*${query}.*" 2>/dev/null | head -n ${maxResults}`;
    } else {
      findCommand = `find '${escapedPath}' ${excludePatterns} -iname "${searchPattern}" 2>/dev/null | head -n ${maxResults}`;
    }
    
    // Use async exec to avoid blocking
    exec(findCommand, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (activeSearch !== activeSearchId) return; // Search was cancelled

      if (error) {
        // Fallback to manual search if find command fails
        fallbackSearch(event, rootPath, query, options, activeSearchId, results);
        return;
      }

      const foundPaths = stdout.trim().split('\n').filter(Boolean);

      // Process results in batches for streaming
      (async () => {
        for (const filePath of foundPaths) {
          if (activeSearch !== activeSearchId) break;

          try {
            const stat = await fs.promises.stat(filePath);
            const name = filePath.split('/').pop();
            const isDirectory = stat.isDirectory();
            const result = {
              name,
              path: filePath,
              isDirectory,
              size: stat.size,
              modified: stat.mtime.toISOString(),
              extension: isDirectory ? '' : (name.includes('.') ? name.split('.').pop().toLowerCase() : ''),
            };

            results.push(result);

            // Send incremental result to renderer
            if (activeSearch === activeSearchId) {
              event.sender.send('search:progress', { result, total: results.length, searchId: activeSearchId });
            }
          } catch (e) {
            // Skip files we can't stat
          }
        }

        // Send final results
        if (activeSearch === activeSearchId) {
          event.sender.send('search:complete', { results, searchId: activeSearchId });
        }
      })();
    });
  } catch (e) {
    // Fallback to manual search if find command fails
    await fallbackSearch(event, rootPath, query, options, activeSearchId, results);
  }
});

async function fallbackSearch(event, rootPath, query, options, searchId, results) {
  const { useRegex, caseSensitive, contentSearch, maxResults = 500, excludeDirs = [] } = options;
  const defaultExcludes = ['node_modules', '.git', '.svn', '.hg', 'bower_components', '.vscode', '.idea', 'dist', 'build', 'target', 'bin', 'obj', 'packages', '.next', '.nuxt', 'coverage', '.cache', 'tmp', 'temp', 'venv', '.venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox', 'site-packages', '.eggs', '*.egg-info', 'vendor', 'Pods'];
  const allExcludes = [...new Set([...defaultExcludes, ...excludeDirs])];

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

  await searchDir(rootPath);
  
  if (activeSearch === searchId) {
    event.sender.send('search:complete', { results, searchId });
  }
}

ipcMain.handle('fs:searchCancel', () => {
  activeSearch = null;
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
ipcMain.handle('tags:add', async (event, { filePath, tagName, color }) => {
  if (!db) return { success: false, error: 'DB not available' };
  try {
    db.prepare('INSERT OR REPLACE INTO tags (file_path, tag_name, color) VALUES (?, ?, ?)').run(filePath, tagName, color || '#4A9EFF');
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
    const tags = db.prepare('SELECT * FROM tags WHERE file_path = ?').all(filePath);
    return { success: true, tags };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('tags:getAll', async () => {
  if (!db) return { success: true, tags: [] };
  try {
    const tags = db.prepare('SELECT DISTINCT tag_name, color FROM tags').all();
    return { success: true, tags };
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
      depth: 1,
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