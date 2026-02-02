/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import Hls from 'hls.js';
import { getPlaybackUrl, getTumbnailPreviewUrl } from '../../shared/mux';
import './carousel.css';

const MOBILE_BREAKPOINT = 768;

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const SCROLL_AMOUNT = CARD_WIDTH + CARD_GAP;
/* One product visible at a time, full width of card */
const PRODUCT_ITEM_WIDTH = CARD_WIDTH; /* 280px = full width */
const PRODUCT_ITEM_GAP = 8;
const PRODUCT_SCROLL_AMOUNT = PRODUCT_ITEM_WIDTH + PRODUCT_ITEM_GAP;

const DEFAULT_SUBTITLE =
  '';

export function VideoCarousel({ feed, videos, settings, onEvent }) {
  const [trackRef, setTrackRef] = createSignal(null);
  /** When set, show full-screen story-like overlay for that video index; null = carousel only */
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [videoEl, setVideoEl] = createSignal(null);
  const [reelsTrackRef, setReelsTrackRef] = createSignal(null);
  const [isMobile, setIsMobile] = createSignal(typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches);

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
    const p = product?.variants?.[0]?.price;
    if (p == null || p === '') return null;
    const num = typeof p === 'string' ? parseFloat(p, 10) : Number(p);
    if (Number.isNaN(num)) return null;
    return { raw: p, formatted: `$ ${num.toFixed(num % 1 === 0 ? 0 : 2)}` };
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
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(el);
      onCleanup(() => {
        hls.destroy();
      });
    } else if (el.canPlayType?.('application/vnd.apple.mpegurl')) {
      el.src = url;
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

  const handleCardClick = (video, index) => {
    onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
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

  const handleCardLinkClick = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    const first = video?.productsTagged?.[0];
    if (first) {
      const productId = typeof first === 'object' ? (first.handle || first.id) : first;
      onEvent?.('product_click', { feedId: feed?.id, productId });
      if (productId) window.location.href = `/products/${productId}`;
    }
  };

  return (
    <div className="video-carousel-container">
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
                          style={{ 'background-image': `url(${getTumbnailPreviewUrl(video.playbackId, 560, 748) || ''})` }}
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
                                    onClick={() => {
                                      onEvent?.('product_click', { feedId: feed?.id, productId: product.handle });
                                    }}
                                  >
                                    Shop Now
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
                          onClick={() => {
                            onEvent?.('product_click', { feedId: feed?.id, productId: product.handle });
                          }}
                        >
                          Add
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
                const thumbUrl = () => getTumbnailPreviewUrl(video.playbackId, 560, 748);
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
                                    <button className="video-carousel-card-product-button" onClick={() => window.location.href = `/products/${product.handle}`}> shop   </button>
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
                    >
                      {/* <ExternalLinkIcon /> */}
                    </a>
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
