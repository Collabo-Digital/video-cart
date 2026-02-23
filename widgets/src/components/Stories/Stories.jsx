/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show, createSignal } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './stories.css';
import { VideoOverlayPlayer } from '../common/VideoOverlayPlayer';
import { addToCart } from '../../utils/shopifyService';

export function VideoStories({ feed, videos, settings, onEvent }) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [expandedIndex, setExpandedIndex] = createSignal(null);

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
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: product?.handle, source: 'stories' });
    const behavior = feed?.settings?.general?.addToCartButtonBehavior;
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
      }]);
      return;
    }
    if (product?.handle) window.location.href = `/products/${product.handle}`;
  };

  const openStory = (video, index) => {
    setActiveIndex(index);
    setExpandedIndex(index);
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
        onVideoChange={(video, index) => {
          setActiveIndex(index);
          onEvent?.('video_change', {
            feedId: feed?.id,
            videoId: video?.id,
            index,
            source: 'stories',
          });
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
    </section>
  );
}