const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

// Semaphore: limits concurrent readdirs to avoid fd exhaustion
const CONCURRENCY = 24;
let active = 0;
const queue = [];

function acquireSlot() {
  return new Promise(resolve => {
    if (active < CONCURRENCY) { active++; resolve(); }
    else queue.push(resolve);
  });
}

function releaseSlot() {
  active--;
  if (queue.length > 0) { active++; queue.shift()(); }
}

async function readDirSafe(p) {
  await acquireSlot();
  try {
    return await fs.promises.readdir(p);
  } catch {
    return [];
  } finally {
    releaseSlot();
  }
}

async function getSize(p) {
  try {
    const stat = await fs.promises.lstat(p);
    if (stat.isSymbolicLink()) return 0;
    if (stat.isDirectory()) {
      const entries = await readDirSafe(p);
      const sizes = await Promise.all(entries.map(e => getSize(path.join(p, e))));
      return sizes.reduce((sum, s) => sum + s, 0);
    }
    return stat.size;
  } catch { return 0; }
}

async function buildTree(p, depth = 0) {
  try {
    const stat = await fs.promises.lstat(p);
    if (stat.isSymbolicLink()) return null;
    const name = path.basename(p);
    if (stat.isDirectory()) {
      if (depth >= 3) {
        return { name, path: p, size: await getSize(p), isDirectory: true, children: [] };
      }
      const entries = await readDirSafe(p);
      const children = (await Promise.all(
        entries
          .filter(e => !e.startsWith('.'))
          .map(e => buildTree(path.join(p, e), depth + 1))
      )).filter(Boolean);
      const size = children.reduce((sum, c) => sum + c.size, 0);
      return { name, path: p, size, isDirectory: true, children };
    } else {
      return { name, path: p, size: stat.size, isDirectory: false };
    }
  } catch { return null; }
}

buildTree(workerData.dirPath)
  .then(tree => parentPort.postMessage({ success: true, tree }))
  .catch(err => parentPort.postMessage({ success: false, error: err.message }));
