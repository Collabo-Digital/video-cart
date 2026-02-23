/* eslint-disable react/prop-types -- shared overlay used by widget variants */
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import Hls from 'hls.js';
import mux from 'mux-embed';
import { getPlaybackUrl, getThumbnailPreviewUrl } from '../../shared/mux';
import { MUX_DATA_ENV_KEY } from '../../core/config';
import './videoOverlay.css';

const MOBILE_BREAKPOINT = 768;

export function VideoOverlayPlayer({
  videos,
  expandedIndex,
  setExpandedIndex,
  productsForVideo,
  productPrice,
  addToCartButtonLabel,
  addToCartButtonStyle,
  handleProductClick,
  onVideoChange,
  onFirstPlay,
}) {
  const [videoEl, setVideoEl] = createSignal(null);
  const [reelsTrackRef, setReelsTrackRef] = createSignal(null);
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  );

  const currentVideo = createMemo(() => {
    const idx = expandedIndex();
    const list = videos ?? [];
    if (idx == null || idx < 0 || idx >= list.length) return null;
    return list[idx];
  });

  const canGoPrev = () => (expandedIndex() ?? 0) > 0;
  const canGoNext = () => (expandedIndex() ?? 0) < (videos?.length ?? 0) - 1;
  const goPrev = () => {
    if (canGoPrev()) setExpandedIndex((i) => i - 1);
  };
  const goNext = () => {
    if (canGoNext()) setExpandedIndex((i) => i + 1);
  };

  createEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    onCleanup(() => mql.removeEventListener('change', handler));
  });

  createEffect(() => {
    const idx = expandedIndex();
    const video = currentVideo();
    if (idx == null || !video) return;
    onVideoChange?.(video, idx);
  });

  /** Attach HLS or native src when overlay video element and playbackId are set */
  createEffect(() => {
    const el = videoEl();
    const video = currentVideo();
    const playbackId = video?.playbackId;
    const url = playbackId ? getPlaybackUrl(playbackId) : null;
    if (!el || !url) return;

    const playerInitTime = typeof window !== 'undefined' && window.performance?.now ? performance.now() : Date.now();
    let hls = null;
    let viewSent = false;

    const onPlay = async () => {
      if (viewSent) return;
      viewSent = true;
      const sec = el.currentTime != null ? Math.floor(el.currentTime) : 0;
      await onFirstPlay?.(video, sec);
    };

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(el);

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

      el.addEventListener('play', onPlay);
      onCleanup(() => {
        el.removeEventListener('play', onPlay);
        if (el.mux && typeof el.mux.destroy === 'function') {
          try { el.mux.destroy(); } catch (_) { /* ignore */ }
        }
        if (hls) hls.destroy();
      });
    } else if (el.canPlayType?.('application/vnd.apple.mpegurl')) {
      el.src = url;

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

      el.addEventListener('play', onPlay);
      onCleanup(() => {
        el.removeEventListener('play', onPlay);
        if (el.mux && typeof el.mux.destroy === 'function') {
          try { el.mux.destroy(); } catch (_) { /* ignore */ }
        }
      });
    } else {
      el.src = url;
      el.addEventListener('play', onPlay);
      onCleanup(() => el.removeEventListener('play', onPlay));
    }
  });

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

  /** On mobile reels: observe slides and sync expandedIndex when a slide is in view */
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

  return (
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
          onClick={() => setExpandedIndex(null)}
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

        {/* Mobile: Reels-style vertical scroll (swipe up/down) */}
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
  );
}
