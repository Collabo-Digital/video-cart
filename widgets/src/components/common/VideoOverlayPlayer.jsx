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
  const [isMuted, setIsMuted] = createSignal(true);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  );

  const UnMuteIcon = () => {
    return (
      <svg fill="#efefef" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"/><g strokeLinecap="round" strokeLinejoin="round"/><path fillRule="evenodd" d="M11.553 3.064A.75.75 0 0 1 12 3.75v16.5a.75.75 0 0 1-1.255.555L5.46 16H2.75A1.75 1.75 0 0 1 1 14.25v-4.5C1 8.784 1.784 8 2.75 8h2.71l5.285-4.805a.75.75 0 0 1 .808-.13zM10.5 5.445l-4.245 3.86a.75.75 0 0 1-.505.195h-3a.25.25 0 0 0-.25.25v4.5c0 .138.112.25.25.25h3a.75.75 0 0 1 .505.195l4.245 3.86z"/><path d="M18.718 4.222a.75.75 0 0 1 1.06 0c4.296 4.296 4.296 11.26 0 15.556a.75.75 0 0 1-1.06-1.06 9.5 9.5 0 0 0 0-13.436.75.75 0 0 1 0-1.06"/><path d="M16.243 7.757a.75.75 0 1 0-1.061 1.061 4.5 4.5 0 0 1 0 6.364.75.75 0 0 0 1.06 1.06 6 6 0 0 0 0-8.485z"/></svg>
    );
  };

  const MuteIcon = () => {
    return (
      <svg fill="#e0e0e0" width="20px" height="20px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14.266 1.264l-13 13 .47.472 3.239-3.238L8 14.666V8.473l2.312-2.313c.467.542.737 1.227.737 1.947 0 .796-.316 1.559-.88 2.122l-.353.353.707.707.354-.353a4 4 0 0 0 1.172-2.829c0-.985-.377-1.923-1.03-2.654l1.422-1.422a5.994 5.994 0 0 1 1.608 4.076 5.999 5.999 0 0 1-1.758 4.243l-.354.353.707.707.354-.353a7 7 0 0 0 2.05-4.95 6.994 6.994 0 0 0-1.9-4.783l1.588-1.588zM8 1.334L4.5 5H1.871S1 5.894 1 8.002C1 10.11 1.871 11 1.871 11h1.422L8 6.293z" opacity=".5" fill="gray"></path> </g></svg>
    );
  };

  const RightToggle = () =>{
    return (
      <svg fill="#e0e0e0" width="20" height="20" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"/><g strokeLinecap="round" strokeLinejoin="round"/><title/><path d="M69.844 43.388 33.842 13.386a6.004 6.004 0 0 0-7.688 9.223L56.624 48l-30.47 25.39a6.004 6.004 0 0 0 7.688 9.223l36.002-30.001a6.01 6.01 0 0 0 0-9.223"/></svg>
    )
  }

  const LeftToggle = () =>{
    return (
      <svg fill="#e0e0e0" width="20" height="20" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" transform="rotate(180)"><g strokeWidth="0"/><g strokeLinecap="round" strokeLinejoin="round"/><title/><path d="M69.844 43.388 33.842 13.386a6.004 6.004 0 0 0-7.688 9.223L56.624 48l-30.47 25.39a6.004 6.004 0 0 0 7.688 9.223l36.002-30.001a6.01 6.01 0 0 0 0-9.223"/></svg>
    )
  }

  const CloseIcon = () =>{
    return (
      <svg fill="#e0e0e0" width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"/><g strokeLinecap="round" strokeLinejoin="round"/><path d="M16.707 8.707 13.414 12l3.293 3.293a1 1 0 1 1-1.414 1.414L12 13.414l-3.293 3.293a1 1 0 1 1-1.414-1.414L10.586 12 7.293 8.707a1 1 0 1 1 1.414-1.414L12 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414"/></svg>
    )
  }

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

  /** Sync mute state and track currentTime/duration for custom controls */
  createEffect(() => {
    const el = videoEl();
    if (!el) return;
    el.muted = isMuted();
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);
    const onDurationChange = () => setDuration(el.duration);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('durationchange', onDurationChange);
    onTimeUpdate();
    if (el.duration != null && !Number.isNaN(el.duration)) setDuration(el.duration);
    onCleanup(() => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('durationchange', onDurationChange);
    });
  });

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleSeek(e) {
    const el = videoEl();
    const range = e.currentTarget;
    if (!el || !range) return;
    const frac = Number(range.value);
    const t = frac * duration();
    if (Number.isFinite(t)) {
      el.currentTime = t;
      setCurrentTime(t);
    }
  }

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
          <CloseIcon />
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
                <LeftToggle />
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
                      autoPlay
                      muted
                      // playsInline
                    />
                    <div className="video-carousel-custom-controls">
                      <button
                        type="button"
                        className="video-carousel-control-mute"
                        aria-label={isMuted() ? 'Unmute' : 'Mute'}
                        onClick={() => setIsMuted((m) => !m)}
                      >
                        {isMuted() ? <UnMuteIcon /> : <MuteIcon />}
                      </button>
                      <div className="video-carousel-progress-wrap">
                        <span className="video-carousel-time">{formatTime(currentTime())}</span>
                        <input
                          type="range"
                          className="video-carousel-progress"
                          min="0"
                          max={duration() > 0 ? 1 : 0}
                          step="any"
                          value={duration() > 0 ? currentTime() / duration() : 0}
                          onInput={handleSeek}
                        />
                        <span className="video-carousel-time">{formatTime(duration())}</span>
                      </div>
                    </div>
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
                <RightToggle />
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
                          // controls
                          autoPlay
                          muted
                          // playsInline
                        />
                        <div className="video-carousel-custom-controls">
                          <button
                            type="button"
                            className="video-carousel-control-mute"
                            aria-label={isMuted() ? 'Unmute' : 'Mute'}
                            onClick={() => setIsMuted((m) => !m)}
                          >
                            {isMuted() ? <UnMuteIcon /> : <MuteIcon />}
                          </button>
                          <div className="video-carousel-progress-wrap">
                            <span className="video-carousel-time">{formatTime(currentTime())}</span>
                            <input
                              type="range"
                              className="video-carousel-progress"
                              min="0"
                              max={duration() > 0 ? 1 : 0}
                              step="any"
                              value={duration() > 0 ? currentTime() / duration() : 0}
                              onInput={handleSeek}
                            />
                            <span className="video-carousel-time">{formatTime(duration())}</span>
                          </div>
                        </div>
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
