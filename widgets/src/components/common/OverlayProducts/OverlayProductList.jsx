/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { For, Show } from 'solid-js';
import { useLiveProduct } from '../../../hooks/useLiveProduct';
import { LABEL_SOLD_OUT } from '../../../constants/strings';
import RightToggleIcon from '../../../assets/Icons/RightToggleIcon';

/**
 * One row. Shows the stored title/image immediately, then live price and
 * availability, so a shopper never sees a price that moved after tagging.
 * fetchProduct caches per handle, so the detail view opening the same product
 * costs no second request.
 */
function ProductListRow({ product, index, onSelect, registerRef }) {
  const { price, available } = useLiveProduct(product);

  return (
    <button
      type="button"
      ref={(el) => registerRef(index, el)}
      className="video-carousel-overlay-plist-row"
      onClick={() => onSelect(index)}
    >
      <img className="video-carousel-overlay-plist-thumb" src={product.image} alt="" loading="lazy" />
      <span className="video-carousel-overlay-plist-info">
        <span className="video-carousel-overlay-plist-title">{product.title}</span>
        <Show when={price()}>
          <span className="video-carousel-overlay-plist-price">{price()}</span>
        </Show>
        {/* Still clickable when sold out — other variants may be buyable. */}
        <Show when={!available()}>
          <span className="video-carousel-overlay-plist-badge">{LABEL_SOLD_OUT}</span>
        </Show>
      </span>
      <span className="video-carousel-overlay-plist-chevron" aria-hidden>
        <RightToggleIcon />
      </span>
    </button>
  );
}

export function OverlayProductList({ products, onSelect, registerRef }) {
  return (
    <div className="video-carousel-overlay-plist">
      <For each={products()}>
        {(product, index) => (
          <ProductListRow
            product={product}
            index={index()}
            onSelect={onSelect}
            registerRef={registerRef}
          />
        )}
      </For>
    </div>
  );
}
