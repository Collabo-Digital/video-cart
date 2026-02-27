/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './floating.css';
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



export function VideoFloating({ feed, videos, settings, onEvent }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const firstVideo = () => (Array.isArray(videos) && videos.length ? videos[0] : null);
  const [toastVisible, setToastVisible] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal('success');

  const title = () => settings?.translation?.floatingTitle || feed?.name || 'Watch now';

  const subtitle = () => {
    const count = videos?.length || 0;
    return `${count} video${count === 1 ? '' : 's'} available`;
  };

  function showToast(message, type = 'success') {
  setToastMessage(message);
  setToastType(type);
  setToastVisible(true);
  setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
}

  const thumb = () => {
    const playbackId = firstVideo()?.playbackId;
    return playbackId ? getThumbnailPreviewUrl(playbackId, 320, 180) : null;
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

  const productsForVideo = (video) => video?.productsTagged ?? [];
  const productPrice = (product) => {
    const priceVal = product?.variants?.[0]?.price;
    if (priceVal == null || priceVal === '') return null;
    const num = typeof priceVal === 'string' ? parseFloat(priceVal, 10) : Number(priceVal);
    if (Number.isNaN(num)) return null;
    return { raw: priceVal, formatted: `$ ${num.toFixed(num % 1 === 0 ? 0 : 2)}` };
  };

  const addToCartButtonLabel = () => feed?.settings?.translation?.addToCartText || 'Check this out';
  const addToCartButtonColor = () => {
    const raw = settings?.design?.addToCartButtonColor ?? feed?.settings?.design?.addToCartButtonColor;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  };
  const addToCartButtonStyle = () => {
    const color = addToCartButtonColor();
    return color ? { 'background-color': color } : undefined;
  };
  const getVariantId = (product) => product?.variants?.[0]?.id ?? product?.id;

  const handleProductClick = async (product, video) => {
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: product?.handle, source: 'floating' });
    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
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
          source: 'video-cart-floating',
        },
      }]).then(async (response) => {
        if (response.status === 200) {
          showToast('Added to cart', 'success');
          if (feed?.id && video?.id) {
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_ATC });
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_ATC });
          }
        }
      }).catch((error) => {
        showToast('Could not add to cart', 'error');
      });
      return;
    }
    if (product?.handle) window.location.href = `/products/${product.handle}`;
  };

  return (
    <div className="video-floating">
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
        onProductClick={async (product, video) => {
          if (!feed?.id || !video?.id) return;
          await handleProductClick(product, video);
          if (feed?.id && video?.id) {
            await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
            await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
          }
        }}
      />

      <Show when={firstVideo()} fallback={<div className="video-floating-empty">No videos available.</div>}>
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
            {/* <div className="video-floating-thumb-overlay" />
            <span className="video-floating-play">▶</span> */}
          </div>

          {/* <div className="video-floating-content">
            <div className="video-floating-title">{title()}</div>
            <div className="video-floating-subtitle">{subtitle()}</div>
          </div> */}
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