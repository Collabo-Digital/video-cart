/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { Show, createSignal, createEffect } from 'solid-js';
import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import './floating.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import { Toast } from '../common/Toast/Toast';
import { trackDbEvent } from '../../utils/analytics';
import { useToast } from '../../hooks/useToast';
import {
  productsForVideo,
  productPrice,
  getAddToCartLabel,
  getButtonStyle,
} from '../../utils/widgetHelpers';
import { createProductClickHandler } from '../../utils/productClickHandler';
import { THUMB_FLOATING } from '../../core/constant';
import { DEFAULT_TITLE_WATCH, EMPTY_VIDEOS_SHORT } from '../../constants/strings';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../utils/designStyles';
import CloseIcon from '../../assets/Icons/CloseIcon';

export function VideoFloating({ feed, videos, settings, onEvent, isPreview }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);
  const [isVisible, setIsVisible] = createSignal(true);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);
  const firstVideo = () => (Array.isArray(videos) && videos.length ? videos[0] : null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();
  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);
  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    showToast,
    source: 'floating',
    isPreview,
  });

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);


  const title = () => settings?.translation?.floatingTitle || feed?.name || DEFAULT_TITLE_WATCH;
  const autoplay = () => settings?.general.autoPlay ?? feed?.settings?.general.autoPlay;
  const subtitle = () => {
    const count = videos?.length || 0;
    return `${count} video${count === 1 ? '' : 's'} available`;
  };

  createEffect(() => {
    const container = containerRef();
    const design = settings?.design ?? feed?.settings?.design;
    const styles = buildDesignStyles(design);
    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }

    if (container) {
      injectCustomCss(container, design);
    }
  });

  const staticThumbUrl = () => getThumbnailUrl(firstVideo()?.playbackId, THUMB_FLOATING.width, THUMB_FLOATING.height);
  const animatedThumbUrl = () => getThumbnailPreviewUrl(firstVideo()?.playbackId, THUMB_FLOATING.width, THUMB_FLOATING.height);
  const isOnHoverMode = () => autoplay() === 'onHover';
  const isHovered = () => hoveredIndex() === 0;
  const thumbUrl = () => {
    if (isOnHoverMode()) return isHovered() ? animatedThumbUrl() : staticThumbUrl();
    if (autoplay() === 'never') return staticThumbUrl();
    return animatedThumbUrl();
  };

  const openVideo = async () => {
    if (isPreview) return;
    const video = firstVideo();
    if (!video) return;
    setExpandedIndex(0);
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
    }
    await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_CLICK });
  };

  const handleFloatingMouseEnter = () => {
    if (autoplay() === 'onHover') setHoveredIndex(0);
  };

  const handleFloatingMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };
  return (
    <Show when={isVisible()}>
      <div className={`video-floating ${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
        <button
          type="button"
          className="video-floating-close"
          aria-label="Close floating video"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
        >
          <CloseIcon />
        </button>
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
            onEvent?.('video_change', {
              feedId: feed?.id,
              videoId: video?.id,
              index,
              source: 'floating',
            });
            if (feed?.id && video?.id) {
              await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
            }
          }}
          onFirstPlay={async (video, watchTimeSeconds) => {
            if (!feed?.id || !video?.id) return;
            await trackDbEvent({
              feedId: feed.id,
              videoId: video.id,
              eventType: EVENT_TYPES.VIDEO_VIEW,
              watchTimeSeconds,
            });
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
          }}
        />

        <Show when={firstVideo()} fallback={<div className="video-floating-empty">{EMPTY_VIDEOS_SHORT}</div>}>
          <button
            type="button"
            onClick={openVideo}
            className="video-floating-button"
            aria-label="Open featured video"
            onMouseEnter={handleFloatingMouseEnter}
            onMouseLeave={handleFloatingMouseLeave}
          >
            <div className="video-floating-thumb-wrap">
              <Show
                when={thumbUrl()}
                fallback={<div className="video-floating-thumb video-floating-thumb-fallback" aria-hidden="true" />}
              >
                <img className="video-floating-thumb" src={thumbUrl()} alt="" loading="lazy" />
              </Show>
            </div>
          </button>
        </Show>

        <Toast
          visible={toastVisible()}
          message={toastMessage()}
          type={toastType()}
          onClose={() => setToastVisible(false)}
        />
      </div>
    </Show>
  );
}