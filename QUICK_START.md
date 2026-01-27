# Quick Start Guide - Clean Architecture & Flat Routes

**For:** Developers new to this codebase  
**Time:** 15 minutes to understand, then start coding

---

## 🎯 What You Need to Know

This project follows **clean layered architecture** with **hybrid flat routes**.

### The 3 Core Rules

1. **Routes → Services → Models** (Never skip layers)
2. **Use flat routes** with `+` for namespaces
3. **Follow the templates** in ARCHITECTURE.md

---

## 📚 Essential Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **ARCHITECTURE.md** | Complete specs & templates | Before coding anything |
| **.cursorrules** | Quick reference & AI rules | When using Cursor |
| **MIGRATION_GUIDE.md** | Restructure instructions | When refactoring |
| **RESTRUCTURE_SUMMARY.md** | Current status | To see what's done |

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────┐
│  Routes (HTTP Handlers)             │  ← app/routes/ (Flat Routes)
│  - Parse request                    │
│  - Call services                    │
│  - Return JSON                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Services (Business Logic)          │  ← app/services/
│  - Validate input                   │
│  - Business rules                   │
│  - Orchestrate models               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Models (Data Access)               │  ← app/models/
│  - CRUD operations                  │
│  - Prisma queries only              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Database (MongoDB + Prisma)        │
└─────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
app/
├── config/              # Singletons (Prisma, Shopify, Mux)
├── models/              # Database operations ONLY
├── services/            # Business logic ONLY
├── routes/              # HTTP handlers (Flat Routes)
│   ├── app+/           # Admin pages (/app/*)
│   ├── api+/           # API endpoints (/api/*)
│   ├── auth+/          # Auth routes (/auth/*)
│   └── webhooks+/      # Webhooks (/webhooks/*)
├── components/
│   ├── ui/             # Generic reusable
│   └── features/       # Domain-specific
└── lib/
    ├── utils/          # Helper functions
    ├── constants/      # Constants
    ├── errors/         # Error classes
    └── hooks/          # React hooks
```

---

## 🚀 Common Tasks

### 1. Add a New API Endpoint

**Example:** Create endpoint to delete video

**Step 1:** Create route handler
```typescript
// app/routes/api+/v1+/videos+/delete.$id.tsx
import { authenticate } from '~/config/shopify.server';
import { deleteVideo } from '~/services/video/delete.service';

export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  
  if (request.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    await deleteVideo(params.id);
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Delete video error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
      }),
      {
        status: error.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
```

**Step 2:** Create service
```javascript
// app/services/video/delete.service.js
import * as VideoModel from '~/models/video.server';
import mux from '~/config/mux.server';

export async function deleteVideo(videoId) {
  // Get video
  const video = await VideoModel.findById(videoId);
  if (!video) {
    throw new Error('Video not found');
  }

  // Delete from Mux
  if (video.videoAssetId) {
    await mux.video.assets.delete(video.videoAssetId);
  }

  // Delete from database
  return VideoModel.deleteById(videoId);
}
```

**Step 3:** Model already has `deleteById()` - you're done!

---

### 2. Add a New Admin Page

**Example:** Create video analytics page

**Create route:**
```typescript
// app/routes/app+/analytics.tsx
import { useLoaderData } from 'react-router';
import { Page } from '@shopify/polaris';
import { authenticate } from '~/config/shopify.server';
import { getVideoAnalytics } from '~/services/video/analytics.service';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const analytics = await getVideoAnalytics();
  return new Response(
    JSON.stringify({ analytics }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};

export default function AnalyticsPage() {
  const { analytics } = useLoaderData();
  
  return (
    <Page title="Video Analytics">
      {/* Your UI here */}
    </Page>
  );
}
```

**URL:** Automatically becomes `/app/analytics`

---

### 3. Add Database Operation

**Example:** Find videos by status

**Add to model:**
```javascript
// app/models/video.server.js

export async function findByStatus(status) {
  return prisma.video.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
  });
}
```

**Use in service:**
```javascript
// app/services/video/analytics.service.js
import * as VideoModel from '~/models/video.server';

