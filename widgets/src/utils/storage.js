const STORAGE_PREFIX = 'vdcrt_';

export function setStorageItem(key, value) {
    try {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        localStorage.setItem(STORAGE_PREFIX + key, serialized);
    } catch {
        // localStorage may be unavailable (private browsing, storage full, etc.)
    }
}

export function getStorageItem(key, fallback = null) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    } catch {
        return fallback;
    }
}

export function removeStorageItem(key) {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
        // silent fail
    }
}

export function setSessionItem(key, value) {
    try {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        sessionStorage.setItem(STORAGE_PREFIX + key, serialized);
    } catch {
        // sessionStorage may be unavailable (private browsing, storage full, etc.)
    }
}

export function getSessionItem(key, fallback = null) {
    try {
        return sessionStorage.getItem(STORAGE_PREFIX + key) ?? fallback;
    } catch {
        return fallback;
    }
}