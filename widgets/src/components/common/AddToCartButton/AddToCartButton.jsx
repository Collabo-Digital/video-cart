/* eslint-disable react/prop-types -- shared overlay control (ARCHITECTURE-RULES §4) */
import { createSignal, onCleanup } from 'solid-js';
import { LABEL_ADDING, LABEL_ADDED, LABEL_ADD_FAILED } from '../../../constants/strings';
import ATCAddIcon from '../../../assets/Icons/ATCAddIcon';
import ATCSuccessIcon from '../../../assets/Icons/ATCSuccessIcon';
import ATCFailedIcon from '../../../assets/Icons/ATCFailedIcon';
import LoadingIcon from '../../../assets/Icons/Loading';
import './addToCartButton.css';

/** How long the terminal state holds before flipping back to idle. */
const RESET_MS = 1600;
/** Fake round-trip so the theme editor can show the animation. */
const PREVIEW_MS = 600;

export function AddToCartButton({
  label,
  style,
  disabled,
  disabledLabel,
  onAdd,
  variant = 'primary',
  className = '',
}) {
  const [status, setStatus] = createSignal('idle'); // idle | loading | done | error

  let resetTimer;
  onCleanup(() => clearTimeout(resetTimer));

  // The merchant colour arrives as an inline `background-color`, which would beat
  // the .is-done / .is-error rules and freeze the button on its brand colour.
  // Hand it over as a custom property so the state classes can still repaint.
  const brandBg = () => style?.()?.['background-color'];

  const isBusy = () => status() !== 'idle';
  const isDisabled = () => Boolean(disabled?.());

  const idleLabel = () => (isDisabled() ? (disabledLabel ?? label()) : label());
  const spokenLabel = () => {
    if (status() === 'loading') return LABEL_ADDING;
    if (status() === 'done') return LABEL_ADDED;
    if (status() === 'error') return LABEL_ADD_FAILED;
    return idleLabel();
  };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBusy() || isDisabled()) return; // swallows double-clicks

    setStatus('loading');

    // onAdd is absent in the theme editor — createProductClickHandler returns
    // undefined under isPreview. Play the animation rather than sitting inert.
    if (!onAdd) {
      resetTimer = setTimeout(() => {
        setStatus('done');
        resetTimer = setTimeout(() => setStatus('idle'), RESET_MS);
      }, PREVIEW_MS);
      return;
    }

    let ok;
    try {
      // The navigate branch resolves undefined and unloads the page anyway.
      ok = (await onAdd()) !== false;
    } catch {
      ok = false;
    }
    setStatus(ok ? 'done' : 'error');
    resetTimer = setTimeout(() => setStatus('idle'), RESET_MS);
  };

  return (
    <button
      type="button"
      className={`vc-atc vc-atc--${variant}${className ? ` ${className}` : ''}`}
      classList={{
        'is-loading': status() === 'loading',
        'is-done': status() === 'done',
        'is-error': status() === 'error',
      }}
      style={brandBg() ? { '--vc-atc-bg': brandBg() } : undefined}
      disabled={isDisabled()}
      aria-label={spokenLabel()}
      aria-busy={status() === 'loading'}
      onClick={handleClick}
    >
      {/* The icon components own their <svg> and take no className, so each
          rides in a wrapper span that carries the slide state. */}
      <span className="vc-atc-icon" aria-hidden="true">
        <span className="vc-atc-spinner"><LoadingIcon /></span>
        <span className="vc-atc-glyph vc-atc-glyph--idle"><ATCAddIcon /></span>
        <span className="vc-atc-glyph vc-atc-glyph--done"><ATCSuccessIcon /></span>
        <span className="vc-atc-glyph vc-atc-glyph--error"><ATCFailedIcon /></span>
      </span>

      {/* Presentational: all four labels live in the DOM at once, so the
          accessible name comes from aria-label instead. */}
      <ul className="vc-atc-labels" aria-hidden="true">
        <li>{idleLabel()}</li>
        <li>{LABEL_ADDING}</li>
        <li>{LABEL_ADDED}</li>
        <li>{LABEL_ADD_FAILED}</li>
      </ul>
    </button>
  );
}
