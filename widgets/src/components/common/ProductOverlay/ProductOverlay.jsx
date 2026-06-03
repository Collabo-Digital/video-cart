import { For, Show } from 'solid-js';
import { productsForVideo, productPrice } from '../../../utils/widgetHelpers';
import { PRODUCT_ITEM_GAP } from '../../../core/constant';
import LeftToggleIcon from '../../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../../assets/Icons/RightToggleIcon';
import './productOverlay.css';

export function ProductOverlay({
  video,
  addToCartButtonLabel,
  addToCartButtonStyle,
  onProductClick,
}) {
  let stripRef;

  const products = () => productsForVideo(video);
  const hasMultiple = () => products().length > 1;

  const scrollStrip = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stripRef) return;
    stripRef.scrollBy({
      left: direction === 'next' ? PRODUCT_ITEM_GAP : -PRODUCT_ITEM_GAP,
      behavior: 'smooth',
    });
  };

  return (
    <Show when={products().length > 0}>
      <span className="vd-product-overlay">
        <div className="vd-product-overlay-nav">
          <Show when={hasMultiple()}>
            <button
              type="button"
              className="vd-overlay-nav-btn"
              aria-label="Previous products"
              onClick={(e) => scrollStrip(e, 'prev')}
            >
              <LeftToggleIcon />
            </button>
          </Show>
          <Show when={hasMultiple()}>
            <button
              type="button"
              className="vd-overlay-nav-btn"
              aria-label="Next products"
              onClick={(e) => scrollStrip(e, 'next')}
            >
              <RightToggleIcon />
            </button>
          </Show>
        </div>

        <div className={`vd-product-overlay-products${hasMultiple() ? ' has-nav' : ''}`}>
          <div className="vd-product-overlay-products-inner" ref={stripRef}>
            <For each={products()}>
              {(product) => (
                <div className="vd-product-overlay-item">
                  <img src={product.image} alt={product.title} loading="lazy" />
                  <div className="vd-product-overlay-item-info">
                    <span className="vd-product-overlay-item-title">
                      {product.title}
                    </span>
                    <div className="vd-product-overlay-item-info-inner">
                      <Show when={productPrice(product)?.formatted}>
                        <span className="vd-product-overlay-item-price">
                          {productPrice(product)?.formatted || '$0.00'}
                        </span>
                      </Show>
                      <button
                        type="button"
                        className="vd-product-overlay-item-button"
                        style={addToCartButtonStyle()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(product, video);
                        }}
                      >
                        {addToCartButtonLabel()}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </span>
    </Show>
  );
}