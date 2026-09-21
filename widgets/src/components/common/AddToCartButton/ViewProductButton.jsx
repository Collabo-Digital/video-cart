/* eslint-disable react/prop-types -- shared overlay control (ARCHITECTURE-RULES §4) */
import { createSignal, onCleanup } from 'solid-js';
import ArrowRightIcon from '../../../assets/Icons/ArrowRightIcon';
import LoadingIcon from '../../../assets/Icons/Loading';
import './addToCartButton.css';

/** Fake round-trip so the theme editor can show the loading state. */
const PREVIEW_MS = 600;

/**
 * The product button for the "Open product page" action. Same shell, variants
 * and brand colour as AddToCartButton, but none of its cart states — there is
 * nothing to add, so "Adding / Added / Try again" would be a lie. The label
 * never changes; the arrow turns into a spinner while the product page loads.
 */
export function ViewProductButton({
  label,
  style,
  onView,
  variant = 'primary',
  className = '',
}) {
  const [opening, setOpening] = createSignal(false);

  // Going back restores this page from the back/forward cache exactly as it
  // was left — spinning — so clear it when the page is shown again.
  const onPageShow = (e) => { if (e.persisted) setOpening(false); };
  window.addEventListener('pageshow', onPageShow);

  let previewTimer;
  onCleanup(() => {
    window.removeEventListener('pageshow', onPageShow);
    clearTimeout(previewTimer);
  });

  // Same hand-off as AddToCartButton: the merchant colour as a custom property.
  const brandBg = () => style?.()?.['background-color'];

  const handleClick = async (e) => {
    e.preventDefault();
    // Cards wrap this button in their own click target.
    e.stopPropagation();
    if (opening()) return; // swallows double-taps

    setOpening(true);

    // onView is absent in the theme editor — createProductClickHandler returns
    // undefined under isPreview. Show the state rather than sitting inert.
    if (!onView) {
      previewTimer = setTimeout(() => setOpening(false), PREVIEW_MS);
      return;
    }

    try {
      // Navigates; the page unloads with the spinner still turning.
      await onView();
    } catch {
      setOpening(false);
    }
  };

  return (
    <button
      type="button"
      className={`vc-atc vc-atc--${variant} vc-atc--view${className ? ` ${className}` : ''}${
        opening() ? ' is-loading' : ''
      }`}
      style={brandBg() ? { '--vc-atc-bg': brandBg() } : undefined}
      aria-busy={opening()}
      onClick={handleClick}
    >
      <span className="vc-atc-label">{label()}</span>
      {/* Reuses AddToCartButton's icon slot: while loading, the idle glyph
          slides out and the spinner turns in its place. */}
      <span className="vc-atc-icon" aria-hidden="true">
        <span className="vc-atc-spinner"><LoadingIcon /></span>
        <span className="vc-atc-glyph vc-atc-glyph--idle"><ArrowRightIcon /></span>
      </span>
    </button>
  );
}
