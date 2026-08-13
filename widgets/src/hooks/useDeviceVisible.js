import { createSignal, onCleanup } from 'solid-js';
import { MOBILE_BREAKPOINT } from '../core/constant';

/**
 * Per-feed device visibility — settings.general.visibleOnDesktop / visibleOnMobile.
 *
 * Reactive: rotating a phone or dragging a desktop window across the breakpoint
 * takes effect without a reload. Must be called inside a reactive root, since it
 * registers onCleanup for the matchMedia listener.
 *
 * @param {Object} settings  the feed's own settings object
 * @returns {() => boolean}  should this widget render right now?
 */
export function useDeviceVisible(settings) {
    const general = settings?.general ?? {};

    // Absent means visible. Feeds saved before these toggles existed carry neither
    // key, so only an explicit `false` is allowed to hide anything — otherwise this
    // check would blank every existing feed on the storefront.
    const onDesktop = general.visibleOnDesktop !== false;
    const onMobile = general.visibleOnMobile !== false;

    // Both answers identical — no need to watch the viewport at all.
    if (onDesktop && onMobile) return () => true;
    if (!onDesktop && !onMobile) return () => false;

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => true;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const [isMobile, setIsMobile] = createSignal(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    onCleanup(() => mql.removeEventListener('change', handler));

    return () => (isMobile() ? onMobile : onDesktop);
}
