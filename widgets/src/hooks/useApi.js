/**
 * SolidJS hook for API calls: data, loading, error, execute.
 * Use with api services: useApi(api.feeds.fetchFeed, false) then execute(feedId, shop).
 */

import { createSignal, onMount } from 'solid-js';

/**
 * @param {(...args: unknown[]) => Promise<unknown>} apiFunction - Service method (e.g. api.feeds.fetchFeed)
 * @param {boolean} [immediate=false] - If true, call execute() once on mount (no args).
 * @returns {{ data: () => unknown, loading: () => boolean, error: () => string | null, execute: (...args: unknown[]) => Promise<unknown> }}
 */
export function useApi(apiFunction, immediate = false) {
  const [data, setData] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);

  const execute = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const message = err?.message || 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  if (immediate) {
    onMount(() => {
      execute();
    });
  }

  return {
    data,
    loading,
    error,
    execute,
  };
}
