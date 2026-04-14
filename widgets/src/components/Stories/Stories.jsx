/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal, createEffect } from 'solid-js';
import { getThumbnailPreviewUrl, getThumbnailUrl } from '../../shared/mux';
import './stories.css';
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
import { THUMB_STORIES } from '../../core/constant';
import { DEFAULT_TITLE_STORIES, EMPTY_STORIES } from '../../constants/strings';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../utils/designStyles';

export function VideoStories({ feed, videos, settings, onEvent, isPreview }) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [containerRef, setContainerRef] = createSignal(null);
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [hoveredIndex, setHoveredIndex] = createSignal(null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();
  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);
  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    showToast,
    source: 'stories',
    isPreview,
  });
  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);
  const autoplay = () => settings?.general.autoPlay ?? feed?.settings?.general.autoPlay;
  const title = () => settings?.translation?.widgetHeading || feed?.name || DEFAULT_TITLE_STORIES;
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || '';

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

  const openStory = async (video, index) => {
    if (isPreview) return;
    setExpandedIndex(index);
    setActiveIndex(index);
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
    }
    await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_CLICK });
  };

  const handleStoryMouseEnter = (index) => {
    if (autoplay() === 'onHover') setHoveredIndex(index);
  };

  const handleStoryMouseLeave = () => {
    if (autoplay() === 'onHover') setHoveredIndex(null);
  };

  return (
    <section className={`video-stories ${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
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
          setActiveIndex(index);
          onEvent?.('video_change', {
            feedId: feed?.id,
            videoId: video?.id,
            index,
            source: 'stories',
          });
          if (feed?.id && video?.id && !isPreview) {
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
          }
        }}
        onFirstPlay={async (video, watchTimeSeconds) => {
          if (!feed?.id || !video?.id || isPreview) return;
          await trackDbEvent({
            feedId: feed.id,
            videoId: video.id,
            eventType: EVENT_TYPES.VIDEO_VIEW,
            watchTimeSeconds,
          });
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_VIDEO_PLAY });
        }}
      />

      <Show when={title()}>
        <header className="video-stories-header">
          <h3 className="video-stories-title">{title()}</h3>
          <p className="video-stories-subtitle">{subtitle()}</p>
        </header>
      </Show>

      <Show
        when={Array.isArray(videos) && videos.length > 0}
        fallback={<p className="video-stories-empty">{EMPTY_STORIES}</p>}
      >
        <div className="video-stories-list" role="list" aria-label="Video stories">
          <For each={videos}>
            {(video, index) => {
              const staticThumbUrl = () => getThumbnailUrl(video.playbackId, THUMB_STORIES.width, THUMB_STORIES.height);
              const animatedThumbUrl = () => getThumbnailPreviewUrl(video.playbackId, THUMB_STORIES.width, THUMB_STORIES.height);
              const isOnHoverMode = () => autoplay() === 'onHover';
              const isHovered = () => hoveredIndex() === index();
              const thumbUrl = () => {
                if (isOnHoverMode()) return isHovered() ? animatedThumbUrl() : staticThumbUrl();
                if (autoplay() === 'never') return staticThumbUrl();
                return animatedThumbUrl();
              };
              const isActive = () => activeIndex() === index();

              return (
                <button
                  type="button"
                  className={`video-story ${isActive() ? 'is-active' : ''}`}
                  onClick={() => openStory(video, index())}
                  aria-label={video?.title || `Story ${index() + 1}`}
                  onMouseEnter={() => handleStoryMouseEnter(index())}
                  onMouseLeave={handleStoryMouseLeave}
                >
                  <span className="video-story-ring">
                    <Show when={thumbUrl()} fallback={<span className="video-story-thumb video-story-thumb-fallback" />}>
                      <img className="video-story-thumb" src={thumbUrl()} alt="" loading="lazy" />
                    </Show>
                  </span>
                  <span className="video-story-label">{video?.title || `Story ${index() + 1}`}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>

      <Toast
        visible={toastVisible()}
        message={toastMessage()}
        type={toastType()}
        onClose={() => setToastVisible(false)}
      />
    </section>
  );
}