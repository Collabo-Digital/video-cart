/* eslint-disable react/prop-types -- shared overlay used by widget variants */
import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
// Full build, NOT 'hls.js/light'. The light build omits AudioTrackController, so
// `altAudioEnabled = !!(config.audioStreamController && config.audioTrackController)`
// (hls.light.js:20363) is permanently false and it never fetches a separate audio
// rendition. Mux delivers CMAF, where audio is its own EXT-X-MEDIA:TYPE=AUDIO
// rendition — so the light build played video with silence, no error and nothing
// for the mute fallback to catch. Costs ~54 KB gzip; audio is not optional for a
// shoppable video widget.
import Hls from 'hls.js';
import mux from 'mux-embed';
import { getPlaybackUrl, getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import { useLiveProduct } from '../../hooks/useLiveProduct';
import { OverlayProductPanel } from './OverlayProducts/OverlayProductPanel';
import { VideoProgressBar } from './VideoProgressBar/VideoProgressBar';
import { formatTime } from '../../utils/widgetHelpers';
import { EMPTY_PRODUCTS, LABEL_SOLD_OUT } from '../../constants/strings';
import { MUX_DATA_ENV_KEY } from '../../core/config';
import './videoOverlay.css';
import CloseIcon from '../../assets/Icons/CloseIcon';
import LeftToggleIcon from '../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../assets/Icons/RightToggleIcon';
import UnMuteIcon from '../../assets/Icons/UnmuteIcon';
import MuteIcon from '../../assets/Icons/MuteIcon';

const MOBILE_BREAKPOINT = 768;

/** Must match the video-carousel-sally-out keyframe duration in videoOverlay.css. */
const CLOSE_ANIMATION_MS = 400;

/** Must match the video-carousel-slide-* keyframe duration in videoOverlay.css. */
const SLIDE_ANIMATION_MS = 400;

/**
 * One tagged product in the fullscreen player. Shows the stored title/image
 * immediately, then live price/availability from Shopify so shoppers never see
 * a price that changed after the merchant tagged the product.
 */
function OverlayProductItem({ product, video, addToCartButtonLabel, addToCartButtonStyle, handleProductClick }) {
  const { price, available } = useLiveProduct(product);

  return (
    <div className="video-carousel-overlay-product">
      <div className="video-carousel-overlay-product-image-wrap">
        <img src={product.image} alt={product.title} loading="lazy" />
      </div>
      <div className="video-carousel-overlay-product-info">
        <span className="video-carousel-overlay-product-title">{product.title}</span>
        <Show when={price()}>
          <span className="video-carousel-overlay-product-price">{price()}</span>
        </Show>
        <button
          type="button"
          className="video-carousel-overlay-product-add video-carousel-overlay-product-shop"
          style={addToCartButtonStyle()}
          disabled={!available()}
          onClick={(e) => {
            e.preventDefault();
            if (!available()) return;
            handleProductClick(product, video);
          }}
        >{available() ? addToCartButtonLabel() : LABEL_SOLD_OUT}</button>
      </div>
    </div>
  );
}

export function VideoOverlayPlayer({
  videos,
  expandedIndex,
  setExpandedIndex,
  productsForVideo,
  addToCartButtonLabel,
  addToCartButtonStyle,
  buttonBehavior,
  handleProductClick,
  onVideoChange,
  onFirstPlay,
}) {
  const [videoEl, setVideoEl] = createSignal(null);
  const [reelsTrackRef, setReelsTrackRef] = createSignal(null);
  const [isMuted, setIsMuted] = createSignal(false);
  const [videoReady, setVideoReady] = createSignal(false);
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

  const posterUrl = (v) => getThumbnailUrl(v?.playbackId, 560, 748) || undefined;

  const total = () => videos?.length ?? 0;

  /* --- prev/next: slide the outgoing video out, the incoming one in -------- */

  /** The video that's leaving, and which way it goes. null when idle.
   *  Direction comes from the button pressed rather than from index arithmetic,
   *  so wrapping last -> first still slides forward instead of sweeping back. */
  const [outgoing, setOutgoing] = createSignal(null);

  const slideTo = (dir) => {
    if (total() < 2) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Mobile navigates by scroll-snap, not by these buttons; reduced motion
    // skips the animation. Both cases just move the index.
    if (!isMobile() && !reduced) setOutgoing({ video: currentVideo(), dir });
    setExpandedIndex((i) => (dir === 'next'
      ? (i + 1) % total()
      : (i - 1 + total()) % total()));
  };

  const goPrev = () => slideTo('prev');
  const goNext = () => slideTo('next');

  /** Drop the ghost once its animation is done. Re-running on every change means
   *  rapid clicks replace the pending ghost instead of stacking timers. */
  createEffect(() => {
    if (!outgoing()) return;
    const timer = setTimeout(() => setOutgoing(null), SLIDE_ANIMATION_MS + 60);
    onCleanup(() => clearTimeout(timer));
  });

  /* --- closing: hold the unmount open so the exit animation can play ------ */

  const [isClosing, setIsClosing] = createSignal(false);

  const finishClose = () => {
    setIsClosing(false);
    // Otherwise a stale ghost replays a phantom slide on the next open.
    setOutgoing(null);
    setExpandedIndex(null);
  };

  /** Desktop plays the sally exit before unmounting. Mobile has no exit
   *  animation, and neither does reduced-motion, so both close immediately —
   *  which keeps the JS and the CSS media query agreeing instead of stalling on
   *  a timer waiting for keyframes that will never run. */
  const requestClose = () => {
    if (isClosing()) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (isMobile() || reduced) {
      setExpandedIndex(null);
      return;
    }
    setIsClosing(true);
  };

  /** Backstop for animationend, which never fires in a hidden tab. */
  createEffect(() => {
    if (!isClosing()) return;
    const timer = setTimeout(finishClose, CLOSE_ANIMATION_MS + 60);
    onCleanup(() => clearTimeout(timer));
  });

  /* --- desktop products panel: list <-> detail ---------------------------- */

  const [selectedProductIndex, setSelectedProductIndex] = createSignal(null);

  const products = () => productsForVideo(currentVideo() ?? {});
  // Derived rather than seeded, so the reset effect below can't clobber the
  // single-product case.
  const activeProductIndex = () => (products().length === 1 ? 0 : selectedProductIndex());

  /** Back to the list whenever the shopper moves to another video, and on close
   *  — expandedIndex() covers both, since closing sets it to null. */
  createEffect(() => {
    expandedIndex();
    setSelectedProductIndex(null);
  });

  /** Escape backs out one level at a time. selectedProductIndex() is read inside
   *  the handler, not the effect body, so this doesn't re-subscribe on every
   *  detail toggle. */
  createEffect(() => {
    if (expandedIndex() == null) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // A dialog that is already leaving shouldn't pop its detail back to the list.
      if (isClosing()) return;
      if (selectedProductIndex() != null) setSelectedProductIndex(null);
      else requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => document.removeEventListener('keydown', onKeyDown));
  });

  /** The page scrolls behind the modal otherwise. */
  createEffect(() => {
    if (expandedIndex() == null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    onCleanup(() => { document.body.style.overflow = previous; });
  });

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
      // Readable from the storefront console: if audio is ever silent again,
      // this says whether the manifest carries an audio track at all, which
      // separates a player bug from a silently-encoded source asset.
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        window.__videoCartAudio = { tracks: hls.audioTracks?.length ?? 0 };
      });
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

  /** Reset the placeholder fade whenever the active video changes (before the ready listener runs) */
  createEffect(() => {
    expandedIndex();
    isMobile();
    setVideoReady(false);
  });

  /** Mark the current video ready once it has a decodable frame (fades the slide placeholder out) */
  createEffect(() => {
    const el = videoEl();
    if (!el) return;
    const markReady = () => setVideoReady(true);
    if (el.readyState >= 2) markReady();
    el.addEventListener('loadeddata', markReady);
    el.addEventListener('playing', markReady);
    onCleanup(() => {
      el.removeEventListener('loadeddata', markReady);
      el.removeEventListener('playing', markReady);
    });
  });

  let prevIdx = null;
  let suppressScrollSync = false;

  /** On mobile reels: scroll track to the slide at expandedIndex (after layout).
   * Skipped when the index change originated from the user's own scroll, so the
   * programmatic scrollTo never fights the native scroll-snap animation. */
  createEffect(() => {
    const idx = expandedIndex();
    if (idx == null) {
      prevIdx = null;
      return;
    }
    if (!isMobile()) return;
    const track = reelsTrackRef();
    if (!track) return;
    const prev = prevIdx;
    prevIdx = idx;
    if (suppressScrollSync) return;
    const lastIdx = (videos?.length ?? 1) - 1;
    const isWrap = (prev === 0 && idx === lastIdx) || (prev === lastIdx && idx === 0);
    const behavior = prev == null || isWrap ? 'instant' : 'smooth';

    const scrollToSlide = () => {
      const slideEl = track.querySelectorAll('.video-carousel-reels-slide')[idx];
      if (slideEl && Math.abs(track.scrollTop - slideEl.offsetTop) >= 2) {
        track.scrollTo({ top: slideEl.offsetTop, behavior });
      }
    };
    if (track.querySelectorAll('.video-carousel-reels-slide')[idx]) scrollToSlide();
    else {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(scrollToSlide);
      });
      onCleanup(() => cancelAnimationFrame(raf));
    }
  });

  /** On mobile reels: commit expandedIndex only after the snap scroll settles,
   * so native scroll-snap fully owns the gesture (no mid-swipe video remount). */
  createEffect(() => {
    if (!isMobile() || !videos?.length) return;
    const track = reelsTrackRef();
    if (!track) return;

    const commitNearestSlide = () => {
      const slides = track.querySelectorAll('.video-carousel-reels-slide');
      if (!slides.length) return;
      let best = null;
      let bestDist = Infinity;
      slides.forEach((el) => {
        const dist = Math.abs(el.offsetTop - track.scrollTop);
        const idx = Number(el.dataset.reelsIndex);
        if (dist < bestDist && !Number.isNaN(idx)) {
          bestDist = dist;
          best = idx;
        }
      });
      if (best == null) return;
      suppressScrollSync = true;
      try {
        setExpandedIndex(best);
      } finally {
        suppressScrollSync = false;
      }
    };

    if ('onscrollend' in window) {
      track.addEventListener('scrollend', commitNearestSlide);
      onCleanup(() => track.removeEventListener('scrollend', commitNearestSlide));
    } else {
      // iOS Safari has no scrollend; treat 120ms of scroll silence as settled
      let debounce = null;
      const onScroll = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(commitNearestSlide, 120);
      };
      track.addEventListener('scroll', onScroll, { passive: true });
      onCleanup(() => {
        if (debounce) clearTimeout(debounce);
        track.removeEventListener('scroll', onScroll);
      });
    }
  });

  /** Warm the static posters for adjacent slides so a swipe never lands on an unloaded image */
  createEffect(() => {
    if (!isMobile()) return;
    const idx = expandedIndex();
    const n = videos?.length ?? 0;
    if (idx == null || n < 2) return;
    [(idx + 1) % n, (idx - 1 + n) % n].forEach((i) => {
      const url = posterUrl(videos[i]);
      if (url) new Image().src = url;
    });
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

  /** Mirror the shopper's mute choice onto whichever element is live. */
  createEffect(() => {
    const el = videoEl();
    if (el) el.muted = isMuted();
  });

  /** Start with sound. Browsers refuse sound-on autoplay unless they trust the
   *  gesture; opening this overlay is a click, so it usually passes. Where it
   *  doesn't, fall back to muted playback rather than leaving a dead frame, and
   *  let the button reflect reality.
   *  Depends on videoEl() only — untrack keeps a mute toggle from re-running an
   *  autoplay attempt. */
  createEffect(() => {
    const el = videoEl();
    if (!el) return;
    el.muted = untrack(isMuted);

    const attempt = () => {
      el.play()?.catch((err) => {
        // AbortError just means a pending play was interrupted — routinely
        // hls.js swapping the source in underneath us. That is not a refusal of
        // sound, and muting on it would silence a video nobody blocked; the
        // canplay retry below picks it up instead.
        if (err?.name !== 'NotAllowedError') return;
        if (el.muted) return; // already muted and still refused, nothing left to try
        // Readable from the console: storefront builds have no DEV logging, and
        // this is the one thing worth knowing when audio comes up silent.
        window.__videoCartAudioBlocked = true;
        setIsMuted(true);
        el.muted = true;
        el.play()?.catch(() => {});
      });
    };

    // Call it NOW, while the click that opened the overlay is still the current
    // task. Permission is decided when play() is invoked, not when playback
    // starts, and Safari only grants it while the gesture is live — deferring
    // this to loadeddata is what got audio refused. Calling before any data is
    // buffered is fine: the promise simply settles once playback begins.
    attempt();

    // Retry once media is actually ready, in case the first call was
    // interrupted rather than refused.
    const retry = () => { if (el.paused) attempt(); };
    el.addEventListener('loadeddata', retry);
    el.addEventListener('canplay', retry);
    onCleanup(() => {
      el.removeEventListener('loadeddata', retry);
      el.removeEventListener('canplay', retry);
    });
  });

  /** Clock for the mobile control bar. The desktop scrubber reads the media
   *  element directly instead, so it never sets a signal during playback. */
  createEffect(() => {
    const el = videoEl();
    if (!el) return;
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
      {/* Backdrop click dismisses. Keyboard users get the same exit from the
          Escape handler above and from the close button, so this needs no key
          listener of its own. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={`video-carousel-overlay${isMobile() ? ' video-carousel-overlay-reels' : ''}${isClosing() ? ' video-carousel-overlay-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Video view"
        onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
      >
        {/* Mobile keeps a root-level close button — the reels rule re-pins it fixed. */}
        <Show when={isMobile()}>
          <button
            type="button"
            className="video-carousel-overlay-close"
            aria-label="Close"
            onClick={requestClose}
          >
            <CloseIcon />
          </button>
        </Show>

        {/* Desktop: nav arrows on the backdrop, either side of the card */}
        <Show when={!isMobile()}>
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

          <div
            className="video-carousel-overlay-card"
            /* Also fires when the OPEN animation ends, hence the guard. */
            onAnimationEnd={() => { if (isClosing()) finishClose(); }}
          >
            <div className="video-carousel-overlay-center">
              {/* The leaving video, frozen to its thumbnail. Rendered before the
                  live pane so the incoming video paints on top. */}
              <Show when={outgoing()} keyed>
                {(out) => (
                  <div
                    className={`video-carousel-overlay-video-wrap video-carousel-overlay-slide-out-${out.dir}`}
                    aria-hidden
                  >
                    <span
                      className="video-carousel-overlay-slide-poster"
                      style={{ 'background-image': `url(${getThumbnailPreviewUrl(out.video?.playbackId, 560, 748) || ''})` }}
                    />
                  </div>
                )}
              </Show>

              {/* keyed: without it Solid reuses this node, the class string stays
                  identical across next->next, and the enter animation never
                  restarts. Remounting the <video> is safe — the HLS effect's
                  onCleanup closes over the element it attached to. */}
              <Show when={currentVideo()} keyed>
                {(video) => (
                  <div
                    className={`video-carousel-overlay-video-wrap${
                      outgoing() ? ` video-carousel-overlay-slide-in-${outgoing().dir}` : ''
                    }`}
                  >
                    {/* Merchant videos come from Mux and the app stores no text
                        tracks, so there is nothing to attach. A real gap now
                        that playback is unmuted. */}
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      id={`video-${video.id}`}
                      ref={setVideoEl}
                      className="video-carousel-overlay-video"
                      poster={posterUrl(video)}
                      preload="auto"
                      playsInline
                      autoPlay
                      loop
                    />
                  </div>
                )}
              </Show>

              {/* Chrome sits outside the sliding layers so it stays put, and so
                  it isn't duplicated across the two panes. Both are absolutely
                  positioned: this pane is a single-cell grid, so an in-flow
                  child would be auto-placed into a new implicit row. */}
              <button
                type="button"
                className="video-carousel-control-mute"
                aria-label={isMuted() ? 'Unmute' : 'Mute'}
                onClick={() => setIsMuted((m) => !m)}
              >
                {isMuted() ? <UnMuteIcon /> : <MuteIcon />}
              </button>
              <VideoProgressBar
                videoEl={videoEl}
                accent={() => addToCartButtonStyle()?.['background-color'] || '#fff'}
              />
            </div>

            {/* keyed on the video so the panel remounts per navigation and its
                cross-fade replays. Cheap: fetchProduct caches per handle.
                The child MUST take a parameter: Solid's Show only invokes the
                children function when its arity is > 0, so a `() =>` child
                returns the same reference forever and keyed never remounts. */}
            <Show when={currentVideo()} keyed>
              {(video) => (
                /* An empty white panel reads as broken — show the video alone. */
                <Show when={products().length}>
                  <OverlayProductPanel
                    products={products}
                    video={() => video}
                    selectedIndex={activeProductIndex}
                    onSelect={setSelectedProductIndex}
                    onBack={() => setSelectedProductIndex(null)}
                    buttonBehavior={buttonBehavior ?? (() => undefined)}
                    videoNumber={() => (expandedIndex() ?? 0) + 1}
                    videoTotal={total}
                    addToCartButtonLabel={addToCartButtonLabel}
                    addToCartButtonStyle={addToCartButtonStyle}
                    handleProductClick={handleProductClick}
                  />
                </Show>
              )}
            </Show>

            {/* Top-right of the CARD, so it sits over the products panel when
                there is one and over the video when there isn't. Last child, so
                it paints above the panel. */}
            <button
              type="button"
              className={`video-carousel-overlay-close${
                products().length ? ' video-carousel-overlay-close-on-panel' : ''
              }`}
              aria-label="Close"
              onClick={requestClose}
            >
              <CloseIcon />
            </button>
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
                    <span
                      className={`video-carousel-reels-slide-placeholder${
                        index() === expandedIndex() && videoReady() ? ' video-carousel-reels-slide-placeholder-hidden' : ''
                      }`}
                      style={{ 'background-image': `url(${getThumbnailPreviewUrl(video.playbackId, 560, 748) || ''})` }}
                      aria-hidden
                    />
                    <Show when={index() === expandedIndex()}>
                      <div className="video-carousel-overlay-video-wrap video-carousel-reels-video-wrap">
                        {/* No text tracks available from Mux — see the desktop
                            player above for the same gap. */}
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          ref={setVideoEl}
                          className="video-carousel-overlay-video"
                          poster={posterUrl(video)}
                          preload="auto"
                          playsInline
                          autoPlay
                          loop
                        />
                        {/* Outside the control bar: the products sheet is a
                            later sibling at bottom:0 with no z-index, so it
                            paints over that bar and buried this button. */}
                        <button
                          type="button"
                          className="video-carousel-control-mute"
                          aria-label={isMuted() ? 'Unmute' : 'Mute'}
                          onClick={() => setIsMuted((m) => !m)}
                        >
                          {isMuted() ? <UnMuteIcon /> : <MuteIcon />}
                        </button>
                        <div className="video-carousel-custom-controls">
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
                    <aside className="video-carousel-overlay-products video-carousel-overlay-products-reels">
                      {/* <h3 className="video-carousel-overlay-products-title">Products tagged</h3> */}
                      <div className="video-carousel-overlay-products-inner">
                        <For each={productsForVideo(video)}>
                          {(product) => (
                            <OverlayProductItem
                              product={product}
                              video={video}
                              addToCartButtonLabel={addToCartButtonLabel}
                              addToCartButtonStyle={addToCartButtonStyle}
                              handleProductClick={handleProductClick}
                            />
                          )}
                        </For>
                      </div>
                      <Show when={!productsForVideo(video).length}>
                        <p className="video-carousel-overlay-products-empty">{EMPTY_PRODUCTS}</p>
                      </Show>
                    </aside>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

      </div>
      </Portal>
    </Show>
  );
}
