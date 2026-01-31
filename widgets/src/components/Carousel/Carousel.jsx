/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent (ARCHITECTURE-RULES §4) */
import { createSignal, For, Show } from 'solid-js';
import { getThumbnailUrl, getTumbnailPreviewUrl } from '../../shared/mux';
import './carousel.css';

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const SCROLL_AMOUNT = CARD_WIDTH + CARD_GAP;
/* One product visible at a time, full width of card */
const PRODUCT_ITEM_WIDTH = CARD_WIDTH; /* 280px = full width */
const PRODUCT_ITEM_GAP = 8;
const PRODUCT_SCROLL_AMOUNT = PRODUCT_ITEM_WIDTH + PRODUCT_ITEM_GAP;

const DEFAULT_SUBTITLE =
  '';

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function VideoCarousel({ feed, videos, settings, onEvent }) {
  const [trackRef, setTrackRef] = createSignal(null);

  const title = () => settings?.translation?.carouselTitle || feed?.name || '';
  const subtitle = () => settings?.translation?.carouselDescription || feed?.description || DEFAULT_SUBTITLE;
  /** Products per video: [[product, ...], []] — index i = products for videos[i] */
  const productsForVideo = (video) => video?.productsTagged ?? [];

  const scrollTrack = (direction) => {
    const el = trackRef();
    if (!el) return;
    const amount = direction === 'next' ? SCROLL_AMOUNT : -SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const scrollProducts = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget.closest('.video-carousel-card');
    const strip = card?.querySelector('.video-carousel-card-products-inner');
    if (!strip) return;
    const amount = direction === 'next' ? PRODUCT_SCROLL_AMOUNT : -PRODUCT_SCROLL_AMOUNT;
    strip.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleCardClick = (video, index) => {
    onEvent?.('video_change', { feedId: feed?.id, videoId: video.id, index });
    const first = video?.productsTagged?.[0];
    if (first) {
      const productId = typeof first === 'object' ? (first.handle || first.id) : first;
      onEvent?.('product_click', { feedId: feed?.id, productId });
      if (productId) window.location.href = `/products/${productId}`;
    }
  };

  const handleCardLinkClick = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    const first = video?.productsTagged?.[0];
    if (first) {
      const productId = typeof first === 'object' ? (first.handle || first.id) : first;
      onEvent?.('product_click', { feedId: feed?.id, productId });
      if (productId) window.location.href = `/products/${productId}`;
    }
  };

  return (
    <div className="video-carousel-container">
      {/* Header: title, subtitle, nav arrows on the right */}
      <header className="video-carousel-header">
        <div className="video-carousel-header-text">
          <h2 className="video-carousel-title">{title()}</h2>
          <p className="video-carousel-subtitle">{subtitle()}</p>
        </div>
        <Show when={videos?.length > 0}>
          <nav className="video-carousel-nav" aria-label="Carousel navigation">
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Previous"
              onClick={() => scrollTrack('prev')}
            >
              ‹
            </button>
            <button
              type="button"
              className="video-carousel-nav-btn"
              aria-label="Next"
              onClick={() => scrollTrack('next')}
            >
              ›
            </button>
          </nav>
        </Show>
      </header>

      {/* Horizontal card track */}
      <Show when={videos?.length > 0}>
        <div className="video-carousel-track-wrap">
          <div className="video-carousel-track" ref={setTrackRef} role="list">
            <For each={videos}>
              {(video, index) => {
                const thumbUrl = () => getTumbnailPreviewUrl(video.playbackId, 560, 748);
                const meta = () => {
                  const count = video?.productsTagged?.length ?? 0;
                  return count > 0 ? `${count} product${count !== 1 ? 's' : ''}` : 'Watch';
                };
                return (
                  <article className="video-carousel-card" role="listitem">
                    <button
                      type="button"
                      className="video-carousel-card-button"
                      onClick={() => handleCardClick(video, index())}
                      aria-label={`${video.title || `Video ${index() + 1}`}, ${meta()}`}
                    >
                      <span className="video-carousel-card-image-wrap">
                        <Show when={thumbUrl()} fallback={<span style="display:block;width:100%;height:100%;background:#e5e7eb" />}>
                          <img
                            className="video-carousel-card-image"
                            src={thumbUrl()}
                            alt=""
                            loading="lazy"
                          />
                        </Show>
                      </span>
                      <span className="video-carousel-card-overlay">
                        <div className={`video-carousel-card-products${productsForVideo(video).length > 1 ? ' has-nav' : ''}`}>
                          <Show when={productsForVideo(video).length > 1}>
                            <button
                              type="button"
                              className="video-carousel-products-btn video-carousel-products-btn-prev"
                              aria-label="Previous products"
                              onClick={(e) => scrollProducts(e, 'prev')}
                            >
                              ‹
                            </button>
                          </Show>
                          <div className="video-carousel-card-products-inner">
                            <For each={productsForVideo(video)}>
                              {(product) => (
                                <div className="video-carousel-card-product">
                                  <img src={product.image} alt={product.title} loading="lazy" />
                                  <div className="video-carousel-card-product-info">
                                    <span className="video-carousel-card-product-title">{product.title}</span>
                                    <button className="video-carousel-card-product-button" onClick={() => window.location.href = `/products/${product.handle}`}> shop   </button>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                          <Show when={productsForVideo(video).length > 1}>
                            <button
                              type="button"
                              className="video-carousel-products-btn video-carousel-products-btn-next"
                              aria-label="Next products"
                              onClick={(e) => scrollProducts(e, 'next')}
                            >
                              ›
                            </button>
                          </Show>
                        </div>
                        {/* <span className="video-carousel-card-name">{video.title || `Video ${index() + 1}`}</span>
                        <span className="video-carousel-card-meta">{meta()}</span> */}
                      </span>
                    </button>
                    <a
                      href={video?.productsTagged?.[0] ? `/products/${typeof video.productsTagged[0] === 'object' ? video.productsTagged[0].handle || video.productsTagged[0].id : video.productsTagged[0]}` : '#'}
                      className="video-carousel-card-link"
                      aria-label="View product"
                      onClick={(e) => handleCardLinkClick(e, video)}
                    >
                      {/* <ExternalLinkIcon /> */}
                    </a>
                  </article>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!videos?.length}>
        <p style="padding: 2rem; text-align: center; color: #6d7175;">No videos available in this feed.</p>
      </Show>
    </div>
  );
}
