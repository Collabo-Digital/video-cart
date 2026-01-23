# Migration Guide - Flat Routes & Clean Architecture

**Date:** January 22, 2026  
**Version:** 1.0

---

## 📋 Overview

This guide documents the migration from the current route structure to a **hybrid flat routes** convention with **clean architecture**.

### What's Changing

1. **Flat Routes Convention**: Using `remix-flat-routes` with hybrid mode
2. **Clean Architecture**: Separating routes, services, and models
3. **New Folder Structure**: Organized by domain and layer

---

## 🗺️ Route Mapping

### Current Structure → New Structure

| Current Path | Current File | New File | Route URL |
|-------------|--------------|----------|-----------|
| Landing page | `routes/_index/route.jsx` | `routes/_index.tsx` | `/` |
| App layout | `routes/app.jsx` | `routes/app+/_layout.tsx` | `/app` |
| Dashboard | `routes/app._index.jsx` | `routes/app+/_index.tsx` | `/app` |
| Videos page | `routes/app.videos.jsx` | `routes/app+/videos.tsx` | `/app/videos` |
| Auth callback | `routes/auth.$.jsx` | `routes/auth+/$.tsx` | `/auth/*` |
| Auth login | `routes/auth.login/route.jsx` | `routes/auth+/login.tsx` | `/auth/login` |
| Create upload | `routes/api+/v1+/video+/upload.jsx` | `routes/api+/v1+/videos+/upload.tsx` | `POST /api/v1/videos/upload` |
| Upload status | `routes/api+/v1+/video+/upload.$uploadId.jsx` | `routes/api+/v1+/videos+/upload.$id.tsx` | `GET /api/v1/videos/upload/:id` |
| Mux webhook | `routes/mux.webhook.jsx` | `routes/webhooks+/mux.tsx` | `/webhooks/mux` |
| App uninstalled | `routes/webhooks.app.uninstalled.jsx` | `routes/webhooks+/app.uninstalled.tsx` | `/webhooks/app/uninstalled` |
| Scopes update | `routes/webhooks.app.scopes_update.jsx` | `routes/webhooks+/app.scopes-update.tsx` | `/webhooks/app/scopes_update` |

---

## 📁 New Folder Structure

```
app/
├── config/                                # Configuration layer
│   ├── database.server.js                # Prisma client (moved from db.server.js)
│   ├── shopify.server.js                 # Shopify config (existing)
│   └── mux.server.js                     # Mux config (moved from utils/)
│
├── models/                                # Data Access Layer (NEW)
│   ├── video.server.js                   # Video CRUD operations
│   ├── shop.server.js                    # Shop CRUD operations
│   └── session.server.js                 # Session CRUD operations
│
├── services/                              # Business Logic Layer (NEW)
│   ├── video/
│   │   ├── upload.service.js             # Video upload workflow
│   │   └── webhook.service.js            # Video webhook processing
│   ├── shop/
│   │   └── onboarding.service.js         # Shop onboarding (doAfterAuth)
│   └── mux/
│       └── webhook.service.js            # Mux webhook handling
│
├── routes/                                # Routes (Flat Routes Hybrid)
│   ├── _index.tsx                        # Landing page (/)
│   │
│   ├── app+/                             # App namespace (/app/*)
│   │   ├── _layout.tsx                   # App layout + auth
│   │   ├── _index.tsx                    # Dashboard (/app)
│   │   ├── videos.tsx                    # Videos library (/app/videos)
│   │   └── videos.$id.tsx                # Video detail (/app/videos/:id)
│   │
│   ├── api+/                             # API namespace (/api/*)
│   │   └── v1+/
│   │       ├── videos+/
│   │       │   ├── list.tsx              # GET /api/v1/videos
│   │       │   ├── upload.tsx            # POST /api/v1/videos/upload
│   │       │   ├── upload.$id.tsx        # GET /api/v1/videos/upload/:id
│   │       │   ├── delete.$id.tsx        # DELETE /api/v1/videos/:id
│   │       │   └── update.$id.tsx        # PATCH /api/v1/videos/:id
│   │       └── analytics+/
│   │           └── summary.tsx           # GET /api/v1/analytics/summary
│   │
│   ├── auth+/                            # Auth namespace (/auth/*)
│   │   ├── $.tsx                         # Auth callback (/auth/*)
│   │   └── login.tsx                     # Login page (/auth/login)
│   │
│   └── webhooks+/                        # Webhooks namespace (/webhooks/*)
│       ├── mux.tsx                       # Mux webhook (/webhooks/mux)
│       ├── app.uninstalled.tsx           # Shopify uninstall (/webhooks/app/uninstalled)
│       └── app.scopes-update.tsx         # Shopify scopes (/webhooks/app/scopes_update)
│
├── components/                            # React Components
│   ├── ui/                               # Generic components
│   │   ├── DatePicker/
│   │   └── Chart/
│   └── features/                         # Domain components
│       ├── video/
│       │   ├── VideoUploader/
│       │   ├── VideoCard/
│       │   └── VideoPlayer/
│       └── analytics/
│           └── Dashboard/
│
└── lib/                                   # Utilities
    ├── utils/
    ├── constants/
    ├── errors/
    └── hooks/
```

