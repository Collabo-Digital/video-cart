/**
 * Widget runtime: finds .video-cart-container nodes, fetches feed data, mounts SolidJS widget.
 */

import { render } from 'solid-js/web';
import { getWidget, registerWidget } from './core/registry';
import { CONTAINER_SELECTOR } from './core/config';
import { api } from './api';
import { VideoCarousel } from './components/Carousel/Carousel';
import { VideoStories } from './components/Stories/Stories';
import { VideoFloating } from './components/Floating/Floating';
import { VideoGrid } from './components/Grid/Grid';

const DEFAULT_WIDGET_TYPE = 'carousel';

function registerStorefrontWidgets() {
  registerWidget({ type: 'carousel', component: VideoCarousel });
  registerWidget({ type: 'stories', component: VideoStories });
  registerWidget({ type: 'floating', component: VideoFloating });
  registerWidget({ type: 'grid', component: VideoGrid });
}

export async function initFeeds() {
  registerStorefrontWidgets();

  const containers = document.querySelectorAll(CONTAINER_SELECTOR);
  if (!containers.length) return;

  if (typeof window !== 'undefined') {
    window.__video_cart_config__ = window.__video_cart_config__ || {};
    window.__video_cart_config__.widgets = window.__video_cart_config__.widgets || [];
  }

  const widgets = window.__video_cart_config__?.widgets || [];

  for (const container of containers) {
    if (container.dataset.videoCartInitialized === 'true') continue;
    const feedId = container.dataset.feedId;
    const containerId = container.dataset.containerId;
    const shop = container.dataset.shop;

    if (!feedId || !containerId) continue;

    const mountEl = document.getElementById(containerId);
    if (!mountEl) continue;

    const cached = widgets.find((entry) => entry.containerId === containerId);

    try {
      let feed;
      if (cached) {
        feed = cached;
      } else {
        feed = await api.feeds.fetchFeed(feedId, shop);
        const widgetEntry = { feedId, containerId, shop, ...feed };
        const alreadyStored = widgets.some((entry) => entry.containerId === containerId);
        if (!alreadyStored && window.__video_cart_config__?.widgets) {
          window.__video_cart_config__.widgets.push(widgetEntry);
        }
      }
      if (!feed.shop) feed.shop = shop;

      const widgetType = feed.widgetType || DEFAULT_WIDGET_TYPE;
      const widgetDef = getWidget(widgetType);
      if (!widgetDef?.component) {
        throw new Error(`Unknown widget type: ${widgetType}`);
      }

      mountEl.innerHTML = '';
      render(
        () =>
          widgetDef.component({
            feed,
            videos: feed.videos || [],
            settings: feed.settings || {},
          }),
        mountEl
      );
      container.dataset.videoCartInitialized = 'true';
    } catch (err) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && typeof console?.error === 'function') {
        console.error('Video feed error:', err);
      }
      // mountEl.innerHTML = '<p style="text-align:center;padding:1rem;color:#6b7280;">Error loading video feed.</p>';
    }
  }
}
