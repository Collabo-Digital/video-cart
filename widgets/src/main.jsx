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

  try {
    const { settings } = await api.settings.fetchSettings();
    window.__video_cart_config__.settings = settings;
    injectGlobalCustomCss(settings?.design);
  } catch (err) {
    console.error('Failed to load global settings:', err);
  }

  await initFeeds();

  const vd = window.__video_cart_config__?.settings?.general?.videoDiscovery;
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
