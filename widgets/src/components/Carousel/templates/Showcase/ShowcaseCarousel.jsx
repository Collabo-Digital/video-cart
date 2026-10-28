/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';

import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../../../shared/mux';
import { EVENT_TYPES } from '../../../../api/services/analyticsService';
import { ProductOverlay } from '../../../common/ProductOverlay/ProductOverlay';
import { VideoOverlayPlayer } from '../../../common/VideoOverlayPlayer';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../../../utils/designStyles';
import { trackDbEvent } from '../../../../utils/analytics';
import { observeWidgetImpression, trackVideoImpressionOnce } from '../../../../utils/impressionTracker';
import {
  productsForVideo,
  productPrice,
  getAddToCartLabel,
  getButtonStyle,
} from '../../../../utils/widgetHelpers';
import { createProductClickHandler } from '../../../../utils/productClickHandler';
import { THUMB_CARD } from '../../../../core/constant';
import { EMPTY_VIDEOS } from '../../../../constants/strings';

import LeftToggleIcon from '../../../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../../../assets/Icons/RightToggleIcon';

import './showcase.css';

const AUTO_LOOP_INTERVAL_MS = 4000;
/** Cards further than this from the centre are hidden (5 visible on desktop). */
const VISIBLE_CARDS_EACH_SIDE = 2;
/** Past this many videos a dot per video stops being readable; the arrows remain. */
const MAX_PAGINATION_DOTS = 12;
/** Horizontal drag shorter than this is a tap, not a swipe. */
const SWIPE_THRESHOLD_PX = 40;
/** Movement below this leaves clicks alone and does not start a drag. */
const DRAG_DEAD_ZONE_PX = 8;
/** One wheel / trackpad step at most this often. */
const WHEEL_STEP_INTERVAL_MS = 400;

