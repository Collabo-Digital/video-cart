/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import Hls from 'hls.js';
import mux from 'mux-embed';
import { getPlaybackUrl, getThumbnailPreviewUrl } from '../../shared/mux';
import { MUX_DATA_ENV_KEY } from '../../core/config';
import { api } from '../../api';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import './carousel.css';
import { addToCart } from '../../utils/shopifyService';

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

const MOBILE_BREAKPOINT = 768;

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
  const [videoEl, setVideoEl] = createSignal(null);
  const [reelsTrackRef, setReelsTrackRef] = createSignal(null);
  const [isMobile, setIsMobile] = createSignal(typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches);

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

  createEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    onCleanup(() => mql.removeEventListener('change', handler));
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

  const currentVideo = () => {
    const idx = expandedIndex();
    const list = videos ?? [];
    if (idx == null || idx < 0 || idx >= list.length) return null;
    return list[idx];
  };

  const canGoPrev = () => (expandedIndex() ?? 0) > 0;
  const canGoNext = () => (expandedIndex() ?? 0) < (videos?.length ?? 0) - 1;
  const goPrev = () => {
    if (canGoPrev()) setExpandedIndex((i) => i - 1);
  };
  const goNext = () => {
    if (canGoNext()) setExpandedIndex((i) => i + 1);
  };

  /** Attach HLS or native src when overlay video element and playbackId are set; re-runs when currentVideo changes */
  createEffect(() => {
    const el = videoEl();
    const video = currentVideo();
    const playbackId = video?.playbackId;
    const url = playbackId ? getPlaybackUrl(playbackId) : null;
    
    if (!el || !url) return;

    // Capture init time for this specific video load
    const playerInitTime = typeof window !== 'undefined' && window.performance?.now ? performance.now() : Date.now();
    
    let hls = null;
    let viewSent = false;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(el);

      // Initialize Mux monitoring AFTER HLS is attached
      if (MUX_DATA_ENV_KEY) {
        try {
          mux.monitor(el, {
            debug: false,
            hlsjs: hls,
            Hls,
            data: {
              env_key: MUX_DATA_ENV_KEY,
              player_name: 'Video Cart Carousel',
              player_init_time: playerInitTime,
              video_id: video?.id ?? playbackId,
              video_title: video?.title || 'Untitled',
              video_duration: video?.duration != null ? Math.round(Number(video.duration) * 1000) : undefined,
              video_stream_type: 'on-demand',
            },
          });
        } catch (err) {
          if (import.meta.env?.DEV) console.error('Mux monitoring init failed:', err);
        }
      }

      // Track view on first play only
      const onPlay = async () => {
        if (viewSent || !feed?.id || !video?.id) return;
        viewSent = true;
        const sec = el.currentTime != null ? Math.floor(el.currentTime) : 0;
        await trackDbEvent({
          feedId: feed.id,
          videoId: video.id,
          eventType: EVENT_TYPES.VIDEO_VIEW,
          watchTimeSeconds: sec,
        });
        await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
      };
      el.addEventListener('play', onPlay);

      onCleanup(() => {
        el.removeEventListener('play', onPlay);
        if (el.mux && typeof el.mux.destroy === 'function') {
          try { el.mux.destroy(); } catch (_) { /* ignore */ }
        }
        if (hls) hls.destroy();
      });
    } else if (el.canPlayType?.('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      el.src = url;
      
      // For native HLS, Mux monitor can still track the video element
      if (MUX_DATA_ENV_KEY) {
        try {
          mux.monitor(el, {
            debug: false,
            data: {
              env_key: MUX_DATA_ENV_KEY,
              player_name: 'Video Cart Carousel',
              player_init_time: playerInitTime,
              video_id: video?.id ?? playbackId,
              video_title: video?.title || 'Untitled',
              video_duration: video?.duration != null ? Math.round(Number(video.duration) * 1000) : undefined,
              video_stream_type: 'on-demand',
            },
          });
        } catch (err) {
          if (import.meta.env?.DEV) console.error('Mux monitoring (native) failed:', err);
        }
      }

      const onPlay = async () => {
        if (viewSent || !feed?.id || !video?.id) return;
        viewSent = true;
        const sec = el.currentTime != null ? Math.floor(el.currentTime) : 0;
        await trackDbEvent({
          feedId: feed.id,
          videoId: video.id,
          eventType: EVENT_TYPES.VIDEO_VIEW,
          watchTimeSeconds: sec,
        });
      };
      el.addEventListener('play', onPlay);

      onCleanup(() => {
        el.removeEventListener('play', onPlay);
        if (el.mux && typeof el.mux.destroy === 'function') {
          try { el.mux.destroy(); } catch (_) { /* ignore */ }
        }
      });
    } else {
      el.src = url;
    }
  });

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

  const handleCardClick = async (video, index) => {
    onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
    }
    setExpandedIndex(index);
  };

  const closeOverlay = () => setExpandedIndex(null);

  /** On mobile reels: scroll track to the slide at expandedIndex (after layout) */
  createEffect(() => {
    if (!isMobile() || expandedIndex() == null) return;
    const track = reelsTrackRef();
    if (!track) return;
    const idx = expandedIndex();
    const slides = track.querySelectorAll('.video-carousel-reels-slide');
    const slideEl = slides[idx];
    const scrollToSlide = () => {
      if (slideEl) track.scrollTo({ top: slideEl.offsetTop, behavior: 'smooth' });
    };
    if (slideEl) scrollToSlide();
    else {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(scrollToSlide);
      });
      onCleanup(() => cancelAnimationFrame(raf));
    }
  });

  /** On mobile reels: observe slides and set expandedIndex when a slide is in view */
  createEffect(() => {
    if (!isMobile() || expandedIndex() == null || !videos?.length) return;
    const track = reelsTrackRef();
    if (!track) return;
    const slides = track.querySelectorAll('.video-carousel-reels-slide');
    if (!slides.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number(entry.target.dataset.reelsIndex);
            if (!Number.isNaN(idx)) setExpandedIndex(idx);
          }
        }
      },
      { root: track, threshold: [0.25, 0.5, 0.75] }
    );
    slides.forEach((el) => observer.observe(el));
    onCleanup(() => observer.disconnect());
  });

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

  /** Single handler: track product click, notify host, then add-to-cart or go to product page. */
  const handleProductClick = async (product, video) => {
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    onEvent?.('product_click', { feedId: feed?.id, productId: product?.handle });
    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
    if (behavior === 'addToCart') {
      await addToCart([{
        id: getVariantId(product),
        quantity: 1,
        properties: {
          _video_id: video?.id,
          _widget_id: feed?.id,
          timestamp: Date.now(),
          source: 'video-cart-carousel',
        },
      }]);
    } else {
      if (product?.handle) window.location.href = `/products/${product.handle}`;
    }
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
      {/* Full-screen story-like overlay when a video is selected */}
      <Show when={expandedIndex() != null && videos?.length > 0}>
        <div
          className={`video-carousel-overlay${isMobile() ? ' video-carousel-overlay-reels' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Video view"
        >
          <button
            type="button"
            className="video-carousel-overlay-close"
            aria-label="Close"
            onClick={closeOverlay}
          >
            ×
          </button>

          {/* Desktop: horizontal nav with center video */}
          <Show when={!isMobile()}>
            <div className="video-carousel-overlay-body">
              <Show when={canGoPrev()}>
                <button
                  type="button"
                  className="video-carousel-overlay-nav video-carousel-overlay-nav-prev"
                  aria-label="Previous video"
                  onClick={goPrev}
                >
                  ‹
                </button>
              </Show>
              <div className="video-carousel-overlay-center">
                <Show when={currentVideo()}>
                  {() => (
                    <div className="video-carousel-overlay-video-wrap">
                      <video
                      id={`video-${currentVideo()?.id}`}
                        ref={setVideoEl}
                        className="video-carousel-overlay-video"
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    </div>
                  )}
                </Show>
              </div>
              <Show when={canGoNext()}>
                <button
                  type="button"
                  className="video-carousel-overlay-nav video-carousel-overlay-nav-next"
                  aria-label="Next video"
                  onClick={goNext}
                >
                  ›
                </button>
              </Show>
            </div>
          </Show>

          {/* Mobile: Reels-style vertical scroll (swipe up/down); each slide = video + its products tagged */}
          <Show when={isMobile()}>
            <div
              className="video-carousel-overlay-reels-track"
              ref={setReelsTrackRef}
              role="list"
              aria-label="Videos"
            >
              <For each={videos}>
                {(video, index) => (
                  <div
                    className="video-carousel-reels-slide"
                    data-reels-index={index()}
                    role="listitem"
                  >
                    <div className="video-carousel-reels-slide-video">
                      <Show when={index() === expandedIndex()}>
                        <div className="video-carousel-overlay-video-wrap video-carousel-reels-video-wrap">
                          <video
                            ref={setVideoEl}
                            className="video-carousel-overlay-video"
                            controls
                            autoPlay
                            muted
                            playsInline
                          />
                        </div>
                      </Show>
                      <Show when={index() !== expandedIndex()}>
                        <span
                          className="video-carousel-reels-slide-placeholder"
                          style={{ 'background-image': `url(${getThumbnailPreviewUrl(video.playbackId, 560, 748) || ''})` }}
                          aria-hidden
                        />
                      </Show>
                      <aside className="video-carousel-overlay-products video-carousel-overlay-products-reels">
                        <h3 className="video-carousel-overlay-products-title">Products tagged</h3>
                        <div className="video-carousel-overlay-products-inner">
                          <For each={productsForVideo(video)}>
                            {(product) => (
                              
                              <div className="video-carousel-overlay-product">
                                <div className="video-carousel-overlay-product-image-wrap">
                                  <img src={product.image} alt={product.title} loading="lazy" />
                                </div>
                                <div className="video-carousel-overlay-product-info">
                                  <span className="video-carousel-overlay-product-title">{product.title}</span>
                                  <Show when={productPrice(product)?.formatted}>
                                    <span className="video-carousel-overlay-product-price">{productPrice(product).formatted}</span>
                                  </Show>
                                  <a
                                    href={`/products/${product.handle}`}
                                    className="video-carousel-overlay-product-add video-carousel-overlay-product-shop"
                                    style={addToCartButtonStyle()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleProductClick(product, video);
                                    }}
                                  >
                                    {addToCartButtonLabel()}
                                  </a>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                        <Show when={!productsForVideo(video).length}>
                          <p className="video-carousel-overlay-products-empty">No products linked to this video.</p>
                        </Show>
                      </aside>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Desktop: products sidebar */}
          <Show when={!isMobile()}>
            <aside className="video-carousel-overlay-products">
              <h3 className="video-carousel-overlay-products-title">Frequently bought</h3>
              <div className="video-carousel-overlay-products-inner">
                <For each={productsForVideo(currentVideo() ?? {})}>
                  {(product) => (
                    <div className="video-carousel-overlay-product">
                      <img src={product.image} alt={product.title} loading="lazy" />
                      <div className="video-carousel-overlay-product-info">
                        <span className="video-carousel-overlay-product-title">{product.title}</span>
                        <a
                          href={`/products/${product.handle}`}
                          className="video-carousel-overlay-product-add"
                          style={addToCartButtonStyle()}
                          onClick={(e) => {
                            e.preventDefault();
                            handleProductClick(product, currentVideo());
                          }}
                        >
                          {addToCartButtonLabel()}
                        </a>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <Show when={!productsForVideo(currentVideo() ?? {}).length}>
                <p className="video-carousel-overlay-products-empty">No products linked to this video.</p>
              </Show>
            </aside>
          </Show>
        </div>
      </Show>

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
    </div>
  );
}
