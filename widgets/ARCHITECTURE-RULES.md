# Widgets Codebase — Architecture & Clean Code Rules

This document defines rules and conventions for the **widgets** storefront codebase (SolidJS). Follow these rules as you add new components and features to keep the codebase clean, understandable, and scalable.

---

## 1. Entry & Bootstrap

- **`main.jsx`** must only: set `window.__video_cart_config__`, attach `initFeeds`, run init on DOM ready (or immediately), and dispatch `video-cart-ready`. No feed logic or component registration here.
- Do **not** add more global variables beyond `__video_cart_config__` and `initFeeds`. Keep the public surface minimal.

---

## 2. Runtime (Mount Layer)

- **`runtime.jsx`** is the **only** place that: queries containers (e.g. `.video-cart-container`), fetches or reads cached feed data, calls `registerWidget`, and uses Solid’s `render()` to mount widgets.
- Use a **single** container selector constant (e.g. `CONTAINER_SELECTOR`) and a single feed API base (e.g. `FEED_API_PATH`); do not scatter selectors or URLs.
- Always guard against **double-mount**: check `data-video-cart-initialized` (or equivalent) and skip already-initialized containers.
- On feed or mount failure, show **one** user-facing fallback (e.g. “Error loading video feed”) and log details; do not leave blank or throw uncaught to the storefront.

---

## 3. Registry (Core)

- **`core/registry.js`** is the single source of truth for mapping widget type (e.g. `feed.widgetType`) to the Solid component to render. All storefront widgets must be registered here before render.
- Registry must remain **UI-agnostic**: no DOM, no fetch, no Solid components inside `registry.js`—only register/get/has/getAll.

---

## 4. Widget Contract (Components)

- Every storefront widget component must accept at least: **`feed`**, **`videos`**, **`settings`**. Optionally support **`widgetId`** and **`onEvent`** for analytics or future features.
- Do **not** change the shape of these props without updating runtime and any other callers. Keep the contract stable so runtime can always call `component({ feed, videos, settings })`.

---

## 5. SolidJS Usage

- Use Solid primitives correctly: **signals** for local UI state (e.g. `currentIndex`, `videoRefs`), **derived values** (e.g. `currentVideo`) as functions that read signals, **createEffect** only for side effects (e.g. autoplay), not for deriving UI data.
- Prefer **`Show`**, **`For`**, **`Switch`/`Match`** for conditional and list rendering; avoid manual DOM creation or jQuery inside components.
- Keep components as **functions** that return JSX; do not put feed-fetch or registry logic inside components.

---

## 6. File & Folder Structure

