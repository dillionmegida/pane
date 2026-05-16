/**
 * Modal Persistence Helpers
 * 
 * Handles URL-like serialization/deserialization of modal states
 * with debounced storage writes to avoid excessive writes.
 */

// ─── Modal Type Constants ─────────────────────────────────────────────────────

export const MODAL_TYPES = {
  SEARCH: 'search',
  ALL_TAGS: 'allTags',
  SMART_FOLDERS: 'smartFolders',
  TAG_BROWSER: 'tagBrowser',
  TAG_MANAGER: 'tags',
  SIZE_VIZ: 'sizeViz',
  SETTINGS: 'settings',
  PERMISSIONS: 'permissions',
} as const;

export type ModalType = typeof MODAL_TYPES[keyof typeof MODAL_TYPES];

// ─── Modal State Interfaces ───────────────────────────────────────────────────

export interface SearchModalState {
  query: string;
  useRegex: boolean;
  contentSearch: boolean;
  rootSearch: boolean;
  excludedDirs: string[];
}

export interface AllTagsModalState {
  // Currently no specific state to persist for AllTagsModal
}

export interface SmartFoldersModalState {
  selectedFilterType: string;
  fileSizeInputMB: string;
  excludedDirectories: string[];
}

export interface ModalState {
  [MODAL_TYPES.SEARCH]?: SearchModalState;
  [MODAL_TYPES.ALL_TAGS]?: AllTagsModalState;
  [MODAL_TYPES.SMART_FOLDERS]?: SmartFoldersModalState;
}

// ─── URL Encoding/Decoding Helpers ───────────────────────────────────────────

/**
 * Encodes an object into a URL-like query string
 */
export function encodeToQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, String(value));
      }
    }
  });
  return params.toString();
}

/**
 * Decodes a URL-like query string into an object
 */
export function decodeFromQueryString(queryString: string): Record<string, any> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, any> = {};
  params.forEach((value, key) => {
    // Try to detect comma-separated arrays
    if (value.includes(',')) {
      result[key] = value.split(',');
    } else {
      // Convert boolean strings to actual booleans
      if (value === 'true') {
        result[key] = true;
      } else if (value === 'false') {
        result[key] = false;
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

// ─── Modal State Serialization ─────────────────────────────────────────────────

/**
 * Serializes modal state to a URL-like string
 * Format: openModal=search&filters=Root,Search Term&useRegex=true
 */
export function serializeModalState(modalType: ModalType, state: any): string {
  const base = { openModal: modalType };
  const filters = encodeToQueryString(state);
  const combined = { ...base, ...(filters ? { filters } : {}) };
  return encodeToQueryString(combined);
}

/**
 * Deserializes a URL-like string back to modal type and state
 */
export function deserializeModalState(serialized: string): { modalType: ModalType | null; state: any } {
  try {
    const parsed = decodeFromQueryString(serialized);
    const modalType = parsed.openModal as ModalType;
    const filtersStr = parsed.filters;
    
    let state: any = {};
    if (filtersStr) {
      state = decodeFromQueryString(filtersStr);
    }
    
    // Remove openModal from state as it's not part of the modal's internal state
    delete state.openModal;
    
    return { modalType, state };
  } catch {
    return { modalType: null, state: {} };
  }
}

// ─── Debounced Storage Write Helper ──────────────────────────────────────────

/**
 * Creates a debounced function that writes to electron storage
 */
export function createDebouncedStorageWrite(key: string, delay: number = 500): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (value: string) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      window.electronAPI.storeSet(key, value);
      timeoutId = null;
    }, delay);
  };
}

// ─── Modal State Persistence Functions ───────────────────────────────────────

const MODAL_STATE_STORAGE_KEY: string = 'modalState';

/**
 * Saves modal state to storage with debouncing
 */
export const saveModalState = createDebouncedStorageWrite(MODAL_STATE_STORAGE_KEY, 500);

/**
 * Loads modal state from storage
 */
export async function loadModalState(): Promise<{ modalType: ModalType | null; state: any }> {
  try {
    const serialized = await window.electronAPI.storeGet(MODAL_STATE_STORAGE_KEY) as string;
    if (!serialized) return { modalType: null, state: {} };
    return deserializeModalState(serialized);
  } catch {
    return { modalType: null, state: {} };
  }
}

/**
 * Clears modal state from storage
 */
export async function clearModalState(): Promise<void> {
  await window.electronAPI.storeSet(MODAL_STATE_STORAGE_KEY, '');
}

/**
 * Public API for persisting modal state (for use in components)
 * Takes modal type and state, serializes them, and saves with debouncing
 */
export function persistModalState(modalType: ModalType, state: any): void {
  const serialized = serializeModalState(modalType, state);
  saveModalState(serialized);
}

/**
 * Immediate save of modal state (bypasses debouncing)
 * Use this when you need to save immediately (e.g., on modal close)
 */
export function persistModalStateImmediate(modalType: ModalType, state: any): void {
  const serialized = serializeModalState(modalType, state);
  // Safe check for test environments where electronAPI might not be fully mocked
  if (window.electronAPI && typeof window.electronAPI.storeSet === 'function') {
    window.electronAPI.storeSet(MODAL_STATE_STORAGE_KEY, serialized);
  }
}

// ─── Modal-Specific Helpers ─────────────────────────────────────────────────

/**
 * Creates a search modal state object
 */
export function createSearchModalState(
  query: string = '',
  useRegex: boolean = false,
  contentSearch: boolean = false,
  rootSearch: boolean = false,
  excludedDirs: string[] = ['node_modules', '.git', 'venv', '.venv', '__pycache__', '.pytest_cache']
): SearchModalState {
  return { query, useRegex, contentSearch, rootSearch, excludedDirs };
}

/**
 * Creates a smart folders modal state object
 */
export function createSmartFoldersModalState(
  selectedFilterType: string = 'large',
  fileSizeInputMB: string = '1000',
  excludedDirectories: string[] = ['node_modules', '.git', 'venv', '.venv', '__pycache__', '.pytest_cache']
): SmartFoldersModalState {
  return { selectedFilterType, fileSizeInputMB, excludedDirectories };
}
