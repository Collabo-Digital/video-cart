// utils/encoding.js

/**
 * Encode tracking data to base64
 * @param {Object} data - Object containing video_id, widget_id, etc.
 * @returns {String} Base64 encoded string
 */
export function encodeTrackingData(data) {
    try {
        const jsonString = JSON.stringify(data);
        const encoded = btoa(jsonString);
        return encoded;
    } catch (error) {
        console.error('Encoding failed:', error);
        return null;
    }
}

/**
 * Decode base64 tracking data
 * @param {String} encodedData - Base64 encoded string
 * @returns {Object} Decoded tracking data object
 */
export function decodeTrackingData(encodedData) {
    try {
        const decoded = atob(encodedData);
        const data = JSON.parse(decoded);
        return data;
    } catch (error) {
        console.error('Decoding failed:', error);
        return null;
    }
}

/**
 * Encode individual value
 * @param {String} value - Value to encode
 * @returns {String} Base64 encoded value
 */
export function encodeValue(value) {
    try {
        return btoa(value);
    } catch (error) {
        console.error('Value encoding failed:', error);
        return value;
    }
}

/**
 * Decode individual value
 * @param {String} encodedValue - Base64 encoded value
 * @returns {String} Decoded value
 */
export function decodeValue(encodedValue) {
    try {
        return atob(encodedValue);
    } catch (error) {
        console.error('Value decoding failed:', error);
        return encodedValue;
    }
}