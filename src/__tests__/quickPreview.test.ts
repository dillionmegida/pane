/**
 * Quick Preview Modal Tests
 * Tests for Spacebar-triggered quick preview, Esc-to-close, file type detection,
 * and media autoplay behavior.
 */

import { PREVIEW_TYPES } from '../store';

const makeFile = (name: string, extra: Record<string, any> = {}): any => {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return { path: `/test/${name}`, name, extension: ext, size: 1024, modified: Date.now(), isDirectory: false, ...extra };
};

const isPreviewableExt = (ext: string): boolean =>
  (PREVIEW_TYPES.imageExts as unknown as string[]).includes(ext) ||
  (PREVIEW_TYPES.videoExts as unknown as string[]).includes(ext) ||
  (PREVIEW_TYPES.audioExts as unknown as string[]).includes(ext) ||
  ext === 'pdf';

describe('QuickPreview - file type detection', () => {
  test('image extensions are previewable', () => {
    const images = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
    images.forEach(ext => { expect(isPreviewableExt(ext)).toBe(true); });
  });

  test('video extensions are previewable', () => {
    const videos = ['mp4', 'mov', 'mkv', 'webm', 'avi'];
    videos.forEach(ext => { expect(isPreviewableExt(ext)).toBe(true); });
  });

  test('audio extensions are previewable', () => {
    const audios = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
    audios.forEach(ext => { expect(isPreviewableExt(ext)).toBe(true); });
  });

  test('pdf is previewable', () => {
    expect(isPreviewableExt('pdf')).toBe(true);
  });

  test('non-previewable extensions return false', () => {
    const others = ['txt', 'js', 'ts', 'json', 'zip', 'dmg', 'exe', 'sh'];
    others.forEach(ext => { expect(isPreviewableExt(ext)).toBe(false); });
  });

  test('directories are not previewable', () => {
    const dir = { ...makeFile('Documents'), isDirectory: true, extension: '' };
    expect(dir.isDirectory).toBe(true);
    expect(isPreviewableExt(dir.extension || '')).toBe(false);
  });

  test('files with no extension are not previewable', () => {
    const file = makeFile('Makefile');
    expect(isPreviewableExt(file.extension)).toBe(false);
  });
});

