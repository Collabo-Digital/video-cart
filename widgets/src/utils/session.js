/**
 * Anonymous first-party visitor/session identity. No PII — random ids only,
 * stored under the vdcrt_ prefix. Used to key analytics events (vid/sid) and
 * to carry attribution through ATC intents and order items.
 */

import { getStorageItem, setStorageItem, getSessionItem, setSessionItem } from './storage';

function newId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Visitor id — persists across visits (localStorage). */
export function getVisitorId() {
    let id = getStorageItem('visitor');
    if (!id) {
        id = newId();
        setStorageItem('visitor', id);
    }
    return id;
}

/** Session id — lives for this tab only (sessionStorage). */
export function getSessionId() {
    let id = getSessionItem('session');
    if (!id) {
        id = newId();
        setSessionItem('session', id);
    }
    return id;
}
