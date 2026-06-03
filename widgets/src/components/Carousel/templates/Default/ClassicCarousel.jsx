/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, createMemo, For, Show, createEffect, onCleanup } from 'solid-js';

import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../../../shared/mux';
import { EVENT_TYPES } from '../../../../api/services/analyticsService';
import { ProductOverlay } from '../../../common/ProductOverlay/ProductOverlay';
import { VideoOverlayPlayer } from '../../../common/VideoOverlayPlayer';
import { Toast } from '../../../common/Toast/Toast';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../../../utils/designStyles';
import { trackDbEvent } from '../../../../utils/analytics';
import { useToast } from '../../../../hooks/useToast';
import {
  productsForVideo,
  productPrice,
  getAddToCartLabel,
  getButtonStyle,
  getProductHandle,
} from '../../../../utils/widgetHelpers';
import { createProductClickHandler } from '../../../../utils/productClickHandler';
import { THUMB_CARD, CARD_GAP, PRODUCT_ITEM_GAP } from '../../../../core/constant';
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

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();

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
    showToast,
    source: 'carousel',
    isPreview,
  });

  const total = () => videos?.length ?? 0;
  const cloneCount = () => Math.min(CLONE_COUNT, total());

  const loopItems = createMemo(() => {
    if (!videos?.length) return [];
    const n = cloneCount();
    const tail = videos.slice(-n);
    const head = videos.slice(0, n);
    return [...tail, ...videos, ...head];
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
    const container = containerRef();
    if (!container || !feed?.id || isPreview) return;

    let sent = false;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (sent) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            sent = true;
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_IMPRESSION });
            break;
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    onCleanup(() => observer.disconnect());
  });

  const getCardWidth = () => {
    const el = trackRef();
    const card = el?.querySelector('.video-carousel-card');
    return card?.offsetWidth ?? 0;
  };

  const scrollToTrackIndex = (idx, behavior = 'smooth') => {
    const el = trackRef();
    const cardW = getCardWidth();
    if (!el || !cardW) return;
    el.scrollTo({ left: idx * (cardW + CARD_GAP), behavior });
  };

  const getTrackIndex = () => {
    const el = trackRef();
    const cardW = getCardWidth();
    if (!el || !cardW) return cloneCount();
    return Math.round(el.scrollLeft / (cardW + CARD_GAP));
  };

  /** Position track at the first real card on mount */
  createEffect(() => {
    const el = trackRef();
    if (!el || !total()) return;
    requestAnimationFrame(() => {
      scrollToTrackIndex(cloneCount(), 'instant');
      setCurrentIndex(0);
    });
  });

  /** Track scroll position and silently reposition when entering cloned region */
  createEffect(() => {
    const el = trackRef();
    if (!el || !total()) return;

    let repositionTimer = null;

    const onScroll = () => {
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
    if (!total()) return;
    const trackIdx = getTrackIndex();
    const nextTrack = direction === 'next' ? trackIdx + 1 : trackIdx - 1;
    scrollToTrackIndex(nextTrack);
  };

  createEffect(() => {
    if (!autoLoop() || !total() || total() <= 1) return;
    const interval = setInterval(() => handleNav('next'), 4000);
    onCleanup(() => clearInterval(interval));
  });

  const isPrevDisabled = () => !videos?.length;
  const isNextDisabled = () => !videos?.length;

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

  const handleCardMouseEnter = (trackIdx) => {
    if (autoplay() === 'onHover') setHoveredIndex(toRealIndex(trackIdx));
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
        handleProductClick={handleProductClick}
        onVideoChange={async (video, index) => {
          onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
          if (feed?.id && video?.id && !isPreview) {
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
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

        <Show when={videos?.length > 0}>
          <nav className="video-carousel-nav" aria-label="Carousel navigation">
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Previous"
              disabled={isPrevDisabled()}
              onClick={() => handleNav('prev')}
            >
              <LeftToggleIcon />
            </button>
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Next"
              disabled={isNextDisabled()}
              onClick={() => handleNav('next')}
            >
              <RightToggleIcon />
            </button>
          </nav>
        </Show>
      </header>

      <Show when={videos?.length > 0}>
        <div className="video-carousel-track-wrap">
          <div className="video-carousel-track" ref={setTrackRef} role="list">
            <For each={loopItems()}>
              {(video, trackIdx) => {
                const realIndex = () => toRealIndex(trackIdx());
                return (
                  <article
                    className="video-carousel-card"
                    role="listitem"
                    onMouseEnter={() => handleCardMouseEnter(trackIdx())}
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

      <Toast
        visible={toastVisible()}
        message={toastMessage()}
        type={toastType()}
        onClose={() => setToastVisible(false)}
      />

    </div>
  );
}