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

/** Startup-latency config, applied to every player on both platforms.
 *  Nothing here touches alt-audio: the CMAF audio rendition is fetched by
 *  audioStreamController / audioTrackController, which exist only in the FULL
 *  hls.js build — see the import note at the top of this file. */
const HLS_BASE_CONFIG = {
    // Never fetch a 1080p rendition for a 390px-wide element on a phone. On a
    // weak connection that is the difference between a 2s and an 8s start, and
    // it is what stops ABR climbing into a rendition that then stalls.
    // Measures the ELEMENT, so never display:none a slide that owns a video.
    capLevelToPlayerSize: true,
    // Start on the smallest rendition so the first segment is tiny and decodes
    // immediately, then let ABR climb. Costs 1-2s of soft picture, which is what
    // every reels player does. The default (-1) makes hls.js guess from a cold
    // bandwidth estimate — on mobile that is a coin flip.
    startLevel: 0,
    // hls.js assumes a healthy connection before it has measured one. 1 Mbps is
    // a realistic mobile cold start and stops the first pick overshooting.
    abrEwmaDefaultEstimate: 1_000_000,
    // Default 3.0 holds the start level for ~3s; 1.0 climbs after about one
    // segment, once real throughput is known.
    abrEwmaFastVoD: 1.0,
    abrEwmaSlowVoD: 6.0,
    // Bounded because the reel keeps two instances alive at once.
    backBufferLength: 10,
    maxBufferSize: 20 * 1000 * 1000,
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
        // Caller config wins, so ReelSlideVideo's neighbour maxBufferLength: 2
        // still overrides the default.
        hls = new Hls({ ...HLS_BASE_CONFIG, ...hlsConfig });
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
