/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';

import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import { ProductOverlay } from '../common/ProductOverlay/ProductOverlay';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { Toast } from '../common/Toast/Toast';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../utils/designStyles';
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
import { THUMB_CARD, CARD_GAP, PRODUCT_ITEM_GAP } from '../../core/constant';
import { LABEL_WATCH, EMPTY_VIDEOS } from '../../constants/strings';

import LeftToggleIcon from '../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../assets/Icons/RightToggleIcon';

import './carousel.css';


const DEFAULT_SUBTITLE = '';


export function VideoCarousel({ feed, videos, settings, onEvent, isPreview }) {

  const [trackRef, setTrackRef] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);

  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const [currentIndex, setCurrentIndex] = createSignal(0);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const autoplay = () => settings?.general?.autoPlay ?? feed?.settings?.general?.autoPlay;
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

  createEffect(() => {
    const el = trackRef();
    if (!el) return;

    const onScroll = () => {
      const card = el.querySelector('.video-carousel-card');
      if (!card) return;
      const cardW = card.offsetWidth;
      if (!cardW) return;
      setCurrentIndex(Math.round(el.scrollLeft / (cardW + CARD_GAP)));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => el.removeEventListener('scroll', onScroll));
  });

  const scrollToCard = (index) => {
    const el = trackRef();
    const card = el?.querySelector('.video-carousel-card');
    if (!el || !card) return;
    el.scrollTo({ left: index * (card.offsetWidth + CARD_GAP), behavior: 'smooth' });
  };

  const handleNav = (direction) => {
    const total = videos?.length ?? 0;
    const current = currentIndex();
    const next = direction === 'next'
      ? Math.min(current + 1, total - 1)
      : Math.max(current - 1, 0);
    scrollToCard(next);
  };

  const isPrevDisabled = () => currentIndex() <= 0;
  const isNextDisabled = () => currentIndex() >= (videos?.length ?? 0) - 1;

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

  const handleCardClick = (e, _video, index) => {
    if (isPreview) return;
    setExpandedIndex(index);
  };

  const handleCardMouseEnter = (index) => {
    if (autoplay() === 'onHover') setHoveredIndex(index);
  };

  const handleCardMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };

  const getThumbUrl = (video, index) => {
    const staticUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const animatedUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const mode = autoplay();

    if (mode === 'onHover') return hoveredIndex() === index ? animatedUrl() : staticUrl();
    if (mode === 'never') return staticUrl();
    return animatedUrl();
  };

  return (
    <div
      className={`video-carousel-container${uniqueClass ? ` ${uniqueClass}` : ''}`}
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
            <For each={videos}>
              {(video, index) => (
                <article
                  className="video-carousel-card"
                  role="listitem"
                  onMouseEnter={() => handleCardMouseEnter(index())}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <button
                    type="button"
                    className="video-carousel-card-button"
                    aria-label={`${video.title || `Video ${index() + 1}`}, ${LABEL_WATCH}`}
                    onClick={(e) => {
                      const isProductAction = e.target.closest(
                        '.video-carousel-card-product-button, .video-carousel-products-btn'
                      );
                      if (!isProductAction) handleCardClick(e, video, index());
                    }}
                  >

                    <span className="video-carousel-card-image-wrap">
                      <Show
                        when={getThumbUrl(video, index())}
                        fallback={<span className="video-carousel-card-image-fallback" />}
                      >
                        <img
                          className="video-carousel-card-image"
                          src={getThumbUrl(video, index())}
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
              )}
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