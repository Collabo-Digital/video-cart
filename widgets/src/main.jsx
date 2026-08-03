/** Entry: fetches global settings, exposes initFeeds on window, and runs it when DOM is ready. */
import { initFeeds } from './runtime';
import { api } from './api';
import { mountDiscovery } from './components/Discovery/Discovery';
import { injectGlobalCustomCss } from './utils/designStyles';

if (typeof window !== 'undefined') {
  window.__video_cart_config__ = window.__video_cart_config__ || {};
  window.__video_cart_config__.initFeeds = initFeeds;
  window.__video_cart_config__.widgets = window.__video_cart_config__.widgets || [];
  window.dispatchEvent(new Event('video-cart-ready'));
}

async function init() {
  if (window.__video_cart_config__?.__initialized) return;
  window.__video_cart_config__.__initialized = true;

  // Global settings and the per-feed fetches are independent (initFeeds uses each
  // feed's own settings), so run them together instead of making every widget wait
  // a full uncached proxy round-trip for the settings call.
  const settingsPromise = api.settings
    .fetchSettings()
    .then(({ settings }) => {
      window.__video_cart_config__.settings = settings;
      injectGlobalCustomCss(settings?.design);
      return settings;
    })
    .catch((err) => {
      console.error('Failed to load global settings:', err);
      return null;
    });

  const [settings] = await Promise.all([settingsPromise, initFeeds()]);

  const vd = settings?.general?.videoDiscovery;
  if (vd?.isEnabled) {
    try {
      const { videos } = await api.settings.fetchDiscoveryVideos();
      window.__video_cart_config__.discoveryVideos = videos;
      if (videos?.length) {
        await mountDiscovery(videos, window.__video_cart_config__.settings);
      }
    } catch (err) {
      console.error('Failed to load discovery videos:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
