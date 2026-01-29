import { VideoCarousel } from './components/VideoCarousel';
import { registerWidget } from './core/registry';
import { initFeeds } from './runtime';

registerWidget({
  type: 'carousel',
  component: VideoCarousel,
});

if (typeof window !== 'undefined') {
  window.VideoCartWidgets = { initFeeds };
  window.dispatchEvent(new Event('video-cart-ready'));
}

function init() {
  console.log("initFeeds");
  initFeeds();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

