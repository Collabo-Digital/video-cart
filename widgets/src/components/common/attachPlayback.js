// Full build, NOT 'hls.js/light'. The light build omits AudioTrackController, so
// `altAudioEnabled = !!(config.audioStreamController && config.audioTrackController)`
// (hls.light.js:20363) is permanently false and it never fetches a separate audio
// rendition. Mux delivers CMAF, where audio is its own EXT-X-MEDIA:TYPE=AUDIO
// rendition — so the light build played video with silence, no error and nothing
// for the mute fallback to catch. Costs ~54 KB gzip; audio is not optional for a
// shoppable video widget.
import Hls from 'hls.js';
import mux from 'mux-embed';
import { getPlaybackUrl } from '../../shared/mux';
import { MUX_DATA_ENV_KEY } from '../../core/config';

/** Last throughput this device actually measured, carried between players.
 *
 *  Every slide builds its own Hls instance, and each one otherwise starts from
 *  `abrEwmaDefaultEstimate` — a cold guess — then spends a fragment or two
 *  working out what the connection can do. In a reel the shopper re-pays that
 *  guess on every swipe. Seeding the next instance with what the last one
 *  measured is what lets the second video onward open straight at the right
 *  rendition; it is the same trick hls.js uses internally when it chains players
 *  (`abrEwmaDefaultEstimate: primary.bandwidthEstimate`).
 *
 *  Module-level on purpose: it should survive the overlay closing and reopening. */
let lastBandwidthEstimate = null;

/** First guess, before any real measurement exists. hls.js defaults to 500 kbps,
 *  which on any modern connection picks a rendition well below what the screen
 *  can show — so the first video opened soft for no reason. */
const COLD_BANDWIDTH_ESTIMATE = 2_500_000;

/** Shared player config — deliberately close to hls.js's defaults.
 *
 *  An earlier pass tuned this for startup latency and paid for it in picture and
 *  buffer headroom: `startLevel: 0` pinned every video to the SMALLEST rendition,
 *  `maxBufferSize: 20MB` cut the default 60MB to a third (so it binds before
 *  `maxBufferLength: 30` ever does and the video runs dry mid-playback),
 *  `backBufferLength: 10` added a SourceBuffer.remove() every few seconds, and
 *  `abrEwmaFastVoD: 1.0` (default 3) made ABR react inside one second so the
 *  rendition oscillated. All four are gone. What is left is the part that helps
 *  without costing picture: a realistic starting estimate and a size cap.
 *
 *  Nothing here touches alt-audio: the CMAF audio rendition is fetched by
 *  audioStreamController / audioTrackController, which exist only in the FULL
 *  hls.js build — see the import note at the top of this file. */
const HLS_BASE_CONFIG = {
    // Never fetch a 1080p rendition for a 390px-wide element. Safe only now that
    // video-owning reels slides are exempt from `content-visibility: auto` (see
    // the -live rule in videoOverlay.css): this measures media.clientWidth, and a
    // render-skipped subtree reports 0x0, which pinned hls.js to the lowest
    // rendition for as much as a second after the slide came into view.
    capLevelToPlayerSize: true,
    // The cap above multiplies by devicePixelRatio, and the default here is
    // Infinity — so on a 3x phone a 390px element still allows 1080p and the cap
    // saves nothing. Clamping at 2x is where the bandwidth actually comes back;
    // 720p on a phone-sized element is indistinguishable and starts faster.
    maxDevicePixelRatio: 2,
    // startLevel is deliberately ABSENT. Undefined means "choose from the
    // bandwidth estimate", which thanks to the seeding above is a measured number
    // rather than a guess.
};

/**
 * Attach a Mux playback source to a <video> and wire the first-play callback.
 *
 * Split out of VideoOverlayPlayer so the desktop pane and each mobile reels
 * slide share one implementation instead of two — the mobile reel now mounts
 * more than one player at a time (the current video plus the next, preloaded),
 * and duplicating the three source branches would be how they drift apart.
 *
 * Mux QoE monitoring is deliberately NOT started — or torn down — here; that is
 * wholly owned by startMuxMonitor. Destroying el.mux from both places throws
 * "The monitor for this video element has already been destroyed" on the second
 * call, since teardown always runs both.
 *
 * @returns {{ hls: Hls|null, dispose: () => void }} `hls` is null on the native
 *   HLS and plain-src paths. The caller keeps it to retune config later.
 */
