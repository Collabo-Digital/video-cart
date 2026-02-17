/**
 * Base64 encode/decode for cart line-item tracking (video_id, widget_id, etc.).
 */

/**
 * @param {Object} data - Object containing video_id, widget_id, etc.
 * @returns {string|null} Base64 encoded string, or null on failure
 */
export function encodeTrackingData(data) {
  try {
    return btoa(JSON.stringify(data));
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('encodeTrackingData failed:', err);
    }
    return null;
  }
}

/**
 * @param {string} encodedData - Base64 encoded string
 * @returns {Object|null} Decoded tracking data, or null on failure
 */
export function decodeTrackingData(encodedData) {
  try {
    return JSON.parse(atob(encodedData));
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('decodeTrackingData failed:', err);
    }
    return null;
  }
}

/**
 * @param {string} value - Value to encode
 * @returns {string} Base64 encoded value, or original on failure
 */
export function encodeValue(value) {
  try {
    return btoa(value);
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('encodeValue failed:', err);
    }
    return value;
  }
}

/**
 * @param {string} encodedValue - Base64 encoded value
 * @returns {string} Decoded value, or original on failure
 */
export function decodeValue(encodedValue) {
  try {
    return atob(encodedValue);
  } catch (err) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('decodeValue failed:', err);
    }
    return encodedValue;
  }
}