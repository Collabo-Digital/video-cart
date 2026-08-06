/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import {
  LABEL_DECREASE_QTY,
  LABEL_INCREASE_QTY,
  LABEL_QUANTITY,
} from '../../../constants/strings';

const MAX_QUANTITY = 99;

const clamp = (n) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(n) || 1)));

export function QuantityStepper({ quantity, setQuantity }) {
  return (
    <div className="video-carousel-overlay-pdetail-qty">
      <button
        type="button"
        className="video-carousel-overlay-pdetail-qty-btn"
        aria-label={LABEL_DECREASE_QTY}
        disabled={quantity() <= 1}
        onClick={() => setQuantity((q) => clamp(q - 1))}
      >
        &minus;
      </button>
      <input
        type="number"
        className="video-carousel-overlay-pdetail-qty-input"
        min="1"
        max={MAX_QUANTITY}
        inputMode="numeric"
        aria-label={LABEL_QUANTITY}
        value={quantity()}
        onInput={(e) => {
          // Let the field go empty mid-edit; the blur handler puts it right.
          if (e.currentTarget.value === '') return;
          setQuantity(clamp(e.currentTarget.value));
        }}
        onBlur={(e) => { e.currentTarget.value = quantity(); }}
      />
      <button
        type="button"
        className="video-carousel-overlay-pdetail-qty-btn"
        aria-label={LABEL_INCREASE_QTY}
        disabled={quantity() >= MAX_QUANTITY}
        onClick={() => setQuantity((q) => clamp(q + 1))}
      >
        +
      </button>
    </div>
  );
}
