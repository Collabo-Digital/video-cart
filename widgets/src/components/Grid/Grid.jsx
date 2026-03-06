/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal, createEffect } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './grid.css';
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
  getProductHandle,
} from '../../utils/widgetHelpers';
import { createProductClickHandler } from '../../utils/productClickHandler';
import { THUMB_CARD } from '../../core/constant';
import { EMPTY_VIDEOS, LABEL_SHOP_PRODUCT } from '../../constants/strings';
import { buildDesignStyles, getUniqueClassIdentifier, injectCustomCss } from '../../utils/designStyles';

const DEFAULT_SUBTITLE = '';

export function VideoGrid({ feed, videos, settings, onEvent }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [containerRef, setContainerRef] = createSignal(null);

  const { showToast, toastVisible, toastMessage, toastType, setToastVisible } = useToast();
  const addToCartButtonLabel = () => getAddToCartLabel(feed);
  const addToCartButtonStyle = () => getButtonStyle(feed, settings);
  const handleProductClick = createProductClickHandler({
    feed,
    settings,
    onEvent,
    showToast,
    source: 'grid',
  });
  const design = settings?.design ?? feed?.settings?.design;
  const uniqueClass = getUniqueClassIdentifier(design);


  const title = () => settings?.translation?.widgetHeading || feed?.name || '';
  const subtitle = () => settings?.translation?.widgetDescription || feed?.description || DEFAULT_SUBTITLE;

   createEffect(() => {
    const container = containerRef();
    const design = settings?.design ?? feed?.settings?.design;
    const general = settings?.general ?? feed?.settings?.general;
    const styles = buildDesignStyles(design, general);
    if (container && Object.keys(styles).length) {
      Object.entries(styles).forEach(([key, value]) => {
        if (value != null) container.style.setProperty(key, value);
      });
    }
    
    if (container) {
      injectCustomCss(container, design);
    }
  });

  const handleCardLinkClick = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    const first = video?.productsTagged?.[0];
    const product = first ? (typeof first === 'object' ? first : { handle: first }) : null;
    if (product) handleProductClick(product, video);
  };

  const handleVideoClick = (video, index) => {
    setExpandedIndex(index);
  };

  return (
    <section className={`video-grid-container ${uniqueClass ? ` ${uniqueClass}` : ''}`} ref={setContainerRef}>
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
          onEvent?.('video_change', { feedId: feed?.id, videoId: video?.id, index, source: 'grid' });
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
        }}
      />

      <header className="video-grid-header">
        <h2 className="video-grid-title">{title()}</h2>
        <Show when={subtitle()}>
          <p className="video-grid-subtitle">{subtitle()}</p>
        </Show>
      </header>

      <Show
        when={Array.isArray(videos) && videos.length > 0}
        fallback={<p className="video-grid-empty">{EMPTY_VIDEOS}</p>}
      >
        <div className="video-grid-list" role="list">
          <For each={videos}>
            {(video, index) => {
              const thumbUrl = () => getThumbnailPreviewUrl(video?.playbackId, THUMB_CARD.width, THUMB_CARD.height);
              const productHandle = () => getProductHandle(video?.productsTagged?.[0]);

              return (
                <article className="video-grid-card" role="listitem">
                  <button
                    type="button"
                    className="video-grid-card-button"
                    onClick={() => handleVideoClick(video, index())}
                    aria-label={video?.title || `Video ${index() + 1}`}
                  >
                    <Show when={thumbUrl()} fallback={<span className="video-grid-thumb-fallback" aria-hidden="true" />}>
                      <img className="video-grid-thumb" src={thumbUrl()} alt="" loading="lazy" />
                    </Show>
                  </button>

                  <Show when={productHandle()}>
                    <button
                      type="button"
                      className="video-grid-product-link"
                      onClick={(e) => handleCardLinkClick(e, video)}
                    >
                      {LABEL_SHOP_PRODUCT}
                    </button>
                  </Show>
                </article>
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