---

## 🎯 Flat Routes Conventions

### Hybrid Mode (Configured)

Your `routes.js` is already configured with hybrid mode:

```javascript
flatRoutes("routes", defineRoutes, {
  ignoredRouteFiles: ['**/.*'],
  nestedDirectoryChar: '+',  // ← Hybrid mode
});
```

### Route File Naming

| Convention | File | URL |
|------------|------|-----|
| **Index** | `_index.tsx` | Root of parent |
| **Layout** | `_layout.tsx` | Wraps children |
| **Namespace** | `folder+/` | Groups routes |
| **Dynamic** | `$param.tsx` | Dynamic segment |
| **Splat** | `$.tsx` | Catch-all |
| **Pathless** | `__folder/` | Groups without URL |

### Examples

```
routes/
├── _index.tsx                    → /
├── about.tsx                     → /about
│
├── app+/                         → /app/*
│   ├── _layout.tsx              → Layout for /app/*
│   ├── _index.tsx               → /app
│   └── videos.tsx               → /app/videos
│
├── api+/                         → /api/*
│   └── v1+/                     → /api/v1/*
│       └── videos+/             → /api/v1/videos/*
│           ├── list.tsx         → GET /api/v1/videos/list
│           └── upload.tsx       → POST /api/v1/videos/upload
│
└── webhooks+/                    → /webhooks/*
    ├── mux.tsx                  → /webhooks/mux
    └── app.uninstalled.tsx      → /webhooks/app/uninstalled
```

---

## 🚀 Migration Steps

### Phase 1: Setup New Structure (Day 1)

**1.1 Create New Folders**

```bash
mkdir -p app/config
mkdir -p app/models
mkdir -p app/services/video
mkdir -p app/services/shop
mkdir -p app/services/mux
mkdir -p app/lib/utils
mkdir -p app/lib/constants
mkdir -p app/lib/errors
mkdir -p app/lib/hooks
mkdir -p app/components/ui
mkdir -p app/components/features/video
mkdir -p app/components/features/analytics
```

**1.2 Move Configuration Files**

```bash
# Move db.server.js to config/
mv app/db.server.js app/config/database.server.js

# Move mux client
mv app/utils/muxClient.server.js app/config/mux.server.js
```

**1.3 Update Import Paths**

Update all imports from:
- `~/db.server` → `~/config/database.server`
- `~/utils/muxClient.server` → `~/config/mux.server`

---

### Phase 2: Create Models Layer (Day 2)

**2.1 Create Video Model**

Create `app/models/video.server.js`:

