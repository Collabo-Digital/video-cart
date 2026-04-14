import { createSignal } from 'solid-js';
import { TOAST_DURATION_MS_EXPORT } from '../components/common/Toast/Toast';

export function useToast() {
    const [toastVisible, setToastVisible] = createSignal(false);
    const [toastMessage, setToastMessage] = createSignal('');
    const [toastType, setToastType] = createSignal('success');

    function showToast(message, type = 'success') {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), TOAST_DURATION_MS_EXPORT);
    }

    return { showToast, toastVisible, toastMessage, toastType, setToastVisible };
}