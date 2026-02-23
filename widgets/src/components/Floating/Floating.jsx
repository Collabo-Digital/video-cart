/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './floating.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { addToCart } from '../../utils/shopifyService';

export function VideoFloating({ feed, videos, settings, onEvent }) {
  const [expandedIndex, setExpandedIndex] = createSignal(null);
  const firstVideo = () => (Array.isArray(videos) && videos.length ? videos[0] : null);

  const title = () => settings?.translation?.floatingTitle || feed?.name || 'Watch now';

  const subtitle = () => {
    const count = videos?.length || 0;
    return `${count} video${count === 1 ? '' : 's'} available`;
  };

  const thumb = () => {
    const playbackId = firstVideo()?.playbackId;
    return playbackId ? getThumbnailPreviewUrl(playbackId, 320, 180) : null;
  };

  const openVideo = () => {
    const video = firstVideo();
    if (!video) return;
    setExpandedIndex(0);
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
      }]);
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
        onVideoChange={(video, index) => {
          onEvent?.('video_change', {
            feedId: feed?.id,
            videoId: video?.id,
            index,
            source: 'floating',
          });
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
    </div>
  );
}