```javascript
/**
 * Video Model - Data Access Layer
 */
import prisma from '~/config/database.server';

export async function findAll(filters = {}) {
  const { status, limit = 50, offset = 0 } = filters;
  
  return prisma.video.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function findById(id) {
  return prisma.video.findUnique({ where: { id } });
}

export async function findByUploadId(uploadId) {
  return prisma.video.findUnique({ 
    where: { videoUploadId: uploadId } 
  });
}

export async function create(data) {
  return prisma.video.create({ data });
}

export async function updateById(id, data) {
  return prisma.video.update({
    where: { id },
    data,
  });
}

export async function upsertByUploadId(data) {
  const { uploadId, ...videoData } = data;
  
  return prisma.video.upsert({
    where: { videoUploadId: uploadId },
    update: videoData,
    create: {
      videoUploadId: uploadId,
      ...videoData,
    },
  });
}

export async function deleteById(id) {
  return prisma.video.delete({ where: { id } });
}

export async function count(filters = {}) {
  const { status } = filters;
  
  return prisma.video.count({
    where: status ? { status } : undefined,
  });
}
```

**2.2 Create Shop Model**

Create `app/models/shop.server.js`:

```javascript
/**
 * Shop Model - Data Access Layer
 */
import prisma from '~/config/database.server';

export async function findByDomain(shopDomain) {
  return prisma.shop.findUnique({
    where: { shopDomain },
  });
}

export async function upsertByDomain(shopDomain, data) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: data,
    create: {
      shopDomain,
      ...data,
    },
  });
}

export async function updateByDomain(shopDomain, data) {
  return prisma.shop.update({
    where: { shopDomain },
    data,
  });
}
```

**2.3 Create Session Model**

Create `app/models/session.server.js`:

```javascript
/**
 * Session Model - Data Access Layer
 */
import prisma from '~/config/database.server';

export async function deleteByShop(shop) {
  return prisma.session.deleteMany({
    where: { shop },
  });
}

export async function updateScope(sessionId, scope) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { scope },
  });
}
```

---

### Phase 3: Create Services Layer (Day 3)

**3.1 Create Video Upload Service**

Create `app/services/video/upload.service.js`:

```javascript
/**
 * Video Upload Service
 */
import mux from '~/config/mux.server';
import * as VideoModel from '~/models/video.server';

export async function createUploadUrl(options = {}) {
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: options.quality || 'basic',
    },
    cors_origin: options.corsOrigin || '*',
    test: process.env.NODE_ENV !== 'production',
  });

  return {
    uploadId: upload.id,
    url: upload.url,
  };
}

export async function getUploadStatus(uploadId) {
  const upload = await mux.video.uploads.retrieve(uploadId);

  return {
    id: upload.id,
    status: upload.status,
    assetId: upload.asset_id,
    error: upload.error,
  };
}
```

**3.2 Create Mux Webhook Service**

Create `app/services/mux/webhook.service.js`:

```javascript
/**
 * Mux Webhook Service
 */
import mux from '~/config/mux.server';
import * as VideoModel from '~/models/video.server';

export async function handleMuxWebhook(request) {
  const body = await request.text();
  
  const event = mux.webhooks.unwrap(
    body,
    request.headers,
    process.env.MUX_WEBHOOK_SIGNING_SECRET
  );

  switch (event.type) {
    case 'video.asset.ready':
      return handleVideoReady(event.data);
    case 'video.asset.errored':
      return handleVideoError(event.data);
    default:
      console.log('Unhandled Mux event:', event.type);
  }
}

async function handleVideoReady(data) {
  const {
    upload_id,
    id: assetId,
    playback_ids,
    duration,
    aspect_ratio,
  } = data;

  const playbackId = playback_ids?.[0]?.id;

  return VideoModel.upsertByUploadId({
    uploadId: upload_id,
    title: 'Untitled Video',
    serviceProvider: 'mux',
    videoAssetId: assetId,
    videoPlaybackId: playbackId,
    duration,
    aspectRatio: aspect_ratio,
    status: 'READY',
  });
}

async function handleVideoError(data) {
  const { upload_id } = data;

  return VideoModel.upsertByUploadId({
    uploadId: upload_id,
    title: 'Untitled Video',
    serviceProvider: 'mux',
    status: 'ERRORED',
  });
}
```

