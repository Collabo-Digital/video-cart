/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './grid.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { addToCart } from '../../utils/shopifyService';
import { api } from '../../api';
import { EVENT_TYPES } from '../../api/services/analyticsService';
import { Toast } from '../common/Toast/Toast';
import { TOAST_DURATION_MS_EXPORT as TOAST_DURATION_MS } from '../common/Toast/Toast';

const DEFAULT_SUBTITLE = '';

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


export function VideoGrid({ feed, videos, settings, onEvent }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);

  const title = () => settings?.translation?.gridTitle || feed?.name || '';
  const subtitle = () => settings?.translation?.gridDescription || feed?.description || DEFAULT_SUBTITLE;
  const productsForVideo = (video) => video?.productsTagged ?? [];

  const [toastVisible, setToastVisible] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [toastType, setToastType] = createSignal('success');

  function showToast(message, type = 'success') {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
  }

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

  const primaryProductHandle = (video) => {
    const firstProduct = video?.productsTagged?.[0];
    if (!firstProduct) return null;
    if (typeof firstProduct === 'object') return firstProduct.handle || firstProduct.id || null;
    return firstProduct;
  };

  const handleVideoClick = (video, index) => {
    setExpandedIndex(index);
  };

  const handleProductClick = async (event, video, productHandle) => {
    event.stopPropagation();
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: productHandle, source: 'grid' });
    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    if (behavior === 'addToCart') {
      await addToCart([{
        id: getVariantId(productHandle),
        quantity: 1,  
        properties: {
          _video_id: video?.id,
          _widget_id: feed?.id,
          timestamp: Date.now(),
          source: 'video-cart-grid',
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
    if (productHandle) window.location.href = `/products/${productHandle}`;
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: productHandle, source: 'grid' });
  };

  const handleOverlayProductClick = async (product, video) => {
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: product?.handle, source: 'grid' });
    if (feed?.id && video?.id) {
      await trackDbEvent({ feedId: feed.id, videoId: video.id, eventType: EVENT_TYPES.VIDEO_PRODUCT_CLICK });
    }
    await trackDbEvent({ feedId: feed.id, eventType: EVENT_TYPES.WIDGET_PRODUCT_CLICK });
    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
    if (behavior === 'addToCart') {
      await addToCart([{
        id: getVariantId(product),
        quantity: 1,
        properties: {
          _video_id: video?.id,
          _widget_id: feed?.id,
          timestamp: Date.now(),
          source: 'video-cart-grid',
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

  return (
    <section className="video-grid-container">
      <VideoOverlayPlayer
        videos={videos}
        expandedIndex={expandedIndex}
        setExpandedIndex={setExpandedIndex}
        productsForVideo={productsForVideo}
        productPrice={productPrice}
        addToCartButtonLabel={addToCartButtonLabel}
        addToCartButtonStyle={addToCartButtonStyle}
        handleProductClick={handleOverlayProductClick}
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
        onProductClick={async (product, video) => {
          if (!feed?.id || !video?.id) return;
          await handleProductClick(product, video);
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
        fallback={<p className="video-grid-empty">No videos available in this feed.</p>}
      >
        <div className="video-grid-list" role="list">
          <For each={videos}>
            {(video, index) => {
              const thumbUrl = () => getThumbnailPreviewUrl(video?.playbackId, 560, 748);
              const productHandle = () => primaryProductHandle(video);

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
                    {/* <span className="video-grid-card-overlay">
                      <span className="video-grid-play">▶</span>
                      <span className="video-grid-card-title">{video?.title || `Video ${index() + 1}`}</span>
                    </span> */}
                  </button>

                  <Show when={productHandle()}>
                    <a
                      href={`/products/${productHandle()}`}
                      className="video-grid-product-link"
                      onClick={(event) => handleProductClick(event, video, productHandle())}
                    >
                      Shop product
                    </a>
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