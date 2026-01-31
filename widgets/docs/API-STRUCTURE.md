# API Structure (SolidJS + Fetch)

This folder follows a **client → endpoints → services** pattern. All API calls go through the single `api` singleton.

## Layout

```
src/api/
├── client.js          # Base fetch: apiClient.get/post/put/patch/delete, buildRequest, handleResponse
├── endpoints.js       # ENDPOINTS constants (no hardcoded URLs elsewhere)
├── services/          # One service per resource
│   └── feedsService.js
└── index.js           # Single api singleton: api.feeds, api.analytics, …
```

## Usage

### From runtime (or any non-component code)

```js
import { api } from './api';

const feed = await api.feeds.fetchFeed(feedId, shop);
const url = api.feeds.buildFeedUrl(feedId, shop);
```

### From a component (optional — use when component needs to call API)

```js
import { useApi } from '../hooks/useApi';
import { api } from '../api';

const { data, loading, error, execute } = useApi(api.feeds.fetchFeed, false);
// Later: execute(feedId, shop)
// Or immediate: useApi(api.feeds.fetchFeed, true) — runs once on mount (no args)
```

## Adding a new resource

1. **endpoints.js** — Add e.g. `PRODUCTS: '/apps/video-widget/products'`, `PRODUCT_BY_ID: (id) => \`/products/${id}\``.
2. **api/services/productService.js** — Use `apiClient.get(ENDPOINTS.PRODUCTS)` etc.; validate response; export `productService`.
3. **api/index.js** — Add `products: productService` to `api`.
4. Use `api.products.getList()` from runtime or `useApi(api.products.getList)` in components.

## Config

- **core/config.js** — `API_BASE_URL` (empty = same-origin), `FEED_API_PATH`, etc. Optional: `VITE_API_URL` in env for dev.

## Rules

- No `fetch` or apiClient in components; use `api` or `useApi(api.*)`.
- No hardcoded URLs; use ENDPOINTS and config.
- One service per resource; one file per service under `api/services/`.
