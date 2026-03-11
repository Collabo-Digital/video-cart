/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import { EVENT_TYPES } from '../../api/services/analyticsService';
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
import { THUMB_CARD, CARD_WIDTH, CARD_GAP, PRODUCT_ITEM_GAP } from '../../core/constant';
import { LABEL_WATCH, EMPTY_VIDEOS } from '../../constants/strings';
import './carousel.css';
import LeftToggleIcon from '../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../assets/Icons/RightToggleIcon';

const SCROLL_AMOUNT = CARD_WIDTH + CARD_GAP;
const PRODUCT_SCROLL_AMOUNT = CARD_WIDTH + PRODUCT_ITEM_GAP;
const DEFAULT_SUBTITLE = '';

export function VideoCarousel({ feed, videos, settings, onEvent, isPreview }) {
  const [trackRef, setTrackRef] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();
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

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const autoplay = () => settings?.general.autoPlay ?? feed?.settings?.general.autoPlay;


  createEffect(() => {
    const container = containerRef();
    const design = settings?.design ?? feed?.settings?.design;
    const styles = buildDesignStyles(design);
    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }

    if (container) {
      injectCustomCss(container, design);
    }
  });

  createEffect(() => {
    const container = containerRef();
    if (!container || !feed?.id || isPreview) return;
    let sent = false;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (sent) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0 ) {
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

  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || DEFAULT_SUBTITLE;

  const scrollTrack = (direction) => {
    const el = trackRef();
    if (!el) return;
    const amount = direction === 'next' ? SCROLL_AMOUNT : -SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const scrollProducts = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget.closest('.video-carousel-card');
    const strip = card?.querySelector('.video-carousel-card-products-inner');
    if (!strip) return;
    const amount = direction === 'next' ? PRODUCT_SCROLL_AMOUNT : -PRODUCT_SCROLL_AMOUNT;
    strip.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleCardClick = (e, _video, index) => {
    if (isPreview) return;
    setExpandedIndex(index);
  };

  const handleCardLinkClick = async (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPreview) return;
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    const handle = getProductHandle(video?.productsTagged?.[0]);
    if (!handle) return;
    onEvent?.('product_click', { feedId: feed?.id, productId: handle });
    window.location.href = `/products/${handle}`;
  };

  const handleCardMouseEnter = (index) => {
    if (autoplay() === 'onHover') setHoveredIndex(index);
  };

  const handleCardMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };

  return (
    <div className={`video-carousel-container ${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
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
          await trackDbEvent({
            feedId: feed.id,
            videoId: video.id,
            eventType: EVENT_TYPES.VIDEO_VIEW,
            watchTimeSeconds,
          });
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
              onClick={() => scrollTrack('prev')}
            >
              <LeftToggleIcon />
            </button>
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Next"
              onClick={() => scrollTrack('next')}
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
              {(video, index) => {
                const staticThumbUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
                const animatedThumbUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
                const isOnHoverMode = () => autoplay() === 'onHover';
                const isHovered = () => hoveredIndex() === index();
                const thumbUrl = () => {
                  if (isOnHoverMode()) return isHovered() ? animatedThumbUrl() : staticThumbUrl();
                  if (autoplay() === 'never') return staticThumbUrl();
                  return animatedThumbUrl();
                };

                return (
                  <article className="video-carousel-card" role="listitem"
                    onMouseEnter={() => handleCardMouseEnter(index())}
                    onMouseLeave={handleCardMouseLeave}
                  >
                    <button
                      type="button"
                      className="video-carousel-card-button"
                      onClick={(e) => {
                        const isInteractiveClick = e.target.closest('.video-carousel-card-product-button, .video-carousel-products-btn');
                        if (isInteractiveClick) return;
                        handleCardClick(e, video, index())
                      }}
                      aria-label={`${video.title || `Video ${index() + 1}`}, ${LABEL_WATCH}`}
                    >
                      <span className="video-carousel-card-image-wrap">
                        <Show
                          when={thumbUrl()}
                          fallback={<span className="video-carousel-card-image-fallback" />}
                        >
                          <img
                            className="video-carousel-card-image"
                            src={thumbUrl()}
                            alt=""
                            loading="lazy"
                          />
                        </Show>
                      </span>
                      <Show when={productsForVideo(video).length > 0}>
                        <span className="video-carousel-card-overlay">
                          <div className={`video-carousel-card-products${productsForVideo(video).length > 1 ? ' has-nav' : ''}`}>
                            <Show when={productsForVideo(video).length > 1}>
                              <button
                                type="button"
                                className="video-carousel-products-btn video-carousel-products-btn-prev"
                                aria-label="Previous products"
                                onClick={(e) => scrollProducts(e, 'prev')}
                              >
                                <LeftToggleIcon />
                              </button>
                            </Show>
                            <div className="video-carousel-card-products-inner">
                              <For each={productsForVideo(video)}>
                                {(product) => (
                                  <div className="video-carousel-card-product">
                                    <img src={product.image} alt={product.title} loading="lazy" />
                                    <div className="video-carousel-card-product-info">
                                      <span className="video-carousel-card-product-title">{product.title}</span>
                                      <button
                                        type="button"
                                        className="video-carousel-card-product-button"
                                        style={addToCartButtonStyle()}
                                        onClick={() => handleProductClick(product, video)}
                                      >
                                        {addToCartButtonLabel()}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </For>
                            </div>
                            <Show when={productsForVideo(video).length > 1}>
                              <button
                                type="button"
                                className="video-carousel-products-btn video-carousel-products-btn-next"
                                aria-label="Next products"
                                onClick={(e) => scrollProducts(e, 'next')}
                              >
                                <RightToggleIcon />
                              </button>
                            </Show>
                          </div>
                        </span>
                      </Show>
                    </button>
                    {/* <a
                      href={getProductHandle(video?.productsTagged?.[0]) ? `/products/${getProductHandle(video.productsTagged[0])}` : '#'}
                      className="video-carousel-card-link"
                      aria-label="View product"
                      onClick={(e) => handleCardLinkClick(e, video)}
                    /> */}
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