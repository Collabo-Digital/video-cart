/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './stories.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { addToCart } from '../../utils/shopifyService';
import { api } from '../../api';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import { Toast } from '../common/Toast/Toast';
import { TOAST_DURATION_MS_EXPORT as TOAST_DURATION_MS } from '../common/Toast/Toast';

async function trackDbEvent(payload) {
  if (!payload?.feedId || !payload?.eventType) return;
  try {
    await api.analytics.recordEvent(payload);
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('Analytics event failed:', err);
    }
  }
}

export function VideoStories({ feed, videos, settings, onEvent }) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const [toastVisible, setToastVisible] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal('success');

  function showToast(message, type = 'success') {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
  }

  const title = () => settings?.translation?.storiesTitle || feed?.name || 'Stories';

  const productsForVideo = (video) => video?.productsTagged ?? [];

  const productPrice = (product) => {
    const priceVal = product?.variants?.[0]?.price;
    if (priceVal == null || priceVal === '') return null;
    const num = typeof priceVal === 'string' ? parseFloat(priceVal, 10) : Number(priceVal);
    if (Number.isNaN(num)) return null;
    return { raw: priceVal, formatted: `$ ${num.toFixed(num % 1 === 0 ? 0 : 2)}` };
  };

  

  const addToCartButtonLabel = () => feed?.settings?.translation?.addToCartText || 'Check this out';
  const buttonBackgroundColor = () => {
    const raw = settings?.design?.buttonBackgroundColor ?? feed?.settings?.design?.buttonBackgroundColor;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  const addToCartButtonStyle = () => {
    const color = buttonBackgroundColor();
    return color ? { 'background-color': color } : undefined;
  };
  const getVariantId = (product) => product?.variants?.[0]?.id ?? product?.id;

  const handleProductClick = async (product, video) => {
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: product?.handle, source: 'stories' });
    const behavior = feed?.settings?.general?.buttonBehavior;
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    if (behavior === 'addToCart') {
      await addToCart([{
        id: getVariantId(product),
        quantity: 1,
        properties: {
          _video_id: video?.id,
          _widget_id: feed?.id,
          timestamp: Date.now(),
          source: 'video-cart-stories',
        },
      }]).then(async (response) => {
        if (response.status === 200) {
          showToast('Added to cart', 'success');
          await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_ATC });
          await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_ATC });
        }
      }).catch((error) => {
        showToast('Could not add to cart', 'error');
      });
      return;
    }
    if (product?.handle) window.location.href = `/products/${product.handle}`;
  };

  const openStory = async (video, index) => {
    setExpandedIndex(index);
    setActiveIndex(index);
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_IMPRESSION });
    }
    await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_CLICK });
  };

  return (
    <section className="video-stories">
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
        onProductClick={async (product, video) => {
          await handleProductClick(product, video);
        }}
      />

      <Show when={title()}>
        <h3 className="video-stories-title">{title()}</h3>
      </Show>

      <Show
        when={Array.isArray(videos) && videos.length > 0}
        fallback={<p className="video-stories-empty">No stories available.</p>}
      >
        <div className="video-stories-list" role="list" aria-label="Video stories">
          <For each={videos}>
            {(video, index) => {
              const thumbUrl = () => getThumbnailPreviewUrl(video?.playbackId, 200, 200);
              const isActive = () => activeIndex() === index();

              return (
                <button
                  type="button"
                  className={`video-story ${isActive() ? 'is-active' : ''}`}
                  onClick={() => openStory(video, index())}
                  aria-label={video?.title || `Story ${index() + 1}`}
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