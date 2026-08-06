/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal, createEffect, createMemo, onCleanup } from 'solid-js';
import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import './grid.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import { Toast } from '../common/Toast/Toast';
import { trackDbEvent } from '../../utils/analytics';
import { useToast } from '../../hooks/useToast';
import {
  productsForVideo,
  productPrice,
  getAddToCartLabel,
  getButtonStyle,
  getProductHandle,
} from '../../utils/widgetHelpers';
import { createProductClickHandler } from '../../utils/productClickHandler';
import { THUMB_CARD } from '../../core/constant';
import { EMPTY_VIDEOS, LABEL_SHOP_PRODUCT } from '../../constants/strings';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../utils/designStyles';
import { ProductOverlay } from '../common/ProductOverlay/ProductOverlay';

const DEFAULT_SUBTITLE = '';

export function VideoGrid({ feed, videos, settings, onEvent, isPreview }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();
  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);
  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    showToast,
    source: 'grid',
    isPreview,
  });
  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const hoverEffect = () => design?.hoverEffect || 'lift';
  const autoplay = () => settings?.general.autoPlay ?? feed?.settings?.general.autoPlay;


  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || DEFAULT_SUBTITLE;

  createEffect(() => {
    const container = containerRef();
    const design = settings?.design ?? feed?.settings?.design;
    const general = settings?.general ?? feed?.settings?.general;
    const styles = buildDesignStyles(design, general);
    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }

    if (container) {
      injectCustomCss(container, design);
    }
  });

  const handleCardLinkClick = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPreview) return;
    const first = video?.productsTagged?.[0];
    const product = first ? (typeof first === 'object' ? first : { handle: first }) : null;
    if (product) handleProductClick(product, video);
  };

  const handleVideoClick = (video, index) => {
    if (isPreview) return;
    setExpandedIndex(index);
  };

  /** Responsive column count — mirrors the CSS: --vdcrt-columns on desktop, 2 on mobile */
  const [cols, setCols] = createSignal(2);
  createEffect(() => {
    const container = containerRef();
    if (!container) return;
    const mql = window.matchMedia('(max-width: 768px)');
    const compute = () => {
      if (mql.matches) {
        setCols(2);
        return;
      }
      const v = parseInt(getComputedStyle(container).getPropertyValue('--vdcrt-columns'), 10);
      setCols(Number.isFinite(v) && v > 0 ? v : 2);
    };
    compute();
    mql.addEventListener('change', compute);
    onCleanup(() => mql.removeEventListener('change', compute));
  });

  /** Videos chunked into rows of cols() — each row is its own grid, so the
   * accordion can resize one row without touching the rows below. */
  const rows = createMemo(() => {
    const n = cols();
    const list = videos ?? [];
    const out = [];
    for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
    return out;
  });

  /** Accordion expand, scoped to the hovered card's ROW: its siblings in the same
   * row compress; rows above/below never change. Heights are locked during the
   * animation and released after it ends (no page jump). */
  const GRID_ACCORDION_GROW = 2.2;
  let gridResetTimer = null;

  const allRows = () => [...(containerRef()?.querySelectorAll('.video-grid-row') ?? [])];

  const clearGridAccordion = () => {
    const cards = [...(containerRef()?.querySelectorAll('.video-grid-card') ?? [])];
    allRows().forEach((r) => {
      r.style.gridTemplateColumns = '';
    });
    cards.forEach((c) => c.classList.remove('video-grid-card-expanded'));
    clearTimeout(gridResetTimer);
    gridResetTimer = setTimeout(() => {
      cards.forEach((c) => {
        c.style.height = '';
        c.style.aspectRatio = '';
      });
    }, 400);
  };

  onCleanup(() => clearTimeout(gridResetTimer));

  const applyGridAccordion = (cardEl) => {
    clearTimeout(gridResetTimer);
    const row = cardEl?.closest('.video-grid-row');
    if (!row) return;
    const rowCards = [...row.querySelectorAll('.video-grid-card')];
    const n = getComputedStyle(row).gridTemplateColumns.split(' ').length;
    const col = rowCards.indexOf(cardEl);
    if (n < 2 || rowCards.length < 2 || col < 0) return;
    allRows().forEach((r) => {
      if (r !== row) r.style.gridTemplateColumns = '';
    });
    // fractional measurement from an untouched card (rounded locks drift the layout)
    const baseH = (rowCards.find((c) => !c.style.height) ?? cardEl).getBoundingClientRect().height;
    // cap so the expanded column never exceeds ~55% of the row (matters at 2 columns)
    const grow = Math.min(GRID_ACCORDION_GROW, (0.55 / 0.45) * (n - 1));
    row.style.gridTemplateColumns = Array.from({ length: n }, (_, i) => (i === col ? `${grow}fr` : '1fr')).join(' ');
    rowCards.forEach((c) => {
      c.style.height = `${baseH}px`;
      c.style.aspectRatio = 'auto';
      c.classList.toggle('video-grid-card-expanded', c === cardEl);
    });
  };

  const handleCardMouseEnter = (index, e) => {
    if (autoplay() === 'onHover') setHoveredIndex(index);
    if (hoverEffect() === 'expand') applyGridAccordion(e?.currentTarget);
  };

  const handleCardMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };

  return (
    <section className={`video-grid-container hover-${hoverEffect()}${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
      <VideoOverlayPlayer
        videos={videos}
        expandedIndex={expandedIndex}
        setExpandedIndex={setExpandedIndex}
        productsForVideo={productsForVideo}
        productPrice={productPrice}
        addToCartButtonLabel={addToCartButtonLabel}
        addToCartButtonStyle={addToCartButtonStyle}
        buttonBehavior={() => feed?.settings?.general?.buttonBehavior}
        handleProductClick={handleProductClick}
        onVideoChange={async (video, index) => {
          onEvent?.('video_change', { feedId: feed?.id, videoId: video?.id, index, source: 'grid' });
          if (feed?.id && video?.id && !isPreview) {
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id || isPreview) return;
          await trackDbEvent({
            feedId: feed.id,
            videoId: video.id,
            eventType: EVENT_TYPES.VIDEO_VIEW,
            watchTimeSeconds,
          });
        }}
      />

      <header className="video-grid-header">
        <h2 className="video-grid-title">{title()}</h2>
        <Show when={subtitle()}>
          <p className="video-grid-subtitle">{subtitle()}</p>
        </Show>
      </header>

      <Show
        when={Array.isArray(videos) && videos.length > 0}
        fallback={<p className="video-grid-empty">{EMPTY_VIDEOS}</p>}
      >
        <div className="video-grid-list" role="list">
          <For each={rows()}>
            {(rowVideos, rowIdx) => (
              <div
                className="video-grid-row"
                role="presentation"
                onMouseLeave={() => hoverEffect() === 'expand' && clearGridAccordion()}
              >
          <For each={rowVideos}>
            {(video, colIdx) => {
              const index = () => rowIdx() * cols() + colIdx();
              const staticThumbUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
              const animatedThumbUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
              const isOnHoverMode = () => autoplay() === 'onHover';
              const isHovered = () => hoveredIndex() === index();
              const thumbUrl = () => {
                if (isOnHoverMode()) return isHovered() ? animatedThumbUrl() : staticThumbUrl();
                if (autoplay() === 'never') return staticThumbUrl();
                return animatedThumbUrl();
              };
              const productHandle = () => getProductHandle(video?.productsTagged?.[0]);

              return (
                <article className="video-grid-card" role="listitem"
                  onMouseEnter={(e) => handleCardMouseEnter(index(), e)}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <button
                    type="button"
                    className="video-grid-card-button"
                    onClick={() => handleVideoClick(video, index())}
                    aria-label={video?.title || `Video ${index() + 1}`}
                  >
                    <Show when={thumbUrl()} fallback={<span className="video-grid-thumb-fallback" aria-hidden="true" />}>
                      <img className="video-grid-thumb" src={thumbUrl()} alt="" loading="lazy" />
                    </Show>
                  </button>

                  <ProductOverlay
                    video={video}
                    addToCartButtonLabel={addToCartButtonLabel}
                    addToCartButtonStyle={addToCartButtonStyle}
                    onProductClick={handleProductClick}
                  />
                </article>
              );
            }}
          </For>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Toast
        visible={toastVisible()}
        message={toastMessage()}
        type={toastType()}
        onClose={() => setToastVisible(false)}
      />
    </section>
  );
}