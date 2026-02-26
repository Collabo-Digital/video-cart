/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import { api } from '../../api';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import './carousel.css';
import { addToCart } from '../../utils/shopifyService';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { Toast } from '../common/Toast/Toast';
import { TOAST_DURATION_MS_EXPORT as TOAST_DURATION_MS } from '../common/Toast/Toast';

/** Fire analytics event to DB (app proxy). Fire-and-forget; does not throw. */
async function trackDbEvent(payload) {
  if (!payload?.feedId || !payload?.eventType) return;
  try {
    await api.analytics.recordEvent(payload);
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('Analytics event failed:', err);
    }
  }
}

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const SCROLL_AMOUNT = CARD_WIDTH + CARD_GAP;
/* One product visible at a time, full width of card */
const PRODUCT_ITEM_WIDTH = CARD_WIDTH; /* 280px = full width */
const PRODUCT_ITEM_GAP = 8;
const PRODUCT_SCROLL_AMOUNT = PRODUCT_ITEM_WIDTH + PRODUCT_ITEM_GAP;

const DEFAULT_SUBTITLE = '';

export function VideoCarousel({ feed, videos, settings, onEvent }) {
  const [trackRef, setTrackRef] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);
  /** When set, show full-screen story-like overlay for that video index; null = carousel only */
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [toastVisible, setToastVisible] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal('success');

  function showToast(message, type = 'success') {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
  }

  /** Feed impression: once when carousel container enters viewport (stored in DB) */
  createEffect(() => {
    const container = containerRef();
    if (!container || !feed?.id) return;
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

  const title = () => settings?.translation?.carouselTitle || feed?.name || '';
  const subtitle = () => settings?.translation?.carouselDescription || feed?.description || DEFAULT_SUBTITLE;
  /** Products per video: [[product, ...], []] — index i = products for videos[i] */
  const productsForVideo = (video) => video?.productsTagged ?? [];

  /** Display price from first variant (Shopify price string e.g. "50.00") */
  const productPrice = (product) => {
    const priceVal = product?.variants?.[0]?.price;
    if (priceVal == null || priceVal === '') return null;
    const num = typeof priceVal === 'string' ? parseFloat(priceVal, 10) : Number(priceVal);
    if (Number.isNaN(num)) return null;
    return { raw: priceVal, formatted: `$ ${num.toFixed(num % 1 === 0 ? 0 : 2)}` };
  };

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

  const handleCardClick = (_video, index) => {
    setExpandedIndex(index);
  };

  const handleCardLinkClick = async (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    const first = video?.productsTagged?.[0];
    if (!first) return;
    const productId = typeof first === 'object' ? (first.handle || first.id) : first;
    onEvent?.('product_click', { feedId: feed?.id, productId });
    if (productId) window.location.href = `/products/${productId}`;
  };

  /** Variant id for cart: first variant or product id. */
  const getVariantId = (product) => product?.variants?.[0]?.id ?? product?.id;


  const handleProductClick = async (product, video) => {

    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    if (behavior === 'addToCart') {
      addToCart([{
        id: getVariantId(product),
        quantity: 1,
        properties: {
          _video_id: video?.id,
          _widget_id: feed?.id,
          timestamp: Date.now(),
          source: 'video-cart-carousel',
        },
      }]).then(async (response) => {
        // if (response.status === 200) {
        console.log("Product is added to cart");
        showToast('Added to cart', 'success');
        await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_ATC });
        await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_ATC });
        // }
      }).catch((error) => {
        console.error('Error adding product to cart:', error);
        showToast('Could not add to cart', 'error');
      });
    } else {
      if (product?.handle) window.location.href = `/products/${product.handle}`;
    }
    
    onEvent?.('product_click', { feedId: feed?.id, productId: product?.handle });
  };

  const addToCartButtonLabel = () => feed?.settings?.translation?.addToCartText || 'Check this out';
  const addToCartButtonColor = () => {
    const raw = settings?.design?.addToCartButtonColor ?? feed?.settings?.design?.addToCartButtonColor;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  const addToCartButtonStyle = () => {
    const color = addToCartButtonColor();
    return color ? { 'background-color': color } : undefined;
  };

  return (
    <div className="video-carousel-container" ref={setContainerRef}>
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
          if (feed?.id && video?.id) {
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id) return;
          await trackDbEvent({
            feedId: feed.id,
            videoId: video.id,
            eventType: EVENT_TYPES.VIDEO_VIEW,
            watchTimeSeconds,
          });
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
        }}
      />

      {/* Header: title, subtitle, nav arrows on the right */}
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
              ‹
            </button>
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Next"
              onClick={() => scrollTrack('next')}
            >
              ›
            </button>
          </nav>
        </Show>
      </header>

      {/* Horizontal card track */}
      <Show when={videos?.length > 0}>
        <div className="video-carousel-track-wrap">
          <div className="video-carousel-track" ref={setTrackRef} role="list">
            <For each={videos}>
              {(video, index) => {
                const thumbUrl = () => getThumbnailPreviewUrl(video.playbackId, 560, 748);
                const meta = () => {
                  const count = video?.productsTagged?.length ?? 0;
                  return count > 0 ? `${count} product${count !== 1 ? 's' : ''}` : 'Watch';
                };
                return (
                  <article className="video-carousel-card" role="listitem">
                    <button
                      type="button"
                      className="video-carousel-card-button"
                      onClick={() => handleCardClick(video, index())}
                      aria-label={`${video.title || `Video ${index() + 1}`}, ${meta()}`}
                    >
                      <span className="video-carousel-card-image-wrap">
                        <Show when={thumbUrl()} fallback={<span style="display:block;width:100%;height:100%;background:#e5e7eb" />}>
                          <img
                            className="video-carousel-card-image"
                            src={thumbUrl()}
                            alt=""
                            loading="lazy"
                          />
                        </Show>
                      </span>
                      <span className="video-carousel-card-overlay">
                        <div className={`video-carousel-card-products${productsForVideo(video).length > 1 ? ' has-nav' : ''}`}>
                          <Show when={productsForVideo(video).length > 1}>
                            <button
                              type="button"
                              className="video-carousel-products-btn video-carousel-products-btn-prev"
                              aria-label="Previous products"
                              onClick={(e) => scrollProducts(e, 'prev')}
                            >
                              ‹
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
                                      Shop
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
                              ›
                            </button>
                          </Show>
                        </div>
                        {/* <span className="video-carousel-card-name">{video.title || `Video ${index() + 1}`}</span>
                        <span className="video-carousel-card-meta">{meta()}</span> */}
                      </span>
                    </button>
                    <a
                      href={video?.productsTagged?.[0] ? `/products/${typeof video.productsTagged[0] === 'object' ? video.productsTagged[0].handle || video.productsTagged[0].id : video.productsTagged[0]}` : '#'}
                      className="video-carousel-card-link"
                      aria-label="View product"
                      onClick={(e) => handleCardLinkClick(e, video)}
                    />
                  </article>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!videos?.length}>
        <p style="padding: 2rem; text-align: center; color: #6d7175;">No videos available in this feed.</p>
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