**3.3 Create Shop Onboarding Service**

Create `app/services/shop/onboarding.service.js` and move `doAfterAuth` logic here.

---

### Phase 4: Restructure Routes (Day 4-5)

**4.1 Create New Route Files**

**Landing Page** (`routes/_index.tsx`):
```typescript
import { redirect, Form, useLoaderData } from "react-router";
import { login } from "~/config/shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function Index() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      {/* Existing landing page content */}
    </div>
  );
}
```

**App Layout** (`routes/app+/_layout.tsx`):
```typescript
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { authenticate } from "~/config/shopify.server";
import enTranslations from '@shopify/polaris/locales/en.json';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function AppLayout() {
  const { apiKey } = useLoaderData();
  
  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations}>
        <s-app-nav>
          <s-link href="/app">Home</s-link>
          <s-link href="/app/videos">Videos</s-link>
        </s-app-nav>
        <Outlet />
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

**Dashboard** (`routes/app+/_index.tsx`):
```typescript
// Move content from app._index.jsx here
```

**Videos Page** (`routes/app+/videos.tsx`):
```typescript
import { json } from 'react-router';
import { Page, Frame } from "@shopify/polaris";
import { useLoaderData } from "react-router";
import { authenticate } from "~/config/shopify.server";
import * as VideoModel from "~/models/video.server";
import VideoUploader from "~/components/features/video/VideoUploader/VideoUploader";
import VideoDisplay from "~/components/features/video/VideoDisplay/VideoDisplay";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const videos = await VideoModel.findAll();
  return json({ videos });
};

export default function VideosPage() {
  const { videos } = useLoaderData();
 
  return (
    <Frame>
      <Page title="Videos Library">
        <VideoUploader />
        <VideoDisplay videos={videos} />
      </Page>
    </Frame>
  );
}
```

**API Routes** (`routes/api+/v1+/videos+/upload.tsx`):
```typescript
import { json } from 'react-router';
import { authenticate } from '~/config/shopify.server';
import { createUploadUrl } from '~/services/video/upload.service';

export const action = async ({ request }) => {
  await authenticate.admin(request);

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const uploadData = await createUploadUrl();
    return json({ success: true, data: uploadData });
  } catch (error) {
    console.error('Upload creation error:', error);
    return json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
};
```

**Webhooks** (`routes/webhooks+/mux.tsx`):
```typescript
import { json } from 'react-router';
import { handleMuxWebhook } from '~/services/mux/webhook.service';

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    await handleMuxWebhook(request);
    return json({ received: true });
  } catch (error) {
    console.error('Mux webhook error:', error);
    return json({ error: error.message }, { status: 400 });
  }
};
```

**Auth Routes** (`routes/auth+/$.tsx`):
```typescript
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "~/config/shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

---

### Phase 5: Update Components (Day 6)

**5.1 Move Components**

```bash
# Move to features
mv app/components/VideoUploader app/components/features/video/VideoUploader
mv app/components/VideoContainer app/components/features/video/VideoDisplay

# Move to ui
mv app/components/DatePicker app/components/ui/DatePicker
mv app/components/Chart app/components/ui/Chart
```

**5.2 Update Component Imports**

Update all imports to use new paths:
```typescript
// Old
import VideoUploader from '../components/VideoUploader/VideoUploader';

// New
import VideoUploader from '~/components/features/video/VideoUploader/VideoUploader';
```

---

### Phase 6: Add Constants & Utilities (Day 7)

**6.1 Create Video Constants**

Create `app/lib/constants/video.js`:

