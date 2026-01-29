# Codebase Restructure Summary

**Date:** January 22, 2026  
**Status:** ✅ Structure Created - Ready for Migration

---

## 📋 What Was Created

### ✅ New Folder Structure

```
app/
├── config/                    ✅ Created
│   ├── database.server.js    ✅ Created (from db.server.js)
│   ├── mux.server.js         ✅ Created (from utils/muxClient.server.js)
│   └── shopify.server.js     🔄 TO MOVE (update imports)
│
├── models/                    ✅ Created (empty - ready for migration)
├── services/                  ✅ Created (empty - ready for migration)
│   ├── video/                ✅ Created
│   ├── shop/                 ✅ Created
│   └── mux/                  ✅ Created
│
└── lib/                       ✅ Created (empty - ready for migration)
    ├── utils/                ✅ Created
    ├── constants/            ✅ Created
    ├── errors/               ✅ Created
    └── hooks/                ✅ Created
```

### ✅ Documentation Files

1. **`ARCHITECTURE.md`** - Complete architecture guide with:
   - Layer specifications (Models, Services, Routes, Components)
   - Code templates for each layer
   - Naming conventions
   - Examples and best practices

2. **`.cursorrules`** - Cursor AI rules file:
   - Automatic enforcement of architecture
   - Code templates
   - Decision trees
   - Pre-commit checklist

3. **`MIGRATION_GUIDE.md`** - Step-by-step migration plan:
   - Route mapping (old → new)
   - Flat routes convention examples
   - Phase-by-phase migration steps
   - Critical routes checklist

4. **`RESTRUCTURE_SUMMARY.md`** (this file) - Current status

---

## 🗺️ Route Restructure Plan (Hybrid Flat Routes)

### Your Current Routes Configuration

✅ Already configured in `app/routes.js`:
```javascript
flatRoutes("routes", defineRoutes, {
  ignoredRouteFiles: ['**/.*'],
  nestedDirectoryChar: '+',  // ← Hybrid mode enabled
});
```

### Proposed New Routes Structure

```
routes/
├── _index.tsx                         → /
│
├── app+/                              → /app/*
│   ├── _layout.tsx                   → Layout for /app/*
│   ├── _index.tsx                    → /app
│   ├── videos.tsx                    → /app/videos
│   └── videos.$id.tsx                → /app/videos/:id (NEW)
│
├── api+/                              → /api/*
│   └── v1+/                          → /api/v1/*
│       └── videos+/                  → /api/v1/videos/*
│           ├── list.tsx              → GET /api/v1/videos
│           ├── upload.tsx            → POST /api/v1/videos/upload
│           ├── upload.$id.tsx        → GET /api/v1/videos/upload/:id
│           ├── delete.$id.tsx        → DELETE /api/v1/videos/:id
│           └── update.$id.tsx        → PATCH /api/v1/videos/:id
│
├── auth+/                             → /auth/*
│   ├── $.tsx                         → /auth/* (catch-all)
│   └── login.tsx                     → /auth/login
│
└── webhooks+/                         → /webhooks/*
    ├── mux.tsx                       → /webhooks/mux
    ├── app.uninstalled.tsx           → /webhooks/app/uninstalled
    └── app.scopes-update.tsx         → /webhooks/app/scopes_update
```

---

## 🔧 Next Steps (Manual Migration Required)

### Step 1: Update shopify.server.js imports (URGENT)

**File:** `app/shopify.server.js`

**Change line 8:**
```javascript
// OLD
import prisma from "./db.server";

// NEW
import prisma from "./config/database.server";
```

**Change line 9:**
```javascript
// OLD
import { doTaskAfterAuth } from "./utils/doAfterAuth";

// NEW  
import { doTaskAfterAuth } from "./services/shop/onboarding.service";
```

### Step 2: Create Models (Copy templates from MIGRATION_GUIDE.md)