export function attachPlayback(el, video, { hlsConfig, onFirstPlay } = {}) {
    const playbackId = video?.playbackId;
    const url = playbackId ? getPlaybackUrl(playbackId) : null;
    if (!el || !url) return { hls: null, dispose: () => {} };

    let hls = null;
    let viewSent = false;

    const onPlay = async () => {
        if (viewSent) return;
        viewSent = true;
        const sec = el.currentTime != null ? Math.floor(el.currentTime) : 0;
        await onFirstPlay?.(video, sec);
    };

    if (Hls.isSupported()) {
        hls = new Hls({
            ...HLS_BASE_CONFIG,
            // Set per instance, not in HLS_BASE_CONFIG, because it changes as the
            // shopper moves through the reel.
            abrEwmaDefaultEstimate: lastBandwidthEstimate ?? COLD_BANDWIDTH_ESTIMATE,
            // Caller config wins, so ReelSlideVideo's neighbour maxBufferLength
            // still overrides the default.
            ...hlsConfig,
        });
        // Hand what this player measures to the next slide's instance. destroy()
        // drops the listener, so there is nothing to unhook in dispose().
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
            const bw = hls.bandwidthEstimate;
            if (Number.isFinite(bw) && bw > 0) lastBandwidthEstimate = bw;
        });
        // Readable from the storefront console: if audio is ever silent again,
        // this says whether the manifest carries an audio track at all, which
        // separates a player bug from a silently-encoded source asset.
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            window.__videoCartAudio = { tracks: hls.audioTracks?.length ?? 0 };
        });
        hls.loadSource(url);
        hls.attachMedia(el);
        el.addEventListener('play', onPlay);

        return {
            hls,
            dispose: () => {
                el.removeEventListener('play', onPlay);
                hls.destroy();
            },
        };
    }

    // Native HLS (Safari) and the plain-src fallback were separate branches only
    // because one started Mux monitoring and the other did not. With monitoring
    // extracted they are identical, so they are one branch — which does mean the
    // fallback path now gets QoE beaconing too, if the caller asks for it.
    el.src = url;
    el.addEventListener('play', onPlay);

    return {
        hls: null,
        dispose: () => {
            el.removeEventListener('play', onPlay);
        },
    };
}

/**
 * Start Mux QoE beaconing for an element that is actually being watched.
 *
 * Separate from attachPlayback on purpose: the mobile reel attaches the NEXT
 * video's source ahead of time, and reporting that to Mux would record a view
 * for a video nobody watched. Callers start this only once their element goes
 * active, and pass `playerInitTime` from that moment — a neighbour preloaded
 * thirty seconds earlier would otherwise report a thirty-second startup.
 *
 * @returns {() => void} stop
 */
export function startMuxMonitor(el, hls, video, playerInitTime) {
    if (!MUX_DATA_ENV_KEY || !el) return () => {};

    try {
        mux.monitor(el, {
            debug: false,
            // hls.js integration only applies where hls.js is doing the work;
            // the native-HLS path passes null and Mux reads the element itself.
            ...(hls ? { hlsjs: hls, Hls } : {}),
            data: {
                env_key: MUX_DATA_ENV_KEY,
                player_name: 'Video Cart Carousel',
                player_init_time: playerInitTime,
                video_id: video?.id ?? video?.playbackId,
                video_title: video?.title || 'Untitled',
                video_duration: video?.duration != null ? Math.round(Number(video.duration) * 1000) : undefined,
                video_stream_type: 'on-demand',
            },
        });
    } catch (err) {
        if (import.meta.env?.DEV) console.error('Mux monitoring init failed:', err);
        return () => {};
    }

    return () => {
        if (el.mux && typeof el.mux.destroy === 'function') {
            try { el.mux.destroy(); } catch (_) { /* ignore */ }
        }
    };
}