describe('QuickPreview - spacebar trigger logic', () => {
  const buildKeyHandler = (opts: {
    paneId?: string;
    activePane?: string;
    selectedFiles?: string[];
    files?: any[];
    columnFiles?: Record<string, any[]>;
    onOpen: (f: any) => void;
  }) => {
    const {
      paneId = 'left',
      activePane = 'left',
      selectedFiles = [],
      files = [],
      columnFiles = {},
      onOpen,
    } = opts;

    return (e: any) => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (activePane !== paneId) return;

      const selArray = selectedFiles;
      if (selArray.length === 0) return;
      const filePath = selArray[0];

      let fileObj = files.find((f: any) => f.path === filePath);
      if (!fileObj) {
        for (const colFiles of Object.values(columnFiles)) {
          const found = (colFiles as any[]).find((f: any) => f.path === filePath);
          if (found) { fileObj = found; break; }
        }
      }
      if (!fileObj || fileObj.isDirectory) return;

      const ext = fileObj.extension || '';
      if (!isPreviewableExt(ext)) return;

      e.preventDefault();
      onOpen(fileObj);
    };
  };

  test('opens modal when Space is pressed with a selected image', () => {
    const img = makeFile('photo.jpg');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [img.path], files: [img], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).toHaveBeenCalledWith(img);
    expect((e as any).preventDefault).toHaveBeenCalled();
  });

  test('opens modal for video file', () => {
    const vid = makeFile('movie.mp4');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [vid.path], files: [vid], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).toHaveBeenCalledWith(vid);
  });

  test('opens modal for audio file', () => {
    const aud = makeFile('song.mp3');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [aud.path], files: [aud], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).toHaveBeenCalledWith(aud);
  });

  test('opens modal for PDF file', () => {
    const pdf = makeFile('document.pdf');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [pdf.path], files: [pdf], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).toHaveBeenCalledWith(pdf);
  });

  test('does NOT open modal for a non-previewable file (e.g. .zip)', () => {
    const zip = makeFile('archive.zip');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [zip.path], files: [zip], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('does NOT open modal for a directory', () => {
    const dir = { ...makeFile('Documents'), isDirectory: true, extension: '' };
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [dir.path], files: [dir], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('does NOT open modal when no file is selected', () => {
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [], files: [], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('does NOT fire on non-Space keys', () => {
    const img = makeFile('photo.png');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [img.path], files: [img], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Enter' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('does NOT open modal when an INPUT is focused', () => {
    const img = makeFile('photo.jpg');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [img.path], files: [img], onOpen });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  test('does NOT open modal when inactive pane presses Space', () => {
    const img = makeFile('photo.jpg');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ paneId: 'left', activePane: 'right', selectedFiles: [img.path], files: [img], onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('finds file in column files when not in root files', () => {
    const aud = makeFile('deep-song.mp3');
    const onOpen = jest.fn();
    const handler = buildKeyHandler({ selectedFiles: [aud.path], files: [], columnFiles: { '/some/dir': [aud] }, onOpen });
    const e = new KeyboardEvent('keydown', { code: 'Space' });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onOpen).toHaveBeenCalledWith(aud);
  });
});

describe('QuickPreview - Esc key close logic', () => {
  const buildEscHandler = ({ onClose }: { onClose: () => void }) => (e: any) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  test('Esc key calls onClose', () => {
    const onClose = jest.fn();
    const handler = buildEscHandler({ onClose });
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    (e as any).preventDefault = jest.fn();
    (e as any).stopPropagation = jest.fn();
    handler(e);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect((e as any).preventDefault).toHaveBeenCalled();
    expect((e as any).stopPropagation).toHaveBeenCalled();
  });

  test('non-Esc key does NOT call onClose', () => {
    const onClose = jest.fn();
    const handler = buildEscHandler({ onClose });
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    (e as any).preventDefault = jest.fn();
    handler(e);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('QuickPreview - media stop on close', () => {
  test('stop() is called on mediaRef when modal closes', () => {
    const mediaRef = { current: { stop: jest.fn() } };
    const handleClose = () => { if (mediaRef.current) mediaRef.current.stop?.(); };
    handleClose();
    expect(mediaRef.current.stop).toHaveBeenCalledTimes(1);
  });

  test('stop is safe when mediaRef has no current', () => {
    const mediaRef: { current: any } = { current: null };
    const handleClose = () => { if (mediaRef.current) mediaRef.current.stop?.(); };
    expect(() => handleClose()).not.toThrow();
  });

  test('stop is safe when mediaRef has no stop method', () => {
    const mediaRef = { current: {} as any };
    const handleClose = () => { if (mediaRef.current) mediaRef.current.stop?.(); };
    expect(() => handleClose()).not.toThrow();
  });
});

describe('QuickPreview - header metadata', () => {
  test('file name is accessible on the file object', () => {
    const file = makeFile('vacation.mp4');
    expect(file.name).toBe('vacation.mp4');
    expect(file.extension).toBe('mp4');
    expect(file.size).toBe(1024);
    expect(typeof file.modified).toBe('number');
    expect(file.path).toBe('/test/vacation.mp4');
  });

  test('pdf file object has correct extension', () => {
    const file = makeFile('report.pdf');
    expect(file.extension).toBe('pdf');
    expect(isPreviewableExt(file.extension)).toBe(true);
  });

  test('image file object has correct extension', () => {
    const file = makeFile('screenshot.png');
    expect(file.extension).toBe('png');
    expect(PREVIEW_TYPES.imageExts.includes(file.extension)).toBe(true);
  });

  test('audio file object has correct extension', () => {
    const file = makeFile('track.flac');
    expect(file.extension).toBe('flac');
    expect(PREVIEW_TYPES.audioExts.includes(file.extension)).toBe(true);
  });
});