Create these files with CRUD operations:
- [ ] `app/models/video.server.js`
- [ ] `app/models/shop.server.js`
- [ ] `app/models/session.server.js`

Templates are in `MIGRATION_GUIDE.md` Phase 2.

### Step 3: Create Services (Extract business logic)

Create these files:
- [ ] `app/services/video/upload.service.js`
- [ ] `app/services/mux/webhook.service.js`
- [ ] `app/services/shop/onboarding.service.js` (move doAfterAuth here)

Templates are in `MIGRATION_GUIDE.md` Phase 3.

### Step 4: Restructure Routes (Flat Routes)

**Create new route files:**

1. Landing page:
   - [ ] Create `routes/_index.tsx`
   - [ ] Move content from `routes/_index/route.jsx`
   - [ ] Delete `routes/_index/` folder

2. App routes:
   - [ ] Create `routes/app+/_layout.tsx` (from `routes/app.jsx`)
   - [ ] Create `routes/app+/_index.tsx` (from `routes/app._index.jsx`)
   - [ ] Create `routes/app+/videos.tsx` (from `routes/app.videos.jsx`)

3. API routes:
   - [ ] Create `routes/api+/v1+/videos+/upload.tsx`
   - [ ] Create `routes/api+/v1+/videos+/upload.$id.tsx`
   - [ ] Create `routes/api+/v1+/videos+/list.tsx` (NEW)

4. Auth routes:
   - [ ] Create `routes/auth+/$.tsx` (from `routes/auth.$.jsx`)
   - [ ] Create `routes/auth+/login.tsx` (from `routes/auth.login/route.jsx`)

5. Webhook routes:
   - [ ] Create `routes/webhooks+/mux.tsx` (from `routes/mux.webhook.jsx`)
   - [ ] Create `routes/webhooks+/app.uninstalled.tsx`
   - [ ] Create `routes/webhooks+/app.scopes-update.tsx`

### Step 5: Create Constants

- [ ] `app/lib/constants/video.js` (VIDEO_CONFIG)
- [ ] `app/lib/constants/routes.js` (if needed)

### Step 6: Create Utilities

- [ ] `app/lib/utils/validation.js` (validateVideoFile)
- [ ] `app/lib/utils/dates.js` (date formatting)

### Step 7: Create Error Classes

- [ ] `app/lib/errors/AppError.js` (base class)
- [ ] `app/lib/errors/VideoUploadError.js`
- [ ] `app/lib/errors/ShopifyApiError.js`

### Step 8: Reorganize Components

Move components to new structure:
- [ ] `components/ui/DatePicker/` (generic)
- [ ] `components/ui/Chart/` (generic)
- [ ] `components/features/video/VideoUploader/`
- [ ] `components/features/video/VideoDisplay/`

### Step 9: Update All Imports

Search and replace across codebase:
```javascript
// Database
"~/db.server" → "~/config/database.server"

// Mux
"~/utils/muxClient.server" → "~/config/mux.server"

// Shopify
"~/shopify.server" → "~/config/shopify.server"
```

### Step 10: Delete Old Files

**⚠️ ONLY after verifying everything works:**
- [ ] Delete `app/db.server.js`
- [ ] Delete `app/utils/muxClient.server.js`
- [ ] Delete old route files in `routes/` (after creating new ones)

---

## 🚨 Critical Routes - Must Maintain URLs

These URLs are configured in `shopify.app.toml` and MUST NOT change:

| Route Purpose | URL | File |
|---------------|-----|------|
| OAuth Redirect | `/auth/*` | `routes/auth+/$.tsx` |
| App Uninstalled | `/webhooks/app/uninstalled` | `routes/webhooks+/app.uninstalled.tsx` |
| Scopes Update | `/webhooks/app/scopes_update` | `routes/webhooks+/app.scopes-update.tsx` |
| Mux Webhook | `/webhooks/mux` | `routes/webhooks+/mux.tsx` |

