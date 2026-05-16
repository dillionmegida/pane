/**
 * File path helper utilities
 */

/**
 * Get the parent directory of a file path
 * @param filePath - The full path to a file or directory
 * @returns The parent directory path, or '/' if the path is at root
 */
export function getDir(filePath: string): string {
  if (!filePath.includes('/')) return '/';
  return filePath.substring(0, filePath.lastIndexOf('/'));
}

/**
 * Get the file name from a path (last component)
 * @param filePath - The full path to a file or directory
 * @returns The file/directory name
 */
export function getFileName(filePath: string): string {
  if (!filePath.includes('/')) return filePath;
  return filePath.substring(filePath.lastIndexOf('/') + 1);
}

/**
 * Get the file extension from a path
 * @param filePath - The full path to a file
 * @returns The file extension (without the dot), or empty string if no extension
 */
export function getExtension(filePath: string): string {
  const fileName = getFileName(filePath);
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === fileName.length - 1) return '';
  return fileName.substring(dotIndex + 1);
}
