import { useState, useRef, useEffect } from 'react';

export const useConcurrentDirectoryScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const abortControllerRef = useRef(null);

  const abortScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.aborted = true;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => abortScan();
  }, []);

  const matchesExcludePattern = (directoryName, excludePatterns) => {
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
    maxConcurrentScans = 3
  }) => {
    if (!rootPath) return;

    abortScan();
    const abortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    const directoryQueue = [rootPath];
    let activeScans = 0;
    let resolveWhenIdle;

    const processDirectory = async (directoryPath) => {
      if (abortController.aborted) return;

      try {
        const response = await window.electronAPI.readdir(directoryPath);
        if (abortController.aborted || !response.success) return;

        const matchedFiles = [];
        
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
        const nextDirectory = directoryQueue.shift();
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
      await new Promise(resolve => {
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
    filterTest
  }) => {
    if (!rootPath) return;

    abortScan();
    const abortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    const directoryQueue = [rootPath];
    let activeScans = 0;
    let resolveWhenIdle;

    const processDirectory = async (directoryPath) => {
      if (abortController.aborted) return;

      try {
        const response = await window.electronAPI.readdir(directoryPath);
        if (abortController.aborted || !response.success) return;

        const matchedFiles = [];
        
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
        const nextDirectory = directoryQueue.shift();
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
      await new Promise(resolve => {
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
    filterTest
  }) => {
    if (!rootPath) return;

    abortScan();
    const abortController = { aborted: false };
    abortControllerRef.current = abortController;

    setIsScanning(true);
    setScanResults([]);

    try {
      const searchId = Date.now();

      const handleSearchComplete = (data) => {
        if (data.searchId === searchId && !abortController.aborted) {
          console.log(`Smart Folders received ${data.results.length} total results from search`);
          
          let filteredResults = data.results.filter(filterTest);
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
          useDefaultExcludes: false 
        },
        searchId
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
    abortScan
  };
};