export async function getReadyVideos() {
  return VideoModel.findByStatus('READY');
}
```

---

## 🎨 Flat Routes Examples

### Basic Routes

```
routes/_index.tsx                → /
routes/about.tsx                 → /about
routes/contact.tsx               → /contact
```

### Namespaced Routes (with `+`)

```
routes/app+/
├── _layout.tsx                  → Layout for /app/*
├── _index.tsx                   → /app
├── videos.tsx                   → /app/videos
└── settings.tsx                 → /app/settings
```

### Nested Namespaces

```
routes/api+/v1+/videos+/
├── list.tsx                     → /api/v1/videos/list
├── upload.tsx                   → /api/v1/videos/upload
└── delete.$id.tsx               → /api/v1/videos/delete/:id
```

### Dynamic & Catch-all

```
routes/app+/videos.$id.tsx       → /app/videos/:id
routes/auth+/$.tsx               → /auth/* (catch-all)
```

---

## 🚫 Common Mistakes

### ❌ Wrong: Business Logic in Route

```typescript
// DON'T DO THIS
export const action = async ({ request }) => {
  const body = await request.json();
  
  // ❌ Validation in route
  if (body.size > 500 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Too large' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  // ❌ Direct Prisma in route
  const video = await prisma.video.create({ data: body });
  return new Response(
    JSON.stringify(video),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
```

### ✅ Correct: Thin Route

```typescript
// DO THIS
export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const video = await uploadVideo(body); // Service handles it
    return new Response(
      JSON.stringify({ success: true, data: video }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Upload failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
      }),
      {
        status: error.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
```

---

## 🧪 Testing Your Changes

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Test Route
```bash
# Test endpoint
curl -X POST http://localhost:3000/api/v1/videos/upload

# Test page
# Open browser: http://localhost:3000/app/videos
```

### 3. Check Build
```bash
npm run build
```

---

## 💡 Pro Tips

1. **Use Cursor AI** - It follows `.cursorrules` automatically
2. **Copy templates** - From ARCHITECTURE.md
3. **Test frequently** - After each file creation
4. **Ask where it belongs** - "Is this Models, Services, or Routes?"
5. **Use constants** - Never hardcode values

---

## 🔍 When You're Stuck

### Question: "Where does this code belong?"

```
Is it database CRUD?
  ├─ YES → Models (app/models/)
  └─ NO
      Is it business logic?
        ├─ YES → Services (app/services/)
        └─ NO
            Is it HTTP handling?
              ├─ YES → Routes (app/routes/)
              └─ NO
                  Is it a helper function?
                    ├─ YES → Utils (app/lib/utils/)
                    └─ NO → Ask in ARCHITECTURE.md
```

### Question: "How do I name this route file?"

See **Flat Routes Examples** above or check `MIGRATION_GUIDE.md`.

### Question: "What template should I use?"

Check `.cursorrules` or `ARCHITECTURE.md` - both have templates.

---

## 📋 Before You Commit

- [ ] Code follows layer separation
- [ ] No business logic in routes
- [ ] No Prisma outside models
- [ ] Functions have JSDoc comments
- [ ] Errors are handled
- [ ] Constants used (no magic values)
- [ ] File is under size limit
- [ ] `npm run build` succeeds

---

## 🎓 Learning Path

**Day 1: Read Documentation** (2 hours)
1. Read this file (10 min)
2. Read ARCHITECTURE.md (30 min)
3. Read `.cursorrules` (15 min)
4. Browse existing code (45 min)

**Day 2: Make Small Change** (2 hours)
1. Add one model function
2. Add one service function
3. Test it works

**Day 3: Build Feature** (4 hours)
1. Pick a feature to add
2. Create model → service → route
3. Test thoroughly

**Week 2: You're productive!** 🎉

---

## 🚀 Start Coding Now!

You're ready! Pick a task and:

1. Check which layer it belongs to
2. Find the template in ARCHITECTURE.md or .cursorrules
3. Copy and modify
4. Test it works
5. Commit

**Remember:** When in doubt, check the docs or ask!

---

**Last Updated:** January 22, 2026
