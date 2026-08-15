/* eslint-disable react/prop-types -- shared overlay used by widget variants */
import { For, Show } from 'solid-js';
import { productsForVideo } from '../../../utils/widgetHelpers';
import { useLiveProduct } from '../../../hooks/useLiveProduct';
import { LABEL_SOLD_OUT } from '../../../constants/strings';
import { PRODUCT_ITEM_GAP } from '../../../core/constant';
import { AddToCartButton } from '../AddToCartButton/AddToCartButton';
import LeftToggleIcon from '../../../assets/Icons/LeftToggleIcon';
import RightToggleIcon from '../../../assets/Icons/RightToggleIcon';
import './productOverlay.css';

/**
 * One tagged product. Renders the stored title/image immediately (no layout
 * shift), then replaces price/availability with live data from Shopify so
 * shoppers never see a stale price.
 */
function ProductItem({ product, video, addToCartButtonLabel, addToCartButtonStyle, onProductClick }) {
  const { price, available } = useLiveProduct(product);

  return (
    <div className="vd-product-overlay-item">
      <div className="vd-product-overlay-item-media">
        <img src={product.image} alt={product.title} loading="lazy" />
        <div className="vd-product-overlay-item-info">
          <span className="vd-product-overlay-item-title">
            {product.title}
          </span>
          <Show when={price()}>
            <span className="vd-product-overlay-item-price">
              {price()}
            </span>
          </Show>
        </div>
      </div>
      {/* Sibling of the media block, not of the price: on a narrow tile the
          card stacks and the button takes the full width. */}
      <AddToCartButton
        className="vd-product-overlay-item-button"
        variant="compact"
        label={addToCartButtonLabel}
        disabledLabel={LABEL_SOLD_OUT}
        disabled={() => !available()}
        style={addToCartButtonStyle}
        onAdd={onProductClick ? () => onProductClick(product, video) : undefined}
      />
    </div>
  );
}

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
    // Items are `flex: 0 0 100%`, so one step is one strip width plus the gap.
    const step = stripRef.clientWidth + PRODUCT_ITEM_GAP;
    stripRef.scrollBy({
      left: direction === 'next' ? step : -step,
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
                <ProductItem
                  product={product}
                  video={video}
                  addToCartButtonLabel={addToCartButtonLabel}
                  addToCartButtonStyle={addToCartButtonStyle}
                  onProductClick={onProductClick}
                />
              )}
            </For>
          </div>
        </div>
      </span>
    </Show>
  );
}