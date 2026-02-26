/* eslint-disable react/prop-types */
import { Show } from 'solid-js';
import './toast.css';

const TOAST_DURATION_MS = 3500;

export function Toast(props) {
  const message = () => props.message ?? '';
  const visible = () => props.visible ?? true;
  const type = () => props.type ?? 'success'; // 'success' | 'error'

  const AlertIcon = () => {
    return (
      <svg width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#be4146"><g strokeWidth="0" /><g strokeLinecap="round" strokeLinejoin="round" /><path d="m7.493.015-.386.04c-1.873.187-3.76 1.153-5.036 2.579C.66 4.211-.057 6.168.009 8.253c.115 3.601 2.59 6.65 6.101 7.518a8.03 8.03 0 0 0 6.117-.98 8 8 0 0 0 3.544-4.904c.172-.701.212-1.058.212-1.887s-.04-1.186-.212-1.887C14.979 2.878 12.315.498 9 .064 8.716.027 7.683-.006 7.493.015m1.36 1.548a6.5 6.5 0 0 1 3.091 1.271c.329.246.976.893 1.222 1.222.561.751.976 1.634 1.164 2.479a6.8 6.8 0 0 1 0 2.93c-.414 1.861-1.725 3.513-3.463 4.363a6.8 6.8 0 0 1-1.987.616c-.424.065-1.336.065-1.76 0-1.948-.296-3.592-1.359-4.627-2.993a7.5 7.5 0 0 1-.634-1.332A6.2 6.2 0 0 1 1.514 8c0-1.039.201-1.925.646-2.84.34-.698.686-1.18 1.253-1.747A6 6 0 0 1 5.16 2.16a6.45 6.45 0 0 1 3.693-.597M7.706 4.29c-.224.073-.351.201-.413.415-.036.122-.04.401-.034 2.111.008 1.97.008 1.971.066 2.08a.7.7 0 0 0 .346.308c.132.046.526.046.658 0a.7.7 0 0 0 .346-.308c.058-.109.058-.11.066-2.08.008-2.152.008-2.154-.145-2.335-.124-.148-.257-.197-.556-.205a1.7 1.7 0 0 0-.334.014m.08 6.24a.86.86 0 0 0-.467.402.85.85 0 0 0-.025.563A.78.78 0 0 0 8 12c.303 0 .612-.22.706-.505a.85.85 0 0 0-.025-.563.95.95 0 0 0-.348-.352c-.116-.06-.429-.089-.547-.05" fillRule="evenodd" fill="#be4146" stroke="none" /></svg>
    );
  };

  const SuccessIcon = () => {
    return (
      <svg fill="#429e42" width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0" /><g strokeLinecap="round" strokeLinejoin="round" /><path fillRule="evenodd" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m3.293 4.293L10 13.586l-1.293-1.293a1 1 0 1 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l6-6a1 1 0 1 0-1.414-1.414" /></svg>
    );
  };

  const CloseIcon = () => {
    return (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0" /><g strokeLinecap="round" strokeLinejoin="round" /><path d="m16 16-4-4m0 0L8 8m4 4 4-4m-4 4-4 4" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    );
  };

  return (
    <Show when={visible()}>
      <div
        className="video-cart-toast"
        classList={{
          'video-cart-toast--visible': visible(),
          'video-cart-toast--success': type() === 'success',
          'video-cart-toast--error': type() === 'error',
        }}
        role="status"
        aria-live="polite"
      >
        <span className="video-cart-toast-icon" aria-hidden="true">
          {type() === 'success' ? <SuccessIcon /> : <AlertIcon />}
        </span>
        <span className="video-cart-toast-message">{message()}</span>
        <button
          type="button"
          className="video-cart-toast-close"
          aria-label="Dismiss"
          onClick={() => props.onClose?.()}
        >
          <CloseIcon />
        </button>
      </div>
    </Show>
  );
}

/**
 * Show a toast for a short time. Call with setToastVisible and setToastMessage from parent.
 * @param { (msg: string, type?: 'success' | 'error') => void } showToast - e.g. (msg, type) => { setToastMessage(msg); setToastType(type); setToastVisible(true); setTimeout(() => setToastVisible(false), TOAST_DURATION_MS); }
 */
export const TOAST_DURATION_MS_EXPORT = TOAST_DURATION_MS;