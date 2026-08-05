/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { Show } from 'solid-js';
import { OverlayProductList } from './OverlayProductList';
import { OverlayProductDetail } from './OverlayProductDetail';
import { LABEL_FREQUENTLY_BOUGHT } from '../../../constants/strings';
import './overlayProducts.css';

/**
 * Desktop tagged-products panel: a list of products, or one product's detail.
 *
 * All props are accessors. Components in this codebase destructure their props,
 * which severs Solid's prop getters — passing functions keeps that house style
 * without losing reactivity.
 */
export function OverlayProductPanel({
  products,
  video,
  selectedIndex,
  onSelect,
  onBack,
  buttonBehavior,
  videoNumber,
  videoTotal,
  addToCartButtonLabel,
  addToCartButtonStyle,
  handleProductClick,
}) {
  const rowRefs = [];
  const registerRef = (i, el) => { rowRefs[i] = el; };

  // More than one product means the list is a real destination to go back to.
  const showBack = () => products().length > 1;
  const selected = () => {
    const i = selectedIndex();
    return i == null ? null : products()[i] ?? null;
  };

  const handleSelect = (i) => {
    onSelect(i);
    handleProductClick?.(products()[i], video(), { intent: 'view' });
  };

  const handleBack = () => {
    const i = selectedIndex();
    onBack();
    queueMicrotask(() => rowRefs[i]?.focus());
  };

  return (
    <aside className="video-carousel-overlay-products">
      {/* keyed: switching product remounts, resetting variant and quantity */}
      <Show
        when={selected()}
        keyed
        fallback={(
          <>
            <h3 className="video-carousel-overlay-products-title">{LABEL_FREQUENTLY_BOUGHT}</h3>
            <OverlayProductList
              products={products}
              onSelect={handleSelect}
              registerRef={registerRef}
            />
          </>
        )}
      >
        {(product) => (
          <OverlayProductDetail
            product={product}
            video={video()}
            buttonBehavior={buttonBehavior}
            showBack={showBack}
            onBack={handleBack}
            videoNumber={videoNumber}
            videoTotal={videoTotal}
            addToCartButtonLabel={addToCartButtonLabel}
            addToCartButtonStyle={addToCartButtonStyle}
            handleProductClick={handleProductClick}
          />
        )}
      </Show>
    </aside>
  );
}
