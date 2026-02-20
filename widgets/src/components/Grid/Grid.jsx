/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { For, Show } from 'solid-js';
import { getThumbnailPreviewUrl } from '../../shared/mux';
import './grid.css';

const DEFAULT_SUBTITLE = '';

export function VideoGrid({ feed, videos, settings, onEvent }) {
  const title = () => settings?.translation?.gridTitle || feed?.name || '';
  const subtitle = () => settings?.translation?.gridDescription || feed?.description || DEFAULT_SUBTITLE;

  const primaryProductHandle = (video) => {
    const firstProduct = video?.productsTagged?.[0];
    if (!firstProduct) return null;
    if (typeof firstProduct === 'object') return firstProduct.handle || firstProduct.id || null;
    return firstProduct;
  };

  const handleVideoClick = (video, index) => {
    onEvent?.('video_change', { feedId: feed?.id, videoId: video?.id, index, source: 'grid' });
  };

  const handleProductClick = (event, video, productHandle) => {
    event.stopPropagation();
    onEvent?.('product_click', { feedId: feed?.id, videoId: video?.id, productId: productHandle, source: 'grid' });
  };

  return (
    <section className="video-grid-container">
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
                    <span className="video-grid-card-overlay">
                      <span className="video-grid-play">▶</span>
                      <span className="video-grid-card-title">{video?.title || `Video ${index() + 1}`}</span>
                    </span>
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
    </section>
  );
}