**Verification:**
```toml
# shopify.app.toml
[auth]
redirect_urls = [ "https://example.com/api/auth" ]  # ← Must work

[[webhooks.subscriptions]]
topics = [ "app/uninstalled" ]
uri = "/webhooks/app/uninstalled"  # ← Must match route

[[webhooks.subscriptions]]
topics = [ "app/scopes_update" ]
uri = "/webhooks/app/scopes_update"  # ← Must match route
```

---

## 📚 Reference Documents

1. **`ARCHITECTURE.md`** - Read this FIRST
   - Complete architecture specifications
   - Code templates for all layers
   - Examples and patterns

2. **`.cursorrules`** - Cursor AI will automatically follow this
   - Quick reference for AI
   - Decision trees
   - Common patterns

3. **`MIGRATION_GUIDE.md`** - Step-by-step migration
   - Detailed instructions for each phase
   - Code examples for each file
   - Before/after comparisons

---

## ✅ Testing Checklist

After migration, test:

### Routes
- [ ] `/` - Landing page loads
- [ ] `/app` - Dashboard loads with auth
- [ ] `/app/videos` - Videos page loads
- [ ] `/auth/login` - Login page works
- [ ] `/api/v1/videos/upload` - POST returns upload URL
- [ ] `/webhooks/mux` - POST accepts webhook
- [ ] `/webhooks/app/uninstalled` - POST accepts webhook
- [ ] `/webhooks/app/scopes_update` - POST accepts webhook

### Functionality
- [ ] OAuth flow completes
- [ ] Video upload works
- [ ] Mux webhooks process correctly
- [ ] Database operations work
- [ ] Analytics display

### Build
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] No TypeScript/linting errors
- [ ] All tests pass

---

## 🎯 Migration Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1:** Config & Setup | 1 hour | Update imports, create folders |
| **Phase 2:** Models | 2 hours | Create 3 model files with CRUD |
| **Phase 3:** Services | 3 hours | Extract business logic to services |
| **Phase 4:** Routes | 4 hours | Restructure to flat routes |
| **Phase 5:** Components | 2 hours | Reorganize component folders |
| **Phase 6:** Constants & Utils | 2 hours | Extract constants and utilities |
| **Phase 7:** Testing | 2 hours | Test all routes and functionality |
| **Phase 8:** Cleanup | 1 hour | Delete old files, update docs |
| **Total** | **17 hours** | ~2-3 days of focused work |

---

## 💡 Pro Tips

1. **Work in branches** - Create a `refactor/clean-architecture` branch
2. **Migrate incrementally** - One phase at a time
3. **Test frequently** - After each phase, run `npm run dev`
4. **Keep old files** - Don't delete until new ones work
5. **Use AI assistance** - Cursor will follow `.cursorrules` automatically
6. **Update documentation** - Keep ARCHITECTURE.md current

---

## 🤖 Using Cursor AI with New Structure

Cursor will automatically follow `.cursorrules` when:

1. **Creating new files** - "Create a video deletion service"
   - ✅ Creates `app/services/video/delete.service.js`
   - ✅ Uses correct template
   - ✅ Follows naming conventions

2. **Adding features** - "Add video tagging endpoint"
   - ✅ Creates model in `app/models/video.server.js`
   - ✅ Creates service in `app/services/video/tagging.service.js`
   - ✅ Creates route in `routes/api+/v1+/videos+/tag.$id.tsx`

3. **Refactoring** - "Refactor this to follow clean architecture"
   - ✅ Separates into correct layers
   - ✅ Extracts constants
   - ✅ Adds proper error handling

---

## 📞 Questions?

Refer to:
1. **ARCHITECTURE.md** - How should I structure my code?
2. **MIGRATION_GUIDE.md** - How do I migrate existing code?
3. **.cursorrules** - What are the quick rules?

---

**Status:** Ready for migration. Start with Phase 1 (Update Imports).

**Last Updated:** January 22, 2026
