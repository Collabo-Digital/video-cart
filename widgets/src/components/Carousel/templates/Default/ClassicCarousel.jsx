/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, createMemo, For, Show, createEffect, onCleanup } from 'solid-js';

import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../../../shared/mux';
import { EVENT_TYPES } from '../../../../api/services/analyticsService';
import { ProductOverlay } from '../../../common/ProductOverlay/ProductOverlay';
import { VideoOverlayPlayer } from '../../../common/VideoOverlayPlayer';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../../../utils/designStyles';
import { trackDbEvent } from '../../../../utils/analytics';
import { observeWidgetImpression, trackVideoImpressionOnce } from '../../../../utils/impressionTracker';
import {
  productsForVideo,
  productPrice,
  getAddToCartLabel,
  getButtonStyle,
  getProductHandle,
} from '../../../../utils/widgetHelpers';
import { createProductClickHandler } from '../../../../utils/productClickHandler';
import { THUMB_CARD, PRODUCT_ITEM_GAP } from '../../../../core/constant';
import { LABEL_WATCH, EMPTY_VIDEOS } from '../../../../constants/strings';

import LeftToggleIcon from '../../../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../../../assets/Icons/RightToggleIcon';

import './carousel.css';


const DEFAULT_SUBTITLE = '';
const CLONE_COUNT = 5;