```javascript
export const VIDEO_CONFIG = {
  MAX_SIZE_MB: 500,
  MAX_SIZE_BYTES: 500 * 1024 * 1024,
  ALLOWED_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
  ],
  CHUNK_SIZE_KB: 30720,
  STATUS: {
    UPLOADING: 'UPLOADING',
    PROCESSING: 'PROCESSING',
    READY: 'READY',
    ERRORED: 'ERRORED',
  },
};
```

**6.2 Create Validation Utils**

Create `app/lib/utils/validation.js`:

```javascript
import { VIDEO_CONFIG } from '~/lib/constants/video';

export function validateVideoFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!VIDEO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  if (file.size > VIDEO_CONFIG.MAX_SIZE_BYTES) {
    throw new Error(`File too large: max ${VIDEO_CONFIG.MAX_SIZE_MB}MB`);
  }

  return true;
}
```

---

## 🔍 Verification Checklist

After migration, verify:

- [ ] All routes are accessible
- [ ] Auth flow works (`/auth/*`)
- [ ] Webhooks receive events (`/webhooks/*`)
- [ ] API endpoints respond (`/api/v1/*`)
- [ ] Dashboard loads (`/app`)
- [ ] Video upload works
- [ ] No broken imports
- [ ] Tests pass
- [ ] Build succeeds

---

## 🚨 Critical Routes (DO NOT BREAK)

These routes must maintain exact URLs for Shopify integration:

| Route | URL | Why Critical |
|-------|-----|--------------|
| Auth callback | `/auth/*` | OAuth redirect (shopify.app.toml) |
| App uninstalled | `/webhooks/app/uninstalled` | Webhook (shopify.app.toml) |
| Scopes update | `/webhooks/app/scopes_update` | Webhook (shopify.app.toml) |
| Mux webhook | `/webhooks/mux` | Mux configuration |

**shopify.app.toml verification:**
```toml
[auth]
redirect_urls = [ "https://example.com/api/auth" ]  # Must match

[[webhooks.subscriptions]]
topics = [ "app/uninstalled" ]
uri = "/webhooks/app/uninstalled"  # Must match

[[webhooks.subscriptions]]
topics = [ "app/scopes_update" ]
uri = "/webhooks/app/scopes_update"  # Must match (use scopes-update or scopes_update)
```

---

## 📊 Before & After Comparison

### Before (Nested Routes)
```
routes/
├── app.jsx                          (layout)
├── app._index.jsx                   (dashboard)
├── app.videos.jsx                   (videos page)
├── api+/v1+/video+/upload.jsx       (upload endpoint)
└── webhooks.app.uninstalled.jsx     (webhook)
```

### After (Flat Routes Hybrid)
```
routes/
├── app+/
│   ├── _layout.tsx                  (layout)
│   ├── _index.tsx                   (dashboard)
│   └── videos.tsx                   (videos page)
├── api+/v1+/videos+/
│   └── upload.tsx                   (upload endpoint)
└── webhooks+/
    └── app.uninstalled.tsx          (webhook)
```

---

## 🛠️ Testing After Migration

### 1. Test Routes

```bash
# Start dev server
npm run dev

# Test each route
curl http://localhost:3000/
curl http://localhost:3000/app
curl http://localhost:3000/api/v1/videos
```

### 2. Test Webhooks

```bash
# Use Shopify CLI to trigger webhooks
shopify app webhook trigger --topic app/uninstalled
```

### 3. Test Build

```bash
npm run build
```

---

## 📝 Notes

- **TypeScript**: Consider migrating to `.tsx` for better type safety
- **File Extensions**: Use `.tsx` for React components, `.ts` for utilities
- **Imports**: Use `~` alias for absolute imports
- **Testing**: Add tests for models and services

---

## 🔗 References

- [Remix Flat Routes Documentation](https://v2.remix.run/resources/remix-flat-routes)
- [React Router Documentation](https://reactrouter.com)
- [Shopify App CLI Configuration](https://shopify.dev/docs/apps/tools/cli/configuration)

---

**Last Updated:** January 22, 2026
