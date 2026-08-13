/* eslint-disable react/prop-types -- widget contract: videos, settings */
import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import {
  productsForVideo,
  productPrice,
  getButtonStyle,
} from '../../utils/widgetHelpers';
import { createProductClickHandler } from '../../utils/productClickHandler';
import ReelIcon from '../../assets/Icons/reelIcon';
import './discovery.css';

const MOBILE_BREAKPOINT = 768;
const HTML_TAGS = new Set(['nav', 'header', 'footer', 'main', 'aside', 'div', 'section', 'ul', 'ol', 'li']);
const DEVICE_DEFAULTS = {
  isVisible: true,
  layoutStyle: 'floating',
  floatingPosition: 'bottom',
  floatingBgColor: '#111827',
  inlinePosition: 'nav',
  inlineInsertMode: 'append',
  showNavIcon: true,
  navLabel: 'Videos',
};

const INSERT_MODES = new Set(['append', 'prepend', 'before', 'after']);

/** Turn admin input into a valid querySelector (e.g. "header__icons" → ".header__icons", "nav" stays "nav"). */
function normalizeSelector(raw) {
  const s = (raw || 'nav').trim();
  if (!s) return 'nav';
  if (/^[.#\[]/.test(s)) return s;
  if (HTML_TAGS.has(s.toLowerCase())) return s;
  return `.${s}`;
}

function waitForElement(selector, maxWaitMs = 8000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + maxWaitMs;
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        observer.disconnect();
        resolve(el);
      } else if (Date.now() >= deadline) {
        clearInterval(interval);
        observer.disconnect();
        resolve(null);
      }
    }, 200);
  });
}

function wrapListItem(mountEl) {
  const listItem = document.createElement('li');
  listItem.className = 'vc-discovery-nav-item';
  listItem.appendChild(mountEl);
  return listItem;
}

/**
 * Place the discovery mount relative to the merchant's navigation target.
 *
 * The selector names the parent verbatim: prepend/append go inside it, first and
 * last; before/after become its previous and next sibling. Nothing descends into
 * inner containers — pointing at a <nav> means the <nav>, not the <ul> inside it.
 *
 * The one wrinkle is list markup: a direct child of <ul>/<ol> has to be an <li>,
 * so the mount is wrapped whenever it would otherwise land in a list.
 */
function insertInline(target, mountEl, mode) {
  // before/after fall back to appending inside when the target has no parent
  // (a selector resolving to <html>), which would otherwise throw.
  const asSibling = (mode === 'before' || mode === 'after') && Boolean(target.parentNode);
  const container = asSibling ? target.parentNode : target;

  let node = mountEl;
  if (container.matches?.('ul, ol')) {
    node = wrapListItem(mountEl);
  } else {
    mountEl.classList.add('vc-discovery-nav-host');
  }

  if (asSibling) target[mode](node);
  else if (mode === 'prepend') container.prepend(node);
  else container.appendChild(node);
}

export function resolveShowNavIcon(value) {
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return true;
}

export function getDeviceSettings() {
  const vd = window.__video_cart_config__?.settings?.general?.videoDiscovery;
  if (!vd) return null;
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const device = isMobile ? vd.mobile : vd.desktop;
  const merged = { ...DEVICE_DEFAULTS, ...device };
  merged.showNavIcon = resolveShowNavIcon(device?.showNavIcon ?? merged.showNavIcon);
  return merged;
}

export function VideoDiscovery({ videos, settings, layoutStyle = 'floating', showNavIcon: showNavIconProp }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const deviceSettings = getDeviceSettings();
  if (!deviceSettings?.isVisible) return null;

  const isInline = layoutStyle === 'inline';
  const position = deviceSettings.floatingPosition || 'bottom';
  const navLabel = deviceSettings.navLabel || 'Videos';
  const showNavIcon = resolveShowNavIcon(
    showNavIconProp !== undefined ? showNavIconProp : deviceSettings.showNavIcon
  );
  const fabBgColor = deviceSettings.floatingBgColor || '#111827';

  const addToCartButtonLabel = () => settings?.translation?.addToCartText || 'Shop Now';
  const addToCartButtonStyle = () => getButtonStyle(null, settings);
  const handleProductClick = createProductClickHandler({
    feed: null,
    settings,
    onEvent: null,
    source: 'discovery',
    isPreview: false,
  });

  const openOverlay = () => {
    if (!videos?.length) return;
    setExpandedIndex(0);
  };

  // The global custom class lives on <body> (see applyGlobalClass), so nothing
  // here re-applies it.
  const wrapperClass = isInline
    ? 'vc-discovery vc-discovery-inline'
    : `vc-discovery vc-discovery-floating vc-discovery-btn-${position}`;

  return (
    <Show when={videos?.length > 0}>
      <div className={wrapperClass}>
        <button
          type="button"
          className="vc-discovery-trigger"
          style={isInline ? undefined : { background: fabBgColor }}
          aria-label="Open Video Discovery"
          onClick={openOverlay}
        >
          {showNavIcon ? <ReelIcon /> : null}
          {navLabel ? <span className="vc-discovery-label">{navLabel}</span> : null}
        </button>

        <VideoOverlayPlayer
          videos={videos}
          expandedIndex={expandedIndex}
          setExpandedIndex={setExpandedIndex}
          productsForVideo={productsForVideo}
          productPrice={productPrice}
          addToCartButtonLabel={addToCartButtonLabel}
          addToCartButtonStyle={addToCartButtonStyle}
          // Discovery has no feed, so it reads the global settings instead.
          buttonBehavior={() => settings?.general?.buttonBehavior}
          handleProductClick={handleProductClick}
          onVideoChange={() => {}}
          onFirstPlay={() => {}}
        />
      </div>
    </Show>
  );
}

export async function mountDiscovery(videos, settings) {
  const deviceSettings = getDeviceSettings();
  if (!deviceSettings?.isVisible) return;

  const layoutStyle = deviceSettings.layoutStyle || 'floating';
  const existing = document.getElementById('vc-discovery-root');
  // Remove the <li> wrapper too — dropping only the root leaves an empty bullet
  // behind in the theme's nav on any re-mount.
  if (existing) (existing.closest('.vc-discovery-nav-item') || existing).remove();

  const mountEl = document.createElement('div');
  mountEl.id = 'vc-discovery-root';

  if (layoutStyle === 'inline') {
    const selector = normalizeSelector(deviceSettings.inlinePosition);
    const target = await waitForElement(selector);
    if (!target) {
      console.warn(`[Video Discovery] Could not find element: "${selector}"`);
      return;
    }

    // A stale or hand-edited settings blob must not silently produce a no-op.
    const mode = INSERT_MODES.has(deviceSettings.inlineInsertMode)
      ? deviceSettings.inlineInsertMode
      : 'append';
    insertInline(target, mountEl, mode);
  } else {
    document.body.appendChild(mountEl);
  }

  render(
    () => (
      <VideoDiscovery
        videos={videos}
        settings={settings}
        layoutStyle={layoutStyle}
        showNavIcon={resolveShowNavIcon(deviceSettings.showNavIcon)}
      />
    ),
    mountEl
  );
}