| Layer      | Location              | Purpose |
|-----------|------------------------|---------|
| Entry     | `src/main.jsx`        | Bootstrap only. |
| Runtime   | `src/runtime.jsx`     | Container discovery, feed load/cache, register + render. Calls `api/` for fetch; does not inline fetch logic. |
| API       | `src/api/`            | **client.js** (base fetch, apiClient get/post/put/patch/delete), **endpoints.js** (ENDPOINTS), **services/** (e.g. feedsService). Single `api` singleton in **index.js**; use `api.feeds.fetchFeed()`. |
| Hooks     | `src/hooks/`          | Custom Solid hooks (e.g. **useApi.js** for data/loading/error/execute with any service method). |
| Core      | `src/core/`           | Registry; config/constants (selectors, API paths). |
| Components| `src/components/`     | One folder per widget (e.g. `VideoCarousel/VideoCarousel.jsx`) or one file per widget; no business or feed logic in component files beyond what’s passed via props. |
| Shared    | `src/shared/` or `src/utils/` | Constants and pure helpers (e.g. Mux URL builders) used by both runtime and components; do not duplicate URLs or magic strings. |

As the codebase grows:

- Add **one folder per widget** under `components/` (e.g. `VideoCarousel/`, `VideoGrid/`) with its JSX and optional CSS.
- Move **shared constants and helpers** into `core/config.js` or `shared/` so runtime and components stay consistent.
- **`api/`** structure: **client.js** (apiClient, buildRequest, handleResponse), **endpoints.js** (ENDPOINTS constants), **services/** (one service per resource, e.g. feedsService). **index.js** exports single `api` with `api.feeds`, etc. Add new resources: new file in services/, new ENDPOINTS, attach in index.js. Cache stays in runtime.

---

## 7. Naming & Consistency

- **Widget type** in the API (e.g. `feed.widgetType === 'carousel'`) must match the key used in `registerWidget(type, …)`. Component names (e.g. `VideoCarousel`) are internal; only the type string is the contract.
- Use clear, consistent names: `initFeeds` for the init function, `CONTAINER_SELECTOR` / `FEED_API_PATH` for constants, `onEvent` for the event callback prop.

---

## 8. Data & Side Effects

- Feed data must be loaded **only** in runtime (or a dedicated `api/feeds` module called from runtime). Components receive data via **props**; they must not fetch feeds or read from `window.__video_cart_config__` directly (except in rare, documented cases).
- Cache feed responses per container (e.g. in `window.__video_cart_config__.widgets`) to avoid duplicate requests; keep cache shape simple and documented.

---

## 9. Styles & Assets

- Prefer **one** approach project-wide: either CSS/SCSS modules (or a single `index.css`) or a small theme/config object for shared colors and spacing. Avoid mixing random inline styles and external stylesheets without a clear convention.
- Keep asset paths and CDN URLs (e.g. Mux) in **one place** (e.g. `shared/constants.js` or `shared/mux.js`); do not hardcode the same URL in multiple components.

---

## 10. Production & Debugging

- Do **not** ship `console.log` (or other debug logs) in production. Either remove them, gate behind a dev flag, or strip them in the build (e.g. terser `drop_console`).
- Keep the bundle entry as a **single IIFE** from `main.jsx`; do not add multiple storefront entry points without updating the Liquid script tag and docs.

---

## 11. Adding New Widgets

When adding a new widget type:

1. Implement a Solid component that respects the **widget contract** (at least `feed`, `videos`, `settings`).
2. Register it in the registry: `registerWidget({ type: '<type>', component })`.
3. Ensure the feed API returns that `widgetType` where needed.
4. Do **not** add special-case branches in runtime for each widget; resolve component via **registry only**.

Example:

```js
// In runtime or a central wiring file:
registerWidget({ type: 'carousel', component: VideoCarousel });
registerWidget({ type: 'grid', component: VideoGrid });
// Runtime: getWidget(feed.widgetType).component({ feed, videos, settings })
```

---

## 12. Dependencies

- Do **not** introduce new global or storefront scripts (e.g. extra frameworks or polyfills) without aligning with the current build (Vite, IIFE, single bundle). Keep dependencies minimal and consistent with Solid + Vite.

---

## 13. API Calls (Strict)

All network requests must follow these rules. This keeps API usage predictable, safe, and easy to change.

### 13.1 Where API calls live

- Use the **single `api` singleton** (import `api` from `./api`). Call `api.feeds.fetchFeed()`, etc. All fetch logic: **api/client.js** (apiClient), **api/endpoints.js** (URLs), **api/services/*.js** (per resource). Runtime and hooks use `api` only; components receive data via **props** (or use **useApi(api.feeds.fetchFeed)** if a component needs to call API).
- **Never** call `fetch` or apiClient directly from components; use service methods via `api` or via **useApi(api.feeds.fetchFeed)**.
- **Adding a new API resource:** (1) Add constants to **endpoints.js**. (2) Create **api/services/yourService.js** using apiClient + ENDPOINTS. (3) In **api/index.js**, add `yourService` to the `api` object. (4) Use `api.yourService.method()` from runtime or useApi.

### 13.2 Base URLs and paths

- Define **all** API base URLs and path prefixes in **`core/config.js`** (e.g. `FEED_API_PATH`, `FEED_LIST_PATH`).
- Do **not** hardcode full URLs or path strings in runtime or components. Build URLs from config:

```js
// ✅ GOOD — config holds the path
import { FEED_API_PATH } from './core/config';
const url = `${FEED_API_PATH}/${feedId}${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`;

// ❌ BAD — hardcoded path
const url = `/apps/video-widget/feeds/${feedId}`;
```

### 13.3 Request building

- Use a **single** place to build request options (URL, method, headers). Prefer a small helper in `api/` (e.g. `buildFeedRequest(feedId, shop)`) if you have multiple endpoints or repeated logic.
- Always **encode** query parameters (e.g. `encodeURIComponent(shop)`). Use the same method for all query params.

### 13.4 Response contract

- Expect a **consistent** response shape from app APIs (e.g. `{ success: boolean, data?: T, error?: string }`).
- **Validate** before use: check `response.ok`, then parse JSON, then check `result.success` and `result.data` (or equivalent). Do not assume the response shape.
- If the API contract changes, update **one** place (the api module or runtime fetch block) and document it.

### 13.5 Error handling (mandatory)

- **Always** handle errors for every API call:
  - Non-ok `response` (e.g. 4xx, 5xx): treat as failure and show a user-facing message.
  - Invalid JSON or missing expected fields: treat as failure, do not throw uncaught to the storefront.
- Use **try/catch** around `fetch` and `response.json()`. In the catch block: show **one** fallback message to the user (e.g. “Error loading video feed”) and optionally log for debugging in dev.
- Do **not** leave `fetch` or `.json()` without a catch. Do **not** swallow errors silently (no empty `catch {}` without at least setting UI state or message).

### 13.6 Caching

- Cache API responses in a **single** place (e.g. `window.__video_cart_config__.widgets`). Document the cache key (e.g. `containerId` or `feedId`) and shape.
- Check cache **before** calling the API for the same key to avoid duplicate requests.
- Do not cache in components or in multiple global structures; keep one source of truth.

### 13.7 No duplicate or scattered fetch logic

- Do **not** duplicate the same `fetch` + error handling + cache logic in multiple files. Extract to one function (e.g. `fetchFeed(feedId, shop)`) in runtime or `api/feeds.js` and reuse it.
- When adding a **new** endpoint: add its path to config, then add one function that builds the URL, calls fetch, validates the response, and returns data (or throws). Call that function from runtime only.

### 13.8 Optional but recommended

- **Timeouts:** Use `AbortController` + `setTimeout` (or a single timeout constant in config) for fetch so slow networks don’t hang the UI.
- **Documentation:** When you add or change an API, document the expected request (method, path, query/body) and response shape in a short comment or in this doc.

### Summary — API checklist

| Point | Rule |
|-------|------|
| Location | API calls only in runtime or `api/`; never in components. |
| URLs | All base URLs/paths in `core/config.js`; build URLs from config. |
| Requests | One place to build URL + options; encode query params. |
| Response | Validate `response.ok`, parse JSON, check `success`/`data` (or equivalent). |
| Errors | try/catch every fetch; one user message; no uncaught throws. |
| Cache | Single cache (e.g. `__video_cart_config__.widgets`); check before fetch. |
| Reuse | One function per endpoint; no duplicated fetch logic. |

---

## Quick Reference Checklist

| Area        | Rule in short |
|------------|----------------|
| Entry      | `main.jsx` = config + initFeeds + DOM ready only. |
| Runtime    | Only place that mounts widgets; use constants; guard double-mount; handle errors. |
| Registry   | Single map type → component; no UI, no fetch. |
| Contract   | All widgets: `feed`, `videos`, `settings` (+ optional `widgetId`, `onEvent`). |
| Solid      | Signals for state, derived for values, effects for side effects only. |
| Structure  | main / runtime / api / core / components / shared; no feed logic in components; fetch in api only. |
| Naming     | `widgetType` matches registry key; clear names for init and constants. |
| Data       | Feed load in runtime (or api); cache in config; components get props only. |
| Styles     | One convention; shared URLs/constants in one place. |
| Production | No console.log in build; single IIFE entry. |
| New widgets| New component + registerWidget; no runtime special-casing. |
| Deps       | Minimal; match Vite + Solid setup. |
| **API calls** | Single `api` singleton (`api.feeds.*`, etc.); only in runtime or `api/`; URLs from config; validate response; try/catch; single cache. |

---

*Last updated for the widgets storefront codebase (SolidJS). Adjust this doc when you introduce new layers or conventions.*
