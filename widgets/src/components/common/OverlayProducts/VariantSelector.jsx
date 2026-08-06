/* eslint-disable react/prop-types -- overlay internals (ARCHITECTURE-RULES §4) */
import { For, Show } from 'solid-js';
import { isValueAvailable } from '../../../utils/productService';

/** Option names that render as circular swatches rather than text pills. */
const SWATCH_OPTION_NAME = /^colou?rs?$/i;

/** First variant image carrying this value — the most reliable swatch source,
 *  because it's what merchants actually configure. */
function valueImage(model, optionIndex, value) {
  return model.variants.find((v) => v.options[optionIndex] === value && v.image)?.image ?? null;
}

function swatchStyle(model, optionIndex, value) {
  const img = valueImage(model, optionIndex, value);
  if (img) return { 'background-image': `url(${img})` };
  // Known false positive: a merchant's "Tan" resolves to the CSS colour `tan`.
  // Degrading to *a* circle still beats showing nothing.
  const css = String(value).trim().toLowerCase();
  if (typeof CSS !== 'undefined' && CSS.supports?.('color', css)) {
    return { 'background-color': css };
  }
  return null;
}

export function VariantSelector({ model, option, optionIndex, selected, onSelect }) {
  const isSwatch = () => SWATCH_OPTION_NAME.test(option.name);

  return (
    <div className="video-carousel-overlay-pdetail-option">
      <span className="video-carousel-overlay-pdetail-option-label">{option.name}</span>
      <div className="video-carousel-overlay-pdetail-option-values" aria-label={option.name}>
        <For each={option.values}>
          {(value) => {
            const chosen = () => selected()[option.name] === value;
            // Unavailable values stay CLICKABLE: hard-disabling them traps the
            // shopper in a dead corner on two-option products (pick Red, every
            // size greys out, no way back).
            const offerable = () => isValueAvailable(model(), selected(), optionIndex, value);
            const style = () => (isSwatch() ? swatchStyle(model(), optionIndex, value) : null);

            return (
              <button
                type="button"
                className={
                  (style()
                    ? 'video-carousel-overlay-pdetail-swatch'
                    : 'video-carousel-overlay-pdetail-pill')
                  + (chosen() ? ' video-carousel-overlay-pdetail-value-selected' : '')
                  + (offerable() ? '' : ' video-carousel-overlay-pdetail-value-unavailable')
                }
                style={style() ?? undefined}
                aria-pressed={chosen()}
                aria-disabled={!offerable()}
                aria-label={`${option.name} ${value}`}
                onClick={() => onSelect(option.name, value)}
              >
                <Show when={!style()}>{value}</Show>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
