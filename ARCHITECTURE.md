# Video Cart - Architecture Guide

**Version:** 1.0  
**Last Updated:** January 22, 2026  
**Status:** Active

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architectural Principles](#architectural-principles)
3. [Folder Structure](#folder-structure)
4. [Layer Specifications](#layer-specifications)
5. [Naming Conventions](#naming-conventions)
6. [Code Standards](#code-standards)
7. [Examples](#examples)
8. [Testing Guidelines](#testing-guidelines)
9. [Quick Reference](#quick-reference)

---

## 🎯 Overview

This document defines the **clean architecture** for the Video Cart Shopify app. All code must follow these rules to ensure maintainability, testability, and scalability.

### Core Principle: Separation of Concerns

```
Routes (Controllers)    → Handle HTTP requests/responses only
         ↓
Services                → Business logic and workflows
         ↓
Models                  → Database operations only
         ↓
Database (Prisma)       → Data persistence
```

**Each layer has ONE responsibility and CANNOT skip layers.**

---

## 🏗️ Architectural Principles

### 1. **Layered Architecture**

| Layer | Purpose | Can Import From | CANNOT Import From |
|-------|---------|-----------------|-------------------|
| **Routes** | HTTP handling | Services, Models (rare) | Nothing below services |
| **Services** | Business logic | Models, Config, Utils | Routes |
| **Models** | Data access | Config only | Services, Routes |
| **Config** | Setup/initialization | External libraries | Models, Services, Routes |

### 2. **SOLID Principles**

- **Single Responsibility**: One file = one purpose
- **Open/Closed**: Extend via new files, not modifying existing
- **Dependency Inversion**: Depend on abstractions (interfaces)

### 3. **DRY (Don't Repeat Yourself)**

- Extract repeated logic into utilities
- Create reusable components
- Use constants instead of magic values

### 4. **Explicit Over Implicit**

- Clear function names that describe what they do
- Always validate inputs
- Handle errors explicitly

---

## 📁 Folder Structure

```
app/
├── config/                         # ⚙️ Configuration (Singletons)
│   ├── shopify.server.js          # Shopify app initialization
│   ├── database.server.js         # Prisma client singleton
│   └── mux.server.js              # Mux client configuration
│
├── models/                         # 🗄️ Data Access Layer
│   ├── video.server.js            # Video CRUD operations
│   ├── shop.server.js             # Shop CRUD operations
│   ├── session.server.js          # Session management
│   └── README.md                  # Model documentation
│
├── services/                       # 🔧 Business Logic Layer
│   ├── video/
│   │   ├── upload.service.js      # Video upload workflow
│   │   ├── processing.service.js  # Video processing logic
│   │   └── analytics.service.js   # Analytics calculations
│   ├── shop/
│   │   ├── onboarding.service.js  # Shop installation flow
│   │   └── settings.service.js    # Shop settings logic
│   ├── mux/
│   │   └── webhook.service.js     # Mux webhook handling
│   └── README.md                  # Service documentation
│
├── routes/                         # 🌐 HTTP Controllers (Thin Layer)
│   ├── app/                       # Admin UI routes
│   │   ├── _layout.jsx            # App shell + navigation
│   │   ├── index.jsx              # Dashboard
│   │   ├── videos.jsx             # Video library
│   │   └── videos.$id.jsx         # Video detail
│   │
│   ├── api/                       # REST API routes
│   │   └── v1/
│   │       ├── videos/
│   │       │   ├── list.jsx            # GET /api/v1/videos
│   │       │   ├── create-upload.jsx   # POST /api/v1/videos/upload
│   │       │   ├── upload-status.$id.jsx # GET /api/v1/videos/upload/:id
│   │       │   ├── delete.$id.jsx      # DELETE /api/v1/videos/:id
│   │       │   └── update.$id.jsx      # PATCH /api/v1/videos/:id
│   │       └── analytics/
│   │           └── summary.jsx         # GET /api/v1/analytics/summary
│   │
│   ├── webhooks/
│   │   ├── mux.jsx                # POST /webhooks/mux
│   │   ├── app-uninstalled.jsx    # Shopify webhooks
│   │   └── app-scopes-update.jsx
│   │
│   └── auth/
│       ├── callback.jsx           # OAuth callback
│       └── login/
│           └── route.jsx          # Login page
│
├── components/                     # 🎨 React Components
│   ├── ui/                        # Generic reusable components
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   └── Button.test.jsx
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── DatePicker/
│   │   │   ├── DatePicker.jsx
│   │   │   └── DateRangePicker.jsx
│   │   └── Chart/
│   │       ├── LineChart.jsx
│   │       └── BarChart.jsx
│   │
│   ├── features/                  # Domain-specific components
│   │   ├── video/
│   │   │   ├── VideoUploader/
│   │   │   │   ├── VideoUploader.jsx
│   │   │   │   ├── UploadModal.jsx
│   │   │   │   ├── FileDropzone.jsx
│   │   │   │   ├── ProgressIndicator.jsx
│   │   │   │   └── useVideoUpload.js     # Custom hook
│   │   │   ├── VideoLibrary/
│   │   │   │   ├── VideoLibrary.jsx
│   │   │   │   ├── VideoGrid.jsx
│   │   │   │   └── VideoFilters.jsx
│   │   │   ├── VideoCard/
│   │   │   │   ├── VideoCard.jsx
│   │   │   │   ├── VideoThumbnail.jsx
│   │   │   │   └── VideoMetadata.jsx
│   │   │   └── VideoPlayer/
│   │   │       ├── VideoPlayer.jsx
│   │   │       └── PlayerModal.jsx
│   │   │
│   │   └── analytics/
│   │       ├── Dashboard/
│   │       ├── MetricsGrid/
│   │       └── AnalyticsChart/
│   │
│   └── layouts/
│       ├── AppLayout.jsx          # Main app layout
│       └── EmptyState.jsx         # Empty state component
│
├── lib/                            # 🛠️ Utilities & Helpers
│   ├── utils/
│   │   ├── dates.js               # Date formatting utilities
│   │   ├── formatting.js          # Text/number formatting
│   │   ├── validation.js          # Input validation
│   │   └── analytics.js           # Analytics helpers
│   │
│   ├── constants/
│   │   ├── video.js               # Video constants
│   │   ├── analytics.js           # Analytics constants
│   │   └── routes.js              # Route paths
│   │
│   ├── errors/
│   │   ├── AppError.js            # Base error class
│   │   ├── VideoUploadError.js    # Video-specific errors
│   │   └── ShopifyApiError.js     # Shopify API errors
│   │
│   └── hooks/                     # Shared React hooks
│       ├── useDebounce.js
│       ├── useAsync.js
│       └── usePagination.js
│
├── types/                          # 📝 TypeScript definitions (future)
│   ├── video.ts
│   ├── shop.ts
│   └── analytics.ts
│
└── tests/                          # 🧪 Test utilities
    ├── setup.js
    ├── mocks/
    │   ├── prisma.mock.js
    │   └── shopify.mock.js
    └── fixtures/
        ├── video.fixture.js
        └── shop.fixture.js
```

---

## 📦 Layer Specifications

### 🗄️ Models Layer (Data Access)

**Purpose:** Abstract ALL database operations. ONLY layer that uses Prisma.

**Rules:**
- ✅ CRUD operations only
- ✅ Return Prisma results directly
- ✅ Can import: `config/database.server.js`
- ❌ NO business logic
- ❌ NO external API calls
- ❌ NO imports from services/routes

**File Template:** `app/models/[entity].server.js`

```javascript
/**
 * [Entity] Model - Data Access Layer
 * 
 * Handles all database operations for [entity].
 */

import prisma from '~/config/database.server';

/**
 * Find all [entities] with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of [entity] objects
 */
export async function findAll(filters = {}) {
  const { status, limit = 50, offset = 0 } = filters;
  
  return prisma.[entity].findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Find [entity] by ID
 * @param {string} id - [Entity] ID
 * @returns {Promise<Object|null>}
 */
export async function findById(id) {
  return prisma.[entity].findUnique({ where: { id } });
}

/**
 * Create new [entity]
 * @param {Object} data - [Entity] data
 * @returns {Promise<Object>}
 */
export async function create(data) {
  return prisma.[entity].create({ data });
}

/**
 * Update [entity] by ID
 * @param {string} id - [Entity] ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>}
 */
export async function updateById(id, data) {
  return prisma.[entity].update({ where: { id }, data });
}

/**
 * Delete [entity] by ID
 * @param {string} id - [Entity] ID
 * @returns {Promise<Object>}
 */
export async function deleteById(id) {
  return prisma.[entity].delete({ where: { id } });
}

/**
 * Count [entities] with optional filtering
 * @param {Object} filters - Optional filters
 * @returns {Promise<number>}
 */
export async function count(filters = {}) {
  return prisma.[entity].count({
    where: filters.status ? { status: filters.status } : undefined,
  });
}
```

**Model Function Naming:**
- `findAll()` - Get multiple records
- `findById()` - Get single by ID
- `findByX()` - Get by specific field
- `create()` - Create new record
- `updateById()` - Update existing
- `deleteById()` - Delete record
- `count()` - Count records
- `upsertByX()` - Create or update

---

### 🔧 Services Layer (Business Logic)

**Purpose:** Orchestrate operations, implement business rules, coordinate models.

**Rules:**
- ✅ Business logic goes here
- ✅ Coordinate multiple models
- ✅ External API calls (Mux, Shopify)
- ✅ Data transformation
- ✅ Can import: Models, Config, Utils, Constants
- ❌ NO direct Prisma usage
- ❌ NO HTTP handling (req/res)
- ❌ NO imports from routes

**File Template:** `app/services/[domain]/[action].service.js`

```javascript
/**
 * [Domain] [Action] Service
 * 
 * Handles [description of what this service does].
 */

import * as [Entity]Model from '~/models/[entity].server';
import { [ErrorClass] } from '~/lib/errors/[ErrorClass]';
import { [CONSTANT] } from '~/lib/constants/[constant]';

/**
 * [Action description]
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Result
 * @throws {[ErrorClass]} When [condition]
 */
export async function [actionName](params) {
  // 1. Validate inputs
  if (!params.required) {
    throw new [ErrorClass]('Message', 'ERROR_CODE');
  }
  
  // 2. Perform business logic
  const result = await someOperation();
  
  // 3. Call models for data operations
  const entity = await [Entity]Model.create(result);
  
  // 4. Return processed result
  return entity;
}

/**
 * Private helper function
 */
async function someOperation() {
  // Helper logic
}
```

**Service Function Naming:**
- `create[Entity]()` - Create workflow
- `update[Entity]()` - Update workflow
- `delete[Entity]()` - Delete workflow
- `process[Action]()` - Process/transform data
- `calculate[Metric]()` - Calculations
- `verify[Something]()` - Validation/verification
- `send[Notification]()` - External communications

---

### 🌐 Routes Layer (HTTP Controllers)

**Purpose:** Handle HTTP requests/responses ONLY. Thin layer that delegates to services.

**Rules:**
- ✅ Validate HTTP input (params, body, query)
- ✅ Call services/models
- ✅ Return JSON responses
- ✅ Handle authentication
- ✅ Keep under 50 lines
- ❌ NO business logic
- ❌ NO direct Prisma usage
- ❌ NO complex calculations

**File Template:** `app/routes/api/v1/[resource]/[action].jsx`

```javascript
/**
 * [METHOD] /api/v1/[resource]/[action]
 * 
 * [Description of what this endpoint does]
 */

import { authenticate } from '~/config/shopify.server';
import { [actionFunction] } from '~/services/[domain]/[action].service';

export const [loader|action] = async ({ request, params }) => {
  // 1. Authenticate
  await authenticate.admin(request);

  // 2. Validate method (for actions)
  if (request.method !== 'POST') {
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
    // 3. Parse input
    const body = await request.json().catch(() => ({}));
    const { param1, param2 } = body;
    
    // 4. Call service
    const result = await [actionFunction]({ param1, param2 });

    // 5. Return response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
  } catch (error) {
    console.error('[Action] error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code || 'OPERATION_FAILED',
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

**Route Structure:**
- `loader` - GET requests (read data)
- `action` - POST/PUT/PATCH/DELETE (write data)
- Always return `new Response()` with JSON (React Router v7)
- Always wrap in try/catch
- Always log errors

---

### 🎨 Components Layer

**Purpose:** Reusable UI components with clear separation between generic and domain-specific.

**Rules:**
- ✅ Split into `ui/` (generic) and `features/` (domain-specific)
- ✅ Extract logic into custom hooks
- ✅ One component per file
- ✅ Colocate tests with components
- ❌ NO business logic in components
- ❌ NO direct API calls (use hooks/services)

**Component Structure:**

```
ComponentName/
├── ComponentName.jsx       # Main component
├── ComponentName.test.jsx  # Tests
├── useComponentName.js     # Custom hook (if needed)
└── ComponentName.module.css # Styles (if needed)
```

**Component Template:**

```javascript
/**
 * [ComponentName]
 * 
 * [Description of what this component does]
 */

import { useState } from 'react';
import { Button, Card } from '@shopify/polaris';

export function ComponentName({ prop1, prop2, onAction }) {
  const [state, setState] = useState(null);
  
  const handleAction = () => {
    // Handle action
    onAction?.(state);
  };
  
  return (
    <Card>
      {/* Component JSX */}
      <Button onClick={handleAction}>Action</Button>
    </Card>
  );
}
```

**Custom Hook Template:**

```javascript
/**
 * use[HookName]
 * 
 * [Description of what this hook does]
 */

import { useState, useCallback } from 'react';

export function use[HookName](initialValue) {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const performAction = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await someAsyncOperation(params);
      setState(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    state,
    loading,
    error,
    performAction,
  };
}
```

---

### 🛠️ Utilities Layer

**Purpose:** Pure functions with no side effects. Helper functions used across the app.

**Rules:**
- ✅ Pure functions (same input = same output)
- ✅ NO side effects
- ✅ NO state
- ✅ NO external dependencies (except constants)
- ✅ Must be testable in isolation

**File:** `app/lib/utils/[category].js`

```javascript
/**
 * [Category] Utilities
 * 
 * [Description]
 */

/**
 * [Function description]
 * @param {Type} param - Description
 * @returns {Type} Description
 */
export function utilityFunction(param) {
  // Pure logic
  return result;
}
```

---

### 📋 Constants

**Purpose:** Centralize all magic values, configuration, and enums.

**Rules:**
- ✅ Use UPPER_SNAKE_CASE for constants
- ✅ Group related constants into objects
- ✅ Export named constants
- ❌ NO functions
- ❌ NO computed values (unless frozen)

**File:** `app/lib/constants/[domain].js`

```javascript
/**
 * [Domain] Constants
 */

export const [DOMAIN]_CONFIG = {
  MAX_SIZE: 500,
  MIN_SIZE: 1,
  
  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
  },
  
  TYPES: {
    TYPE_A: 'type_a',
    TYPE_B: 'type_b',
  },
};

export const [DOMAIN]_MESSAGES = {
  SUCCESS: 'Operation successful',
  ERROR: 'Operation failed',
};
```

---

### ⚠️ Error Handling

**Purpose:** Standardized error classes with codes and metadata.

**Rules:**
- ✅ Extend base AppError class
- ✅ Include error code
- ✅ Include HTTP status code
- ✅ Add metadata for debugging

**File:** `app/lib/errors/[Domain]Error.js`

```javascript
import { AppError } from './AppError';

/**
 * [Domain] specific errors
 */
export class [Domain]Error extends AppError {
  constructor(message, code, meta = {}) {
    super(message, code, 400, meta);
  }
}

export const [DOMAIN]_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
};
```

**Base Error:** `app/lib/errors/AppError.js`

```javascript
export class AppError extends Error {
  constructor(message, code, statusCode = 500, meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        meta: this.meta,
      }),
    };
  }
}
```

---

## 📝 Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Models | `[entity].server.js` | `video.server.js` |
| Services | `[action].service.js` | `upload.service.js` |
| Routes | `[resource].[action].jsx` | `videos.list.jsx` |
| Components | `PascalCase.jsx` | `VideoCard.jsx` |
| Hooks | `use[Name].js` | `useVideoUpload.js` |
| Utils | `[category].js` | `validation.js` |
| Constants | `[domain].js` | `video.js` |
| Errors | `[Domain]Error.js` | `VideoUploadError.js` |
| Tests | `[file].test.js` | `video.server.test.js` |

### Functions

| Type | Convention | Example |
|------|------------|---------|
| Find single | `findBy[Field]()` | `findById()`, `findByEmail()` |
| Find multiple | `findAll()` | `findAll({ status: 'active' })` |
| Create | `create()` | `create(data)` |
| Update | `updateBy[Field]()` | `updateById(id, data)` |
| Delete | `deleteBy[Field]()` | `deleteById(id)` |
| Count | `count()` | `count({ status: 'active' })` |
| Service actions | `[verb][Entity]()` | `uploadVideo()`, `processOrder()` |
| Utilities | `[verb][Noun]()` | `formatDate()`, `validateEmail()` |
| Hooks | `use[Name]()` | `useVideoUpload()` |
| Event handlers | `handle[Event]()` | `handleClick()`, `handleSubmit()` |

### Variables

```javascript
// ✅ Good
const videoId = '123';
const userEmail = 'user@example.com';
const isActive = true;
const VIDEO_MAX_SIZE = 500;

// ❌ Bad
const vid = '123';
const e = 'user@example.com';
const active = true;
const maxSize = 500; // Should be UPPER_SNAKE_CASE
```

---

## 📐 Code Standards

### 1. File Length

- Models: Max 300 lines
- Services: Max 200 lines per file
- Routes: Max 50 lines per handler
- Components: Max 150 lines
- Utilities: Max 100 lines

**If exceeding limits, split into multiple files.**

### 2. Function Complexity

- Max 30 lines per function
- Max 3 levels of nesting
- Max 5 parameters (use object for more)

```javascript
// ✅ Good - Object parameter
function createVideo({ title, duration, format, quality, tags }) {
  // ...
}

// ❌ Bad - Too many parameters
function createVideo(title, duration, format, quality, tags) {
  // ...
}
```

### 3. Comments

**Required:**
- JSDoc for all exported functions
- Complex logic explanation
- TODO/FIXME for technical debt

**Not Required:**
- Obvious code (self-documenting names)

```javascript
// ✅ Good
/**
 * Upload video to Mux and create database record
 * @param {File} file - Video file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Created video object
 */
export async function uploadVideo(file, options) {
  // Upload to Mux first (required for CDN delivery)
  const muxAsset = await uploadToMux(file);
  
  // Then save metadata to database
  return VideoModel.create({ ...muxAsset, ...options });
}

// ❌ Bad - Obvious comment
// This function adds two numbers
function add(a, b) {
  return a + b; // Return the sum
}
```

### 4. Imports

**Order:**
1. External libraries (React, Polaris)
2. Internal config
3. Internal models
4. Internal services
5. Internal utilities
6. Types
7. Styles

```javascript
// ✅ Good
import { useState } from 'react';
import { Button, Card } from '@shopify/polaris';
import { authenticate } from '~/config/shopify.server';
import * as VideoModel from '~/models/video.server';
import { uploadVideo } from '~/services/video/upload.service';
import { formatDate } from '~/lib/utils/dates';
import { VIDEO_CONFIG } from '~/lib/constants/video';
import styles from './styles.module.css';
```

### 5. Error Handling

**Always:**
- Use try/catch in routes
- Throw custom errors in services
- Log errors before returning
- Include error codes

```javascript
// ✅ Good
export const action = async ({ request }) => {
  try {
    const result = await uploadVideo(data);
    return new Response(
      JSON.stringify({ success: true, data: result }),
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
        success: false,
        error: error.message,
        code: error.code || 'UPLOAD_FAILED',
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

// ❌ Bad - No error handling
export const action = async ({ request }) => {
  const result = await uploadVideo(data);
  return new Response(
    JSON.stringify(result),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
```

### 6. Validation

**Always validate:**
- User input
- API parameters
- External data

```javascript
// ✅ Good
export async function createVideo(data) {
  if (!data.title) {
    throw new VideoError('Title is required', 'TITLE_REQUIRED');
  }
  
  if (data.duration < 0) {
    throw new VideoError('Duration must be positive', 'INVALID_DURATION');
  }
  
  return VideoModel.create(data);
}

// ❌ Bad - No validation
export async function createVideo(data) {
  return VideoModel.create(data);
}
```

---

## 💡 Examples

### Example 1: Creating a New Feature (Video Tagging)

**Step 1: Add to Model** (`app/models/video.server.js`)

```javascript
/**
 * Add tags to video
 * @param {string} videoId - Video ID
 * @param {Array<string>} tags - Array of tag names
 * @returns {Promise<Object>}
 */
export async function addTags(videoId, tags) {
  return prisma.video.update({
    where: { id: videoId },
    data: {
      tags: {
        push: tags,
      },
    },
  });
}
```

**Step 2: Add to Service** (`app/services/video/tagging.service.js`)

```javascript
import * as VideoModel from '~/models/video.server';
import { VideoError } from '~/lib/errors/VideoError';

export async function tagVideo(videoId, tags) {
  // Validate
  if (!videoId) {
    throw new VideoError('Video ID required', 'VIDEO_ID_REQUIRED');
  }
  
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new VideoError('Tags must be non-empty array', 'INVALID_TAGS');
  }
  
  // Check video exists
  const video = await VideoModel.findById(videoId);
  if (!video) {
    throw new VideoError('Video not found', 'VIDEO_NOT_FOUND', { videoId });
  }
  
  // Add tags
  return VideoModel.addTags(videoId, tags);
}
```

**Step 3: Add Route** (`app/routes/api/v1/videos/tag.$id.jsx`)

```javascript
import { authenticate } from '~/config/shopify.server';
import { tagVideo } from '~/services/video/tagging.service';

export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  
  if (request.method !== 'POST') {
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
    const { tags } = await request.json();
    const video = await tagVideo(params.id, tags);
    
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
    console.error('Tag video error:', error);
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

---

### Example 2: Refactoring Existing Code

**Before (Mixed Concerns):**

```javascript
// ❌ Bad - Everything in route
export const action = async ({ request }) => {
  const body = await request.text();
  let event = mux.webhooks.unwrap(body, request.headers, process.env.SECRET);
  
  if (event.type === 'video.asset.ready') {
    await prisma.video.upsert({
      where: { videoUploadId: event.data.upload_id },
      update: { status: 'READY', videoAssetId: event.data.id },
      create: { /* ... */ },
    });
  }
  
  return new Response(JSON.stringify({ received: true }));
};
```

**After (Clean Architecture):**

```javascript
// ✅ Good - Route (thin)
// app/routes/webhooks/mux.jsx
import { handleMuxWebhook } from '~/services/mux/webhook.service';

export const action = async ({ request }) => {
  try {
    await handleMuxWebhook(request);
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// ✅ Good - Service (business logic)
// app/services/mux/webhook.service.js
import mux from '~/config/mux.server';
import * as VideoModel from '~/models/video.server';

export async function handleMuxWebhook(request) {
  const body = await request.text();
  const event = mux.webhooks.unwrap(body, request.headers, process.env.SECRET);
  
  switch (event.type) {
    case 'video.asset.ready':
      return processVideoReady(event.data);
    default:
      console.log('Unhandled event:', event.type);
  }
}

async function processVideoReady(data) {
  return VideoModel.upsertByUploadId({
    uploadId: data.upload_id,
    videoAssetId: data.id,
    status: 'READY',
  });
}

// ✅ Good - Model (data access)
// app/models/video.server.js
export async function upsertByUploadId(data) {
  return prisma.video.upsert({
    where: { videoUploadId: data.uploadId },
    update: { videoAssetId: data.videoAssetId, status: data.status },
    create: { /* ... */ },
  });
}
```

---

## 🧪 Testing Guidelines

### Test File Location

Place tests next to the file being tested:

```
app/
├── models/
│   ├── video.server.js
│   └── video.server.test.js
├── services/
│   └── video/
│       ├── upload.service.js
│       └── upload.service.test.js
└── components/
    └── VideoCard/
        ├── VideoCard.jsx
        └── VideoCard.test.jsx
```

### Test Structure

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('[ModuleName]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('[functionName]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = await functionName(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
    
    it('should throw error when [condition]', async () => {
      // Arrange & Act & Assert
      await expect(functionName(invalid)).rejects.toThrow('Error message');
    });
  });
});
```

### Mock Dependencies

```javascript
// Mock external modules
vi.mock('~/config/database.server', () => ({
  default: {
    video: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock models in services
vi.mock('~/models/video.server', () => ({
  findById: vi.fn(),
  create: vi.fn(),
}));
```

---

## 🚀 Quick Reference

### When Creating New Code

**Ask yourself:**

1. **Is this a database operation?** → Create/update Model
2. **Is this business logic?** → Create/update Service
3. **Is this an HTTP endpoint?** → Create Route (call Service)
4. **Is this reusable UI?** → Create Component in `ui/`
5. **Is this domain-specific UI?** → Create Component in `features/`
6. **Is this a constant value?** → Add to Constants
7. **Is this a utility function?** → Add to Utils
8. **Is this a custom error?** → Extend AppError

### Before Committing

**Checklist:**

- [ ] Code follows layer separation (Route → Service → Model)
- [ ] No business logic in routes
- [ ] No Prisma calls outside models
- [ ] Functions have JSDoc comments
- [ ] Errors are handled and logged
- [ ] Constants used instead of magic values
- [ ] Input validation performed
- [ ] Tests written and passing
- [ ] File is under size limit
- [ ] Imports are organized
- [ ] No console.logs (except errors)

### Common Patterns

**Pattern: Create Entity**
```
Route → Service.createEntity() → Model.create()
```

**Pattern: List Entities**
```
Route → Model.findAll()
```

**Pattern: Complex Operation**
```
Route → Service.complexOperation() → Model1.find() + Model2.create() + ExternalAPI.call()
```

**Pattern: Error Handling**
```
Service throws CustomError → Route catches → Returns JSON with error code
```

---

## 🎯 Decision Tree

```
Is it a new feature?
├─ Yes → Which layer does it belong to?
│   ├─ Database operation → Model
│   ├─ Business logic → Service
│   ├─ HTTP endpoint → Route
│   ├─ UI component → Component
│   └─ Helper function → Utils
│
└─ No → Refactoring existing code?
    ├─ Mixed concerns → Separate into layers
    ├─ Repeated code → Extract to utility
    ├─ Magic values → Move to constants
    └─ Missing tests → Add tests
```

---

## 📚 Additional Resources

- [React Router Documentation](https://reactrouter.com)
- [Prisma Best Practices](https://www.prisma.io/docs/guides)
- [Shopify Polaris](https://polaris.shopify.com)
- [Clean Architecture (Book)](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)

---

## 📞 Questions?

If you're unsure where code should go:

1. Check this document first
2. Look for similar existing patterns
3. Ask: "Does this belong in the current layer?"
4. When in doubt, prefer Services over Routes

---

**Remember:** Clean architecture takes slightly more time upfront but saves exponentially more time in maintenance, debugging, and onboarding.

---

**Last Updated:** January 22, 2026  
**Maintained By:** Architecture Team
