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
    const id = design?.uniqueClassIdentifier?.trim();
    return id || null;
}

/**
 * Injects the custom CSS into the container.
 * @param {Object} container - The container element.
 * @param {Object} design - The design object.
 */
export function injectCustomCss(container, design) {
    const css = design?.customCss?.trim();
    if (!css || !container) return;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-video-cart-feed-css', design.uniqueClassIdentifier || 'custom');
    // Scope CSS to this container (e.g. by container's unique class or ID)
    // const scopeClass = design.uniqueClassIdentifier?.trim() || container.id || 'video-cart-scoped';
    styleEl.textContent = css; // Or wrap: `${scopeClass} { ... }` if needed
    container.appendChild(styleEl);
}