import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FileItem } from '../types';

interface ReaddirResult {
  success: boolean;
  files: FileItem[];
  error?: string;
}

/**
 * Custom hook for caching directory contents with React Query.
 * This replaces direct calls to window.electronAPI.readdir().
 * 
 * @param dirPath - The directory path to read
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Query result with data, loading state, error, and refetch function
 */
export function useDirectory(dirPath: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dir', dirPath],
    queryFn: async (): Promise<ReaddirResult> => {
      return window.electronAPI.readdir(dirPath);
    },
    enabled: enabled && !!dirPath,
    staleTime: 0, // Always check for freshness on mount
    gcTime: 30000, // Keep in cache for 30 seconds after unmount
    retry: 1, // Retry failed requests once
  });

  /**
   * Invalidate the cache for a specific directory.
   * Call this when you know the directory contents have changed.
   */
  const invalidateDirectory = (path: string) => {
    queryClient.invalidateQueries({ queryKey: ['dir', path] });
  };

  /**
   * Invalidate the cache for the current directory.
   */
  const invalidate = () => {
    if (dirPath) {
      invalidateDirectory(dirPath);
    }
  };

  return {
    ...query,
    invalidateDirectory,
    invalidate,
  };
}

/**
 * Direct function to read a directory (non-hook version).
 * Useful for calling outside of React components (e.g., in store actions).
 * This still uses the React Query cache.
 */
export async function readDirectory(dirPath: string): Promise<ReaddirResult> {
  return window.electronAPI.readdir(dirPath);
}

/**
 * Invalidate directory cache from outside React components.
 * Call this from store actions or event handlers.
 */
export function invalidateDirectoryCache(queryClient: any, dirPath: string) {
  queryClient.invalidateQueries({ queryKey: ['dir', dirPath] });
}
