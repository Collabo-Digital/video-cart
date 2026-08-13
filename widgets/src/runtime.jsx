/**
 * Widget runtime: finds .video-cart-container nodes, fetches feed data, mounts SolidJS widget.
 */

import { Show } from 'solid-js';
import { render } from 'solid-js/web';
import { getWidget, registerWidget } from './core/registry';
import { CONTAINER_SELECTOR } from './core/config';
import { useDeviceVisible } from './hooks/useDeviceVisible';
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

  // Collect the containers that still need mounting, split by how they name
  // their feed. A pasted feed id (the Advanced override) always wins; every
  // other block is resolved from its stable Shopify block id.
  const idJobs = [];
  const blockJobs = [];
  for (const container of containers) {
    if (container.dataset.videoCartInitialized === 'true') continue;
    const containerId = container.dataset.containerId;
    if (!containerId) continue;

    const mountEl = document.getElementById(containerId);
    if (!mountEl) continue;

    const job = {
      container,
      containerId,
      mountEl,
      shop: container.dataset.shop,
      feedId: (container.dataset.feedId || '').trim(),
      blockId: container.dataset.blockId,
    };

    if (job.feedId) idJobs.push(job);
    else if (job.blockId) blockJobs.push(job);
  }
  if (!idJobs.length && !blockJobs.length) return;

  // One request for every auto block on the page, however many there are.
  if (blockJobs.length) {
    const blockMap = await api.feeds
      .resolveBlocks(blockJobs.map((job) => job.blockId))
      .catch((err) => {
        logError(err);
        return {};
      });
    blockJobs.forEach((job) => { job.feed = blockMap[job.blockId] || null; });
  }

  // Fetch every explicitly-identified feed in parallel. Previously this awaited
  // inside the loop, so N widgets on a page cost N sequential uncached proxy
  // round-trips.
  const feeds = await Promise.all(
    idJobs.map((job) => {
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

  idJobs.forEach((job, i) => { job.feed = feeds[i]; });

  [...idJobs, ...blockJobs].forEach((job) => {
    const feed = job.feed;
    if (!feed) return;

    try {
      if (!feed.shop) feed.shop = job.shop;

      // The page gate applies only to the pasted-id path, where the feed was
      // never chosen for this specific block. A block mapping is an explicit
      // per-block choice — second-guessing it by page would silently ignore
      // what the merchant picked.
      if (job.feedId) {
        const feedPage = feed.widgetPage || 'homePage';
        if (feedPage === 'custom') {
          if (window.location.pathname !== feed.customPagePath) return;
        } else if (currentPage !== feedPage) {
          return;
        }
      }

      const widgetType = feed.widgetType || DEFAULT_WIDGET_TYPE;
      const widgetDef = getWidget(widgetType);
      if (!widgetDef?.component) {
        throw new Error(`Unknown widget type: ${widgetType}`);
      }

      job.mountEl.innerHTML = '';
      render(() => {
        const settings = feed.settings || {};
        const deviceVisible = useDeviceVisible(settings);
        // Callback child, not a bare call: Show must not evaluate the component
        // while hidden, or a mobile-disabled feed still mounts its video elements
        // on desktop. It is also what makes crossing the breakpoint unmount the
        // widget and stop playback, rather than just hiding it.
        return (
          <Show when={deviceVisible()}>
            {() => widgetDef.component({ feed, videos: feed.videos || [], settings })}
          </Show>
        );
      }, job.mountEl);
      // The container *has* been initialised — it is just rendering nothing at
      // this width. Gating this would let a later initFeeds pass mount a second copy.
      job.container.dataset.videoCartInitialized = 'true';
    } catch (err) {
      logError(err);
    }
  });
}