export function ShowcaseCarousel({ feed, videos, settings, onEvent, isPreview }) {
  const [containerRef, setContainerRef] = createSignal(null);
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [activeIndex, setActiveIndex] = createSignal(Math.floor((videos?.length || 0) / 2));
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const autoPlayMode = () => settings?.general?.autoPlay ?? feed?.settings?.general?.autoPlay;
  const autoLoop = () => settings?.general?.autoLoop ?? feed?.settings?.general?.autoLoop ?? true;
  const buttonBehavior = () => feed?.settings?.general?.buttonBehavior;
  // The product card sits below the video here, so "hover" makes no sense: show it unless hidden.
  const productCardDisplayMode = () =>
    (feed?.settings?.general?.productOverlayDisplay === 'hidden' ? 'hidden' : 'always');
  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || '';
  const videoCount = () => videos?.length ?? 0;

  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);

  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    source: 'carousel',
    isPreview,
  });

  createEffect(() => {
    const container = containerRef();
    const activeDesign = settings?.design ?? feed?.settings?.design;
    const styles = buildDesignStyles(activeDesign);

    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }

    if (container) injectCustomCss(container, activeDesign);
  });

  createEffect(() => {
    observeWidgetImpression(containerRef(), feed, isPreview, onCleanup);
  });

  /** Position class from the wrapped distance to the active card (same maths as Spotlight). */
  const getCardPositionClass = (index) => {
    const count = videoCount();
    if (!count) return '';

    let offset = index - activeIndex();
    if (offset > count / 2) offset -= count;
    if (offset < -count / 2) offset += count;

    if (offset === 0) return 'is-center';
    if (Math.abs(offset) > VISIBLE_CARDS_EACH_SIDE) return 'is-hidden';
    return `${offset < 0 ? 'is-prev' : 'is-next'}-${Math.abs(offset)}`;
  };

  const handleNav = (direction) => {
    const count = videoCount();
    if (!count) return;
    setActiveIndex((prev) => (direction === 'next' ? (prev + 1) % count : (prev - 1 + count) % count));
  };

  createEffect(() => {
    if (!autoLoop() || videoCount() <= 1) return;
    const interval = setInterval(() => handleNav('next'), AUTO_LOOP_INTERVAL_MS);
    onCleanup(() => clearInterval(interval));
  });

  // Drag: the row follows the pointer 1:1 through a CSS custom property (the
  // same mechanism the design variables use on the container), then snaps on
  // release. Touch browsers drop the click that follows a drag; `suppressNextCardClick` does
  // the same for a mouse drag. No pointer capture: it would retarget the click
  // away from the card and product buttons.
  let stageElement;
  let pointerStartX = null;
  let pointerDeltaX = 0;
  let isDragging = false;
  let suppressNextCardClick = false;

  const finishDrag = () => {
    if (pointerStartX == null) return;
    const dragDistance = pointerDeltaX;
    pointerStartX = null;
    pointerDeltaX = 0;
    isDragging = false;
    stageElement.classList.remove('is-dragging');
    stageElement.style.setProperty('--vdsc-drag-offset', '0px');
    if (Math.abs(dragDistance) < SWIPE_THRESHOLD_PX) return;
    suppressNextCardClick = true;
    handleNav(dragDistance < 0 ? 'next' : 'prev');
  };

  const handlePointerDown = (event) => {
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    suppressNextCardClick = false;
  };

  const handlePointerMove = (event) => {
    if (pointerStartX == null) return;
    pointerDeltaX = event.clientX - pointerStartX;
    if (!isDragging && Math.abs(pointerDeltaX) < DRAG_DEAD_ZONE_PX) return;
    isDragging = true;
    stageElement.classList.add('is-dragging');
    stageElement.style.setProperty('--vdsc-drag-offset', `${pointerDeltaX}px`);
  };

  // Horizontal trackpad / wheel swipes step one card; vertical scrolling is left to the page.
  let lastWheelStepAt = 0;
  const handleWheel = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 20) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheelStepAt < WHEEL_STEP_INTERVAL_MS) return;
    lastWheelStepAt = now;
    handleNav(event.deltaX > 0 ? 'next' : 'prev');
  };

  const handleCardClick = (index) => {
    if (suppressNextCardClick) {
      suppressNextCardClick = false;
      return;
    }
    if (!isPreview) setExpandedIndex(index);
  };

  const getThumbUrl = (video, index) => {
    const staticUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const animatedUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const playMode = autoPlayMode();

    if (playMode === 'onHover') return hoveredIndex() === index ? animatedUrl() : staticUrl();
    if (playMode === 'never') return staticUrl();
    return animatedUrl();
  };

  return (
    <div
      className={`video-carousel-container template-showcase${uniqueClass ? ` ${uniqueClass}` : ''}`}
      ref={setContainerRef}
    >
      <VideoOverlayPlayer
        videos={videos}
        expandedIndex={expandedIndex}
        setExpandedIndex={setExpandedIndex}
        productsForVideo={productsForVideo}
        productPrice={productPrice}
        addToCartButtonLabel={addToCartButtonLabel}
        addToCartButtonStyle={addToCartButtonStyle}
        buttonBehavior={buttonBehavior}
        handleProductClick={handleProductClick}
        onVideoChange={async (video, index) => {
          onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
          if (feed?.id && video?.id && !isPreview) {
            await trackVideoImpressionOnce(feed.id, video.id);
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id || isPreview) return;
          await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_VIEW, watchTimeSeconds });
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
        }}
      />

      <Show when={title()}>
        <header className="showcase-header">
          <h2 className="showcase-title">{title()}</h2>
          <Show when={subtitle()}>
            <p className="showcase-subtitle">{subtitle()}</p>
          </Show>
        </header>
      </Show>

      <Show when={videoCount() > 0} fallback={<p className="video-carousel-empty">{EMPTY_VIDEOS}</p>}>
        <div
          className="showcase-stage"
          role="list"
          ref={stageElement}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={finishDrag}
          onWheel={handleWheel}
        >
          <For each={videos}>
            {(video, index) => (
              <article
                className={`showcase-card ${getCardPositionClass(index())}`}
                role="listitem"
                onMouseEnter={() => { if (autoPlayMode() === 'onHover') setHoveredIndex(index()); }}
                onMouseLeave={() => { if (autoPlayMode() === 'onHover') setHoveredIndex(null); }}
              >
                <button
                  type="button"
                  className="showcase-card-button"
                  aria-label={video.title || `Video ${index() + 1}`}
                  onClick={() => handleCardClick(index())}
                >
                  <span className="showcase-card-image-wrap">
                    <Show
                      when={getThumbUrl(video, index())}
                      fallback={<span className="showcase-card-image-fallback" />}
                    >
                      <img
                        className="showcase-card-image"
                        src={getThumbUrl(video, index())}
                        alt=""
                        loading="lazy"
                        draggable={false}
                      />
                    </Show>
                  </span>
                </button>

                {/* Sibling of the card button, not inside it: the product card's
                    own buttons never bubble into the video click. */}
                <ProductOverlay
                  video={video}
                  buttonBehavior={buttonBehavior}
                  displayMode={productCardDisplayMode}
                  addToCartButtonLabel={addToCartButtonLabel}
                  addToCartButtonStyle={addToCartButtonStyle}
                  onProductClick={handleProductClick}
                />
              </article>
            )}
          </For>
        </div>

        <nav className="showcase-nav" aria-label="Carousel navigation">
          <button type="button" className="showcase-nav-btn" aria-label="Previous" onClick={() => handleNav('prev')}>
            <LeftToggleIcon />
          </button>

          <Show when={videoCount() <= MAX_PAGINATION_DOTS}>
            <div className="showcase-dots">
              <For each={videos}>
                {(_video, index) => (
                  <button
                    type="button"
                    className={`showcase-dot${activeIndex() === index() ? ' is-active' : ''}`}
                    aria-label={`Go to video ${index() + 1}`}
                    aria-current={activeIndex() === index() ? 'true' : undefined}
                    onClick={() => setActiveIndex(index())}
                  />
                )}
              </For>
            </div>
          </Show>

          <button type="button" className="showcase-nav-btn" aria-label="Next" onClick={() => handleNav('next')}>
            <RightToggleIcon />
          </button>
        </nav>
      </Show>
    </div>
  );
}
