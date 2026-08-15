/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { createEffect, onCleanup } from 'solid-js';
import { attachPlayback, startMuxMonitor } from './attachPlayback';

/** Seconds the preloading neighbour buffers before going quiet.
 *
 *  10, not 2. Two seconds is roughly ONE Mux fragment: the shopper swiped, the
 *  video played for about a second, ran dry, and stalled while the next fragment
 *  loaded — the "plays, pauses for a moment, plays" the reel was doing. Ten
 *  seconds is enough runway that the fragment loader is comfortably ahead by the
 *  time the buffer would have run out. */
const PRELOAD_SECONDS = 10;

/** What a neighbour targets for its first moment. Both instances pull over the
 *  same connection, so a neighbour going straight for PRELOAD_SECONDS would
 *  starve the video the shopper is actually watching while it is still filling
 *  its own buffer. */
const PRELOAD_INITIAL_SECONDS = 3;

/** How long a neighbour stays at PRELOAD_INITIAL_SECONDS before ramping up. */
const PRELOAD_RAMP_MS = 1200;

/** hls.js default; restored on the slide the shopper is actually watching. */
const ACTIVE_BUFFER_SECONDS = 30;

/**
 * One reels slide's <video>, owning its own hls.js instance.
 *
 * The mobile reel mounts two of these — the current video and the next one,
 * preloaded — so that landing on the next slide is an unpause rather than a
 * cold start. Only the active one registers itself as the player's "current"
 * element, plays, carries sound, or reports to Mux.
 *
 * A component rather than a Map held by the parent: Solid's lifecycle already
 * gives per-instance creation and disposal, and getting disposal wrong leaks an
 * Hls instance plus its worker and SourceBuffer, which on Android is a crash
 * rather than a slowdown.
 *
 * @param {Object} video           the feed video for this slide
 * @param {() => boolean} active   is this the slide being watched
 * @param {() => boolean} isMuted  the shopper's mute choice
 * @param {Function} registerActive  parent's setVideoEl
 * @param {Function} onFirstPlay
 * @param {string} [poster]
 */
export function ReelSlideVideo(props) {
  let mediaEl;

  /* Deliberately NO autoPlay attribute. A preloading neighbour must never start
     playing, and the attribute was always belt-and-braces here: the parent's
     autoplay effect calls play() explicitly, which is what actually earns the
     sound permission — permission is decided when play() is invoked, not when
     playback begins. */
  const el = (
    // No text tracks available from Mux — same gap as the desktop player.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={mediaEl}
      className="video-carousel-overlay-video"
      poster={props.poster}
      preload="auto"
      playsInline
      loop
    />
  );

  /* Attach the source immediately, even for a neighbour — that is the whole
     point. A neighbour self-limits with maxBufferLength: hls.js re-reads it
     every tick, so a 2s target fetches the init segment plus roughly one
     fragment and then goes quiet. Deliberately not stopLoad() on FRAG_BUFFERED:
     with Mux's CMAF alt-audio that event fires per track, so a `once` handler
     can stop after an audio-only fragment and leave no video frame at all. */
  const { hls, dispose } = attachPlayback(mediaEl, props.video, {
    hlsConfig: props.active() ? undefined : { maxBufferLength: PRELOAD_INITIAL_SECONDS },
    onFirstPlay: props.onFirstPlay,
  });
  onCleanup(dispose);

  /* A neighbour ramps its target up instead of starting at the full
     PRELOAD_SECONDS, so its first fragments do not compete with the video on
     screen. hls.js re-reads maxBufferLength every tick, so raising it later just
     continues the fetch. The `<` guard matters: if this slide went active inside
     the ramp window, ACTIVE_BUFFER_SECONDS is already set and must not be
     clobbered back down. */
  if (hls && !props.active()) {
    const ramp = setTimeout(() => {
      if (hls.config.maxBufferLength < PRELOAD_SECONDS) {
        hls.config.maxBufferLength = PRELOAD_SECONDS;
      }
    }, PRELOAD_RAMP_MS);
    onCleanup(() => clearTimeout(ramp));
  }

  /** Hand the parent this element while it is the one being watched. */
  createEffect(() => {
    if (!props.active()) return;
    props.registerActive(mediaEl);
    onCleanup(() => {
      // The incoming slide can register BEFORE this cleanup runs. Clearing
      // unconditionally would null out the signal the parent's effects just
      // rebound to; the identity check makes the ordering irrelevant.
      props.registerActive((cur) => (cur === mediaEl ? null : cur));
    });
  });

  /** Activation: open the buffer back up, start reporting, take the sound. */
  createEffect(() => {
    if (!props.active()) {
      // Belt-and-braces against any ordering quirk leaking audio from a slide
      // that is off screen. The parent's mute mirror only touches the active
      // element, so nothing else would.
      mediaEl.muted = true;
      return;
    }

    // Raising the target is enough — the buffer controller re-evaluates on its
    // next tick and carries on fetching. Deliberately NOT startLoad(): we never
    // called stopLoad(), so calling it here would re-initialise the stream
    // controllers and can force a re-seek, which is exactly the stutter this
    // whole change exists to remove.
    if (hls) hls.config.maxBufferLength = ACTIVE_BUFFER_SECONDS;

    // Captured here, not at construction: a neighbour preloaded thirty seconds
    // ago would otherwise report a thirty-second player startup to Mux.
    const stopMonitor = startMuxMonitor(mediaEl, hls, props.video, performance.now());

    onCleanup(() => {
      stopMonitor();
      mediaEl.pause();
      // Deliberately NOT `currentTime = 0` inline. A seek makes hls.js flush and
      // re-append its buffer, and this cleanup now runs mid-swipe (activation is
      // driven by IntersectionObserver, not scrollend), so the flush would land on
      // the same frame the incoming video is decoding its first frames. Deferred
      // to idle, so revisiting a slide still starts from the top — the old
      // unmount-and-remount semantics, just off the critical path.
      const rewind = () => { if (!props.active()) mediaEl.currentTime = 0; };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(rewind, { timeout: 1000 });
      else setTimeout(rewind, 400);
    });
  });

  return el;
}
