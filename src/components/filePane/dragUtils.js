export function createDragImage(name, count) {
  const dragImg = document.createElement('div');
  dragImg.style.cssText = `
    position: absolute;
    top: -1000px;
    padding: 6px 12px;
    background: rgba(74, 158, 255, 0.9);
    color: white;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  dragImg.textContent = count === 1 ? name : `${count} items`;
  document.body.appendChild(dragImg);
  setTimeout(() => document.body.removeChild(dragImg), 0);
  return dragImg;
}

export function startDrag(e, file, selectedFiles, setSelection, setDraggedFiles, setIsDragging, paneId) {
  const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
  if (!selectedFiles.has(file.path)) {
    setSelection(paneId, paths);
  }
  setDraggedFiles(paths);
  setIsDragging(true);
  e.dataTransfer.setData('file-paths', JSON.stringify(paths));
  e.dataTransfer.effectAllowed = 'copyMove';
  const dragImg = createDragImage(file.name, paths.length);
  e.dataTransfer.setDragImage(dragImg, 0, 0);
}

export function endDrag(setIsDragging, setDraggedFiles, setDragOver) {
  setIsDragging(false);
  setDraggedFiles([]);
  setDragOver(null);
}
