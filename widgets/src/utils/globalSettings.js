import { createSignal } from 'solid-js';

/**
 * App-level settings, fetched once from the app proxy by main.jsx.
 *
 * A signal rather than a bare read of window.__video_cart_config__.settings:
 * that fetch races initFeeds(), so every widget — and the overlay it renders —
 * mounts before the settings land. Anything read from a component body has to
 * re-run when they arrive, and a plain property read cannot.
 *
 * Seeded from the window in case something imports this after the fetch has
 * already resolved.
 */
const [globalSettings, setGlobalSettings] = createSignal(
    typeof window !== 'undefined' ? window.__video_cart_config__?.settings ?? null : null
);

export { globalSettings, setGlobalSettings };
