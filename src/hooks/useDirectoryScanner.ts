import { useState, useRef, useEffect } from 'react';
import type { FileItem } from '../types';

interface AbortController {
  aborted: boolean;
}

interface ScanForLargeFilesParams {
  rootPath: string;
  fileSizeThresholdBytes: number;
  excludedDirectories?: string[];
  maxConcurrentScans?: number;
}

interface ScanWithConcurrentWalkingParams {
  rootPath: string;
  excludedDirectories?: string[];
  maxConcurrentScans?: number;
  filterTest: (file: FileItem) => boolean;
}

interface ScanWithGenericSearchParams {
  rootPath: string;
  excludedDirectories?: string[];
  filterTest: (file: FileItem) => boolean;
}

export interface DirectoryScannerReturn {
  isScanning: boolean;
  scanResults: FileItem[];
  setScanResults: React.Dispatch<React.SetStateAction<FileItem[]>>;
  scanForLargeFiles: (params: ScanForLargeFilesParams) => Promise<void>;
  scanWithConcurrentWalking: (params: ScanWithConcurrentWalkingParams) => Promise<void>;
  scanWithGenericSearch: (params: ScanWithGenericSearchParams) => Promise<void>;
  abortScan: () => void;
}

export const useConcurrentDirectoryScanner = (): DirectoryScannerReturn => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<FileItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.aborted = true;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => abortScan();
  }, []);

  const matchesExcludePattern = (directoryName: string, excludePatterns: string[]): boolean => {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(directoryName);
      }
      return directoryName === pattern;
    });
  };

  const scanForLargeFiles = async ({
    rootPath,
    fileSizeThresholdBytes,
    excludedDirectories = [],
    maxConcurrentScans = 3,
  }: ScanForLargeFilesParams): Promise<void> => {
    if (!rootPath) return;

    abortScan();
    const abortController: AbortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    const directoryQueue: string[] = [rootPath];
    let activeScans = 0;
    let resolveWhenIdle: (() => void) | undefined;

    const processDirectory = async (directoryPath: string): Promise<void> => {
      if (abortController.aborted) return;

      try {
        const response = await window.electronAPI.readdir(directoryPath);
        if (abortController.aborted || !response.success) return;

        const matchedFiles: FileItem[] = [];

        for (const file of response.files) {
          if (abortController.aborted) return;

          if (file.isDirectory) {
            if (!matchesExcludePattern(file.name, excludedDirectories)) {
              directoryQueue.push(file.path);
            }
          } else if (file.size > fileSizeThresholdBytes) {
            matchedFiles.push(file);
          }
        }

        if (matchedFiles.length > 0 && !abortController.aborted) {
          setScanResults(previousResults => [...previousResults, ...matchedFiles]);
        }
      } catch (error) {
        console.error('Error reading directory:', directoryPath, error);
      }
    };

    const pumpQueue = () => {
      while (activeScans < maxConcurrentScans && directoryQueue.length > 0 && !abortController.aborted) {
        const nextDirectory = directoryQueue.shift()!;
        activeScans++;

        processDirectory(nextDirectory).finally(() => {
          activeScans--;

          if (abortController.aborted) {
            if (activeScans === 0 && resolveWhenIdle) resolveWhenIdle();
            return;
          }

          if (directoryQueue.length > 0) {
            pumpQueue();
          } else if (activeScans === 0) {
            if (resolveWhenIdle) resolveWhenIdle();
          }
        });
      }
    };

    try {
      await new Promise<void>(resolve => {
        resolveWhenIdle = resolve;
        pumpQueue();
        if (activeScans === 0) resolve();
      });
    } finally {
      if (!abortController.aborted) {
        setIsScanning(false);
      }
    }
  };

  const scanWithConcurrentWalking = async ({
    rootPath,
    excludedDirectories = [],
    maxConcurrentScans = 3,
    filterTest,
  }: ScanWithConcurrentWalkingParams): Promise<void> => {
    if (!rootPath) return;

    abortScan();
    const abortController: AbortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    const directoryQueue: string[] = [rootPath];
    let activeScans = 0;
    let resolveWhenIdle: (() => void) | undefined;

    const processDirectory = async (directoryPath: string): Promise<void> => {
      if (abortController.aborted) return;

      try {
        const response = await window.electronAPI.readdir(directoryPath);
        if (abortController.aborted || !response.success) return;

        const matchedFiles: FileItem[] = [];

        for (const file of response.files) {
          if (abortController.aborted) return;

          if (file.isDirectory) {
            if (!matchesExcludePattern(file.name, excludedDirectories)) {
              directoryQueue.push(file.path);
              if (filterTest(file)) {
                matchedFiles.push(file);
              }
            }
          } else if (filterTest(file)) {
            matchedFiles.push(file);
          }
        }

        if (matchedFiles.length > 0 && !abortController.aborted) {
          setScanResults(previousResults => [...previousResults, ...matchedFiles]);
        }
      } catch (error) {
        console.error('Error reading directory:', directoryPath, error);
      }
    };

    const pumpQueue = () => {
      while (activeScans < maxConcurrentScans && directoryQueue.length > 0 && !abortController.aborted) {
        const nextDirectory = directoryQueue.shift()!;
        activeScans++;

        processDirectory(nextDirectory).finally(() => {
          activeScans--;

          if (abortController.aborted) {
            if (activeScans === 0 && resolveWhenIdle) resolveWhenIdle();
            return;
          }

          if (directoryQueue.length > 0) {
            pumpQueue();
          } else if (activeScans === 0) {
            if (resolveWhenIdle) resolveWhenIdle();
          }
        });
      }
    };

    try {
      await new Promise<void>(resolve => {
        resolveWhenIdle = resolve;
        pumpQueue();
        if (activeScans === 0) resolve();
      });
    } finally {
      if (!abortController.aborted) {
        setIsScanning(false);
      }
    }
  };

  const scanWithGenericSearch = async ({
    rootPath,
    excludedDirectories = [],
    filterTest,
  }: ScanWithGenericSearchParams): Promise<void> => {
    if (!rootPath) return;

    abortScan();
    const abortController: AbortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    try {
      const searchId = Date.now();

      const handleSearchComplete = (data: { searchId: number; results: FileItem[] }) => {
        if (data.searchId === searchId && !abortController.aborted) {
          console.log(`Smart Folders received ${data.results.length} total results from search`);

          const filteredResults = data.results.filter(filterTest);
          console.log(`After filtering, ${filteredResults.length} results remain`);

          setScanResults(filteredResults);
          setIsScanning(false);

          window.electronAPI.offSearchComplete?.();
        }
      };

      window.electronAPI.onSearchComplete?.(handleSearchComplete);

      await window.electronAPI.search?.({
        rootPath,
        query: '.',
        options: {
          maxResults: null,
          excludeDirs: excludedDirectories,
          useDefaultExcludes: false,
        },
        searchId,
      });
    } catch (error) {
      console.error('Search error:', error);
      setScanResults([]);
    } finally {
      if (!abortController.aborted) {
        setIsScanning(false);
      }
    }
  };

  return {
    isScanning,
    scanResults,
    setScanResults,
    scanForLargeFiles,
    scanWithConcurrentWalking,
    scanWithGenericSearch,
    abortScan,
  };
};
