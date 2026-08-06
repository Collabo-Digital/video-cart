/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { OverlayProductList } from './OverlayProductList';
import { OverlayProductDetail } from './OverlayProductDetail';
import { LABEL_FREQUENTLY_BOUGHT } from '../../../constants/strings';
import './overlayProducts.css';

/** Must match the video-carousel-slide-* keyframe duration in videoOverlay.css. */
const PANEL_SLIDE_MS = 400;

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

  /** Which view is on its way out. null when idle.
   *  view 'list'   -> going forward into the detail
   *  view 'detail' -> going back to the list; carries the product so the detail
   *                   instance survives the animation rather than unmounting,
   *                   which would visibly reset the shopper's variant choice. */
  const [leaving, setLeaving] = createSignal(null);

  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  createEffect(() => {
    if (!leaving()) return;
    const timer = setTimeout(() => setLeaving(null), PANEL_SLIDE_MS + 60);
    onCleanup(() => clearTimeout(timer));
  });

  // Each view is mounted while it's current, and while it's sliding away.
  const showList = () => selectedIndex() == null || leaving()?.view === 'list';
  const detailProduct = () => selected() ?? leaving()?.product ?? null;

  const listClass = () => {
    const l = leaving();
    if (!l) return '';
    return l.view === 'list'
      ? ' video-carousel-overlay-slide-out-next' // forward: list exits left
      : ' video-carousel-overlay-slide-in-prev'; // back: list enters from the left
  };

  const detailClass = () => {
    const l = leaving();
    if (!l) return '';
    return l.view === 'list'
      ? ' video-carousel-overlay-slide-in-next' // forward: detail enters from the right
      : ' video-carousel-overlay-slide-out-prev'; // back: detail exits right
  };

  const handleSelect = (i) => {
    if (!reduced()) setLeaving({ view: 'list' });
    onSelect(i);
    handleProductClick?.(products()[i], video(), { intent: 'view' });
  };

  const handleBack = () => {
    const i = selectedIndex();
    // Read selected() before onBack() clears the index.
    if (!reduced()) setLeaving({ view: 'detail', product: selected() });
    onBack();
    queueMicrotask(() => rowRefs[i]?.focus());
  };

  return (
    <aside className="video-carousel-overlay-products">
      {/* Both pages are mounted for the length of a transition and slide past
          each other in the same grid cell. `inert` keeps the leaving one out of
          reach of clicks and the tab order. */}
      <Show when={showList()}>
        <div
          className={`video-carousel-overlay-panel-page${listClass()}`}
          inert={leaving()?.view === 'list' || undefined}
          aria-hidden={leaving()?.view === 'list' || undefined}
        >
          <h3 className="video-carousel-overlay-products-title">{LABEL_FREQUENTLY_BOUGHT}</h3>
          <OverlayProductList
            products={products}
            onSelect={handleSelect}
            registerRef={registerRef}
          />
        </div>
      </Show>

      {/* keyed: switching product remounts, resetting variant and quantity */}
      <Show when={detailProduct()} keyed>
        {(product) => (
          <div
            className={`video-carousel-overlay-panel-page${detailClass()}`}
            inert={leaving()?.view === 'detail' || undefined}
            aria-hidden={leaving()?.view === 'detail' || undefined}
          >
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
          </div>
        )}
      </Show>
    </aside>
  );
}
