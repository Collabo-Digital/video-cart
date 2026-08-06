/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { formatTime } from '../../../utils/widgetHelpers';
import './videoProgressBar.css';

/** Keyboard seek steps, in seconds. */
const STEP_SMALL = 5;
const STEP_LARGE = 10;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Reels-style scrubber for the desktop player.
 *
 * The visuals are driven by requestAnimationFrame writing transforms straight
 * to the DOM through refs — deliberately outside Solid's reactive system. The
 * `timeupdate` event only fires ~4x/sec, which is what makes a naive progress
 * bar visibly step; and setting a signal every frame would re-render 60x/sec
 * for something no other component reads.
 *
 * ARIA values do go through a signal, but only at `timeupdate` cadence: screen
 * readers have no use for 60Hz, and it keeps the render count at zero during
 * ordinary playback.
 *
 * @param {() => HTMLVideoElement|null} videoEl
 * @param {() => string} accent  CSS colour for the fill
 */
export function VideoProgressBar({ videoEl, accent }) {
  let rootEl;
  let trackEl;
  let fillEl;
  let thumbEl;
  let bubbleEl;

  const [ariaTime, setAriaTime] = createSignal(0);
  const [ariaDuration, setAriaDuration] = createSignal(0);

  /** Set while dragging so the rAF loop doesn't fight the pointer. */
  let dragging = false;
  let raf = null;

  const durationOf = (el) => {
    const d = el?.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
  };

  /** Move fill, thumb and bubble to a 0..1 position. Pure DOM writes. */
  const render = (p, bubbleText) => {
    if (!fillEl || !trackEl) return;
    const width = trackEl.clientWidth;
    fillEl.style.transform = `translateX(${(p - 1) * 100}%)`;
    if (thumbEl) thumbEl.style.transform = `translate3d(${p * width}px, -50%, 0)`;
    if (bubbleEl && bubbleText != null) {
      bubbleEl.textContent = bubbleText;
      bubbleEl.style.transform = `translate3d(${p * width}px, 0, 0)`;
    }
  };

  const paint = () => {
    const el = videoEl();
    const d = durationOf(el);
    if (el && d && !dragging) render(clamp01(el.currentTime / d));
    raf = requestAnimationFrame(paint);
  };

  const startLoop = () => {
    if (raf == null) raf = requestAnimationFrame(paint);
  };

  const stopLoop = () => {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  };

  /** Pointer x -> 0..1 along the track. */
  const positionFromEvent = (e) => {
    const rect = trackEl.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp01((e.clientX - rect.left) / rect.width);
  };

  const seekTo = (p) => {
    const el = videoEl();
    const d = durationOf(el);
    if (!el || !d) return;
    el.currentTime = p * d;
    setAriaTime(el.currentTime);
    render(p);
  };

  const onPointerDown = (e) => {
    const d = durationOf(videoEl());
    if (!d) return;
    dragging = true;
    rootEl.setPointerCapture?.(e.pointerId);
    const p = positionFromEvent(e);
    render(p, formatTime(p * d));
  };

  const onPointerMove = (e) => {
    const d = durationOf(videoEl());
    if (!d) return;
    const p = positionFromEvent(e);
    // While dragging this is a preview only — seeking on every move would
    // hammer HLS with segment requests for frames nobody sees.
    if (dragging) render(p, formatTime(p * d));
    else if (bubbleEl) {
      bubbleEl.textContent = formatTime(p * d);
      bubbleEl.style.transform = `translate3d(${p * trackEl.clientWidth}px, 0, 0)`;
    }
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    rootEl.releasePointerCapture?.(e.pointerId);
    seekTo(positionFromEvent(e));
  };

  const onKeyDown = (e) => {
    const el = videoEl();
    const d = durationOf(el);
    if (!el || !d) return;
    const jump = (delta) => {
      e.preventDefault();
      seekTo(clamp01((el.currentTime + delta) / d));
    };
    switch (e.key) {
      case 'ArrowRight': jump(STEP_SMALL); break;
      case 'ArrowLeft': jump(-STEP_SMALL); break;
      case 'PageUp': jump(STEP_LARGE); break;
      case 'PageDown': jump(-STEP_LARGE); break;
      case 'Home': e.preventDefault(); seekTo(0); break;
      case 'End': e.preventDefault(); seekTo(1); break;
      default: break;
    }
  };

  /** Re-attach whenever the <video> is replaced (prev/next remounts it). */
  createEffect(() => {
    const el = videoEl();
    if (!el) return;

    const syncAria = () => {
      setAriaTime(el.currentTime);
      setAriaDuration(durationOf(el));
    };
    const paintOnce = () => {
      const d = durationOf(el);
      if (d) render(clamp01(el.currentTime / d));
      syncAria();
    };

    el.addEventListener('timeupdate', syncAria);
    el.addEventListener('loadedmetadata', paintOnce);
    el.addEventListener('durationchange', paintOnce);
    el.addEventListener('seeked', paintOnce);
    el.addEventListener('play', startLoop);
    el.addEventListener('pause', stopLoop);
    el.addEventListener('ended', stopLoop);

    paintOnce();
    if (!el.paused) startLoop();

    onCleanup(() => {
      stopLoop();
      el.removeEventListener('timeupdate', syncAria);
      el.removeEventListener('loadedmetadata', paintOnce);
      el.removeEventListener('durationchange', paintOnce);
      el.removeEventListener('seeked', paintOnce);
      el.removeEventListener('play', startLoop);
      el.removeEventListener('pause', stopLoop);
      el.removeEventListener('ended', stopLoop);
    });
  });

  return (
    <div
      ref={rootEl}
      className="vc-progress"
      style={{ '--vc-progress-fill': accent() }}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin="0"
      aria-valuemax={Math.round(ariaDuration())}
      aria-valuenow={Math.round(ariaTime())}
      aria-valuetext={`${formatTime(ariaTime())} of ${formatTime(ariaDuration())}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <span ref={bubbleEl} className="vc-progress-bubble" aria-hidden>0:00</span>
      <span ref={trackEl} className="vc-progress-track">
        <span ref={fillEl} className="vc-progress-fill" />
      </span>
      <span ref={thumbEl} className="vc-progress-thumb" aria-hidden />
    </div>
  );
}
