/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';

import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../../../shared/mux';
import { EVENT_TYPES } from '../../../../api/services/analyticsService';
import { ProductOverlay } from '../../../common/ProductOverlay/ProductOverlay';
import { VideoOverlayPlayer } from '../../../common/VideoOverlayPlayer';
import { Toast } from '../../../common/Toast/Toast';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../../../utils/designStyles';
import { trackDbEvent } from '../../../../utils/analytics';
import { useToast } from '../../../../hooks/useToast';
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

import './spotlight.css';

export function SpotlightCarousel({ feed, videos, settings, onEvent, isPreview }) {
  const [containerRef, setContainerRef] = createSignal(null);
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [activeIndex, setActiveIndex] = createSignal(
    Math.floor((videos?.length || 0) / 2)
  );
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const autoplay = () => settings?.general?.autoPlay ?? feed?.settings?.general?.autoPlay;
  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || '';

  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);

  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    showToast,
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
    const container = containerRef();
    if (!container || !feed?.id || isPreview) return;

    let sent = false;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (sent) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            sent = true;
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_IMPRESSION });
            break;
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    onCleanup(() => observer.disconnect());
  });

  const getThumbUrl = (video, index) => {
    const staticUrl = () => getThumbnailUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const animatedUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_CARD.width, THUMB_CARD.height);
    const mode = autoplay();

    if (mode === 'onHover') return hoveredIndex() === index ? animatedUrl() : staticUrl();
    if (mode === 'never') return staticUrl();
    return animatedUrl();
  };

  const getCardPositionClass = (index) => {
    const total = videos?.length ?? 0;
    if (!total) return '';

    let offset = index - activeIndex();
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    if (offset === 0) return 'is-center';
    if (offset === -1) return 'is-prev';
    if (offset === 1) return 'is-next';
    if (offset === -2) return 'is-far-prev';
    if (offset === 2) return 'is-far-next';
    return 'is-hidden';
  };

  const handleNav = (direction) => {
    const total = videos?.length ?? 0;
    if (!total) return;
    setActiveIndex((prev) =>
      direction === 'next'
        ? (prev + 1) % total
        : (prev - 1 + total) % total
    );
  };

  const handleCardClick = (video, index) => {
    if (index !== activeIndex()) {
      setActiveIndex(index);
      return;
    }
    if (!isPreview) setExpandedIndex(index);
  };

  const isPrevDisabled = () => !videos?.length;
  const isNextDisabled = () => !videos?.length;

  return (
    <div
      className={`video-carousel-container template-spotlight${uniqueClass ? ` ${uniqueClass}` : ''}`}
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
        handleProductClick={handleProductClick}
        onVideoChange={async (video, index) => {
          onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
          if (feed?.id && video?.id && !isPreview) {
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id || isPreview) return;
          await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_VIEW, watchTimeSeconds });
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
        }}
      />

      <Show when={title()}>
        <header className="spotlight-header">
          <h2 className="spotlight-title">{title()}</h2>
          <Show when={subtitle()}>
            <p className="spotlight-subtitle">{subtitle()}</p>
          </Show>
        </header>
      </Show>

      <Show when={videos?.length > 0} fallback={<p className="video-carousel-empty">{EMPTY_VIDEOS}</p>}>
        <div className="spotlight-stage">
          <button
            type="button"
            className="spotlight-nav-btn spotlight-nav-prev"
            aria-label="Previous"
            disabled={isPrevDisabled()}
            onClick={() => handleNav('prev')}
          >
            <LeftToggleIcon />
          </button>

          <div className="spotlight-track">
            <For each={videos}>
              {(video, index) => (
                <article
                  className={`spotlight-card ${getCardPositionClass(index())}`}
                  onMouseEnter={() => { if (autoplay() === 'onHover') setHoveredIndex(index()); }}
                  onMouseLeave={() => { if (autoplay() === 'onHover') setHoveredIndex(null); }}
                >
                  <button
                    type="button"
                    className="spotlight-card-button"
                    aria-label={video.title || `Video ${index() + 1}`}
                    onClick={() => handleCardClick(video, index())}
                  >
                    <span className="spotlight-card-image-wrap">
                      <Show
                        when={getThumbUrl(video, index())}
                        fallback={<span className="spotlight-card-image-fallback" />}
                      >
                        <img
                          className="spotlight-card-image"
                          src={getThumbUrl(video, index())}
                          alt=""
                          loading="lazy"
                        />
                      </Show>
                    </span>

                    <ProductOverlay
                      video={video}
                      addToCartButtonLabel={addToCartButtonLabel}
                      addToCartButtonStyle={addToCartButtonStyle}
                      onProductClick={handleProductClick}
                    />
                  </button>
                </article>
              )}
            </For>
          </div>

          <button
            type="button"
            className="spotlight-nav-btn spotlight-nav-next"
            aria-label="Next"
            disabled={isNextDisabled()}
            onClick={() => handleNav('next')}
          >
            <RightToggleIcon />
          </button>
        </div>
      </Show>

      <Toast
        visible={toastVisible()}
        message={toastMessage()}
        type={toastType()}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
