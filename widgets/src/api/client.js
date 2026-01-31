/**
 * Base fetch configuration. All API requests go through apiClient (ARCHITECTURE-RULES §13).
 */

import { API_BASE_URL } from '../core/config';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

function buildRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };
  return fetch(url, config);
}

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.error || `HTTP Error: ${response.status}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const apiClient = {
  get: (endpoint, options = {}) =>
    buildRequest(endpoint, { ...options, method: 'GET' }).then(handleResponse),

  post: (endpoint, data, options = {}) =>
    buildRequest(endpoint, {
      ...options,
      method: 'POST',
      body: data != null ? JSON.stringify(data) : undefined,
    }).then(handleResponse),

  put: (endpoint, data, options = {}) =>
    buildRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: data != null ? JSON.stringify(data) : undefined,
    }).then(handleResponse),

  patch: (endpoint, data, options = {}) =>
    buildRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: data != null ? JSON.stringify(data) : undefined,
    }).then(handleResponse),

  delete: (endpoint, options = {}) =>
    buildRequest(endpoint, { ...options, method: 'DELETE' }).then(handleResponse),
};
