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

let _previewDispose = null;

export function renderPreviewWidget(mountEl, payload) {
  registerStorefrontWidgets(); // safe to call multiple times

  const { feed, settings, videos } = payload || {};
  if (!feed || !mountEl) return;

  const widgetType = feed.widgetType || 'carousel';
  const widgetDef = getWidget(widgetType);
  if (!widgetDef?.component) {
    mountEl.innerHTML = `<p style="color:#b91c1c;">Unknown widget type: ${widgetType}</p>`;
    return;
  }

  if (_previewDispose) {
    _previewDispose();
    _previewDispose = null;
  }

  mountEl.innerHTML = '';

  _previewDispose = render(
    () => widgetDef.component({
      feed,
      videos: videos || feed.videos || [],
      settings: settings || feed.settings || {},
      isPreview: true,
    }),
    mountEl
  );
}

// Expose on window for the preview HTML page to call
if (typeof window !== 'undefined') {
  window.__video_cart_preview__ = {
    renderPreviewWidget,
  };
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
  const logError = (err) => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && typeof console?.error === 'function') {
      console.error('Video feed error:', err);
    }
  };

  // Collect the containers that still need mounting.
  const jobs = [];
  for (const container of containers) {
    if (container.dataset.videoCartInitialized === 'true') continue;
    const feedId = container.dataset.feedId;
    const containerId = container.dataset.containerId;
    const shop = container.dataset.shop;

    if (!feedId || !containerId) continue;

    const mountEl = document.getElementById(containerId);
    if (!mountEl) continue;

    jobs.push({ container, feedId, containerId, shop, mountEl });
  }
  if (!jobs.length) return;

  // Fetch every feed in parallel. Previously this awaited inside the loop, so N
  // widgets on a page cost N sequential uncached proxy round-trips.
  const feeds = await Promise.all(
    jobs.map((job) => {
      const cached = widgets.find((entry) => entry.containerId === job.containerId);
      if (cached) return Promise.resolve(cached);

      return api.feeds
        .fetchFeed(job.feedId, job.shop)
        .then((feed) => {
          const alreadyStored = widgets.some((entry) => entry.containerId === job.containerId);
          if (!alreadyStored && window.__video_cart_config__?.widgets) {
            window.__video_cart_config__.widgets.push({
              feedId: job.feedId,
              containerId: job.containerId,
              shop: job.shop,
              ...feed,
            });
          }
          return feed;
        })
        .catch((err) => {
          // Isolate failures so one bad feed can't stop the others rendering.
          logError(err);
          return null;
        });
    })
  );

  const currentPage = window.__video_cart_config__?.store_page || 'other';

  jobs.forEach((job, i) => {
    const feed = feeds[i];
    if (!feed) return;

    try {
      if (!feed.shop) feed.shop = job.shop;

      const feedPage = feed.widgetPage || 'homePage';
      if (feedPage === 'custom') {
        if (window.location.pathname !== feed.customPagePath) return;
      } else if (currentPage !== feedPage) {
        return;
      }

      const widgetType = feed.widgetType || DEFAULT_WIDGET_TYPE;
      const widgetDef = getWidget(widgetType);
      if (!widgetDef?.component) {
        throw new Error(`Unknown widget type: ${widgetType}`);
      }

      job.mountEl.innerHTML = '';
      render(
        () =>
          widgetDef.component({
            feed,
            videos: feed.videos || [],
            settings: feed.settings || {},
          }),
        job.mountEl
      );
      job.container.dataset.videoCartInitialized = 'true';
    } catch (err) {
      logError(err);
    }
  });
}
