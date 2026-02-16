/**
 * useSocialImport
 *
 * Custom hook for resolving and importing Instagram/TikTok URLs via API.
 * Encapsulates API calls so components stay thin (per ARCHITECTURE).
 *
 * @returns {Object} State and handlers for resolve/import
 */

import { useState, useCallback } from 'react';

const RESOLVE_ENDPOINT = '/api/v1/videos/resolve-social';
const IMPORT_ENDPOINT = '/api/v1/videos/import-social';

/**
 * @param {string} source - 'instagram' | 'tiktok'
 * @param {string} url - Post URL
 * @returns {Promise<Object>} Resolved preview data
 */
async function resolveUrl(source, url) {
  const res = await fetch(RESOLVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, url }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to resolve URL');
  }
  return json.data;
}

/**
 * @param {string} source - 'instagram' | 'tiktok'
 * @param {string} url - Post URL
 * @returns {Promise<Object>} Imported video payload
 */
async function importUrl(source, url) {
  const res = await fetch(IMPORT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, url }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to import');
  }
  return json.data;
}

/**
 * @param {string} source - 'instagram' | 'tiktok'
 * @returns {Object} resolveUrls, importByUrl, loading, importing, error
 */
export function useSocialImport(source) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const resolveUrls = useCallback(
    async (urls) => {
      if (!urls?.length) return [];
      setLoading(true);
      setError(null);
      try {
        const results = [];
        for (const url of urls.slice(0, 12)) {
          const d = await resolveUrl(source, url);
          console.log('d results ----->', d);
          results.push({
            id: d.postUrl,
            postUrl: d.postUrl,
            thumbnail: d.thumbnail,
            title: d.title || d.postUrl,
          });
        }
        return results;
      } catch (e) {
        setError(e.message || 'Failed to fetch previews');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [source]
  );

  const importByUrl = useCallback(
    async (url) => {
      setError(null);
      return importUrl(source, url);
    },
    [source]
  );

  return {
    resolveUrls,
    importByUrl,
    loading,
    importing,
    error,
    setError,
  };
}
