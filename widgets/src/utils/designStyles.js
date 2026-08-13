/**   
 * Builds css custom properties for the video cart.
 * @param {Object} design - The design object.
 * @returns {Object} The design styles.
 */
export function buildDesignStyles(design, general) {
    if (!design || typeof design !== 'object') return {};
    const d = design;
    if (general && typeof general === 'object') {
        if (general.videosPerRow != null && typeof general.videosPerRow === 'string') {
            d.videosPerRow = general.videosPerRow;
        }
    }
    const styles = {};
    if (d.cardCornerRadius != null && typeof d.cardCornerRadius === 'number') {
        styles['--vdcrt-border-radius'] = `${d.cardCornerRadius}px`;
    }
    if (d.videoGap != null && typeof d.videoGap === 'number') {
        styles['--vdcrt-video-gap'] = `${d.videoGap}px`;
    }
    if (typeof d.buttonBackgroundColor === 'string' && d.buttonBackgroundColor.trim()) {
        styles['--vdcrt-button-bg'] = d.buttonBackgroundColor.trim();
    }
    if (typeof d.buttonTextColor === 'string' && d.buttonTextColor.trim()) {
        styles['--vdcrt-button-color'] = d.buttonTextColor.trim();
    }
    if (d.videosPerRow != null && typeof d.videosPerRow === 'string') {
        styles['--vdcrt-columns'] = String(d.videosPerRow);
    }
    if (d.titleAlignment != null && typeof d.titleAlignment === 'string') {
        styles['--vdcrt-header-align'] = d.titleAlignment;
    }
    if (d.ringColor != null && typeof d.ringColor === 'string') {
        styles['--vdcrt-story-ring-color'] = d.ringColor.trim();
    }
    return styles;
}

/**
 * Gets the unique class identifier for the design.
 * @param {Object} design - The design object.
 * @returns {string} The unique class identifier.
 */
export function getUniqueClassIdentifier(design) {
    const raw = design?.uniqueClassIdentifier?.trim();
    if (!raw) return null;
    const id = raw.replace(/^\./, '').replace(/[^a-zA-Z0-9_-]/g, '');
    return id || null;
}

/** Last value put on <body>, so a re-run swaps rather than stacks. */
let appliedGlobalClass = null;

/**
 * Puts the global custom class on <body>.
 *
 * Not on the widget roots: the video overlay and the floating widget portal out
 * to <body>, so a class on a widget container could never reach them. On <body>
 * a single hook scopes to everything the app renders.
 *
 * @param {Object} design - The design object from global settings.
 */
export function applyGlobalClass(design) {
    if (typeof document === 'undefined' || !document.body) return;

    const cls = getUniqueClassIdentifier(design);
    if (cls === appliedGlobalClass) return;

    if (appliedGlobalClass) document.body.classList.remove(appliedGlobalClass);
    if (cls) document.body.classList.add(cls);
    appliedGlobalClass = cls;
}

/**
 * Injects the custom CSS into the container.
 * @param {Object} container - The container element.
 * @param {Object} design - The design object.
 */
export function injectCustomCss(container, design) {
    const css = design?.customCss?.trim();
    if (!css || !container) return;

    const marker = getUniqueClassIdentifier(design) || 'custom';
    if (container.querySelector(`style[data-video-cart-feed-css="${marker}"]`)) return;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-video-cart-feed-css', marker);
    styleEl.textContent = css;
    container.appendChild(styleEl);
}

/**
 * Injects global custom CSS from app settings into the document head.
 * @param {Object} design - The design object from global settings.
 */
export function injectGlobalCustomCss(design) {
    const css = design?.customCss?.trim();
    if (!css || typeof document === 'undefined') return;

    const marker = getUniqueClassIdentifier(design) || 'global';
    const existing = document.querySelector(`[data-video-cart-global-css="${marker}"]`);
    if (existing) {
        existing.textContent = css;
        return;
    }

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-video-cart-global-css', marker);
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}