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
import { getUniqueClassIdentifier } from '../../utils/designStyles';
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
  showNavIcon: true,
  navLabel: 'Videos',
};

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

function resolveInlineTarget(element) {
  if (!element) return null;
  const tag = element.tagName?.toLowerCase();
  if (tag === 'nav' || tag === 'header') {
    return element.querySelector('ul, ol') || element;
  }
  return element;
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

  const uniqueClass = getUniqueClassIdentifier(settings?.design);
  const wrapperClass = [
    isInline ? 'vc-discovery vc-discovery-inline' : `vc-discovery vc-discovery-floating vc-discovery-btn-${position}`,
    uniqueClass,
  ].filter(Boolean).join(' ');

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
  if (existing) existing.remove();

  const mountEl = document.createElement('div');
  mountEl.id = 'vc-discovery-root';

  const design = settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  if (uniqueClass) mountEl.classList.add(uniqueClass);

  if (layoutStyle === 'inline') {
    const selector = normalizeSelector(deviceSettings.inlinePosition);
    const found = await waitForElement(selector);
    const target = resolveInlineTarget(found);
    if (!target) {
      console.warn(`[Video Discovery] Could not find element: "${selector}"`);
      return;
    }

    if (target.matches('ul, ol')) {
      const listItem = document.createElement('li');
      listItem.className = 'vc-discovery-nav-item';
      if (uniqueClass) listItem.classList.add(uniqueClass);
      listItem.appendChild(mountEl);
      target.appendChild(listItem);
    } else {
      target.appendChild(mountEl);
    }
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
