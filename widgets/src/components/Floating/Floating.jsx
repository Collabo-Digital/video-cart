/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { Show, createSignal, createEffect } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
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

export function VideoFloating({ feed, videos, settings, onEvent }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);
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
  });

  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);


  const title = () => settings?.translation?.floatingTitle || feed?.name || DEFAULT_TITLE_WATCH;

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

  const thumb = () => {
    const playbackId = firstVideo()?.playbackId;
    return playbackId ? getThumbnailPreviewUrl(playbackId, THUMB_FLOATING.width, THUMB_FLOATING.height) : null;
  };

  const openVideo = async () => {
    const video = firstVideo();
    if (!video) return;
    setExpandedIndex(0);
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
    }
    await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_CLICK });
  };

  return (
    <div className={`video-floating ${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
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
        >
          <div className="video-floating-thumb-wrap">
            <Show
              when={thumb()}
              fallback={<div className="video-floating-thumb video-floating-thumb-fallback" aria-hidden="true" />}
            >
              <img className="video-floating-thumb" src={thumb()} alt="" loading="lazy" />
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
  );
}