export function ClassicCarousel({ feed, videos, settings, onEvent, isPreview }) {

  const [trackRef, setTrackRef] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);

  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const [currentIndex, setCurrentIndex] = createSignal(0);
  // Measured, not assumed: carousel.css changes the card basis at 768px and the
  // merchant controls the gap, so neither can be hardcoded.
  const [perView, setPerView] = createSignal(0);

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const hoverEffect = () =>  design?.hoverEffect  || 'lift'    ;
  const autoplay = () => settings?.general?.autoPlay ?? feed?.settings?.general?.autoPlay;
  const autoLoop = () => settings?.general?.autoLoop ?? feed?.settings?.general?.autoLoop ?? true;
  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || DEFAULT_SUBTITLE;

  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);

  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    source: 'carousel',
    isPreview,
  });

  const total = () => videos?.length ?? 0;

  // Clones only work once the real videos overflow the viewport. Below that the
  // clones sit INSIDE the visible track — the shopper sees the same video two or
  // three times, and the track is too short to reach the wrap trigger.
  const shouldLoop = () => perView() > 0 && total() > perView();
  const cloneCount = () => (shouldLoop() ? Math.min(CLONE_COUNT, total()) : 0);

  const loopItems = createMemo(() => {
    if (!videos?.length) return [];
    const n = cloneCount();
    if (!n) return videos.slice();
    return [...videos.slice(-n), ...videos, ...videos.slice(0, n)];
  });

  const toTrackIndex = (realIdx) => realIdx + cloneCount();
  const toRealIndex = (trackIdx) => ((trackIdx - cloneCount()) % total() + total()) % total();

  createEffect(() => {
    const container = containerRef();
    const activeDesign = settings?.design ?? feed?.settings?.design;
    const styles = buildDesignStyles(activeDesign);

    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }

    if (container) injectCustomCss(container, activeDesign);
  });

  createEffect(() => {
    observeWidgetImpression(containerRef(), feed, isPreview, onCleanup);
  });

  // Distance between two card origins captures width AND the real gap in one
  // measurement. CARD_GAP (20) disagrees with the CSS gap (12px default,
  // merchant-configurable) and with the flex-basis calc (22px).
  const getStep = () => {
    const el = trackRef();
    const cards = el?.querySelectorAll('.video-carousel-card');
    if (!cards?.length) return 0;
    return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
  };

  const measurePerView = () => {
    const el = trackRef();
    const step = getStep();
    if (!el || !step) return;
    setPerView(Math.max(1, Math.round(el.clientWidth / step)));
  };

  createEffect(() => {
    const el = trackRef();
    // Re-measure when the rendered card list changes (async feed load, clone on/off).
    loopItems();
    if (!el) return;
    measurePerView();
    const ro = new ResizeObserver(measurePerView);
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  });

  const scrollToTrackIndex = (idx, behavior = 'smooth') => {
    const el = trackRef();
    const step = getStep();
    if (!el || !step) return;
    el.scrollTo({ left: idx * step, behavior });
  };

  const getTrackIndex = () => {
    const el = trackRef();
    const step = getStep();
    if (!el || !step) return cloneCount();
    return Math.round(el.scrollLeft / step);
  };

  /** Re-centre whenever cloning switches on or off (and on first paint). */
  createEffect(() => {
    const el = trackRef();
    const n = cloneCount();
    if (!el || !total()) return;
    requestAnimationFrame(() => {
      scrollToTrackIndex(n, 'instant');
      setCurrentIndex(0);
    });
  });

  /** Track scroll position and silently reposition when entering cloned region */
  createEffect(() => {
    const el = trackRef();
    if (!el || !total() || !shouldLoop()) return;

    let repositionTimer = null;

    const onScroll = () => {
      if (hoverEffect() === 'expand') clearAccordion();
      const trackIdx = getTrackIndex();
      setCurrentIndex(toRealIndex(trackIdx));

      clearTimeout(repositionTimer);
      repositionTimer = setTimeout(() => {
        const n = cloneCount();
        const t = total();
        const idx = getTrackIndex();

        if (idx < n) {
          const realIdx = toRealIndex(idx);
          scrollToTrackIndex(realIdx + n, 'instant');
        } else if (idx >= n + t) {
          const realIdx = toRealIndex(idx);
          scrollToTrackIndex(realIdx + n, 'instant');
        }
      }, 60);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => {
      clearTimeout(repositionTimer);
      el.removeEventListener('scroll', onScroll);
    });
  });

  const handleNav = (direction) => {
    if (!total() || !shouldLoop()) return;
    const trackIdx = getTrackIndex();
    const nextTrack = direction === 'next' ? trackIdx + 1 : trackIdx - 1;
    scrollToTrackIndex(nextTrack);
  };

  // Autoplaying a track that cannot loop just jitters it against its end stop.
  createEffect(() => {
    if (!autoLoop() || !shouldLoop()) return;
    const interval = setInterval(() => handleNav('next'), 4000);
    onCleanup(() => clearInterval(interval));
  });

  const scrollProducts = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const strip = e.currentTarget
      .closest('.video-carousel-card')
      ?.querySelector('.video-carousel-card-products-inner');
    if (!strip) return;
    strip.scrollBy({
      left: direction === 'next' ? PRODUCT_ITEM_GAP : -PRODUCT_ITEM_GAP,
      behavior: 'smooth',
    });
  };

  const handleCardClick = (e, _video, trackIdx) => {
    if (isPreview) return;
    setExpandedIndex(toRealIndex(trackIdx));
  };

  /** Accordion expand: grow the hovered card and compress only the other VISIBLE cards.
   * Offscreen (cloned) cards keep their size, so the track's scroll layout and the
   * surrounding page never shift. Sizes are inline; cleared on leave/scroll. */
  const ACCORDION_GROW = 2.2;
  const ACCORDION_MIN_SHRINK = 0.25;
  let accordionResetTimer = null;

  const accordionCards = () => [...(trackRef()?.querySelectorAll('.video-carousel-card') ?? [])];

  const clearAccordion = () => {
    // Collapse widths (animated by the CSS transition) but keep height/aspect
    // locked until the animation ends — releasing them early lets the still-wide
    // card recompute its 9/16 height and balloon the track (page jump).
    accordionCards().forEach((c) => {
      c.style.flexBasis = '';
      c.classList.remove('video-carousel-card-expanded');
    });
    clearTimeout(accordionResetTimer);
    accordionResetTimer = setTimeout(() => {
      accordionCards().forEach((c) => {
        c.style.height = '';
        c.style.aspectRatio = '';
      });
    }, 400);
  };

  onCleanup(() => clearTimeout(accordionResetTimer));

  const applyAccordion = (cardEl) => {
    clearTimeout(accordionResetTimer);
    const track = trackRef();
    if (!track || !cardEl) return;
    const cards = accordionCards();
    const trackRect = track.getBoundingClientRect();
    const visible = cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.right > trackRect.left + 1 && r.left < trackRect.right - 1;
    });
    if (visible.length < 2 || !visible.includes(cardEl)) return;
    // Measure from a card the accordion never touched so mid-animation sizes don't drift;
    // getBoundingClientRect keeps fractions (offset* rounds, and rounded locks shift layout)
    const untouchedRect = cards.find((c) => !visible.includes(c))?.getBoundingClientRect();
    const baseW = untouchedRect ? untouchedRect.width : (track.clientWidth - (5 - 1) * 22) / 5;
    const baseH = untouchedRect ? untouchedRect.height : (baseW * 16) / 9;
    const others = visible.length - 1;
    const maxGrow = baseW + others * baseW * (1 - ACCORDION_MIN_SHRINK);
    const expandedW = Math.min(baseW * ACCORDION_GROW, track.clientWidth * 0.55, maxGrow);
    const shrink = (expandedW - baseW) / others;
    visible.forEach((c) => {
      c.style.height = `${baseH}px`;
      c.style.aspectRatio = 'auto';
      c.style.flexBasis = `${c === cardEl ? expandedW : baseW - shrink}px`;
      c.classList.toggle('video-carousel-card-expanded', c === cardEl);
    });
  };

  const handleCardMouseEnter = (trackIdx, e) => {
    if (autoplay() === 'onHover') setHoveredIndex(toRealIndex(trackIdx));
    if (hoverEffect() === 'expand') applyAccordion(e?.currentTarget);
  };

  const handleCardMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };

  const getThumbUrl = (video, realIndex) => {
    const staticUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const animatedUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const mode = autoplay();

    if (mode === 'onHover') return hoveredIndex() === realIndex ? animatedUrl() : staticUrl();
    if (mode === 'never') return staticUrl();
    return animatedUrl();
  };

  return (
    <div
      className={`video-carousel-container hover-${hoverEffect()}${uniqueClass ? ` ${uniqueClass}` : ''}`}
      ref={setContainerRef}
    >

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
          onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
          if (feed?.id && video?.id && !isPreview) {
            await trackVideoImpressionOnce(feed.id, video.id);
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id || isPreview) return;
          await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_VIEW, watchTimeSeconds });
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
        }}
      />

      <header className="video-carousel-header">
        <div className="video-carousel-header-text">
          <h2 className="video-carousel-title">{title()}</h2>
          <p className="video-carousel-subtitle">{subtitle()}</p>
        </div>

        {/* Nothing to page through when everything already fits — the arrows
            would be inert, so don't render them at all. */}
        <Show when={shouldLoop()}>
          <nav className="video-carousel-nav" aria-label="Carousel navigation">
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Previous"
              onClick={() => handleNav('prev')}
            >
              <LeftToggleIcon />
            </button>
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Next"
              onClick={() => handleNav('next')}
            >
              <RightToggleIcon />
            </button>
          </nav>
        </Show>
      </header>

      <Show when={videos?.length > 0}>
        <div className="video-carousel-track-wrap">
          <div
            className="video-carousel-track"
            ref={setTrackRef}
            role="list"
            onMouseLeave={() => hoverEffect() === 'expand' && clearAccordion()}
          >
            <For each={loopItems()}>
              {(video, trackIdx) => {
                const realIndex = () => toRealIndex(trackIdx());
                return (
                  <article
                    className="video-carousel-card"
                    role="listitem"
                    onMouseEnter={(e) => handleCardMouseEnter(trackIdx(), e)}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    <button
                      type="button"
                      className="video-carousel-card-button"
                      aria-label={`${video.title || `Video ${realIndex() + 1}`}, ${LABEL_WATCH}`}
                      onClick={(e) => {
                        const isProductAction = e.target.closest(
                          '.vd-product-overlay-item-button, .vd-overlay-nav-btn, .video-carousel-card-product-button, .video-carousel-products-btn'
                        );
                        if (!isProductAction) handleCardClick(e, video, trackIdx());
                      }}
                    >

                      <span className="video-carousel-card-image-wrap">
                        <Show
                          when={getThumbUrl(video, realIndex())}
                          fallback={<span className="video-carousel-card-image-fallback" />}
                        >
                          <img
                            className="video-carousel-card-image"
                            src={getThumbUrl(video, realIndex())}
                            alt=""
                            loading="lazy"
                          />
                        </Show>
                      </span>

                      <ProductOverlay
                        video={video}
                        addToCartButtonLabel={addToCartButtonLabel}
                        addToCartButtonStyle={addToCartButtonStyle}
                        onProductClick={handleProductClick}
                      />

                    </button>
                  </article>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!videos?.length}>
        <p className="video-carousel-empty">{EMPTY_VIDEOS}</p>
      </Show>
    </div>
  );
}