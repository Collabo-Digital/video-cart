/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { useLiveProduct } from '../../../hooks/useLiveProduct';
import {
  buildProductViewModel,
  defaultOptionValues,
  hasRealOptions,
  imageIndexOf,
  matchVariant,
} from '../../../utils/productService';
import { formatMoney, getVariantId, htmlToText } from '../../../utils/widgetHelpers';
import {
  LABEL_BACK_TO_PRODUCTS,
  LABEL_SOLD_OUT,
  LABEL_VIEW_FULL_DETAILS,
  LABEL_VIEW_PRODUCT,
  labelVideoCounter,
} from '../../../constants/strings';
import { VariantSelector } from './VariantSelector';
import { QuantityStepper } from './QuantityStepper';
import { AddToCartButton } from '../AddToCartButton/AddToCartButton';
import LeftToggleIcon from '../../../assets/Icons/LeftToggleIcon';

const BUTTON_BEHAVIOR_ADD_TO_CART = 'addToCart';

export function OverlayProductDetail({
  product,
  video,
  buttonBehavior,
  showBack,
  onBack,
  videoNumber,
  videoTotal,
  addToCartButtonLabel,
  addToCartButtonStyle,
  handleProductClick,
}) {
  const { live } = useLiveProduct(product);
  const model = createMemo(() => buildProductViewModel(product, live()));

  const [selectedOptions, setSelectedOptions] = createSignal({});
  const [quantity, setQuantity] = createSignal(1);
  const [activeImageIndex, setActiveImageIndex] = createSignal(0);

  // Seed once. A plain latch rather than a signal read, so writing
  // selectedOptions can't re-enter this effect.
  let seeded = false;
  createEffect(() => {
    const m = model();
    if (seeded || !m.options.length || !m.variants.length) return;
    seeded = true;
    setSelectedOptions(defaultOptionValues(m));
  });

  const matched = () => matchVariant(model(), selectedOptions());

  // One-way sync: model.images carries every variant image, but dedup keeps
  // only one spelling of each — match on canonical identity, not the string.
  createEffect(() => {
    const i = imageIndexOf(model(), matched()?.image);
    if (i >= 0) setActiveImageIndex(i);
  });

  const isAddToCart = () => buttonBehavior() === BUTTON_BEHAVIOR_ADD_TO_CART;
  const priceAmount = () => matched()?.price ?? model().variants[0]?.price ?? null;
  const compareAmount = () => matched()?.compareAt ?? null;
  // Only claim sold out once live data can actually say so.
  const soldOut = () => Boolean(live()) && matched() != null && !matched().available;
  const description = () => htmlToText(model().description);
  const heroSrc = () => model().images[activeImageIndex()] ?? product.image ?? null;

  // Returns the handler's promise so the button can render the cart outcome.
  const onPrimary = () => {
    if (soldOut()) return false;
    // handleProductClick is undefined in preview mode — always call it optionally.
    if (!isAddToCart()) {
      return handleProductClick?.(product, video);
    }
    return handleProductClick?.(product, video, {
      intent: 'add',
      variantId: matched()?.id ?? getVariantId(product),
      quantity: quantity(),
    });
  };

  return (
    <div className="video-carousel-overlay-pdetail" tabIndex={-1}>
      <Show when={showBack()}>
        <button type="button" className="video-carousel-overlay-pdetail-back" onClick={onBack}>
          <LeftToggleIcon />
          {LABEL_BACK_TO_PRODUCTS}
        </button>
      </Show>

      <Show when={model().images.length > 1}>
        <div className="video-carousel-overlay-pdetail-thumbs">
          <For each={model().images}>
            {(src, i) => (
              <button
                type="button"
                className={`video-carousel-overlay-pdetail-thumb${
                  i() === activeImageIndex() ? ' video-carousel-overlay-pdetail-thumb-active' : ''
                }`}
                aria-label={`Image ${i() + 1}`}
                aria-pressed={i() === activeImageIndex()}
                onClick={() => setActiveImageIndex(i())}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={heroSrc()}>
        <img className="video-carousel-overlay-pdetail-hero" src={heroSrc()} alt={model().title} />
      </Show>

      <Show when={model().eyebrow}>
        <span className="video-carousel-overlay-pdetail-eyebrow">{model().eyebrow}</span>
      </Show>
      <h3 className="video-carousel-overlay-pdetail-title">{model().title}</h3>

      {/* Skeleton only for what the snapshot can't supply while live data lands. */}
      <Show
        when={priceAmount() != null}
        fallback={<span className="video-carousel-overlay-pdetail-skeleton" aria-hidden />}
      >
        <p className="video-carousel-overlay-pdetail-price">
          {formatMoney(priceAmount())}
          <Show when={compareAmount() != null && compareAmount() > priceAmount()}>
            <s className="video-carousel-overlay-pdetail-compare">{formatMoney(compareAmount())}</s>
          </Show>
        </p>
      </Show>

      <Show when={hasRealOptions(model())}>
        <div className="video-carousel-overlay-pdetail-options">
          <For each={model().options}>
            {(option, i) => (
              <Show when={option.values.length > 1}>
                <VariantSelector
                  model={model}
                  option={option}
                  optionIndex={i()}
                  selected={selectedOptions}
                  onSelect={(name, value) =>
                    setSelectedOptions((prev) => ({ ...prev, [name]: value }))}
                />
              </Show>
            )}
          </For>
        </div>
      </Show>

      <div className="video-carousel-overlay-pdetail-buy">
        {/* Quantity is meaningless when the button navigates instead of adding. */}
        <Show when={isAddToCart()}>
          <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
        </Show>
        <AddToCartButton
          className="video-carousel-overlay-pdetail-atc"
          variant="primary"
          label={() => (isAddToCart() ? addToCartButtonLabel() : LABEL_VIEW_PRODUCT)}
          disabledLabel={LABEL_SOLD_OUT}
          disabled={soldOut}
          style={addToCartButtonStyle}
          onAdd={handleProductClick ? onPrimary : undefined}
        />
      </div>

      <Show when={description()}>
        <p className="video-carousel-overlay-pdetail-desc">{description()}</p>
      </Show>

      <div className="video-carousel-overlay-pdetail-footer">
        <Show when={videoTotal() > 1}>
          <span className="video-carousel-overlay-pdetail-counter">
            {labelVideoCounter(videoNumber(), videoTotal())}
          </span>
        </Show>
        {/* Redundant when the primary button already navigates there. */}
        <Show when={isAddToCart() && model().url}>
          <a className="video-carousel-overlay-pdetail-link" href={model().url}>
            {LABEL_VIEW_FULL_DETAILS}
          </a>
        </Show>
      </div>
    </div>
  );
}
