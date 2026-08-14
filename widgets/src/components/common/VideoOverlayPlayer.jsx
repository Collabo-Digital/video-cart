/* eslint-disable react/prop-types -- shared overlay used by widget variants */
import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import { useLiveProduct } from '../../hooks/useLiveProduct';
import { OverlayProductPanel } from './OverlayProducts/OverlayProductPanel';
import { OverlayProductDetail } from './OverlayProducts/OverlayProductDetail';
import { VideoProgressBar } from './VideoProgressBar/VideoProgressBar';
import { ReelSlideVideo } from './ReelSlideVideo';
import { attachPlayback, startMuxMonitor } from './attachPlayback';
import './videoOverlay.css';
import CloseIcon from '../../assets/Icons/CloseIcon';
import LeftToggleIcon from '../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../assets/Icons/RightToggleIcon';
import UnMuteIcon from '../../assets/Icons/UnmuteIcon';
import MuteIcon from '../../assets/Icons/MuteIcon';
import HeartIcon from '../../assets/Icons/HeartIcon';
import HeartFilledIcon from '../../assets/Icons/HeartFilledIcon';
import { getLikedIds, likeKey, saveLikedIds } from '../../utils/likes';
import { isDataSaver } from '../../utils/widgetHelpers';

const MOBILE_BREAKPOINT = 768;

/** Must match the video-carousel-sally-out keyframe duration in videoOverlay.css. */
const CLOSE_ANIMATION_MS = 400;

/** Must match the video-carousel-slide-* keyframe duration in videoOverlay.css. */
const SLIDE_ANIMATION_MS = 400;

/**
 * One tagged product in the mobile card strip. Shows the stored title/image
 * immediately, then the live price from Shopify so shoppers never see a price
 * that changed after the merchant tagged the product.
 *
 * The whole card is the tap target and opens the detail sheet — the same shape
 * as desktop, where list rows open the detail and only the detail can add to
 * cart. That is also why there is no inline add-to-cart button: a <button>
 * inside a <button> is invalid, and the old inline one had no variant picker,
 * so it just guessed via getVariantId(). Everything inside is a <span> for the
 * same reason — a <div> in a <button> is invalid too.
 */
