import { initFeeds } from './runtime';

if (typeof window !== 'undefined') {
  window.__video_cart_config__ = window.__video_cart_config__ || {};
  window.__video_cart_config__.initFeeds = initFeeds;
  window.__video_cart_config__.widgets = window.__video_cart_config__.widgets || [];
  window.dispatchEvent(new Event('video-cart-ready'));
}

function init() {
  initFeeds();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

