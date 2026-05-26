/* eslint-disable react/prop-types -- shared overlay used by widget variants */
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import Hls from 'hls.js';
import mux from 'mux-embed';
import { getPlaybackUrl, getThumbnailPreviewUrl } from '../../shared/mux';
import { MUX_DATA_ENV_KEY } from '../../core/config';
import './videoOverlay.css';
import CloseIcon from '../../assets/Icons/CloseIcon';
import LeftToggleIcon from '../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../assets/Icons/RightToggleIcon';
import UnMuteIcon from '../../assets/Icons/UnmuteIcon';
import MuteIcon from '../../assets/Icons/MuteIcon';

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

  const currentVideo = createMemo(() => {
    const idx = expandedIndex();
    const list = videos ?? [];
    if (idx == null || idx < 0 || idx >= list.length) return null;
    return list[idx];
  });

  const total = () => videos?.length ?? 0;
  const goPrev = () => {
    if (!total()) return;
    setExpandedIndex((i) => (i - 1 + total()) % total());
  };
  const goNext = () => {
    if (!total()) return;
    setExpandedIndex((i) => (i + 1) % total());
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

  const [prevIndex, setPrevIndex] = createSignal(null);

  /** On mobile reels: scroll track to the slide at expandedIndex (after layout) */
  createEffect(() => {
    if (!isMobile() || expandedIndex() == null) return;
    const track = reelsTrackRef();
    if (!track) return;
    const idx = expandedIndex();
    const prev = prevIndex();
    setPrevIndex(idx);
    const lastIdx = (videos?.length ?? 1) - 1;
    const isWrap = (prev === 0 && idx === lastIdx) || (prev === lastIdx && idx === 0);
    const behavior = isWrap ? 'instant' : 'smooth';

    const slides = track.querySelectorAll('.video-carousel-reels-slide');
    const slideEl = slides[idx];
    const scrollToSlide = () => {
      if (slideEl) track.scrollTo({ top: slideEl.offsetTop, behavior });
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

  /** On mobile reels: circular swipe — intercept boundary gestures and wrap */
  createEffect(() => {
    if (!isMobile() || expandedIndex() == null || !videos?.length || videos.length < 2) return;
    const track = reelsTrackRef();
    if (!track) return;

    const SWIPE_THRESHOLD = 40;
    let startY = null;
    let isBoundarySwipe = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isBoundarySwipe = false;
    };

    const onTouchMove = (e) => {
      if (startY == null) return;
      const currentY = e.touches[0].clientY;
      const diff = startY - currentY;
      const idx = expandedIndex();
      const lastIdx = videos.length - 1;
      const atTop = track.scrollTop <= 2;
      const atBottom = track.scrollTop + track.clientHeight >= track.scrollHeight - 2;

      if ((diff > 10 && atBottom && idx === lastIdx) ||
          (diff < -10 && atTop && idx === 0)) {
        isBoundarySwipe = true;
        e.preventDefault();
      }
    };

    const onTouchEnd = (e) => {
      if (startY == null || !isBoundarySwipe) {
        startY = null;
        isBoundarySwipe = false;
        return;
      }
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;
      startY = null;
      isBoundarySwipe = false;

      if (Math.abs(diff) < SWIPE_THRESHOLD) return;

      const idx = expandedIndex();
      const lastIdx = videos.length - 1;

      if (diff > 0 && idx === lastIdx) {
        setExpandedIndex(0);
      } else if (diff < 0 && idx === 0) {
        setExpandedIndex(lastIdx);
      }
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    onCleanup(() => {
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove);
      track.removeEventListener('touchend', onTouchEnd);
    });
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
      <Portal>
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
            <Show when={total() > 1}>
              <button
                type="button"
                className="video-carousel-overlay-nav video-carousel-overlay-nav-prev"
                aria-label="Previous video"
                onClick={goPrev}
              >
                <LeftToggleIcon />
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
                      loop
                      muted
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
            <Show when={total() > 1}>
              <button
                type="button"
                className="video-carousel-overlay-nav video-carousel-overlay-nav-next"
                aria-label="Next video"
                onClick={goNext}
              >
                <RightToggleIcon />
              </button>
            </Show>
          </div>
        </Show>

        {/* Mobile: Reels-style vertical scroll (swipe up/down) */}
        <Show when={isMobile()}>
          <Show when={total() > 1}>
            <button
              type="button"
              className="video-carousel-reels-nav video-carousel-reels-nav-prev"
              aria-label="Previous video"
              onClick={goPrev}
            >
              <LeftToggleIcon />
            </button>
            <button
              type="button"
              className="video-carousel-reels-nav video-carousel-reels-nav-next"
              aria-label="Next video"
              onClick={goNext}
            >
              <RightToggleIcon />
            </button>
          </Show>
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
                          autoPlay
                          loop
                          muted
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
                                <button
                                  type="button"
                                  className="video-carousel-overlay-product-add video-carousel-overlay-product-shop"
                                  style={addToCartButtonStyle()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleProductClick(product, video);
                                  }}
                                >{addToCartButtonLabel()}</button>

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
                      <button
                        type="button"
                        className="video-carousel-overlay-product-add"
                        style={addToCartButtonStyle()}
                        onClick={(e) => {
                          e.preventDefault();
                          handleProductClick(product, currentVideo());
                        }}
                      >{addToCartButtonLabel()}</button>
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
      </Portal>
    </Show>
  );
}