function OverlayProductItem({ product, onOpen }) {
  const { price } = useLiveProduct(product);

  return (
    <button type="button" className="video-carousel-overlay-product" onClick={onOpen}>
      <span className="video-carousel-overlay-product-image-wrap">
        {/* alt="" — the title beside it already names the product. */}
        <img src={product.image} alt="" loading="lazy" />
      </span>
      <span className="video-carousel-overlay-product-info">
        <span className="video-carousel-overlay-product-title">{product.title}</span>
        <Show when={price()}>
          <span className="video-carousel-overlay-product-price">{price()}</span>
        </Show>
      </span>
    </button>
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

  /* --- likes: device-local, never sent anywhere ---------------------------- */

  /** Seeded once from localStorage; the signal holds the array so the heart
   *  re-renders, and every change is mirrored straight back to disk. */
  const [likedIds, setLikedIds] = createSignal(getLikedIds());

  /** Drives the one-shot like animation. Separate from likedIds so that merely
   *  scrolling onto an already-liked video does not replay it. */
  const [likePulse, setLikePulse] = createSignal(false);

  const isCurrentLiked = createMemo(() => {
    const key = likeKey(currentVideo());
    return key != null && likedIds().includes(key);
  });

  const toggleCurrentLike = () => {
    const key = likeKey(currentVideo());
    if (key == null) return;
    let turnedOn = false;
    setLikedIds((prev) => {
      turnedOn = !prev.includes(key);
      const next = turnedOn ? [...prev, key] : prev.filter((k) => k !== key);
      saveLikedIds(next);
      return next;
    });
    // Only liking animates — un-liking just settles, which is what every reels
    // player does. Dropping the class and re-adding it next frame is what makes
    // a rapid re-like replay the keyframes instead of being ignored.
    setLikePulse(false);
    if (turnedOn) requestAnimationFrame(() => setLikePulse(true));
  };

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

  /* --- products: desktop panel list <-> detail, mobile card strip -> sheet -- */

  const [selectedProductIndex, setSelectedProductIndex] = createSignal(null);

  const products = () => productsForVideo(currentVideo() ?? {});
  // Derived rather than seeded, so the reset effect below can't clobber the
  // single-product case.
  const activeProductIndex = () => (products().length === 1 ? 0 : selectedProductIndex());

  /** What the mobile detail sheet shows. Deliberately the raw
   *  selectedProductIndex, NOT activeProductIndex — the latter auto-returns 0
   *  for single-product videos, which on desktop opens straight into the detail
   *  but on mobile would leave the sheet permanently open. */
  const sheetProduct = () => {
    const i = selectedProductIndex();
    return i == null ? null : products()[i] ?? null;
  };

  const openProductDetail = (i) => {
    setSelectedProductIndex(i);
    // The same 'view' ping OverlayProductPanel fires when a list row is picked.
    handleProductClick?.(products()[i], currentVideo(), { intent: 'view' });
  };

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
    // Mobile reels slides own their own players — see ReelSlideVideo, which
    // mounts one for the current video and one for the next, preloaded.
    if (isMobile()) return;

    const el = videoEl();
    const video = currentVideo();
    if (!el || !video?.playbackId) return;

    const playerInitTime = typeof window !== 'undefined' && window.performance?.now ? performance.now() : Date.now();
    const { hls, dispose } = attachPlayback(el, video, { onFirstPlay });
    const stopMonitor = startMuxMonitor(el, hls, video, playerInitTime);

    onCleanup(() => {
      stopMonitor();
      dispose();
    });
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

    // Arithmetic, not measurement: every slide is exactly one track-height
    // (.video-carousel-reels-slide is height:100% of a 100dvh track), so
    // slide N always sits at N * clientHeight. The old version ran a
    // querySelectorAll and read offsetTop, forcing a layout flush on every
    // index change.
    const scrollToSlide = () => {
      const h = track.clientHeight;
      if (!h) return;
      const top = idx * h;
      if (Math.abs(track.scrollTop - top) >= 2) {
        track.scrollTo({ top, behavior });
      }
    };
    if (track.clientHeight) scrollToSlide();
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

    // Same arithmetic as scrollToSlide, inverted. This runs at the end of every
    // single swipe (scroll-snap-stop: always guarantees it), and used to do a
    // querySelectorAll plus one offsetTop read per slide — N+1 forced layouts
    // at the exact moment the snap was settling.
    const commitNearestSlide = () => {
      const h = track.clientHeight;
      if (!h) return;
      const best = Math.round(track.scrollTop / h);
      if (best < 0 || best >= videos.length) return;
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

  /** Which slides get their heavy content: the products sheet and the animated
   *  poster. ±1 so the next/previous slide is already built when the swipe
   *  lands — nothing pops in. Modular, so the circular-wrap targets are covered.
   *
   *  Every slide used to mount both. That meant N backdrop-filter sheets over
   *  moving video, N animated WebPs decoding at once, N x M product cards, and
   *  N x M useLiveProduct fetches firing in one burst at open — all competing
   *  with the HLS manifest for the video actually being watched. The desktop
   *  branch mounts exactly one panel; this brings mobile close to that.
   *
   *  Layout-safe: the sheet and the placeholder are both position:absolute
   *  inside a slide whose height comes from CSS, so mounting or unmounting them
   *  cannot change a slide's height and the offsetTop scroll math above holds. */
  /** Which slides own a <video> + Hls. Next-only, NOT ±1 like nearIndices: the
   *  previous slide's segments are already in the browser's HTTP cache from when
   *  it played, so a second instance for it buys nothing, and a third live
   *  decoder risks MEDIA_ERR_DECODE on budget Android, where concurrent hardware
   *  decoders cap as low as four. Modular, so the last slide's wrap target is
   *  warm too. */
  const videoIndices = createMemo(() => {
    const idx = expandedIndex();
    const n = videos?.length ?? 0;
    if (idx == null || !n || !isMobile()) return new Set();
    if (n < 2 || isDataSaver() || (navigator.deviceMemory ?? 4) <= 2) return new Set([idx]);
    return new Set([idx, (idx + 1) % n]);
  });

  /** Preloaded neighbours never play, so they cannot fire onFirstPlay — but
   *  scrolling past a video and back remounts its child, which would fire it
   *  again. Deduped here, for the overlay's lifetime. Mobile only: desktop's
   *  per-mount flag already lets it re-fire on revisit, and changing that is a
   *  separate decision. */
  const played = new Set();

  const handleFirstPlay = async (video, watchTimeSeconds) => {
    const key = video?.id ?? video?.playbackId;
    if (!key || played.has(key)) return;
    played.add(key);
    await onFirstPlay?.(video, watchTimeSeconds);
  };

  createEffect(() => {
    if (expandedIndex() == null) played.clear();
  });

  const nearIndices = createMemo(() => {
    const idx = expandedIndex();
    const n = videos?.length ?? 0;
    if (idx == null || !n || !isMobile()) return new Set();
    return new Set([idx, (idx + 1) % n, (idx - 1 + n) % n]);
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

  /** On mobile reels: circular swipe — wrap at the boundaries.
   *  Deliberately NO touchmove listener. A non-passive touchmove on the scroller
   *  forces the compositor to wait for main-thread JS before every scroll frame,
   *  and the handler's scrollTop/clientHeight/scrollHeight reads each forced a
   *  layout flush mid-gesture. The boundary is read once here, at gesture end.
   *  The rubber-band that preventDefault() used to suppress is now handled by
   *  `overscroll-behavior-y: none` in videoOverlay.css, which costs nothing. */
  createEffect(() => {
    if (!isMobile() || expandedIndex() == null || !videos?.length || videos.length < 2) return;
    const track = reelsTrackRef();
    if (!track) return;

    const SWIPE_THRESHOLD = 40;
    let startY = null;

    const onTouchStart = (e) => { startY = e.touches[0].clientY; };

    const onTouchEnd = (e) => {
      if (startY == null) return;
      const endY = e.changedTouches[0].clientY;
      const diff = startY - endY;
      startY = null;
      if (Math.abs(diff) < SWIPE_THRESHOLD) return;

      const idx = expandedIndex();
      const lastIdx = videos.length - 1;
      // Layout read once per gesture, not once per frame.
      const atTop = track.scrollTop <= 2;
      const atBottom = track.scrollTop + track.clientHeight >= track.scrollHeight - 2;

      if (diff > 0 && idx === lastIdx && atBottom) {
        setExpandedIndex(0);
      } else if (diff < 0 && idx === 0 && atTop) {
        setExpandedIndex(lastIdx);
      }
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    onCleanup(() => {
      track.removeEventListener('touchstart', onTouchStart);
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

  /* The mobile clock signal and its timeupdate listeners are gone: both
     platforms now use VideoProgressBar, which paints from rAF straight to the
     DOM and never sets a signal during playback. That was the last thing
     writing to the DOM ~4x/sec while the shopper was mid-scroll. */

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

        {/* Mobile action rail. Lives at the overlay root, not inside a slide, so
            there is exactly one of it and it does not move while the reels track
            scrolls. The close button stays pinned top-right above it. */}
        <Show when={isMobile()}>
          <div className="video-carousel-reels-rail">
            <button
              type="button"
              className={`${isCurrentLiked() ? 'video-carousel-reels-like-on' : ''}${likePulse() ? ' video-carousel-reels-like-pulse' : ''}`}
              aria-label={isCurrentLiked() ? 'Unlike' : 'Like'}
              aria-pressed={isCurrentLiked()}
              onClick={toggleCurrentLike}
              /* Clears the class from the CSS duration itself, so there is no
                 timer to keep in sync with the keyframes. */
              onAnimationEnd={() => setLikePulse(false)}
            >
              {isCurrentLiked() ? <HeartFilledIcon /> : <HeartIcon />}
            </button>
            <button
              type="button"
              className="video-carousel-control-mute"
              aria-label={isMuted() ? 'Unmute' : 'Mute'}
              onClick={() => setIsMuted((m) => !m)}
            >
              {isMuted() ?  <MuteIcon /> : <UnMuteIcon /> }
            </button>
          </div>
        </Show>

        {/* Mobile product detail, as a bottom sheet. Rendered here at the overlay
            root rather than per-slide, so there is exactly one of it and it is
            driven by currentVideo() — three slides render their product strips
            at once, so a per-slide sheet could not tell which one was open.
            `keyed` so switching products remounts and resets variant + quantity,
            the same reason OverlayProductPanel keys its detail. */}
        <Show when={isMobile() ? sheetProduct() : null} keyed>
          {(product) => (
            <>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className="video-carousel-reels-sheet-backdrop"
                onClick={() => setSelectedProductIndex(null)}
                aria-hidden
              />
              <div
                className="video-carousel-reels-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Product details"
              >
                <OverlayProductDetail
                  product={product}
                  video={currentVideo()}
                  buttonBehavior={buttonBehavior ?? (() => undefined)}
                  showBack={() => true}
                  onBack={() => setSelectedProductIndex(null)}
                  videoNumber={() => (expandedIndex() ?? 0) + 1}
                  videoTotal={total}
                  addToCartButtonLabel={addToCartButtonLabel}
                  addToCartButtonStyle={addToCartButtonStyle}
                  handleProductClick={handleProductClick}
                />
              </div>
            </>
          )}
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
                {isMuted() ? <MuteIcon /> : <UnMuteIcon /> }
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
                      /* Distant slides get no image at all — they fall back to
                         the rule's own background-color and cost nothing. Same
                         URL as before for near slides, so no new cache entry. */
                      style={{
                        'background-image': nearIndices().has(index())
                          ? `url(${getThumbnailPreviewUrl(video.playbackId, 560, 748) || ''})`
                          : 'none',
                      }}
                      aria-hidden
                    />
                    <Show when={videoIndices().has(index())}>
                      <div className="video-carousel-overlay-video-wrap video-carousel-reels-video-wrap">
                        <ReelSlideVideo
                          video={video}
                          active={() => index() === expandedIndex()}
                          registerActive={setVideoEl}
                          onFirstPlay={handleFirstPlay}
                          poster={posterUrl(video)}
                        />
                        {/* Only the watched slide gets chrome — the preloading
                            neighbour is a bare <video>. Mute lives in the
                            root-level action rail now, next to the like button.
                            The scrubber is the same component desktop uses: it
                            already sets touch-action: none, so dragging it never
                            fights the vertical scroll-snap. */}
                        <Show when={index() === expandedIndex()}>
                          <VideoProgressBar
                            videoEl={videoEl}
                            accent={() => addToCartButtonStyle()?.['background-color'] || '#fff'}
                          />
                        </Show>
                      </div>
                    </Show>
                    {/* Nothing tagged: no panel at all, matching the desktop
                        branch above. An empty aside still paints the base rule's
                        background and border-left over the video (the reels
                        override does not reset them), which reads as a rendering
                        glitch rather than an empty state. */}
                    <Show when={nearIndices().has(index()) && productsForVideo(video).length}>
                      <aside className="video-carousel-overlay-products video-carousel-overlay-products-reels">
                        {/* <h3 className="video-carousel-overlay-products-title">Products tagged</h3> */}
                        <div className="video-carousel-overlay-products-inner">
                          <For each={productsForVideo(video)}>
                            {(product, i) => (
                              <OverlayProductItem
                                product={product}
                                onOpen={() => openProductDetail(i())}
                              />
                            )}
                          </For>
                        </div>
                      </aside>
                    </Show>
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
