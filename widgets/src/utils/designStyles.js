/**   
 * Builds css custom properties for the video cart.
 * @param {Object} design - The design object.
 * @returns {Object} The design styles.
 */
export function buildDesignStyles(design) {
    if (!design || typeof design !== 'object') return {};
    const d = design;
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
    if (d.videosPerRow != null && typeof d.videosPerRow === 'number') {
        styles['--vdcrt-columns'] = String(d.videosPerRow);
    }
    if (d.titleAlignment != null && typeof d.titleAlignment === 'string') {
        styles['--vdcrt-header-align'] = d.titleAlignment;
    }
    return styles;
}